import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { KeysService } from '../keys/keys.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({ namespace: '/cohort', cors: { origin: '*', credentials: true } })
export class CohortGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly userSocketMap = new Map<string, string>(); // userId → socketId

  constructor(
    private readonly jwt: JwtService,
    private readonly keys: KeysService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    const token = client.handshake.auth['token'] as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        algorithms: ['RS256'],
        publicKey: this.keys.publicKey,
      });
      client.userId = payload.sub;
      this.userSocketMap.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      this.userSocketMap.delete(client.userId);
    }
  }

  @SubscribeMessage('joinCohort')
  handleJoinCohort(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() cohortId: string,
  ): void {
    void client.join(`cohort:${cohortId}`);
  }

  @SubscribeMessage('leaveCohort')
  handleLeaveCohort(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() cohortId: string,
  ): void {
    void client.leave(`cohort:${cohortId}`);
  }

  emitMemberProgress(
    cohortId: string,
    data: { userId: string; moduleTitle: string; moduleOrder: number; score: number },
  ): void {
    this.server.to(`cohort:${cohortId}`).emit('cohort:memberProgress', data);
  }

  emitNewMember(cohortId: string, userId: string): void {
    this.server.to(`cohort:${cohortId}`).emit('cohort:newMember', { userId });
  }
}
