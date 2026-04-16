"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memory = void 0;
const db_1 = require("./db");
/**
 * Memory layer.
 *
 * Three logical types per JARVIS spec:
 *   - short-term context  -> recent messages per chat
 *   - long-term facts     -> facts table (deduped, free text)
 *   - task history        -> task_memory table (status + plan)
 */
exports.memory = {
    // ---------- short-term ----------
    storeMessage: (chat_id, role, content) => {
        const stmt = db_1.db.prepare('INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)');
        stmt.run(chat_id, role, content);
    },
    getRecentMessages: (chat_id, limit = 20) => {
        const stmt = db_1.db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?');
        const rows = stmt.all(chat_id, limit);
        return rows.reverse();
    },
    buildShortTermContext: (chat_id, limit = 6) => {
        const rows = exports.memory.getRecentMessages(chat_id, limit);
        return rows
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n');
    },
    // ---------- long-term facts ----------
    storeFact: (fact) => {
        const trimmed = fact.trim();
        if (!trimmed)
            return;
        // Soft dedupe: skip if exact same fact already exists
        const exists = db_1.db.prepare('SELECT 1 FROM facts WHERE fact = ? LIMIT 1').get(trimmed);
        if (exists)
            return;
        db_1.db.prepare('INSERT INTO facts (fact) VALUES (?)').run(trimmed);
    },
    getFacts: (limit = 50) => {
        const stmt = db_1.db.prepare('SELECT fact FROM facts ORDER BY id DESC LIMIT ?');
        const rows = stmt.all(limit);
        return rows.map((r) => r.fact);
    },
    // ---------- task history ----------
    storeTask: (taskId, planJson) => {
        const stmt = db_1.db.prepare('INSERT INTO task_memory (task_id, status, plan_json) VALUES (?, ?, ?)');
        stmt.run(taskId, 'pending', planJson);
    },
    updateTaskStatus: (taskId, status) => {
        const stmt = db_1.db.prepare("UPDATE task_memory SET status = ?, updated_at = datetime('now') WHERE task_id = ?");
        stmt.run(status, taskId);
    },
    getRecentTasks: (limit = 10) => {
        return db_1.db
            .prepare('SELECT * FROM task_memory ORDER BY id DESC LIMIT ?')
            .all(limit);
    },
};
