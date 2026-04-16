import { LLMManager } from '../llm/provider';
import { logger } from '../utils/logger';
import { JARVIS_SYSTEM_PROMPT, JARVIS_LIMITS } from '../constants/jarvis_prompt';

export interface PlanStep {
  step: number;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tool_to_use?: string;
  input?: Record<string, any>;
}

export class Planner {
  constructor(private llm: LLMManager) {}

  async generatePlan(
    goal: string,
    availableTools: { name: string; description: string }[],
    context: string = '',
  ): Promise<PlanStep[]> {
    const systemPrompt = `${JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the PLANNING ENGINE sub-module.

Break the user's refined goal into a structured JSON plan.
- Maximum ${JARVIS_LIMITS.MAX_PLAN_STEPS} steps. Use FEWER when possible.
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
        logger.warn('[Planner] empty plan, using fallback');
        return this.fallbackPlan(goal);
      }

      return raw
        .slice(0, JARVIS_LIMITS.MAX_PLAN_STEPS)
        .map((s: any, i: number): PlanStep => ({
          step: i + 1,
          action: String(s.action || s.description || 'continue'),
          status: 'pending',
          tool_to_use:
            s.tool_to_use && s.tool_to_use !== 'null' && String(s.tool_to_use).length > 0
              ? String(s.tool_to_use)
              : undefined,
          input: s.input && typeof s.input === 'object' ? s.input : undefined,
        }));
    } catch (e: any) {
      logger.error(`[Planner] failed: ${e.message}. Using fallback.`);
      return this.fallbackPlan(goal);
    }
  }

  private fallbackPlan(goal: string): PlanStep[] {
    return [
      { step: 1, action: goal, status: 'pending' },
      { step: 2, action: 'Formulate final response', status: 'pending' },
    ];
  }
}
