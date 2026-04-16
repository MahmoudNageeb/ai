"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const db_1 = require("./memory/db"); // Ensure db is initialized
const groq_1 = require("./llm/groq");
const gemini_1 = require("./llm/gemini");
const provider_1 = require("./llm/provider");
const registry_1 = require("./llm/registry");
const agent_1 = require("./core/agent");
const telegram_1 = require("./interfaces/telegram");
async function bootstrap() {
    logger_1.logger.info('Initializing JARVIS System...');
    try {
        if (!db_1.db)
            throw new Error('Database failed to initialize.');
        // ---- LLM Manager (Groq primary, Gemini fallback if both keys exist) ----
        let manager;
        if (env_1.env.GROQ_API_KEY && env_1.env.GEMINI_API_KEY) {
            manager = new provider_1.LLMManager(new groq_1.GroqProvider(), new gemini_1.GeminiProvider());
        }
        else if (env_1.env.GROQ_API_KEY) {
            manager = new provider_1.LLMManager(new groq_1.GroqProvider());
        }
        else {
            manager = new provider_1.LLMManager(new gemini_1.GeminiProvider());
        }
        (0, registry_1.setLLM)(manager); // expose to tools
        logger_1.logger.info('LLM Manager initialized.');
        // ---- Core Agent ----
        const agent = new agent_1.Agent(manager);
        // ---- Telegram Interface ----
        const telegramApp = new telegram_1.TelegramInterface(agent);
        await telegramApp.start();
    }
    catch (error) {
        logger_1.logger.error('Fatal Application Error: ', error.message);
        process.exit(1);
    }
}
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error(`Uncaught Exception: ${err.message}`);
});
bootstrap();
