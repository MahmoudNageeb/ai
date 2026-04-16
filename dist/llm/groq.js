"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class GroqProvider {
    client;
    defaultModel = 'llama-3.3-70b-versatile';
    constructor() {
        this.client = new groq_sdk_1.default({ apiKey: env_1.env.GROQ_API_KEY });
    }
    async chat(messages, systemPrompt) {
        try {
            const apiMessages = [];
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
        }
        catch (error) {
            logger_1.logger.error(`Groq API Error: ${error.message}`);
            throw error;
        }
    }
    // Used for planning to ensure structured JSON output
    async generateJson(prompt, systemPrompt) {
        try {
            const messages = [];
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
        }
        catch (error) {
            logger_1.logger.error(`Groq JSON Error: ${error.message}`);
            throw error;
        }
    }
}
exports.GroqProvider = GroqProvider;
