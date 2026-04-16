import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram Bot Token is required'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DB_PATH: z.string().default('./memory.db'),
  ALLOWED_USERS: z.string().optional(),
}).refine(data => data.GROQ_API_KEY || data.GEMINI_API_KEY, {
  message: 'At least one of GROQ_API_KEY or GEMINI_API_KEY must be provided',
  path: ['GROQ_API_KEY', 'GEMINI_API_KEY']
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

export const env = {
  ..._env.data,
  ALLOWED_USERS_LIST: _env.data.ALLOWED_USERS ? _env.data.ALLOWED_USERS.split(',').map(u => u.trim()) : [],
};
