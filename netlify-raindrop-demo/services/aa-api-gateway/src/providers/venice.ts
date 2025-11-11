/**
 * Venice LLM Client
 * Provides streaming and non-streaming chat completions
 */

interface VeniceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VeniceChatRequest {
  model?: string;
  messages: VeniceMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface VeniceChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class VeniceClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(options?: { apiKey?: string; baseUrl?: string; model?: string }) {
    this.apiKey = options?.apiKey || process.env.VENICE_API_KEY || '';
    this.baseUrl = options?.baseUrl || process.env.VENICE_API_BASE || 'https://api.venice.ai/api/v1';
    this.model = options?.model || 'llama-3.3-70b';

    if (!this.apiKey) {
      console.warn('⚠️  Venice API key not configured. Set VENICE_API_KEY environment variable.');
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(messages: VeniceMessage[], options?: {
    temperature?: number;
    max_tokens?: number;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Venice API key not configured');
    }

    const payload: VeniceChatRequest = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error (${response.status}): ${error}`);
    }

    const data = await response.json() as VeniceChatResponse;
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Streaming chat completion (returns ReadableStream)
   */
  async chatStream(messages: VeniceMessage[], options?: {
    temperature?: number;
    max_tokens?: number;
  }): Promise<ReadableStream> {
    if (!this.apiKey) {
      throw new Error('Venice API key not configured');
    }

    const payload: VeniceChatRequest = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice API error (${response.status}): ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body from Venice API');
    }

    return response.body;
  }
}

// Singleton instance
export const venice = new VeniceClient();
