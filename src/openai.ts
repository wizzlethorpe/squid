const BASE_URL = 'https://api.openai.com/v1';

export class OpenAIClient {
  constructor(private apiKey: string) {}

  async chatCompletionStructured<T>(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    response_format: {
      type: 'json_schema';
      json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
      };
    };
  }): Promise<T> {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    return JSON.parse(content) as T;
  }

  async generateImage(params: {
    prompt: string;
    size?: string;
    quality?: string;
  }): Promise<string> {
    const response = await fetch(`${BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: params.prompt,
        size: params.size || '1024x1024',
        quality: params.quality || 'high',
        background: 'transparent',
        n: 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: response.statusText },
      }));
      throw new Error(
        `Image generation error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    if (!data.data?.[0]?.b64_json) {
      throw new Error('No image data returned');
    }
    return data.data[0].b64_json;
  }
}

export function base64ToBlob(base64: string, mimeType = 'image/png'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
