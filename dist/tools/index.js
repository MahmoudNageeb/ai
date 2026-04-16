"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTools = exports.getTool = exports.registerTool = void 0;
exports.callTool = callTool;
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
const logger_1 = require("../utils/logger");
const toolRegistry = new Map();
const registerTool = (tool) => {
    toolRegistry.set(tool.name, tool);
};
exports.registerTool = registerTool;
const getTool = (name) => toolRegistry.get(name);
exports.getTool = getTool;
const getAllTools = () => Array.from(toolRegistry.values());
exports.getAllTools = getAllTools;
/**
 * Safe wrapper used by every executor path:
 *  - validates input is an object
 *  - enforces a tool-output truncation cap
 *  - retries on transient failure
 */
async function callTool(name, input) {
    const tool = (0, exports.getTool)(name);
    if (!tool)
        return { ok: false, output: null, error: `Unknown tool: ${name}` };
    const safeInput = input && typeof input === 'object' ? input : {};
    let lastErr = '';
    for (let attempt = 0; attempt <= jarvis_prompt_1.JARVIS_LIMITS.MAX_TOOL_RETRIES; attempt++) {
        try {
            const result = await tool.execute(safeInput);
            const truncated = truncate(result, jarvis_prompt_1.JARVIS_LIMITS.MAX_TOOL_OUTPUT_CHARS);
            return { ok: true, output: truncated };
        }
        catch (e) {
            lastErr = e?.message || String(e);
            logger_1.logger.warn(`[tool:${name}] attempt ${attempt + 1} failed: ${lastErr}`);
        }
    }
    return { ok: false, output: null, error: lastErr };
}
function truncate(value, maxChars) {
    try {
        if (typeof value === 'string') {
            return value.length > maxChars ? value.slice(0, maxChars) + '…[truncated]' : value;
        }
        const json = JSON.stringify(value);
        if (json.length <= maxChars)
            return value;
        return { _truncated: true, preview: json.slice(0, maxChars) + '…' };
    }
    catch {
        return value;
    }
}
// ----- Auto-load all built-in tools -----
require("./time_now");
require("./calculator");
require("./memory_tools");
require("./text_analyzer");
require("./translator");
require("./task_planner_tool");
require("./task_executor_tool");
require("./web_search");
