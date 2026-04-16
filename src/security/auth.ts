import { env } from '../config/env';
import { logger } from '../utils/logger';

export const isUserAllowed = (userId: number | string): boolean => {
  // If list is empty, treat as open to everyone (as requested: "anyone is fine")
  if (env.ALLOWED_USERS_LIST.length === 0) {
    return true;
  }
  return env.ALLOWED_USERS_LIST.includes(userId.toString());
};

export const sanitizeInput = (input: string): string => {
  // Basic sanitization
  return input.trim();
};
