export enum TrackSlug {
  GENAI_AGENTIC = 'genai-agentic-ai',
  CLOUD_MLOPS = 'cloud-mlops',
  ODOO_ERP = 'odoo-erp-development',
  AI_FULLSTACK = 'ai-integrated-fullstack',
  CYBERSECURITY = 'cybersecurity',
  UI_UX_DESIGN = 'ui-ux-brand-design',
  AI_MARKETING = 'ai-marketing-sales',
}

export interface TrackDto {
  id: string;
  slug: TrackSlug;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  isActive: boolean;
  enrollmentCount: number;
  avgCompletionRate: number;
}

export interface ModuleDto {
  id: string;
  trackId: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  passingScore: number;
  isActive: boolean;
  isLocked?: boolean;
}

export interface ConceptDto {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  prerequisites: string[];
}
