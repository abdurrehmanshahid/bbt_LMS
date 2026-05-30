export interface ConceptNode {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  trackId: string;
  trackTitle: string;
  order: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export interface ConceptGraphDto {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface ReadyConceptDto {
  conceptId: string;
  title: string;
  moduleId: string;
  trackId: string;
  trackTitle: string;
  order: number;
}

export interface ReadyToLearnResponse {
  ready: ReadyConceptDto[];
  earned: string[];
}

export interface SkillPathDto {
  path: string[];
  length: number;
}

export interface SyncResult {
  synced: number;
  edges: number;
}
