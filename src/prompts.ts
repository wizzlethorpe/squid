import type { OpenAIClient } from './openai';
import type { PromptRefinementResult, TattooStyle } from './types';
import {
  PROMPT_REFINEMENT_SCHEMA,
  detectKnownArtists,
  replaceArtistReferences,
} from './artist-guard';

const SYSTEM_PROMPT = `You are an expert tattoo design consultant and prompt engineer. Your job is to take a user's tattoo idea description and transform it into an optimal image generation prompt.

You must:
1. Enhance the description with tattoo-specific visual details: line weight, shading technique, color palette, composition, placement considerations, and style-specific elements.
2. CRITICALLY: Detect any artist name references (direct names, "in the style of", or indirect references to specific artists' signature styles). Replace ALL artist references with descriptive style characteristics. Never pass an artist name to the image generator.
3. Detect any copyrighted characters, logos, or trademarked content and flag them.
4. Identify the tattoo style(s) present in the description.
5. Produce a safe_prompt that is optimized for image generation with NO artist names and NO copyrighted content.

Style-specific guidance:
- Traditional: Bold black outlines, limited color palette (red, green, yellow, brown), flat color fills, iconic motifs (anchors, roses, eagles, daggers)
- Neo-traditional: Evolved traditional with broader color palette, more detail and dimension, decorative elements, illustrated quality
- Japanese: Flowing composition, wind/water backgrounds, peonies, koi, dragons, waves, clouds, bold outlines with gradient shading (bokashi)
- Blackwork: Solid black ink, geometric patterns, dotwork shading, negative space, high contrast
- Watercolor: Soft color washes, paint splatter effects, minimal or no outlines, fluid transitions, abstract color bleeding
- Geometric: Sacred geometry, mandalas, precise lines, symmetry, mathematical patterns, clean edges
- Bold-symbolic: Heavy bold black lines, solid black fills, high-contrast black and white only, strong graphic iconography, symbolic imagery (skulls, snakes, daggers, moons, eyes, hands), woodcut/linocut print quality, no shading gradients — just solid black shapes and crisp white negative space, punk/occult/folk symbol aesthetic
- Minimalist: Fine lines, simple forms, small scale, essential details only, elegant negative space
- Illustrative: Detailed linework, cross-hatching, storybook quality, artistic freedom in rendering
- Dotwork: Composed entirely of dots, stippling gradients, mandala patterns, geometric precision
- Realism: Tattoo realism — smooth tonal wash gradients, accurate proportions, detailed shading. Must read as tattoo art, not as a photograph or 3D render. Black-and-grey wash or color realism with needle-work quality.

CRITICAL: The final prompt you produce MUST result in an image that looks like actual tattoo art — the kind of design a tattoo artist would draw as flash art or a custom piece. Your output prompt should:
- Use tattoo-specific rendering language: "ink on paper", "flash sheet quality", "stencil-ready", "hand-drawn by a tattoo artist"
- Describe bold, confident linework — avoid language suggesting soft, digital, or painterly rendering
- NEVER use language that would produce: photorealistic 3D renders, digital painting with glow effects, airbrushed illustrations, gradient mesh art, or generic clip art
- For realism style, emphasize "tattoo realism" — smooth wash gradients and needle-work quality, NOT camera-photograph quality

The image will be generated with a transparent background, so design the tattoo as an isolated piece — no skin, no body, just the design itself.`;

/**
 * Stage 1: Refine the user's description via GPT-4o with structured output.
 */
export async function refinePrompt(
  client: OpenAIClient,
  description: string,
  style: TattooStyle,
  customPrompt?: string,
): Promise<PromptRefinementResult> {
  const preDetected = detectKnownArtists(description);
  const preFiltered =
    preDetected.length > 0 ? replaceArtistReferences(description) : description;

  const userMessage = JSON.stringify({
    tattoo_description: preFiltered,
    selected_style: style,
    custom_style_instructions: customPrompt || null,
    pre_detected_artists: preDetected,
    original_had_artist_references: preDetected.length > 0,
  });

  const systemPrompt = customPrompt
    ? SYSTEM_PROMPT +
      `\n\nThe user has defined a custom style with these instructions. Use them as the primary style guide:\n${customPrompt}`
    : SYSTEM_PROMPT;

  const result = await client.chatCompletionStructured<PromptRefinementResult>({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: PROMPT_REFINEMENT_SCHEMA,
  });

  if (preDetected.length > 0) {
    const allArtists = [
      ...new Set([...result.detected_artists, ...preDetected]),
    ];
    result.detected_artists = allArtists;
    if (!result.warnings.some((w) => w.toLowerCase().includes('artist'))) {
      result.warnings.push(
        `Artist references automatically replaced: ${preDetected.join(', ')}`,
      );
    }
  }

  return result;
}

