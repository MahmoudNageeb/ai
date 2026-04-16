"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const genai_1 = require("@google/genai");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class GeminiProvider {
    client;
    defaultModel = 'gemini-2.5-pro'; // or gemini-1.5-pro
    constructor() {
        this.client = new genai_1.GoogleGenAI({ apiKey: env_1.env.GEMINI_API_KEY });
    }
    async chat(messages, systemPrompt) {
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
        }
        catch (error) {
            logger_1.logger.error(`Gemini API Error: ${error.message}`);
            throw error;
        }
    }
    async generateJson(prompt, systemPrompt) {
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
        }
        catch (error) {
            logger_1.logger.error(`Gemini JSON Error: ${error.message}`);
            throw error;
        }
    }
}
exports.GeminiProvider = GeminiProvider;
