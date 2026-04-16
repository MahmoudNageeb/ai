"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeEvaluate = safeEvaluate;
const index_1 = require("./index");
const FUNCTIONS = {
    abs: Math.abs,
    sqrt: Math.sqrt,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    log: Math.log,
    ln: Math.log,
    log10: Math.log10,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
};
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, 'u-': 4 };
const RIGHT_ASSOC = new Set(['^', 'u-']);
function tokenize(expr) {
    const tokens = [];
    let i = 0;
    const s = expr.replace(/\s+/g, '');
    while (i < s.length) {
        const c = s[i];
        if ((c >= '0' && c <= '9') || c === '.') {
            let j = i;
            while (j < s.length && (s[j] === '.' || (s[j] >= '0' && s[j] <= '9')))
                j++;
            const num = parseFloat(s.slice(i, j));
            if (Number.isNaN(num))
                throw new Error(`Invalid number near "${s.slice(i, j)}"`);
            tokens.push({ type: 'num', value: num });
            i = j;
        }
        else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
            let j = i;
            while (j < s.length && /[a-zA-Z0-9_]/.test(s[j]))
                j++;
            const name = s.slice(i, j).toLowerCase();
            if (name === 'pi')
                tokens.push({ type: 'num', value: Math.PI });
            else if (name === 'e')
                tokens.push({ type: 'num', value: Math.E });
            else if (FUNCTIONS[name])
                tokens.push({ type: 'fn', value: name });
            else
                throw new Error(`Unknown identifier: ${name}`);
            i = j;
        }
        else if (c === '(') {
            tokens.push({ type: 'lparen' });
            i++;
        }
        else if (c === ')') {
            tokens.push({ type: 'rparen' });
            i++;
        }
        else if (c === ',') {
            tokens.push({ type: 'comma' });
            i++;
        }
        else if ('+-*/%^'.includes(c)) {
            tokens.push({ type: 'op', value: c });
            i++;
        }
        else
            throw new Error(`Illegal character "${c}"`);
    }
    return tokens;
}
function toRpn(tokens) {
    const out = [];
    const stack = [];
    // Track argument counts for each function call currently on the stack
    const argCount = [];
    // Track whether the current open paren belongs to a function
    const parenIsFn = [];
    let prev = null;
    for (const tok of tokens) {
        if (tok.type === 'num') {
            out.push(tok);
            // If we are inside a function call and have not counted an arg yet, mark first arg
            if (argCount.length && argCount[argCount.length - 1] === 0) {
                argCount[argCount.length - 1] = 1;
            }
        }
        else if (tok.type === 'fn')
            stack.push(tok);
        else if (tok.type === 'comma') {
            while (stack.length && stack[stack.length - 1].type !== 'lparen')
                out.push(stack.pop());
            if (argCount.length)
                argCount[argCount.length - 1] += 1;
        }
        else if (tok.type === 'op') {
            // Detect unary minus
            const isUnary = tok.value === '-' &&
                (prev === null || prev.type === 'op' || prev.type === 'lparen' || prev.type === 'comma');
            const op = isUnary ? 'u-' : tok.value;
            while (stack.length) {
                const top = stack[stack.length - 1];
                if (top.type === 'op' || top.type === 'fn') {
                    const topOp = top.type === 'fn' ? null : top.value;
                    if (top.type === 'fn' ||
                        (PRECEDENCE[topOp] > PRECEDENCE[op]) ||
                        (PRECEDENCE[topOp] === PRECEDENCE[op] && !RIGHT_ASSOC.has(op))) {
                        out.push(stack.pop());
                        continue;
                    }
                }
                break;
            }
            stack.push({ type: 'op', value: op });
        }
        else if (tok.type === 'lparen') {
            stack.push(tok);
            // If previous token was a function name, this paren is a function call
            const isFnCall = prev !== null && prev.type === 'fn';
            parenIsFn.push(isFnCall);
            if (isFnCall)
                argCount.push(0);
        }
        else if (tok.type === 'rparen') {
            while (stack.length && stack[stack.length - 1].type !== 'lparen')
                out.push(stack.pop());
            if (!stack.length)
                throw new Error('Mismatched parentheses');
            stack.pop();
            const wasFn = parenIsFn.pop() === true;
            if (wasFn && stack.length && stack[stack.length - 1].type === 'fn') {
                const fnTok = stack.pop();
                fnTok.arity = argCount.pop();
                out.push(fnTok);
            }
        }
        prev = tok;
    }
    while (stack.length) {
        const t = stack.pop();
        if (t.type === 'lparen' || t.type === 'rparen')
            throw new Error('Mismatched parentheses');
        out.push(t);
    }
    return out;
}
function evalRpn(rpn) {
    const stack = [];
    for (const tok of rpn) {
        if (tok.type === 'num')
            stack.push(tok.value);
        else if (tok.type === 'op') {
            if (tok.value === 'u-') {
                const a = stack.pop();
                if (a === undefined)
                    throw new Error('Bad expression');
                stack.push(-a);
            }
            else {
                const b = stack.pop();
                const a = stack.pop();
                if (a === undefined || b === undefined)
                    throw new Error('Bad expression');
                switch (tok.value) {
                    case '+':
                        stack.push(a + b);
                        break;
                    case '-':
                        stack.push(a - b);
                        break;
                    case '*':
                        stack.push(a * b);
                        break;
                    case '/':
                        if (b === 0)
                            throw new Error('Division by zero');
                        stack.push(a / b);
                        break;
                    case '%':
                        stack.push(a % b);
                        break;
                    case '^':
                        stack.push(Math.pow(a, b));
                        break;
                    default: throw new Error(`Unknown operator ${tok.value}`);
                }
            }
        }
        else if (tok.type === 'fn') {
            const fn = FUNCTIONS[tok.value];
            const arity = tok.arity ?? 1;
            if (stack.length < arity)
                throw new Error(`Function ${tok.value} missing args`);
            const args = [];
            for (let k = 0; k < arity; k++)
                args.unshift(stack.pop());
            stack.push(fn(...args));
        }
    }
    if (stack.length !== 1)
        throw new Error('Invalid expression');
    return stack[0];
}
function safeEvaluate(expression) {
    if (typeof expression !== 'string' || expression.length === 0) {
        throw new Error('Expression must be a non-empty string');
    }
    if (expression.length > 500)
        throw new Error('Expression too long');
    return evalRpn(toRpn(tokenize(expression)));
}
(0, index_1.registerTool)({
    name: 'calculator',
    description: 'Safely evaluates a mathematical expression. Supports + - * / % ^, parentheses, and functions: abs, sqrt, pow, min, max, round, floor, ceil, log, ln, log10, sin, cos, tan, plus constants pi and e.',
    parameters: {
        type: 'object',
        required: ['expression'],
        properties: {
            expression: { type: 'string', description: 'The math expression, e.g. "2*(3+4)^2"' },
        },
    },
    execute: (input) => {
        const result = safeEvaluate(input.expression);
        return { expression: input.expression, result };
    },
});
