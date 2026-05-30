import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
      }),
  );
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
