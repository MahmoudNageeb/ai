"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.isUserAllowed = void 0;
const env_1 = require("../config/env");
const isUserAllowed = (userId) => {
    // If list is empty, treat as open to everyone (as requested: "anyone is fine")
    if (env_1.env.ALLOWED_USERS_LIST.length === 0) {
        return true;
    }
    return env_1.env.ALLOWED_USERS_LIST.includes(userId.toString());
};
exports.isUserAllowed = isUserAllowed;
const sanitizeInput = (input) => {
    // Basic sanitization
    return input.trim();
};
exports.sanitizeInput = sanitizeInput;
