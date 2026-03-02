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
- Japanese: Flowing composition, wind/water backgrounds, peonies, koi, dragons, waves, clouds, bold outlines with gradient shading
- Blackwork: Solid black ink, geometric patterns, dotwork shading, negative space, high contrast
- Watercolor: Soft color washes, paint splatter effects, minimal or no outlines, fluid transitions, abstract color bleeding
- Geometric: Sacred geometry, mandalas, precise lines, symmetry, mathematical patterns, clean edges
- Bold-symbolic: Heavy bold black lines, solid black fills, high-contrast black and white only, strong graphic iconography, symbolic imagery (skulls, snakes, daggers, moons, eyes, hands), woodcut/linocut print quality, no shading gradients — just solid black shapes and crisp white negative space, punk/occult/folk symbol aesthetic
- Minimalist: Fine lines, simple forms, small scale, essential details only, elegant negative space
- Illustrative: Detailed linework, cross-hatching, storybook quality, artistic freedom in rendering
- Dotwork: Composed entirely of dots, stippling gradients, mandala patterns, geometric precision
- Realism: Photographic quality, smooth gradients, accurate proportions, detailed shading, 3D depth

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

/**
 * Stage 2: Build the final image generation prompt.
 */
export function buildImagePrompt(
  safePrompt: string,
  style: TattooStyle,
  customPrompt?: string,
): string {
  const styleDesc = customPrompt || style;
  return (
    `A high-quality tattoo design illustration: ${safePrompt}. ` +
    `Rendered as a standalone ${styleDesc} tattoo design on a clean transparent background. ` +
    `The design is isolated with no skin, no body, no background elements. ` +
    `Professional tattoo flash sheet quality with crisp details suitable for a tattoo stencil reference. ` +
    `The design should look like it was drawn by a skilled tattoo artist as a custom flash piece.`
  );
}
