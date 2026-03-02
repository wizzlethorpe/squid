import type { AppState, LibraryEntry } from '../types';
import {
  renderHeader,
  renderStyleSelector,
  renderInfoPanel,
  renderCheckerboardPreview,
  renderWarnings,
  renderLoadingSpinner,
} from './components';

export function renderApp(state: AppState, container: HTMLElement): void {
  container.innerHTML = `
    ${renderHeader(state.currentView)}
    <main class="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
      ${renderView(state)}
    </main>
    <footer class="border-t border-neutral px-6 py-4 text-center">
      <p class="text-xs text-neutral-500">Squid — All processing happens in your browser. Your API key never leaves your device.</p>
    </footer>
    <div id="lightbox" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/90 cursor-pointer">
      <div class="bg-[#f0ece4] rounded overflow-hidden max-w-[90vw] max-h-[90vh]">
        <img id="lightbox-img" class="max-w-[90vw] max-h-[90vh] object-contain" />
      </div>
    </div>
  `;
}

function renderView(state: AppState): string {
  switch (state.currentView) {
    case 'generate':
      return renderGenerateView(state);
    case 'library':
      return renderLibraryView();
    case 'settings':
      return renderSettingsView(state);
  }
}

function renderGenerateView(state: AppState): string {
  const hasKey = !!state.apiKey;

  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Create a Tattoo Design</h1>
      <p class="text-sm text-neutral-400 mt-1">Describe your idea and let AI craft a tattoo-ready design</p>
    </div>

    ${
      !hasKey
        ? `<div class="border border-neutral-600 rounded p-4 mb-6 text-sm">
            You need an OpenAI API key to generate images. Go to <button class="underline font-semibold" data-view="settings">Settings</button> to add one.
          </div>`
        : ''
    }

    <div class="flex gap-8">
      <div class="flex-1 min-w-0 space-y-6">
        <div>
          <label class="block text-sm font-medium mb-2" for="tattoo-description">Describe your tattoo idea</label>
          <textarea
            id="tattoo-description"
            class="w-full h-32 px-4 py-3 bg-transparent border border-neutral rounded text-base resize-y placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            placeholder="A wolf howling at the moon with pine trees in the foreground, wrapped in a crescent moon shape..."
            ${!hasKey ? 'disabled' : ''}
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Style</label>
          ${renderStyleSelector(state.selectedStyle, state.customStyles)}
        </div>

        <button
          id="generate-btn"
          class="w-full py-3 text-sm font-semibold rounded transition-colors ${!hasKey || state.isGenerating ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-white text-black hover:bg-neutral-200'}"
          ${!hasKey || state.isGenerating ? 'disabled' : ''}
        >
          ${state.isGenerating ? 'Generating...' : 'Generate Tattoo Design'}
        </button>

        <div id="result-area">
          ${
            state.isGenerating
              ? renderLoadingSpinner(state.generationProgress || 'Refining your prompt...')
              : ''
          }
          ${state.lastResult ? renderResult(state) : ''}
        </div>
      </div>

      <aside class="w-64 shrink-0 hidden md:block">
        <div class="sticky top-6 border border-neutral rounded p-4">
          <div id="info-panel">
            ${renderInfoPanel(state.selectedStyle, state.customStyles)}
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderResult(state: AppState): string {
  const r = state.lastResult!;
  return `
    <div class="space-y-6 mt-4">
      ${renderCheckerboardPreview(r.imageUrl)}

      <div class="flex justify-center gap-3">
        <button id="download-btn" class="px-4 py-2 text-sm font-medium border border-neutral-600 rounded hover:border-white transition-colors">Download PNG</button>
      </div>
      <p class="text-center text-xs text-neutral-500">Automatically saved to your library</p>

      ${renderWarnings(r.warnings)}

      <details class="border border-neutral rounded">
        <summary class="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-neutral-900 transition-colors">Prompt Details</summary>
        <div class="px-4 py-3 border-t border-neutral space-y-2 text-sm text-neutral-400">
          <p><strong class="text-neutral-200">Your input:</strong> ${escapeHtml(r.originalPrompt)}</p>
          <p><strong class="text-neutral-200">Refined:</strong> ${escapeHtml(r.refinedPrompt)}</p>
          <p><strong class="text-neutral-200">Final prompt:</strong> ${escapeHtml(r.safePrompt)}</p>
        </div>
      </details>
    </div>
  `;
}

function renderLibraryView(): string {
  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Your Library</h1>
      <p class="text-sm text-neutral-400 mt-1">Saved tattoo designs (stored locally in your browser)</p>
    </div>

    <div class="flex justify-between items-start mb-6 flex-wrap gap-3">
      <div class="flex gap-1.5 flex-wrap">
        ${['all', 'traditional', 'neo-traditional', 'japanese', 'blackwork', 'watercolor', 'geometric', 'bold-symbolic', 'minimalist', 'illustrative', 'dotwork', 'realism']
          .map(
            (f) =>
              `<button class="px-2.5 py-1 text-xs border border-neutral-700 rounded-full hover:border-white transition-colors library-filter" data-filter="${f}">${f === 'all' ? 'All' : f === 'neo-traditional' ? 'Neo-Trad' : f.charAt(0).toUpperCase() + f.slice(1)}</button>`,
          )
          .join('')}
      </div>
      <button id="clear-library-btn" class="px-2.5 py-1 text-xs border border-neutral-700 rounded-full hover:border-red-500 hover:text-red-500 transition-colors">Clear All</button>
    </div>

    <div id="library-grid" class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div class="flex items-center justify-center py-12 col-span-full">
        <span class="loading loading-spinner loading-sm"></span>
        <span class="ml-2 text-sm text-neutral-500">Loading...</span>
      </div>
    </div>
  `;
}

export function renderLibraryGrid(images: LibraryEntry[]): string {
  if (images.length === 0) {
    return `
      <div class="text-center py-12 col-span-full text-neutral-500">
        <p>No designs saved yet.</p>
        <p class="text-sm mt-1">Generate a tattoo design and save it to build your library.</p>
      </div>
    `;
  }

  return images
    .map(
      (img) => `
    <div class="border border-neutral rounded overflow-hidden group" data-image-id="${img.id}">
      <div class="bg-[#f0ece4] cursor-pointer library-image-preview">
        <img src="${URL.createObjectURL(img.blob)}" alt="${escapeHtml(img.originalPrompt)}" class="w-full h-auto" />
      </div>
      <div class="p-3 space-y-2">
        <div class="flex justify-between items-center">
          <span class="text-xs border border-neutral-700 rounded-full px-2 py-0.5">${img.style}</span>
          <span class="text-xs text-neutral-500">${new Date(img.timestamp).toLocaleDateString()}</span>
        </div>
        <p class="text-xs text-neutral-400 line-clamp-2">${escapeHtml(img.originalPrompt)}</p>
        <div class="flex justify-end gap-2">
          <button class="text-xs underline hover:text-white transition-colors library-download" data-image-id="${img.id}">Download</button>
          <button class="text-xs underline text-neutral-500 hover:text-red-500 transition-colors library-delete" data-image-id="${img.id}">Delete</button>
        </div>
      </div>
    </div>
  `,
    )
    .join('');
}

function renderSettingsView(state: AppState): string {
  return `
    <div class="mb-8">
      <h1 class="text-3xl font-bold">Settings</h1>
      <p class="text-sm text-neutral-400 mt-1">Configure your API key</p>
    </div>

    <div class="max-w-md space-y-6">
      <div>
        <label class="block text-sm font-medium mb-2" for="api-key-input">OpenAI API Key</label>
        <div class="flex gap-2">
          <input
            type="password"
            id="api-key-input"
            class="flex-1 px-4 py-2 bg-transparent border border-neutral rounded text-base placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            placeholder="sk-..."
            value="${state.apiKey || ''}"
          />
          <button id="toggle-key-btn" class="px-3 py-2 text-sm border border-neutral rounded hover:border-white transition-colors">Show</button>
        </div>
        <p class="text-xs text-neutral-500 mt-2">Stored only in this browser. Never sent anywhere except directly to OpenAI.</p>
      </div>

      <button id="save-key-btn" class="w-full py-2.5 text-sm font-semibold bg-white text-black rounded hover:bg-neutral-200 transition-colors">Save Key</button>

      ${
        state.apiKey
          ? `<p class="text-sm text-neutral-400">API key is configured and ready.</p>`
          : `<p class="text-sm text-neutral-400">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" class="underline hover:text-white">platform.openai.com</a></p>`
      }
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
