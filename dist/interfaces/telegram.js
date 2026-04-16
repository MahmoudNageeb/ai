"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramInterface = void 0;
const grammy_1 = require("grammy");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const auth_1 = require("../security/auth");
class TelegramInterface {
    agent;
    bot;
    constructor(agent) {
        this.agent = agent;
        this.bot = new grammy_1.Bot(env_1.env.TELEGRAM_BOT_TOKEN);
        this.setupRoutes();
    }
    setupRoutes() {
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            if (userId && !(0, auth_1.isUserAllowed)(userId)) {
                logger_1.logger.warn(`Unauthorized access attempt from User ID: ${userId}`);
                return; // drop silently
            }
            await next();
        });
        this.bot.command('start', async (ctx) => {
            logger_1.logger.info('Received /start command');
            await ctx.reply("Hello, I am JARVIS. How can I assist you today?");
        });
        this.bot.on('message:text', async (ctx) => {
            const text = (0, auth_1.sanitizeInput)(ctx.message.text);
            if (!text)
                return;
            const chatId = ctx.chat.id.toString();
            logger_1.logger.info(`Received text from ${chatId}: ${text.substring(0, 50)}...`);
            // typing indicator
            await ctx.api.sendChatAction(ctx.chat.id, 'typing');
            try {
                const response = await this.agent.processInput(chatId, text);
                await ctx.reply(response);
            }
            catch (error) {
                logger_1.logger.error(`Error processing message: ${error.message}`);
                await ctx.reply("I encountered an internal error processing your request.");
            }
        });
        // Error handler
        this.bot.catch((err) => {
            logger_1.logger.error(`Grammy Error:`, err);
        });
    }
    async start() {
        logger_1.logger.info('Starting Telegram Bot with Long Polling...');
        await this.bot.start({
            onStart: (botInfo) => {
                logger_1.logger.info(`Bot successfuly connected as @${botInfo.username}`);
            }
        });
    }
}
exports.TelegramInterface = TelegramInterface;
