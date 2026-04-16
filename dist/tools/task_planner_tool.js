"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const registry_1 = require("../llm/registry");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
/**
 * Tool wrapper around the planner so the LLM itself can choose to invoke
 * "make a plan" as a step inside AGENT mode.
 */
(0, index_1.registerTool)({
    name: 'task_planner',
    description: 'Converts a high-level goal into a structured step-by-step plan (JSON array of steps).',
    parameters: {
        type: 'object',
        required: ['goal'],
        properties: {
            goal: { type: 'string', description: 'The high-level objective to plan for.' },
        },
    },
    execute: async (input) => {
        if (!input?.goal)
            throw new Error('task_planner requires "goal"');
        const tools = (0, index_1.getAllTools)()
            .filter((t) => t.name !== 'task_planner' && t.name !== 'task_executor')
            .map((t) => ({ name: t.name, description: t.description }));
        const llm = (0, registry_1.getLLM)();
        const sys = `You are the planning sub-module of JARVIS.
Available tools: ${JSON.stringify(tools)}
Respond ONLY with JSON: { "steps": [ { "step": 1, "action": "...", "tool_to_use": "tool_or_null" } ] }
Maximum ${jarvis_prompt_1.JARVIS_LIMITS.MAX_PLAN_STEPS} steps. Be concise.`;
        const result = await llm.generateJson(input.goal, sys);
        const raw = Array.isArray(result) ? result : Array.isArray(result?.steps) ? result.steps : [];
        const steps = raw.slice(0, jarvis_prompt_1.JARVIS_LIMITS.MAX_PLAN_STEPS).map((s, i) => ({
            step: i + 1,
            action: String(s.action || s.description || 'continue'),
            tool_to_use: s.tool_to_use && s.tool_to_use !== 'null' ? String(s.tool_to_use) : undefined,
        }));
        return { goal: input.goal, steps };
    },
});
