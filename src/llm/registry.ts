import { LLMManager } from './provider';

/**
 * Singleton holder so that tools (which run inside the agent loop) can
 * reach the active LLM manager WITHOUT importing the agent or causing
 * circular dependencies.
 */
let _llm: LLMManager | null = null;

export const setLLM = (manager: LLMManager) => {
  _llm = manager;
};

export const getLLM = (): LLMManager => {
  if (!_llm) {
    throw new Error('LLMManager not initialized. Call setLLM() during bootstrap.');
  }
  return _llm;
};
