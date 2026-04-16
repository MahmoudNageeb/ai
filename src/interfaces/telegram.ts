import { Bot } from 'grammy';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Agent } from '../core/agent';
import { isUserAllowed, sanitizeInput } from '../security/auth';

export class TelegramInterface {
  private bot: Bot;

  constructor(private agent: Agent) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    this.setupRoutes();
  }

  private setupRoutes() {
    this.bot.use(async (ctx, next) => {
      const userId = ctx.from?.id;
      if (userId && !isUserAllowed(userId)) {
        logger.warn(`Unauthorized access attempt from User ID: ${userId}`);
        return; // drop silently
      }
      await next();
    });

    this.bot.command('start', async (ctx) => {
      logger.info('Received /start command');
      await ctx.reply("Hello, I am JARVIS. How can I assist you today?");
    });

    this.bot.on('message:text', async (ctx) => {
      const text = sanitizeInput(ctx.message.text);
      if (!text) return;

      const chatId = ctx.chat.id.toString();
      logger.info(`Received text from ${chatId}: ${text.substring(0, 50)}...`);

      // typing indicator
      await ctx.api.sendChatAction(ctx.chat.id, 'typing');

      try {
        const response = await this.agent.processInput(chatId, text);
        await ctx.reply(response);
      } catch (error: any) {
        logger.error(`Error processing message: ${error.message}`);
        await ctx.reply("I encountered an internal error processing your request.");
      }
    });

    // Error handler
    this.bot.catch((err) => {
      logger.error(`Grammy Error:`, err);
    });
  }

  async start() {
    logger.info('Starting Telegram Bot with Long Polling...');
    await this.bot.start({
      onStart: (botInfo) => {
        logger.info(`Bot successfuly connected as @${botInfo.username}`);
      }
    });
  }
}
