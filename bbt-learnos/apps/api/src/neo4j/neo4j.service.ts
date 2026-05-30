import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, QueryResult, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const uri = this.config.get<string>('NEO4J_URI', '');
    if (!uri) {
      this.logger.warn('NEO4J_URI not set — Neo4j disabled (skill graph will degrade gracefully)');
      return;
    }

    const user = this.config.get<string>('NEO4J_USER', 'neo4j');
    const password = this.config.get<string>('NEO4J_PASSWORD', '');

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j connected');
      await this.createIndexes();
    } catch (err) {
      this.logger.warn(`Neo4j connection failed — degraded mode: ${String(err)}`);
      this.driver = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.driver?.close();
  }

  isConnected(): boolean {
    return this.driver !== null;
  }

  async run(cypher: string, params: Record<string, unknown> = {}): Promise<QueryResult> {
    if (!this.driver) throw new Error('Neo4j not connected');
    const session: Session = this.driver.session();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX concept_id IF NOT EXISTS FOR (c:Concept) ON (c.id)',
      'CREATE INDEX concept_track IF NOT EXISTS FOR (c:Concept) ON (c.trackId)',
    ];
    for (const idx of indexes) {
      await this.run(idx).catch((err: unknown) => {
        this.logger.warn(`Index creation warning: ${String(err)}`);
      });
    }
  }
}
