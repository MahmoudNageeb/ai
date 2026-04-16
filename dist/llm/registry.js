"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLM = exports.setLLM = void 0;
/**
 * Singleton holder so that tools (which run inside the agent loop) can
 * reach the active LLM manager WITHOUT importing the agent or causing
 * circular dependencies.
 */
let _llm = null;
const setLLM = (manager) => {
    _llm = manager;
};
exports.setLLM = setLLM;
const getLLM = () => {
    if (!_llm) {
        throw new Error('LLMManager not initialized. Call setLLM() during bootstrap.');
    }
    return _llm;
};
exports.getLLM = getLLM;
