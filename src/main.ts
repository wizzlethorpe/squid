import './style.css';
import { OpenAIClient, base64ToBlob } from './openai';
import { refinePrompt, buildImagePrompt } from './prompts';
import type { TattooStyle } from './types';
import { TATTOO_STYLES } from './types';
import {
  getState,
  subscribe,
  saveApiKey,
  setView,
  setGenerating,
  setResult,
  setSelectedStyle,
  addCustomStyle,
  deleteCustomStyle,
} from './ui/state';
import { renderApp, renderLibraryGrid } from './ui/views';
import { saveImage, getImages, deleteImage, clearAll } from './library';

const app = document.getElementById('app')!;

// Re-render on state change
subscribe((state) => {
  renderApp(state, app);
  attachEventListeners();

  if (state.currentView === 'library') {
    loadLibrary();
  }
});

// Initial render
renderApp(getState(), app);
attachEventListeners();

// Lightbox: close on click
document.addEventListener('click', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (
    lightbox &&
    (e.target === lightbox || e.target === document.getElementById('lightbox-img'))
  ) {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
  }
});

function openLightbox(imgSrc: string): void {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  if (lightbox && lightboxImg) {
    lightboxImg.src = imgSrc;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
  }
}

function attachEventListeners(): void {
  // Tab navigation
  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const view = (e.currentTarget as HTMLElement).dataset.view;
      if (view === 'generate' || view === 'library' || view === 'settings') {
        setView(view);
      }
    });
  });

  // Style selection — update info panel on change
  app.querySelectorAll('input[name="tattoo-style"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value;
      // custom:Name -> extract the name
      if (value.startsWith('custom:')) {
        setSelectedStyle(value.slice(7));
      } else {
        setSelectedStyle(value);
      }
    });
  });

  // Save custom style
  const saveCustomBtn = document.getElementById('save-custom-style-btn');
  saveCustomBtn?.addEventListener('click', () => {
    const nameInput = document.getElementById('custom-style-name') as HTMLInputElement;
    const promptInput = document.getElementById('custom-style-prompt') as HTMLTextAreaElement;
    const name = nameInput?.value.trim();
    const prompt = promptInput?.value.trim();
    if (!name || !prompt) {
      alert('Please provide both a name and prompt instructions.');
      return;
    }
    addCustomStyle({ name, prompt });
  });

  // Delete custom style
  app.querySelectorAll('.delete-custom-style').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const name = (e.currentTarget as HTMLElement).dataset.styleName;
      if (name && confirm(`Delete custom style "${name}"?`)) {
        deleteCustomStyle(name);
      }
    });
  });

  // Generate button
  const generateBtn = document.getElementById('generate-btn');
  generateBtn?.addEventListener('click', handleGenerate);

  // Download
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn?.addEventListener('click', handleDownload);

  // Settings: save key
  const saveKeyBtn = document.getElementById('save-key-btn');
  saveKeyBtn?.addEventListener('click', () => {
    const input = document.getElementById('api-key-input') as HTMLInputElement;
    if (input?.value.trim()) {
      saveApiKey(input.value.trim());
    }
  });

  // Settings: toggle key visibility
  const toggleBtn = document.getElementById('toggle-key-btn');
  toggleBtn?.addEventListener('click', () => {
    const input = document.getElementById('api-key-input') as HTMLInputElement;
    if (input) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Hide' : 'Show';
    }
  });

  // Library: filter buttons
  app.querySelectorAll('.library-filter').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const filter = (e.currentTarget as HTMLElement).dataset.filter;
      loadLibrary(filter === 'all' ? undefined : (filter as TattooStyle));
    });
  });

  // Library: clear all
  const clearBtn = document.getElementById('clear-library-btn');
  clearBtn?.addEventListener('click', async () => {
    if (confirm('Delete all saved designs? This cannot be undone.')) {
      await clearAll();
      loadLibrary();
    }
  });

  // Library: individual download/delete
  app.querySelectorAll('.library-download').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number((e.currentTarget as HTMLElement).dataset.imageId);
      const images = await getImages();
      const img = images.find((i) => i.id === id);
      if (img) downloadBlob(img.blob, `tattoo-${img.style}-${id}.png`);
    });
  });

  app.querySelectorAll('.library-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number((e.currentTarget as HTMLElement).dataset.imageId);
      if (confirm('Delete this design?')) {
        await deleteImage(id);
        loadLibrary();
      }
    });
  });
}

