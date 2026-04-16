"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reflector = void 0;
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
const logger_1 = require("../utils/logger");
class Reflector {
    llm;
    constructor(llm) {
        this.llm = llm;
    }
    async evaluate(step, output) {
        const sys = `${jarvis_prompt_1.JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the REFLECTION sub-module.
Decide whether the step's output truly satisfies the step's intent.
Respond ONLY as JSON:
{ "success": true|false, "reason": "short", "needs_replan": true|false }`;
        const prompt = `Step intent: ${step.action}
Tool used: ${step.tool_to_use || '(none)'}
Output:
${output}`;
        try {
            const r = await this.llm.generateJson(prompt, sys);
            return {
                success: r?.success === true,
                reason: typeof r?.reason === 'string' ? r.reason : '',
                needs_replan: r?.needs_replan === true,
            };
        }
        catch (e) {
            logger_1.logger.warn(`[Reflector] eval failed, assuming success. ${e.message}`);
            return { success: true, reason: 'reflector-fallback', needs_replan: false };
        }
    }
}
exports.Reflector = Reflector;
