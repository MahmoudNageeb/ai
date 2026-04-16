"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executor = void 0;
const tools_1 = require("../tools");
const logger_1 = require("../utils/logger");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
class Executor {
    llm;
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * Executes a single plan step.
     *  - If the step declares tool_to_use → calls that tool with validated input.
     *  - Else → asks the LLM to produce the step output (with full JARVIS persona).
     */
    async executeStep(step, runningContext) {
        // ---- Tool path ----
        if (step.tool_to_use) {
            const input = await this.resolveToolInput(step, runningContext);
            const { ok, output, error } = await (0, tools_1.callTool)(step.tool_to_use, input);
            return {
                step: step.step,
                action: step.action,
                tool_used: step.tool_to_use,
                output: ok ? this.stringify(output) : `ERROR: ${error}`,
                raw_output: output,
                ok,
                error,
            };
        }
        // ---- LLM path ----
        const sys = `${jarvis_prompt_1.JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the EXECUTION ENGINE sub-module.
Produce the concrete output for THIS step only. No planning, no preamble, no meta-commentary.

Running context so far:
${runningContext || '(empty)'}`;
        try {
            const resp = await this.llm.chat([{ role: 'user', content: `Step to execute: ${step.action}` }], sys);
            return {
                step: step.step,
                action: step.action,
                output: (resp.content || '').trim() || '(no output)',
                ok: true,
            };
        }
        catch (e) {
            logger_1.logger.error(`[Executor] step ${step.step} failed: ${e.message}`);
            return { step: step.step, action: step.action, output: e.message, ok: false, error: e.message };
        }
    }
    /**
     * If the planner provided "input", trust it (after light validation).
     * Otherwise, ask the LLM to derive a JSON input object from the step text.
     */
    async resolveToolInput(step, ctx) {
        if (step.input && typeof step.input === 'object')
            return step.input;
        const tool = (0, tools_1.getAllTools)().find((t) => t.name === step.tool_to_use);
        if (!tool)
            return {};
        const sys = `You generate JSON arguments for tool "${tool.name}".
Tool description: ${tool.description}
JSON schema: ${JSON.stringify(tool.parameters)}
Context: ${ctx}
Respond ONLY with the JSON object that matches the schema.`;
        try {
            const result = await this.llm.generateJson(step.action, sys);
            return result && typeof result === 'object' ? result : {};
        }
        catch {
            return {};
        }
    }
    stringify(value) {
        if (typeof value === 'string')
            return value;
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
}
exports.Executor = Executor;
