"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
(0, index_1.registerTool)({
    name: 'time_now',
    description: 'Returns the current date and time. Optional format: iso | local | unix.',
    parameters: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['iso', 'local', 'unix'],
                description: 'Output format (default: local)',
            },
            timezone: {
                type: 'string',
                description: 'Optional IANA timezone, e.g. "Africa/Cairo"',
            },
        },
    },
    execute: (input = {}) => {
        const now = new Date();
        if (input.format === 'iso')
            return { time: now.toISOString() };
        if (input.format === 'unix')
            return { time: Math.floor(now.getTime() / 1000) };
        try {
            return {
                time: now.toLocaleString('en-GB', {
                    timeZone: input.timezone || undefined,
                    hour12: false,
                }),
                timezone: input.timezone || 'system',
            };
        }
        catch {
            return { time: now.toLocaleString() };
        }
    },
});
