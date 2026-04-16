import Database from 'better-sqlite3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Initialize DB
const db = new Database(env.DB_PATH);
db.pragma('journal_mode = WAL');

// Setup tables
const setupDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,          -- 'user' | 'assistant' | 'system' | 'tool'
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      status TEXT NOT NULL,        -- 'pending' | 'in_progress' | 'completed' | 'failed'
      plan_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fact TEXT NOT NULL,
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  logger.info('Database initialized successfully with WAL mode.');
};

setupDb();

export { db };
