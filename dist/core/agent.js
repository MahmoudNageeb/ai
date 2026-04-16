"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const memory_1 = require("../memory/memory");
const planner_1 = require("./planner");
const executor_1 = require("./executor");
const reflector_1 = require("./reflector");
const decision_engine_1 = require("./decision_engine");
const tools_1 = require("../tools");
const logger_1 = require("../utils/logger");
const jarvis_prompt_1 = require("../constants/jarvis_prompt");
/**
 * The Agent orchestrates the full JARVIS autonomous loop:
 *
 *   1. Intent Extraction      (DecisionEngine)
 *   2. Mode Routing            (SIMPLE / TOOL / AGENT)
 *   3. Task Breakdown          (Planner)
 *   4. Plan Optimization       (Planner returns optimized plan)
 *   5. Tool Selection          (Planner / Executor)
 *   6. Execution Loop          (Executor + retries)
 *   7. Reflection              (Reflector — replan up to N times)
 *   8. Completion Check
 *   9. Final Response          (clean output, internal reasoning hidden)
 */
class Agent {
    llm;
    planner;
    executor;
    reflector;
    decision;
    constructor(llm) {
        this.llm = llm;
        this.planner = new planner_1.Planner(llm);
        this.executor = new executor_1.Executor(llm);
        this.reflector = new reflector_1.Reflector(llm);
        this.decision = new decision_engine_1.DecisionEngine(llm);
    }
    async processInput(chatId, userInputRaw) {
        const userInput = (userInputRaw || '').slice(0, jarvis_prompt_1.JARVIS_LIMITS.MAX_INPUT_LENGTH).trim();
        if (!userInput)
            return '...';
        logger_1.logger.info(`[Agent] chat=${chatId} input="${userInput.slice(0, 60)}"`);
        memory_1.memory.storeMessage(chatId, 'user', userInput);
        const tools = (0, tools_1.getAllTools)().map((t) => ({ name: t.name, description: t.description }));
        const shortCtx = memory_1.memory.buildShortTermContext(chatId, 6);
        // ---------- 1. DECISION ----------
        const decision = await this.decision.decide(userInput, tools, shortCtx);
        logger_1.logger.info(`[Agent] mode=${decision.mode} reason="${decision.reason}"`);
        let finalOutput;
        try {
            switch (decision.mode) {
                case 'SIMPLE':
                    finalOutput = await this.runSimple(userInput, shortCtx);
                    break;
                case 'TOOL':
                    finalOutput = await this.runTool(userInput, decision.suggested_tool, shortCtx);
                    break;
                case 'AGENT':
                default:
                    finalOutput = await this.runAgent(chatId, decision.refined_objective, shortCtx);
                    break;
            }
        }
        catch (e) {
            logger_1.logger.error(`[Agent] mode=${decision.mode} crashed: ${e.message}`);
            finalOutput = 'I ran into an internal error completing your request.';
        }
        memory_1.memory.storeMessage(chatId, 'assistant', finalOutput);
        return finalOutput;
    }
    // ============ SIMPLE MODE ============
    async runSimple(userInput, shortCtx) {
        const sys = `${jarvis_prompt_1.JARVIS_SYSTEM_PROMPT}

Mode: SIMPLE.
Reply to the user directly. Be concise. No tool calls. No planning.
Recent context:
${shortCtx || '(none)'}`;
        const resp = await this.llm.chat([{ role: 'user', content: userInput }], sys);
        return (resp.content || '').trim() || '…';
    }
    // ============ TOOL MODE ============
    async runTool(userInput, suggestedTool, shortCtx) {
        if (!suggestedTool)
            return this.runSimple(userInput, shortCtx);
        const tool = (0, tools_1.getAllTools)().find((t) => t.name === suggestedTool);
        if (!tool)
            return this.runSimple(userInput, shortCtx);
        // Derive input
        const argSys = `Generate ONLY a JSON arguments object for tool "${tool.name}".
Tool description: ${tool.description}
Schema: ${JSON.stringify(tool.parameters)}
User request: ${userInput}`;
        let input = {};
        try {
            input = await this.llm.generateJson(userInput, argSys);
            if (!input || typeof input !== 'object')
                input = {};
        }
        catch {
            input = {};
        }
        const { ok, output, error } = await (0, tools_1.callTool)(suggestedTool, input);
        return this.formulateFinal(userInput, [
            { action: `Use ${suggestedTool}`, ok, output: ok ? this.toString(output) : `ERROR: ${error}`, tool_used: suggestedTool },
        ]);
    }
    // ============ AGENT MODE ============
    async runAgent(chatId, objective, shortCtx) {
        const tools = (0, tools_1.getAllTools)().map((t) => ({ name: t.name, description: t.description }));
        let plan = await this.planner.generatePlan(objective, tools, shortCtx);
        memory_1.memory.storeTask(`${chatId}:${Date.now()}`, JSON.stringify(plan));
        logger_1.logger.info(`[Agent] plan generated: ${plan.length} steps`);
        const executions = [];
        let runningCtx = `User goal: ${objective}\nContext:\n${shortCtx}`;
        let replanCount = 0;
        let iter = 0;
        for (let i = 0; i < plan.length; i++) {
            if (iter++ >= jarvis_prompt_1.JARVIS_LIMITS.MAX_EXECUTION_ITERATIONS) {
                logger_1.logger.warn('[Agent] max iterations reached, stopping loop');
                break;
            }
            const step = plan[i];
            // Skip the explicit "formulate final response" step — handled below.
            if (/formulate.*final.*response/i.test(step.action) && !step.tool_to_use)
                continue;
            const exec = await this.executor.executeStep(step, runningCtx);
            executions.push(exec);
            runningCtx += `\n[Step ${exec.step}] ${exec.action}\nOutput: ${this.shorten(exec.output)}`;
            // Reflection
            const refl = await this.reflector.evaluate(step, exec.output);
            logger_1.logger.info(`[Agent] step ${step.step} success=${refl.success} replan=${refl.needs_replan}`);
            if (!refl.success && refl.needs_replan && replanCount < jarvis_prompt_1.JARVIS_LIMITS.MAX_REFLECTION_LOOPS) {
                replanCount++;
                logger_1.logger.info(`[Agent] replanning (#${replanCount})`);
                const remaining = `Original goal: ${objective}\nWhat we already did:\n${executions
                    .map((e) => `- ${e.action} → ${this.shorten(e.output)}`)
                    .join('\n')}\nReason for replanning: ${refl.reason}`;
                const newTail = await this.planner.generatePlan(remaining, tools, runningCtx);
                // Replace remaining plan with newly generated one
                plan = [...plan.slice(0, i + 1), ...newTail];
            }
            else if (!refl.success && !refl.needs_replan) {
                // Tolerate single-step failure but stop the loop early
                break;
            }
        }
        return this.formulateFinal(objective, executions);
    }
    // ============ FINAL RESPONSE FORMULATION ============
    async formulateFinal(userInput, executions) {
        const summary = executions
            .map((e) => `• ${e.action}${e.tool_used ? ` [${e.tool_used}]` : ''} → ${this.shorten(e.output)}`)
            .join('\n');
        const sys = `${jarvis_prompt_1.JARVIS_SYSTEM_PROMPT}

You are now acting strictly as the FINAL RESPONSE FORMULATOR.
Output ONLY the user-facing reply. No reasoning, no plan disclosure, no mention of tools or steps.
If executions failed, apologize gracefully and offer a useful alternative.`;
        const prompt = `User asked: ${userInput}

Internal execution summary (HIDE this from the user):
${summary || '(no executions)'}

Now write the final clean answer.`;
        try {
            const resp = await this.llm.chat([{ role: 'user', content: prompt }], sys);
            const out = (resp.content || '').trim();
            return out || 'Done.';
        }
        catch (e) {
            logger_1.logger.error(`[Agent] final formulation failed: ${e.message}`);
            // Last-resort: stitch raw outputs
            const last = executions[executions.length - 1];
            return last?.output ? this.shorten(last.output) : 'Done.';
        }
    }
    // ---- helpers ----
    toString(v) {
        if (typeof v === 'string')
            return v;
        try {
            return JSON.stringify(v);
        }
        catch {
            return String(v);
        }
    }
    shorten(v, max = 600) {
        const s = this.toString(v);
        return s.length > max ? s.slice(0, max) + '…' : s;
    }
}
exports.Agent = Agent;
