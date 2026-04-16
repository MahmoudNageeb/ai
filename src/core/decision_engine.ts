import { LLMManager } from '../llm/provider';
import { logger } from '../utils/logger';
import { JARVIS_SYSTEM_PROMPT } from '../constants/jarvis_prompt';

export type ExecutionMode = 'SIMPLE' | 'TOOL' | 'AGENT';

export interface Decision {
  mode: ExecutionMode;
  reason: string;
  suggested_tool?: string;
  refined_objective: string;
}

/**
 * The Decision Engine is the brain that classifies every incoming request
 * into one of the 3 execution modes BEFORE any planning happens.
 *
 * It also extracts the true intent ("understand the goal, not just the words").
 */
export class DecisionEngine {
  constructor(private llm: LLMManager) {}

  async decide(
    userInput: string,
    availableTools: { name: string; description: string }[],
    shortTermContext: string,
  ): Promise<Decision> {
    const systemPrompt = `${JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the DECISION ENGINE sub-module.
Classify the user's request into exactly one of:
  - SIMPLE  : a direct answer is enough (greetings, definitions, opinions, chat).
  - TOOL    : one single tool call is enough (e.g. "what time is it" -> time_now).
  - AGENT   : the goal needs multi-step planning, multiple tools, or reflection.

You will also extract the REAL underlying objective.

Available tools:
${JSON.stringify(availableTools, null, 0)}

Recent context:
${shortTermContext || '(no prior context)'}

Respond STRICTLY as JSON in this exact shape:
{
  "mode": "SIMPLE" | "TOOL" | "AGENT",
  "reason": "short justification",
  "suggested_tool": "tool_name_or_null",
  "refined_objective": "clear restatement of the user's true goal"
}`;

    try {
      const result = await this.llm.generateJson(userInput, systemPrompt);

      const mode = this.normalizeMode(result?.mode);
      return {
        mode,
        reason: typeof result?.reason === 'string' ? result.reason : 'auto',
        suggested_tool:
          typeof result?.suggested_tool === 'string' &&
          result.suggested_tool !== 'null' &&
          result.suggested_tool.length > 0
            ? result.suggested_tool
            : undefined,
        refined_objective:
          typeof result?.refined_objective === 'string' && result.refined_objective.length > 0
            ? result.refined_objective
            : userInput,
      };
    } catch (e: any) {
      logger.warn(`[DecisionEngine] Falling back to heuristic. Reason: ${e.message}`);
      return this.heuristicFallback(userInput, availableTools);
    }
  }

  private normalizeMode(raw: any): ExecutionMode {
    const v = String(raw || '').toUpperCase().trim();
    if (v === 'SIMPLE' || v === 'TOOL' || v === 'AGENT') return v;
    return 'SIMPLE';
  }

  /** Last-resort classifier when the LLM JSON parse fails. */
  private heuristicFallback(
    userInput: string,
    availableTools: { name: string; description: string }[],
  ): Decision {
    const text = userInput.toLowerCase();

    // Direct tool keyword matches
    const toolHints: Record<string, string[]> = {
      time_now: ['time', 'date', 'الوقت', 'التاريخ', 'الساعة'],
      calculator: ['calculate', 'compute', '+', '-', '*', '/', '=', 'احسب'],
      translator: ['translate', 'ترجم'],
      web_search: ['search', 'google', 'lookup', 'ابحث'],
      memory_recall: ['remember', 'recall', 'تذكر'],
      memory_store: ['save this', 'remember that', 'احفظ'],
    };

    for (const [toolName, hints] of Object.entries(toolHints)) {
      if (availableTools.some((t) => t.name === toolName) && hints.some((h) => text.includes(h))) {
        return {
          mode: 'TOOL',
          reason: `heuristic match on tool ${toolName}`,
          suggested_tool: toolName,
          refined_objective: userInput,
        };
      }
    }

    // Multi-step indicators
    if (
      text.includes(' then ') ||
      text.includes(' and then ') ||
      text.includes('step by step') ||
      text.split(/[.?!]/).filter((s) => s.trim().length > 8).length > 2
    ) {
      return {
        mode: 'AGENT',
        reason: 'heuristic multi-step indicators',
        refined_objective: userInput,
      };
    }

    return {
      mode: 'SIMPLE',
      reason: 'heuristic default',
      refined_objective: userInput,
    };
  }
}
