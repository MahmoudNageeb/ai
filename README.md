# JARVIS — Autonomous AI Execution System

> **Not a chatbot.** JARVIS is an intelligent **goal-execution engine** that converts user intentions into completed real-world actions through tools, planning, reasoning, and reflection.

---

## ✨ What Changed in v2.0

This version implements the full JARVIS specification:

- **Decision Engine** — every request is classified into one of 3 modes:
  - `SIMPLE` → direct answer.
  - `TOOL` → one tool call.
  - `AGENT` → multi-step planning + execution + reflection loop.
- **Full autonomous loop** — Intent Extraction → Task Breakdown → Plan Optimization → Tool Selection → Execution → Reflection → Completion Check → Final Response.
- **9 core tools** — `time_now`, `memory_store`, `memory_recall`, `calculator`, `text_analyzer`, `translator`, `task_planner`, `task_executor`, `web_search`.
- **3-layer memory** — short-term context, long-term facts, task history.
- **Safety controls** — max plan steps, max iterations, max retries, output truncation, no `eval`/`Function`, validated tool inputs.
- **Output discipline** — internal reasoning is hidden; the user only sees the final clean answer.

---

## 🧱 Architecture

```
src/
├── constants/
│   └── jarvis_prompt.ts      # Master system prompt + safety limits
├── core/
│   ├── decision_engine.ts    # SIMPLE / TOOL / AGENT classifier
│   ├── planner.ts            # Goal → optimized step list
│   ├── executor.ts           # Single-step executor (tool or LLM)
│   ├── reflector.ts          # Success / replan judge
│   └── agent.ts              # Orchestrates the full loop
├── llm/
│   ├── provider.ts           # LLMManager (primary + fallback)
│   ├── registry.ts           # Singleton accessor for tools
│   ├── groq.ts               # Groq Llama 3.3 70B
│   └── gemini.ts             # Gemini 2.5 Pro fallback
├── memory/
│   ├── db.ts                 # SQLite (WAL) bootstrap
│   └── memory.ts             # short-term / long-term / task history
├── tools/
│   ├── index.ts              # Registry + safe callTool() wrapper
│   ├── time_now.ts
│   ├── calculator.ts         # Pure shunting-yard (NO eval)
│   ├── memory_tools.ts       # memory_store / memory_recall
│   ├── text_analyzer.ts      # summarize / explain / restructure / key_points
│   ├── translator.ts
│   ├── task_planner_tool.ts
│   ├── task_executor_tool.ts
│   └── web_search.ts         # Tavily / Serper / DuckDuckGo
├── interfaces/
│   └── telegram.ts           # grammY-based bot
├── security/
│   └── auth.ts               # User allowlist + input sanitization
├── config/env.ts             # Zod-validated environment
└── index.ts                  # Bootstrap
```

---

## 🚀 Setup

```bash
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN and at least one of GROQ_API_KEY / GEMINI_API_KEY

npm install
npm run dev          # development (ts-node + nodemon)

# or for production:
npm run build
npm start
```

Requires Node.js ≥ 18.

---

## 🔑 Environment Variables

| Var                  | Required | Purpose                                            |
| -------------------- | -------- | -------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | ✅       | BotFather token                                    |
| `GROQ_API_KEY`       | ⚪*      | Primary LLM (Llama 3.3 70B)                        |
| `GEMINI_API_KEY`     | ⚪*      | Fallback / alternative LLM                         |
| `DB_PATH`            | ❌       | SQLite path (default `./memory.db`)                |
| `ALLOWED_USERS`      | ❌       | Comma-separated Telegram user IDs allowlist        |
| `TAVILY_API_KEY`     | ❌       | Best `web_search` backend                          |
| `SERPER_API_KEY`     | ❌       | Alternative `web_search` backend                   |

\* At least one of the two LLM keys must be set.

---

## 🧰 Adding New Tools

```ts
// src/tools/my_tool.ts
import { registerTool } from './index';

registerTool({
  name: 'my_tool',
  description: 'Does something useful.',
  parameters: {
    type: 'object',
    required: ['x'],
    properties: { x: { type: 'string' } },
  },
  execute: async (input: { x: string }) => {
    return { received: input.x };
  },
});
```

Then import it once in `src/tools/index.ts`. The Decision Engine and Planner will automatically discover it.

---

## 🛡️ Safety Limits (configurable in `src/constants/jarvis_prompt.ts`)

| Limit                       | Default |
| --------------------------- | ------- |
| `MAX_PLAN_STEPS`            | 8       |
| `MAX_EXECUTION_ITERATIONS`  | 10      |
| `MAX_TOOL_RETRIES`          | 2       |
| `MAX_REFLECTION_LOOPS`      | 3       |
| `MAX_INPUT_LENGTH`          | 8000    |
| `MAX_TOOL_OUTPUT_CHARS`     | 4000    |

---

## 📜 License

MIT.
