import { TATTOO_STYLES } from '../types';
import type { CustomStyle } from '../types';

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  traditional:
    'Bold black outlines, limited color palette (red, green, yellow, brown), flat color fills, iconic motifs — anchors, roses, eagles, daggers.',
  'neo-traditional':
    'Evolved traditional with broader color palette, more detail and dimension, decorative elements, illustrated quality.',
  japanese:
    'Flowing composition, wind/water backgrounds, peonies, koi, dragons, waves, clouds, bold outlines with gradient shading.',
  blackwork:
    'Solid black ink, geometric patterns, dotwork shading, negative space, high contrast.',
  watercolor:
    'Soft color washes, paint splatter effects, minimal or no outlines, fluid transitions, abstract color bleeding.',
  geometric:
    'Sacred geometry, mandalas, precise lines, symmetry, mathematical patterns, clean edges.',
  'bold-symbolic':
    'Heavy bold black lines, solid black fills, high-contrast black and white only, woodcut/linocut print quality — just solid shapes and crisp negative space.',
  minimalist:
    'Fine lines, simple forms, small scale, essential details only, elegant negative space.',
  illustrative:
    'Detailed linework, cross-hatching, storybook quality, artistic freedom in rendering.',
  dotwork:
    'Composed entirely of dots, stippling gradients, mandala patterns, geometric precision.',
  realism:
    'Photographic quality, smooth gradients, accurate proportions, detailed shading, 3D depth.',
};

export function renderHeader(currentView: string): string {
  return `
    <nav class="flex items-center justify-between px-6 py-4 border-b border-neutral">
      <span class="text-lg font-bold tracking-widest uppercase">Squid</span>
      <div class="flex gap-1">
        ${['generate', 'library', 'settings']
          .map(
            (view) =>
              `<button class="px-3 py-1.5 text-sm ${currentView === view ? 'bg-white text-black' : 'text-neutral-content hover:text-white'} rounded transition-colors" data-view="${view}">${view.charAt(0).toUpperCase() + view.slice(1)}</button>`,
          )
          .join('')}
      </div>
    </nav>
  `;
}

export function renderStyleSelector(
  selectedStyle: string,
  customStyles: CustomStyle[],
): string {
  const builtinChips = TATTOO_STYLES.map((style) => {
    const isSelected = style === selectedStyle;
    const label = style
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-');
    return `<label class="cursor-pointer">
      <input type="radio" name="tattoo-style" value="${style}" class="hidden peer" ${isSelected ? 'checked' : ''} />
      <span class="inline-block px-3 py-1 text-sm border rounded-full transition-colors peer-checked:bg-white peer-checked:text-black peer-checked:border-white border-neutral-600 hover:border-white">${label}</span>
    </label>`;
  }).join('\n');

  const customChips = customStyles
    .map((cs) => {
      const isSelected = cs.name === selectedStyle;
      return `<label class="cursor-pointer">
      <input type="radio" name="tattoo-style" value="custom:${cs.name}" class="hidden peer" ${isSelected ? 'checked' : ''} />
      <span class="inline-block px-3 py-1 text-sm border rounded-full transition-colors peer-checked:bg-white peer-checked:text-black peer-checked:border-white border-neutral-600 hover:border-white">${escapeHtml(cs.name)}</span>
    </label>`;
    })
    .join('\n');

  const otherSelected = selectedStyle === '__new_custom__';
  const otherChip = `<label class="cursor-pointer">
    <input type="radio" name="tattoo-style" value="__new_custom__" class="hidden peer" ${otherSelected ? 'checked' : ''} />
    <span class="inline-block px-3 py-1 text-sm border rounded-full transition-colors peer-checked:bg-white peer-checked:text-black peer-checked:border-white border-dashed border-neutral-600 hover:border-white">+ Custom</span>
  </label>`;

  return `<div class="flex flex-wrap gap-2">${builtinChips}${customChips}${otherChip}</div>`;
}

export function renderInfoPanel(
  selectedStyle: string,
  customStyles: CustomStyle[],
): string {
  // Custom style editor
  if (selectedStyle === '__new_custom__') {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-semibold">Create Custom Style</h3>
        <div>
          <label class="block text-xs text-neutral-400 mb-1">Name</label>
          <input type="text" id="custom-style-name" class="w-full px-3 py-2 bg-transparent border border-neutral rounded text-sm placeholder-neutral-500 focus:outline-none focus:border-white transition-colors" placeholder="e.g. Dark Etching" />
        </div>
        <div>
          <label class="block text-xs text-neutral-400 mb-1">Prompt instructions</label>
          <textarea id="custom-style-prompt" class="w-full h-24 px-3 py-2 bg-transparent border border-neutral rounded text-sm resize-y placeholder-neutral-500 focus:outline-none focus:border-white transition-colors" placeholder="Describe the visual characteristics: line weight, shading, color palette, mood, references..."></textarea>
        </div>
        <button id="save-custom-style-btn" class="w-full py-2 text-sm font-medium bg-white text-black rounded hover:bg-neutral-200 transition-colors">Save Style</button>
      </div>
    `;
  }

  // Check if it's a saved custom style
  const custom = customStyles.find((cs) => cs.name === selectedStyle);
  if (custom) {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-semibold">${escapeHtml(custom.name)}</h3>
        <p class="text-sm text-neutral-400 leading-relaxed">${escapeHtml(custom.prompt)}</p>
        <button class="text-xs underline text-neutral-500 hover:text-red-500 transition-colors delete-custom-style" data-style-name="${escapeHtml(custom.name)}">Delete style</button>
        <hr class="border-neutral" />
        <div class="space-y-1">
          <p class="text-xs text-neutral-500 font-medium">Estimated cost per generation</p>
          <p class="text-sm">~$0.17 – $0.20</p>
          <p class="text-xs text-neutral-500">GPT-4o refinement ~$0.003 + gpt-image-1 high ~$0.17</p>
        </div>
      </div>
    `;
  }

  // Built-in style
  const description =
    STYLE_DESCRIPTIONS[selectedStyle] || 'Select a style to see its details.';
  return `
    <div class="space-y-4">
      <h3 class="text-sm font-semibold">${selectedStyle.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}</h3>
      <p class="text-sm text-neutral-400 leading-relaxed">${escapeHtml(description)}</p>
      <hr class="border-neutral" />
      <div class="space-y-1">
        <p class="text-xs text-neutral-500 font-medium">Estimated cost per generation</p>
        <p class="text-sm">~$0.17 – $0.20</p>
        <p class="text-xs text-neutral-500">GPT-4o refinement ~$0.003 + gpt-image-1 high ~$0.17</p>
      </div>
    </div>
  `;
}

export function renderCheckerboardPreview(imageUrl: string): string {
  return `
    <div class="rounded overflow-hidden max-w-lg mx-auto border border-neutral bg-[#f0ece4]">
      <img src="${imageUrl}" alt="Generated tattoo design" class="w-full h-auto" />
    </div>
  `;
}

export function renderWarnings(warnings: string[]): string {
  if (warnings.length === 0) return '';
  return `
    <div class="border border-neutral-600 rounded p-4 mt-4">
      <p class="font-semibold text-sm mb-2">Notices</p>
      <ul class="list-disc list-inside text-sm text-neutral-400">
        ${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}
      </ul>
    </div>
  `;
}

export function renderLoadingSpinner(message: string): string {
  return `
    <div class="flex flex-col items-center gap-4 py-12">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="text-sm text-neutral-400">${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
