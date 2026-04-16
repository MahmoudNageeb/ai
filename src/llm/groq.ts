import Groq from 'groq-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { BaseLLMProvider, LLMMessage, LLCChatResponse } from './provider';

export class GroqProvider implements BaseLLMProvider {
  private client: Groq;
  private defaultModel = 'llama-3.3-70b-versatile';

  constructor() {
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLCChatResponse> {
    try {
      const apiMessages: any[] = [];
      if (systemPrompt) {
        apiMessages.push({ role: 'system', content: systemPrompt });
      }
      
      for (const msg of messages) {
        apiMessages.push({
          role: msg.role === 'tool' ? 'tool' : msg.role,
          content: msg.content,
        });
      }

      const response = await this.client.chat.completions.create({
        messages: apiMessages,
        model: this.defaultModel,
        temperature: 0.7,
      });

      const message = response.choices[0]?.message;
      return {
        content: message?.content,
        tool_calls: message?.tool_calls,
      };
    } catch (error: any) {
      logger.error(`Groq API Error: ${error.message}`);
      throw error;
    }
  }

  // Used for planning to ensure structured JSON output
  async generateJson(prompt: string, systemPrompt?: string): Promise<any> {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await this.client.chat.completions.create({
        messages,
        model: this.defaultModel,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error: any) {
      logger.error(`Groq JSON Error: ${error.message}`);
      throw error;
    }
  }
}
