"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// Initialize DB
const db = new better_sqlite3_1.default(env_1.env.DB_PATH);
exports.db = db;
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
    logger_1.logger.info('Database initialized successfully with WAL mode.');
};
setupDb();
