"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const registry_1 = require("../llm/registry");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
(0, index_1.registerTool)({
    name: 'text_analyzer',
    description: 'Analyzes text by summarizing, explaining, restructuring, or extracting key points using the LLM.',
    parameters: {
        type: 'object',
        required: ['text', 'mode'],
        properties: {
            text: { type: 'string', description: 'The text to analyze.' },
            mode: {
                type: 'string',
                enum: ['summarize', 'explain', 'restructure', 'key_points'],
                description: 'Type of analysis to perform.',
            },
            max_words: { type: 'number', description: 'Optional output length hint.' },
        },
    },
    execute: async (input) => {
        if (!input?.text || typeof input.text !== 'string') {
            throw new Error('text_analyzer requires "text"');
        }
        const text = input.text.slice(0, jarvis_prompt_1.JARVIS_LIMITS.MAX_INPUT_LENGTH);
        const instructions = {
            summarize: `Summarize the text concisely${input.max_words ? ` in about ${input.max_words} words` : ''}.`,
            explain: 'Explain the text clearly for a general audience.',
            restructure: 'Restructure the text into a clean, well-organized version with headings/bullets where helpful.',
            key_points: 'Extract the most important key points as a short bulleted list.',
        };
        const instruction = instructions[input.mode] || instructions.summarize;
        const llm = (0, registry_1.getLLM)();
        const resp = await llm.chat([{ role: 'user', content: `${instruction}\n\nTEXT:\n${text}` }], 'You are a precise text analysis sub-module of JARVIS. Reply with the analysis only — no preamble.');
        return { mode: input.mode, output: (resp.content || '').trim() };
    },
});
