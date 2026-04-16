import { db } from './db';

export interface ChatMessage {
  id?: number;
  chat_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at?: string;
}

export interface TaskRecord {
  id: number;
  task_id: string;
  status: string;
  plan_json: string;
  created_at: string;
  updated_at: string;
}

/**
 * Memory layer.
 *
 * Three logical types per JARVIS spec:
 *   - short-term context  -> recent messages per chat
 *   - long-term facts     -> facts table (deduped, free text)
 *   - task history        -> task_memory table (status + plan)
 */
export const memory = {
  // ---------- short-term ----------
  storeMessage: (chat_id: string, role: string, content: string) => {
    const stmt = db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)');
    stmt.run(chat_id, role, content);
  },

  getRecentMessages: (chat_id: string, limit: number = 20): ChatMessage[] => {
    const stmt = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(chat_id, limit) as ChatMessage[];
    return rows.reverse();
  },

  buildShortTermContext: (chat_id: string, limit: number = 6): string => {
    const rows = memory.getRecentMessages(chat_id, limit);
    return rows
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
  },

  // ---------- long-term facts ----------
  storeFact: (fact: string) => {
    const trimmed = fact.trim();
    if (!trimmed) return;
    // Soft dedupe: skip if exact same fact already exists
    const exists = db.prepare('SELECT 1 FROM facts WHERE fact = ? LIMIT 1').get(trimmed);
    if (exists) return;
    db.prepare('INSERT INTO facts (fact) VALUES (?)').run(trimmed);
  },

  getFacts: (limit: number = 50): string[] => {
    const stmt = db.prepare('SELECT fact FROM facts ORDER BY id DESC LIMIT ?');
    const rows = stmt.all(limit) as { fact: string }[];
    return rows.map((r) => r.fact);
  },

  // ---------- task history ----------
  storeTask: (taskId: string, planJson: string) => {
    const stmt = db.prepare('INSERT INTO task_memory (task_id, status, plan_json) VALUES (?, ?, ?)');
    stmt.run(taskId, 'pending', planJson);
  },

  updateTaskStatus: (
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ) => {
    const stmt = db.prepare(
      "UPDATE task_memory SET status = ?, updated_at = datetime('now') WHERE task_id = ?",
    );
    stmt.run(status, taskId);
  },

  getRecentTasks: (limit: number = 10): TaskRecord[] => {
    return db
      .prepare('SELECT * FROM task_memory ORDER BY id DESC LIMIT ?')
      .all(limit) as TaskRecord[];
  },
};
