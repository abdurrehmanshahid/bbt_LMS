const API = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api').replace(/\/$/, '');

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

export async function getTrackSkillGraph(trackId: string): Promise<ConceptGraphDto> {
  try {
    const res = await fetch(`${API}/skill-graph/tracks/${trackId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { nodes: [], edges: [] };
    return res.json() as Promise<ConceptGraphDto>;
  } catch {
    return { nodes: [], edges: [] };
  }
}

export async function getReadyToLearn(token: string): Promise<ReadyToLearnResponse> {
  try {
    const res = await fetch(`${API}/learner/skill-graph/ready`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ready: [], earned: [] };
    return res.json() as Promise<ReadyToLearnResponse>;
  } catch {
    return { ready: [], earned: [] };
  }
}
