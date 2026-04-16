import { JARVIS_LIMITS } from '../constants/jarvis_prompt';
import { logger } from '../utils/logger';

export interface Tool {
  name: string;
  description: string;
  parameters: any; // JSON schema for parameters
  execute: (input: any) => Promise<any> | any;
}

const toolRegistry = new Map<string, Tool>();

export const registerTool = (tool: Tool) => {
  toolRegistry.set(tool.name, tool);
};

export const getTool = (name: string): Tool | undefined => toolRegistry.get(name);

export const getAllTools = (): Tool[] => Array.from(toolRegistry.values());

/**
 * Safe wrapper used by every executor path:
 *  - validates input is an object
 *  - enforces a tool-output truncation cap
 *  - retries on transient failure
 */
export async function callTool(name: string, input: any): Promise<{ ok: boolean; output: any; error?: string }> {
  const tool = getTool(name);
  if (!tool) return { ok: false, output: null, error: `Unknown tool: ${name}` };

  const safeInput = input && typeof input === 'object' ? input : {};
  let lastErr = '';
  for (let attempt = 0; attempt <= JARVIS_LIMITS.MAX_TOOL_RETRIES; attempt++) {
    try {
      const result = await tool.execute(safeInput);
      const truncated = truncate(result, JARVIS_LIMITS.MAX_TOOL_OUTPUT_CHARS);
      return { ok: true, output: truncated };
    } catch (e: any) {
      lastErr = e?.message || String(e);
      logger.warn(`[tool:${name}] attempt ${attempt + 1} failed: ${lastErr}`);
    }
  }
  return { ok: false, output: null, error: lastErr };
}

function truncate(value: any, maxChars: number): any {
  try {
    if (typeof value === 'string') {
      return value.length > maxChars ? value.slice(0, maxChars) + '…[truncated]' : value;
    }
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return value;
    return { _truncated: true, preview: json.slice(0, maxChars) + '…' };
  } catch {
    return value;
  }
}

// ----- Auto-load all built-in tools -----
import './time_now';
import './calculator';
import './memory_tools';
import './text_analyzer';
import './translator';
import './task_planner_tool';
import './task_executor_tool';
import './web_search';
