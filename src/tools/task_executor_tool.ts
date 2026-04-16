import { registerTool, getTool } from './index';
import { getLLM } from '../llm/registry';
import { JARVIS_LIMITS } from '../constants/jarvis_prompt';
import { logger } from '../utils/logger';

/**
 * Executes a structured plan step-by-step. Each step may call another tool
 * by name (`tool_to_use` + `input`) or be free-form (delegated to the LLM).
 */
registerTool({
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
  execute: async (payload: { steps: Array<{ step?: number; action: string; tool_to_use?: string; input?: any }> }) => {
    if (!payload || !Array.isArray(payload.steps)) {
      throw new Error('task_executor requires "steps" array');
    }
    const steps = payload.steps.slice(0, JARVIS_LIMITS.MAX_EXECUTION_ITERATIONS);
    const results: Array<{ step: number; action: string; success: boolean; output: any }> = [];
    const llm = getLLM();

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const stepNo = s.step ?? i + 1;
      try {
        let output: any;
        if (s.tool_to_use && s.tool_to_use !== 'null') {
          const tool = getTool(s.tool_to_use);
          if (!tool) throw new Error(`Unknown tool: ${s.tool_to_use}`);
          output = await tool.execute(s.input || {});
        } else {
          const resp = await llm.chat(
            [{ role: 'user', content: `Execute this step: ${s.action}` }],
            'You are an execution sub-module. Produce only the requested output, no preface.',
          );
          output = resp.content?.trim() || '';
        }
        results.push({ step: stepNo, action: s.action, success: true, output });
      } catch (e: any) {
        logger.warn(`[task_executor] step ${stepNo} failed: ${e.message}`);
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
