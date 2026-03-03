export const TATTOO_STYLES = [
  'traditional',
  'neo-traditional',
  'japanese',
  'blackwork',
  'watercolor',
  'geometric',
  'bold-symbolic',
  'minimalist',
  'illustrative',
  'dotwork',
  'realism',
] as const;

export type TattooStyle = (typeof TATTOO_STYLES)[number];

export interface PromptRefinementResult {
  refined_prompt: string;
  detected_artists: string[];
  detected_copyrighted: string[];
  style_tags: string[];
  warnings: string[];
  safe_prompt: string;
}

export interface LibraryEntry {
  id?: number;
  blob: Blob;
  originalPrompt: string;
  refinedPrompt: string;
  safePrompt: string;
  style: TattooStyle;
  timestamp: string;
  warnings: string[];
}

export type ViewName = 'generate' | 'library' | 'settings';

export interface CustomStyle {
  name: string;
  prompt: string;
}

export type ImageModel = 'gpt-image-1' | 'gpt-image-1-mini';

export interface AppState {
  currentView: ViewName;
  apiKey: string | null;
  isGenerating: boolean;
  generationProgress: string;
  lastResult: GenerationResult | null;
  selectedStyle: string;
  customStyles: CustomStyle[];
  imageModel: ImageModel;
  isRefining: boolean;
}

export interface GenerationResult {
  imageUrl: string;
  blob: Blob;
  originalPrompt: string;
  refinedPrompt: string;
  safePrompt: string;
  style: TattooStyle;
  warnings: string[];
  timestamp: string;
}
