import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Neo4jService } from '../neo4j/neo4j.service';
import { PrismaService } from '../prisma/prisma.service';

import type {
  ConceptGraphDto,
  ConceptNode,
  ReadyConceptDto,
  ReadyToLearnResponse,
  SkillPathDto,
  SyncResult,
} from './skill-graph.interfaces';

@Injectable()
export class SkillGraphService {
  private readonly logger = new Logger(SkillGraphService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Sync ─────────────────────────────────────────────────────────────────

  async syncFromPostgres(): Promise<SyncResult> {
    if (!this.neo4j.isConnected()) {
      this.logger.warn('syncFromPostgres: Neo4j not connected — skipped');
      return { synced: 0, edges: 0 };
    }

    const concepts = await this.prisma.concept.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        moduleId: true,
        module: {
          select: {
            trackId: true,
            track: { select: { id: true, title: true } },
          },
        },
        prerequisites: { select: { prerequisiteId: true } },
      },
    });

    const conceptParams = concepts.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      moduleId: c.moduleId,
      trackId: c.module.track.id,
      trackTitle: c.module.track.title,
      order: c.order,
    }));

    const edgeParams: { conceptId: string; prerequisiteId: string }[] = [];
    for (const c of concepts) {
      for (const p of c.prerequisites) {
        edgeParams.push({ conceptId: c.id, prerequisiteId: p.prerequisiteId });
      }
    }

    const validConceptIds = concepts.map((c) => c.id);
    const validEdgePairs = edgeParams.map((e) => [e.conceptId, e.prerequisiteId]);

    // Step 1: upsert nodes
    await this.neo4j.run(
      `UNWIND $concepts AS c
       MERGE (n:Concept {id: c.id})
       SET n.title       = c.title,
           n.description = c.description,
           n.moduleId    = c.moduleId,
           n.trackId     = c.trackId,
           n.trackTitle  = c.trackTitle,
           n.order       = toFloat(c.order)`,
      { concepts: conceptParams },
    );

    // Step 2: upsert edges
    if (edgeParams.length > 0) {
      await this.neo4j.run(
        `UNWIND $edges AS e
         MATCH (from:Concept {id: e.conceptId})
         MATCH (to:Concept   {id: e.prerequisiteId})
         MERGE (from)-[:REQUIRES]->(to)`,
        { edges: edgeParams },
      );
    }

    // Step 3: remove stale edges
    await this.neo4j.run(
      `MATCH (f:Concept)-[r:REQUIRES]->(t:Concept)
       WHERE NOT [f.id, t.id] IN $validPairs
       DELETE r`,
      { validPairs: validEdgePairs },
    );

    // Step 4: remove stale nodes
    await this.neo4j.run(
      `MATCH (n:Concept)
       WHERE NOT n.id IN $validIds
       DETACH DELETE n`,
      { validIds: validConceptIds },
    );

    this.logger.log(`Synced ${concepts.length} concepts, ${edgeParams.length} edges to Neo4j`);
    return { synced: concepts.length, edges: edgeParams.length };
  }

  @OnEvent('assessment.passed')
  onAssessmentPassed(): void {
    void this.syncFromPostgres().catch((err: unknown) => {
      this.logger.warn(`Auto-sync after assessment.passed failed: ${String(err)}`);
    });
  }

  // ─── Graph queries ─────────────────────────────────────────────────────────

  async getPrerequisiteChain(conceptId: string): Promise<string[]> {
    if (!this.neo4j.isConnected()) return [];
    const result = await this.neo4j.run(
      `MATCH (c:Concept {id: $id})-[:REQUIRES*1..]->(dep:Concept)
       RETURN DISTINCT dep.id AS depId`,
      { id: conceptId },
    );
    return result.records.map((r) => r.get('depId') as string);
  }

  async getUnlockedBy(conceptId: string): Promise<string[]> {
    if (!this.neo4j.isConnected()) return [];
    const result = await this.neo4j.run(
      `MATCH (next:Concept)-[:REQUIRES]->(c:Concept {id: $id})
       RETURN DISTINCT next.id AS nextId`,
      { id: conceptId },
    );
    return result.records.map((r) => r.get('nextId') as string);
  }

  async getReadyToLearn(learnerId: string): Promise<ReadyToLearnResponse> {
    const badges = await this.prisma.skillBadge.findMany({
      where: { learnerId, isRevoked: false },
      select: { conceptId: true },
    });
    const earnedIds = badges.map((b) => b.conceptId);

    if (!this.neo4j.isConnected()) return { ready: [], earned: earnedIds };

    const result = await this.neo4j.run(
      `MATCH (c:Concept)
       WHERE NOT c.id IN $earnedIds
         AND ALL(prereq IN [(c)-[:REQUIRES]->(p) | p.id] WHERE prereq IN $earnedIds)
       RETURN c.id        AS conceptId,
              c.title     AS title,
              c.moduleId  AS moduleId,
              c.trackId   AS trackId,
              c.trackTitle AS trackTitle,
              c.order     AS order
       ORDER BY c.trackId, c.order`,
      { earnedIds },
    );

    const ready: ReadyConceptDto[] = result.records.map((r) => ({
      conceptId: r.get('conceptId') as string,
      title: r.get('title') as string,
      moduleId: r.get('moduleId') as string,
      trackId: r.get('trackId') as string,
      trackTitle: r.get('trackTitle') as string,
      order: (r.get('order') as number),
    }));

    return { ready, earned: earnedIds };
  }

  async getSkillPath(fromId: string, toId: string): Promise<SkillPathDto> {
    if (!this.neo4j.isConnected()) return { path: [], length: 0 };
    const result = await this.neo4j.run(
      `MATCH p = shortestPath(
         (from:Concept {id: $fromId})-[:REQUIRES*]->(to:Concept {id: $toId})
       )
       RETURN [n IN nodes(p) | n.id] AS path`,
      { fromId, toId },
    );
    if (result.records.length === 0) return { path: [], length: 0 };
    const path = result.records[0].get('path') as string[];
    return { path, length: path.length };
  }

  async getConceptGraph(trackId: string): Promise<ConceptGraphDto> {
    if (!this.neo4j.isConnected()) return { nodes: [], edges: [] };

    const result = await this.neo4j.run(
      `MATCH (c:Concept {trackId: $trackId})
       OPTIONAL MATCH (c)-[:REQUIRES]->(prereq:Concept {trackId: $trackId})
       RETURN c.id          AS id,
              c.title       AS title,
              c.description AS description,
              c.moduleId    AS moduleId,
              c.trackId     AS trackId,
              c.trackTitle  AS trackTitle,
              c.order       AS order,
              collect(prereq.id) AS requiresIds`,
      { trackId },
    );

    const nodes: ConceptNode[] = [];
    const edges: { from: string; to: string }[] = [];
    const seenNodes = new Set<string>();

    for (const r of result.records) {
      const id = r.get('id') as string;
      if (!seenNodes.has(id)) {
        seenNodes.add(id);
        nodes.push({
          id,
          title: r.get('title') as string,
          description: r.get('description') as string,
          moduleId: r.get('moduleId') as string,
          trackId: r.get('trackId') as string,
          trackTitle: r.get('trackTitle') as string,
          order: r.get('order') as number,
        });
      }
      const requiresIds = r.get('requiresIds') as string[];
      for (const reqId of requiresIds) {
        if (reqId) edges.push({ from: id, to: reqId });
      }
    }

    return { nodes, edges };
  }
}
