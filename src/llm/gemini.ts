import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { BaseLLMProvider, LLMMessage, LLCChatResponse } from './provider';

export class GeminiProvider implements BaseLLMProvider {
  private client: GoogleGenAI;
  private defaultModel = 'gemini-2.5-pro'; // or gemini-1.5-pro

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  async chat(messages: LLMMessage[], systemPrompt?: string): Promise<LLCChatResponse> {
    try {
      // For simple fallback, we combine history into a generative prompt
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role === 'tool' ? 'tool' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await this.client.models.generateContent({
        model: this.defaultModel,
        contents,
        config: {
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          temperature: 0.7,
        }
      });

      return {
        content: response.text,
      };
    } catch (error: any) {
      logger.error(`Gemini API Error: ${error.message}`);
      throw error;
    }
  }

  async generateJson(prompt: string, systemPrompt?: string): Promise<any> {
    try {
      const response = await this.client.models.generateContent({
        model: this.defaultModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          responseMimeType: 'application/json',
          temperature: 0.1,
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      logger.error(`Gemini JSON Error: ${error.message}`);
      throw error;
    }
  }
}
