import { registerTool } from './index';
import { memory } from '../memory/memory';

registerTool({
  name: 'memory_store',
  description: 'Save important information to long-term memory (user preferences, facts, key results). Use sparingly — only meaningful info.',
  parameters: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', description: 'The fact or information to remember.' },
      category: {
        type: 'string',
        enum: ['preference', 'fact', 'task_result', 'other'],
        description: 'Optional classification.',
      },
    },
  },
  execute: (input: { content: string; category?: string }) => {
    if (!input || typeof input.content !== 'string' || input.content.trim().length === 0) {
      throw new Error('memory_store requires non-empty "content"');
    }
    const tagged = input.category ? `[${input.category}] ${input.content.trim()}` : input.content.trim();
    memory.storeFact(tagged);
    return { stored: true, content: tagged };
  },
});

registerTool({
  name: 'memory_recall',
  description: 'Retrieve previously stored facts from long-term memory. Optional keyword filter.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Optional keyword to filter facts.' },
      limit: { type: 'number', description: 'Max number of facts to return (default 10).' },
    },
  },
  execute: (input: { query?: string; limit?: number } = {}) => {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    let facts = memory.getFacts();
    if (input.query && input.query.trim().length > 0) {
      const q = input.query.toLowerCase();
      facts = facts.filter((f) => f.toLowerCase().includes(q));
    }
    return { count: Math.min(facts.length, limit), facts: facts.slice(0, limit) };
  },
});