/**
 * Resolve the selected style into a TattooStyle (or closest match)
 * and optional custom prompt override.
 */
function resolveStyle(): { style: TattooStyle; customPrompt?: string } {
  const state = getState();
  const selected = state.selectedStyle;

  // Built-in style
  if ((TATTOO_STYLES as readonly string[]).includes(selected)) {
    return { style: selected as TattooStyle };
  }

  // Custom style — use 'illustrative' as the base style type for storage,
  // but pass the custom prompt through for generation
  const custom = state.customStyles.find((cs) => cs.name === selected);
  if (custom) {
    return { style: 'illustrative', customPrompt: custom.prompt };
  }

  return { style: 'illustrative' };
}

async function handleGenerate(): Promise<void> {
  const state = getState();
  if (!state.apiKey) return;

  const textarea = document.getElementById('tattoo-description') as HTMLTextAreaElement;
  const description = textarea?.value.trim();
  if (!description) {
    alert('Please describe your tattoo idea.');
    return;
  }

  const { style, customPrompt } = resolveStyle();
  const client = new OpenAIClient(state.apiKey);

  try {
    // Stage 1: Refine prompt
    setGenerating(true, 'Refining your prompt with AI...');

    const refinement = await refinePrompt(client, description, style, customPrompt);

    // Stage 2: Generate image
    setGenerating(true, 'Generating your tattoo design...');

    const imagePrompt = buildImagePrompt(refinement.safe_prompt, style, customPrompt);
    const base64 = await client.generateImage({ prompt: imagePrompt });
    const blob = base64ToBlob(base64);
    const imageUrl = URL.createObjectURL(blob);

    const result = {
      imageUrl,
      blob,
      originalPrompt: description,
      refinedPrompt: refinement.refined_prompt,
      safePrompt: refinement.safe_prompt,
      style,
      warnings: refinement.warnings,
      timestamp: new Date().toISOString(),
    };

    setResult(result);
    setGenerating(false);

    // Auto-save to library
    await saveImage({
      blob: result.blob,
      originalPrompt: result.originalPrompt,
      refinedPrompt: result.refinedPrompt,
      safePrompt: result.safePrompt,
      style: result.style,
      timestamp: result.timestamp,
      warnings: result.warnings,
    });
  } catch (err) {
    setGenerating(false);
    const message = err instanceof Error ? err.message : 'Unknown error';
    alert(`Generation failed: ${message}`);
  }
}

function handleDownload(): void {
  const result = getState().lastResult;
  if (!result) return;
  downloadBlob(result.blob, `tattoo-${result.style}-${Date.now()}.png`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadLibrary(styleFilter?: TattooStyle): Promise<void> {
  const grid = document.getElementById('library-grid');
  if (!grid) return;

  const images = await getImages(styleFilter ? { style: styleFilter } : undefined);
  grid.innerHTML = renderLibraryGrid(images);

  grid.querySelectorAll('.library-download').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number((e.currentTarget as HTMLElement).dataset.imageId);
      const img = images.find((i) => i.id === id);
      if (img) downloadBlob(img.blob, `tattoo-${img.style}-${id}.png`);
    });
  });

  grid.querySelectorAll('.library-image-preview').forEach((el) => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img') as HTMLImageElement;
      if (img) openLightbox(img.src);
    });
  });

  grid.querySelectorAll('.library-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number((e.currentTarget as HTMLElement).dataset.imageId);
      if (confirm('Delete this design?')) {
        await deleteImage(id);
        loadLibrary(styleFilter);
      }
    });
  });
}
