import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

let tracer: { scope: () => { active: () => { setTag: (k: string, v: string) => void } | null } } | null = null;

try {
  // dd-trace must be the very first import; we lazy-load here so tests run without it
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  tracer = require('dd-trace') as typeof tracer;
} catch {
  // dd-trace not available — no-op
}

@Injectable()
export class DatadogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DatadogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const route = `${req.method} ${req.path}`;

    const span = tracer?.scope().active();
    if (span) {
      span.setTag('http.route', route);
      span.setTag('service', process.env['DD_SERVICE'] ?? 'bbt-api');
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          if (ms > 1000) this.logger.warn(`Slow request: ${route} (${ms}ms)`);
        },
        error: () => {
          const ms = Date.now() - start;
          this.logger.error(`Request error: ${route} (${ms}ms)`);
        },
      }),
    );
  }
}
