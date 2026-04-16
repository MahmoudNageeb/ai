"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMManager = void 0;
class LLMManager {
    primary;
    fallback;
    constructor(primary, fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }
    async chat(messages, systemPrompt) {
        try {
            return await this.primary.chat(messages, systemPrompt);
        }
        catch (error) {
            if (this.fallback) {
                console.warn('Primary LLM failed, switching to fallback...');
                return await this.fallback.chat(messages, systemPrompt);
            }
            throw error;
        }
    }
    async generateJson(prompt, systemPrompt) {
        try {
            return await this.primary.generateJson(prompt, systemPrompt);
        }
        catch (error) {
            if (this.fallback) {
                console.warn('Primary LLM JSON generation failed, switching to fallback...');
                return await this.fallback.generateJson(prompt, systemPrompt);
            }
            throw error;
        }
    }
}
exports.LLMManager = LLMManager;
