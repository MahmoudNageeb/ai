import { registerTool } from './index';
import { getLLM } from '../llm/registry';
import { JARVIS_LIMITS } from '../constants/jarvis_prompt';

registerTool({
  name: 'translator',
  description: 'Translates text between languages. Provide target_language (e.g. "English", "Arabic", "French"). Optional source_language; if omitted, auto-detect.',
  parameters: {
    type: 'object',
    required: ['text', 'target_language'],
    properties: {
      text: { type: 'string', description: 'Text to translate.' },
      target_language: { type: 'string', description: 'Target language name or ISO code.' },
      source_language: { type: 'string', description: 'Optional source language; auto-detected if omitted.' },
    },
  },
  execute: async (input: { text: string; target_language: string; source_language?: string }) => {
    if (!input?.text || !input?.target_language) {
      throw new Error('translator requires "text" and "target_language"');
    }
    const text = input.text.slice(0, JARVIS_LIMITS.MAX_INPUT_LENGTH);
    const src = input.source_language ? `from ${input.source_language}` : '(auto-detect source language)';
    const llm = getLLM();
    const resp = await llm.chat(
      [{ role: 'user', content: `Translate the following text ${src} to ${input.target_language}. Output the translation ONLY, no quotes or commentary.\n\n${text}` }],
      'You are a professional translation sub-module of JARVIS. Respond with the translation only.',
    );
    return {
      source_language: input.source_language || 'auto',
      target_language: input.target_language,
      translation: (resp.content || '').trim(),
    };
  },
});
