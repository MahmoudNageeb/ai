"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const registry_1 = require("../llm/registry");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
const logger_1 = require("../utils/logger");
/**
 * Executes a structured plan step-by-step. Each step may call another tool
 * by name (`tool_to_use` + `input`) or be free-form (delegated to the LLM).
 */
(0, index_1.registerTool)({
    name: 'task_executor',
    description: 'Executes a structured plan step-by-step. Input: { steps: [{ step, action, tool_to_use?, input? }] }',
    parameters: {
        type: 'object',
        required: ['steps'],
        properties: {
            steps: {
                type: 'array',
                description: 'Ordered list of steps to execute.',
                items: {
                    type: 'object',
                    properties: {
                        step: { type: 'number' },
                        action: { type: 'string' },
                        tool_to_use: { type: 'string' },
                        input: { type: 'object' },
                    },
                    required: ['action'],
                },
            },
        },
    },
    execute: async (payload) => {
        if (!payload || !Array.isArray(payload.steps)) {
            throw new Error('task_executor requires "steps" array');
        }
        const steps = payload.steps.slice(0, jarvis_prompt_1.JARVIS_LIMITS.MAX_EXECUTION_ITERATIONS);
        const results = [];
        const llm = (0, registry_1.getLLM)();
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            const stepNo = s.step ?? i + 1;
            try {
                let output;
                if (s.tool_to_use && s.tool_to_use !== 'null') {
                    const tool = (0, index_1.getTool)(s.tool_to_use);
                    if (!tool)
                        throw new Error(`Unknown tool: ${s.tool_to_use}`);
                    output = await tool.execute(s.input || {});
                }
                else {
                    const resp = await llm.chat([{ role: 'user', content: `Execute this step: ${s.action}` }], 'You are an execution sub-module. Produce only the requested output, no preface.');
                    output = resp.content?.trim() || '';
                }
                results.push({ step: stepNo, action: s.action, success: true, output });
            }
            catch (e) {
                logger_1.logger.warn(`[task_executor] step ${stepNo} failed: ${e.message}`);
                results.push({ step: stepNo, action: s.action, success: false, output: e.message });
                break;
            }
        }
        return {
            total: steps.length,
            completed: results.filter((r) => r.success).length,
            results,
        };
    },
});