const STYLE_RENDERING: Record<TattooStyle, string> = {
  traditional:
    'Bold black outlines with flat color fills. Colors limited to red, green, yellow, brown, black. No gradients or soft shading — hard-edged classic flash quality.',
  'neo-traditional':
    'Bold black outlines with richer color palette and more dimensional shading than traditional. Decorative Art Nouveau influences. Hand-drawn ink art, not digital illustration.',
  japanese:
    'Flowing composition with bold black outlines and smooth gradient shading (bokashi). Traditional Japanese woodblock print quality with ukiyo-e influence.',
  blackwork:
    'Solid black ink only. Bold shapes, geometric patterns, stipple/dotwork shading. High contrast between solid black and negative white space. Woodcut or linocut print aesthetic.',
  watercolor:
    'Loose ink splatter and wash effects simulating watercolor paint on paper. Minimal black outlines or none. Must still read as a tattoo design, not a watercolor painting.',
  geometric:
    'Precise geometric linework, sacred geometry patterns, mathematically clean edges. Thin to medium black lines with high precision. Compass-and-ruler drafted aesthetic.',
  'bold-symbolic':
    'Heavy bold black lines, solid black fills, maximum contrast. Woodcut/linocut print quality — no gradients, just solid black shapes and crisp white negative space. Punk/occult/folk symbol aesthetic.',
  minimalist:
    'Ultra-fine single-weight black lines. Simple forms, maximum negative space. Single needle tattoo quality — delicate and precise.',
  illustrative:
    'Detailed linework with cross-hatching and stippling for shading. Etching or engraving quality. Hand-drawn ink illustration aesthetic.',
  dotwork:
    'Composed entirely of individual dots — stippling technique. Density of dots creates shading gradients. Mandala and geometric precision.',
  realism:
    'Smooth tonal gradients achieved through fine needle work. Black and grey wash or color realism. Must look like tattoo art, not a photograph or 3D render.',
};

/**
 * Stage 2: Build the final image generation prompt.
 */
export function buildImagePrompt(
  safePrompt: string,
  style: TattooStyle,
  customPrompt?: string,
): string {
  const styleDesc = customPrompt || style;
  const renderingNotes = customPrompt ? '' : ` ${STYLE_RENDERING[style]}`;
  return (
    `A professional tattoo flash sheet design: ${safePrompt}. ` +
    `Style: ${styleDesc} tattoo.${renderingNotes} ` +
    `Rendered as an isolated tattoo design on a clean transparent background — ` +
    `no skin, no body, no background elements, no frame or border. ` +
    `The artwork must look like it was hand-drawn with ink on paper by a professional tattoo artist — ` +
    `bold confident linework, clean edges, stencil-ready quality. ` +
    `Tattoo flash sheet aesthetic: the kind of design you would see pinned to the wall of a tattoo parlor. ` +
    `DO NOT render as: photorealistic 3D art, digital painting with glow effects, ` +
    `gradient mesh illustrations, airbrushed art, or general clip art. ` +
    `The design must unmistakably read as a tattoo.`
  );
}

/**
 * Build a prompt for refining an existing tattoo image with user feedback.
 */
export function buildRefinementPrompt(
  safePrompt: string,
  style: TattooStyle,
  feedback: string,
  customPrompt?: string,
): string {
  const styleDesc = customPrompt || style;
  return (
    `Refine this tattoo design based on the following feedback: ${feedback}. ` +
    `The original design is: ${safePrompt}. ` +
    `Maintain the ${styleDesc} tattoo style. ` +
    `Rendered on a clean transparent background — no skin, no body, no background elements. ` +
    `The result must look like professional tattoo flash art — bold confident ink lines, ` +
    `stencil-ready quality, hand-drawn by a skilled tattoo artist. ` +
    `DO NOT render as photorealistic 3D art, digital painting with glow effects, or airbrushed art.`
  );
}
