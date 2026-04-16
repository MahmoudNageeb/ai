"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Planner = void 0;
const logger_1 = require("../utils/logger");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
class Planner {
    llm;
    constructor(llm) {
        this.llm = llm;
    }
    async generatePlan(goal, availableTools, context = '') {
        const systemPrompt = `${jarvis_prompt_1.JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the PLANNING ENGINE sub-module.

Break the user's refined goal into a structured JSON plan.
- Maximum ${jarvis_prompt_1.JARVIS_LIMITS.MAX_PLAN_STEPS} steps. Use FEWER when possible.
- Reorder steps for efficiency (Plan Optimization).
- For each step that needs a tool, fill "tool_to_use" with one of the available tool names
  and "input" with the JSON arguments object the tool requires.
- The final step should always be a "Formulate final response" step (no tool).

Available tools:
${JSON.stringify(availableTools, null, 0)}

Recent conversation context:
${context || '(none)'}

Respond ONLY as JSON in this exact shape (no markdown, no commentary):
{
  "steps": [
    { "step": 1, "action": "string", "tool_to_use": "tool_name_or_null", "input": { } }
  ]
}`;
        try {
            const result = await this.llm.generateJson(goal, systemPrompt);
            const raw = Array.isArray(result)
                ? result
                : Array.isArray(result?.steps)
                    ? result.steps
                    : [];
            if (raw.length === 0) {
                logger_1.logger.warn('[Planner] empty plan, using fallback');
                return this.fallbackPlan(goal);
            }
            return raw
                .slice(0, jarvis_prompt_1.JARVIS_LIMITS.MAX_PLAN_STEPS)
                .map((s, i) => ({
                step: i + 1,
                action: String(s.action || s.description || 'continue'),
                status: 'pending',
                tool_to_use: s.tool_to_use && s.tool_to_use !== 'null' && String(s.tool_to_use).length > 0
                    ? String(s.tool_to_use)
                    : undefined,
                input: s.input && typeof s.input === 'object' ? s.input : undefined,
            }));
        }
        catch (e) {
            logger_1.logger.error(`[Planner] failed: ${e.message}. Using fallback.`);
            return this.fallbackPlan(goal);
        }
    }
    fallbackPlan(goal) {
        return [
            { step: 1, action: goal, status: 'pending' },
            { step: 2, action: 'Formulate final response', status: 'pending' },
        ];
    }
}
exports.Planner = Planner;
