/**
 * Well-known tattoo and visual artists.
 * Fast client-side pre-check before the GPT-4o structured output call.
 */
const KNOWN_ARTISTS: string[] = [
  // Tattoo artists
  'sailor jerry', 'norman collins', 'don ed hardy', 'ed hardy',
  'horiyoshi iii', 'filip leu', 'paul booth', 'nikko hurtado',
  'ami james', 'kat von d', 'chris nunez', 'bang bang',
  'keith mccurdy', 'dr woo', 'brian woo', 'steve butcher',
  'mark mahoney', 'freddy negrete', 'jack rudy', 'mike rubendall',
  'thomas hooper', 'guy aitchison', 'jeff gogue', 'mike devries',
  'bob tyrrell', 'robert hernandez', 'carlos torres', 'megan massacre',
  'ryan ashley', 'virginia elwood', 'sasha unisex', 'dmitriy samohin',
  'jesse smith', 'jun cha', 'mr cartoon',

  // Fine artists commonly referenced in tattoos
  'alphonse mucha', 'hr giger', 'h.r. giger', 'gustav klimt',
  'salvador dali', 'mc escher', 'm.c. escher', 'banksy',
  'basquiat', 'frida kahlo', 'egon schiele', 'aubrey beardsley',
  'takashi murakami', 'james jean', 'alex grey',

  // Illustrators / concept artists
  'frank frazetta', 'boris vallejo', 'luis royo', 'brom',
  'simon bisley', 'bernie wrightson', 'moebius', 'mike mignola',
  'jim lee', 'todd mcfarlane', 'artgerm', 'wlop',
  'kim jung gi', 'katsuya terada', 'yoji shinkawa',
];

/**
 * When an artist is detected, replace with a description of their style.
 */
const ARTIST_STYLE_MAP: Record<string, string> = {
  'sailor jerry': 'traditional American tattoo style with bold outlines, limited color palette of red/green/yellow, and classic nautical motifs',
  'don ed hardy': 'bold Japanese-American fusion tattoo style with vibrant colors and iconic motifs',
  'ed hardy': 'bold Japanese-American fusion tattoo style with vibrant colors and iconic motifs',
  'horiyoshi iii': 'traditional Japanese irezumi style with full bodysuit composition and ukiyo-e influences',
  'alphonse mucha': 'Art Nouveau style with flowing organic lines, floral borders, and ethereal figures',
  'hr giger': 'biomechanical surrealist style with dark organic-mechanical fusion imagery',
  'h.r. giger': 'biomechanical surrealist style with dark organic-mechanical fusion imagery',
  'gustav klimt': 'decorative gold-leaf style with geometric patterns and mosaic textures',
  'mc escher': 'impossible geometry and tessellation patterns with mathematical precision',
  'm.c. escher': 'impossible geometry and tessellation patterns with mathematical precision',
  'mr cartoon': 'Chicano-style fine-line black and grey with lowrider culture motifs',
  'kim jung gi': 'hyper-detailed ink illustration with dynamic perspective and dense composition',
  'alex grey': 'visionary art style with translucent anatomical layers and psychedelic sacred geometry',
  'frank frazetta': 'dramatic heroic fantasy illustration with powerful figures and rich earth tones',
  'mike mignola': 'heavy shadows, bold black shapes, and gothic comic illustration style',
  'moebius': 'intricate line art with vast surreal landscapes and clean precise hatching',
  'salvador dali': 'surrealist style with melting forms, dreamlike imagery, and precise rendering',
  'frida kahlo': 'folk art symbolism with vivid colors, botanical elements, and expressive portraiture',
  'banksy': 'urban stencil art style with satirical imagery and high contrast black/white',
  'basquiat': 'neo-expressionist raw style with bold strokes, crowns, and layered text elements',
};

export function detectKnownArtists(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_ARTISTS.filter((artist) => lower.includes(artist));
}

export function replaceArtistReferences(text: string): string {
  let result = text;
  const detected = detectKnownArtists(text);

  for (const artist of detected) {
    const replacement =
      ARTIST_STYLE_MAP[artist] ||
      `style commonly associated with that artist's genre`;
    const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`in the style of ${escaped}`, 'gi'),
      new RegExp(`${escaped}[- ]?style`, 'gi'),
      new RegExp(`${escaped}[- ]?inspired`, 'gi'),
      new RegExp(`by ${escaped}`, 'gi'),
      new RegExp(`like ${escaped}`, 'gi'),
      new RegExp(escaped, 'gi'),
    ];
    for (const pattern of patterns) {
      result = result.replace(pattern, replacement);
    }
  }
  return result;
}

export const PROMPT_REFINEMENT_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'tattoo_prompt_refinement',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        refined_prompt: {
          type: 'string',
          description:
            'Enhanced visual description optimized for tattoo image generation. Rich in visual detail, composition, shading, and style-specific techniques.',
        },
        detected_artists: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Any artist names detected in the input, including indirect references.',
        },
        detected_copyrighted: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Any copyrighted characters, logos, or trademarked works detected.',
        },
        style_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tattoo styles identified in the description.',
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Warnings about artist references replaced, copyrighted content removed, or suggestions.',
        },
        safe_prompt: {
          type: 'string',
          description:
            'Final prompt with ALL artist names replaced by style descriptors and copyrighted content removed.',
        },
      },
      required: [
        'refined_prompt',
        'detected_artists',
        'detected_copyrighted',
        'style_tags',
        'warnings',
        'safe_prompt',
      ],
      additionalProperties: false,
    },
  },
};
