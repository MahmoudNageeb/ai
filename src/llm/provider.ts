export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface LLCChatResponse {
  content: string | undefined | null;
  tool_calls?: any[]; // Keep flexible based on provider tools format
}

export interface BaseLLMProvider {
  chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLCChatResponse>;
  generateJson(prompt: string, systemPrompt?: string): Promise<any>;
}

export class LLMManager {
  private primary: BaseLLMProvider;
  private fallback?: BaseLLMProvider;

  constructor(primary: BaseLLMProvider, fallback?: BaseLLMProvider) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLCChatResponse> {
    try {
      return await this.primary.chat(messages, systemPrompt);
    } catch (error) {
      if (this.fallback) {
        console.warn('Primary LLM failed, switching to fallback...');
        return await this.fallback.chat(messages, systemPrompt);
      }
      throw error;
    }
  }

  async generateJson(prompt: string, systemPrompt?: string): Promise<any> {
    try {
      return await this.primary.generateJson(prompt, systemPrompt);
    } catch (error) {
      if (this.fallback) {
        console.warn('Primary LLM JSON generation failed, switching to fallback...');
        return await this.fallback.generateJson(prompt, systemPrompt);
      }
      throw error;
    }
  }
}
