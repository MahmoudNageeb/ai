import { env } from './config/env';
import { logger } from './utils/logger';
import { db } from './memory/db'; // Ensure db is initialized
import { GroqProvider } from './llm/groq';
import { GeminiProvider } from './llm/gemini';
import { LLMManager } from './llm/provider';
import { setLLM } from './llm/registry';
import { Agent } from './core/agent';
import { TelegramInterface } from './interfaces/telegram';

async function bootstrap() {
  logger.info('Initializing JARVIS System...');

  try {
    if (!db) throw new Error('Database failed to initialize.');

    // ---- LLM Manager (Groq primary, Gemini fallback if both keys exist) ----
    let manager: LLMManager;
    if (env.GROQ_API_KEY && env.GEMINI_API_KEY) {
      manager = new LLMManager(new GroqProvider(), new GeminiProvider());
    } else if (env.GROQ_API_KEY) {
      manager = new LLMManager(new GroqProvider());
    } else {
      manager = new LLMManager(new GeminiProvider());
    }
    setLLM(manager); // expose to tools
    logger.info('LLM Manager initialized.');

    // ---- Core Agent ----
    const agent = new Agent(manager);

    // ---- Telegram Interface ----
    const telegramApp = new TelegramInterface(agent);
    await telegramApp.start();
  } catch (error: any) {
    logger.error('Fatal Application Error: ', error.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});

bootstrap();
