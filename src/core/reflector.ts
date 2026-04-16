import { LLMManager } from '../llm/provider';
import { PlanStep } from './planner';
import { JARVIS_SYSTEM_PROMPT } from '../constants/jarvis_prompt';
import { logger } from '../utils/logger';

export interface Reflection {
  success: boolean;
  reason: string;
  needs_replan: boolean;
}

export class Reflector {
  constructor(private llm: LLMManager) {}

  async evaluate(step: PlanStep, output: string): Promise<Reflection> {
    const sys = `${JARVIS_SYSTEM_PROMPT}

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
    } catch (e: any) {
      logger.warn(`[Reflector] eval failed, assuming success. ${e.message}`);
      return { success: true, reason: 'reflector-fallback', needs_replan: false };
    }
  }
}
