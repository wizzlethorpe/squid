import type { AppState, CustomStyle, GenerationResult, ViewName } from '../types';

type StateListener = (state: AppState) => void;

const API_KEY_STORAGE = 'tattoo_openai_api_key';
const CUSTOM_STYLES_STORAGE = 'tattoo_custom_styles';

function loadCustomStyles(): CustomStyle[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STYLES_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const initialState: AppState = {
  currentView: 'generate',
  apiKey: localStorage.getItem(API_KEY_STORAGE),
  isGenerating: false,
  generationProgress: '',
  lastResult: null,
  selectedStyle: 'illustrative',
  customStyles: loadCustomStyles(),
};

let state: AppState = { ...initialState };
const listeners: StateListener[] = [];

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn: StateListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
  setState({ apiKey: key });
}

export function setView(view: ViewName): void {
  setState({ currentView: view });
}

export function setGenerating(isGenerating: boolean, progress = ''): void {
  setState({ isGenerating, generationProgress: progress });
}

export function setResult(result: GenerationResult | null): void {
  setState({ lastResult: result });
}

export function setSelectedStyle(style: string): void {
  setState({ selectedStyle: style });
}

export function addCustomStyle(style: CustomStyle): void {
  const updated = [...state.customStyles, style];
  localStorage.setItem(CUSTOM_STYLES_STORAGE, JSON.stringify(updated));
  setState({ customStyles: updated, selectedStyle: style.name });
}

export function deleteCustomStyle(name: string): void {
  const updated = state.customStyles.filter((s) => s.name !== name);
  localStorage.setItem(CUSTOM_STYLES_STORAGE, JSON.stringify(updated));
  setState({
    customStyles: updated,
    selectedStyle: state.selectedStyle === name ? 'illustrative' : state.selectedStyle,
  });
}
