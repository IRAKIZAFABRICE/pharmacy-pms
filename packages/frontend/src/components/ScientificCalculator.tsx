// packages/frontend/src/components/ScientificCalculator.tsx
import { useState, useEffect, useCallback } from 'react';

type AngleMode = 'deg' | 'rad';

interface Token {
  type: 'num' | 'const' | 'func' | 'op' | 'uminus';
  value: string;
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, (x: number, mode: AngleMode) => number> = {
  sin: (x, m) => m === 'deg' ? Math.sin((x * Math.PI) / 180) : Math.sin(x),
  cos: (x, m) => m === 'deg' ? Math.cos((x * Math.PI) / 180) : Math.cos(x),
  tan: (x, m) => m === 'deg' ? Math.tan((x * Math.PI) / 180) : Math.tan(x),
  asin: (x, m) => { const r = Math.asin(x); return m === 'deg' ? (r * 180) / Math.PI : r; },
  acos: (x, m) => { const r = Math.acos(x); return m === 'deg' ? (r * 180) / Math.PI : r; },
  atan: (x, m) => { const r = Math.atan(x); return m === 'deg' ? (r * 180) / Math.PI : r; },
  log: (x) => Math.log10(x),
  ln: (x) => Math.log(x),
  sqrt: (x) => Math.sqrt(x),
  exp: (x) => Math.exp(x),
  abs: (x) => Math.abs(x),
};

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial needs a non-negative integer');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let prev: Token | null = null;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) { num += input[i]; i++; }
      const t: Token = { type: 'num', value: num };
      tokens.push(t); prev = t; continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let name = '';
      while (i < input.length && /[a-zA-Z]/.test(input[i])) { name += input[i]; i++; }
      const lower = name.toLowerCase();
      if (lower in CONSTANTS) { const t: Token = { type: 'const', value: lower }; tokens.push(t); prev = t; }
      else { const t: Token = { type: 'func', value: lower }; tokens.push(t); prev = t; }
      continue;
    }
    if (c === '(' || c === ')' || c === ',' || c === '+' || c === '*' || c === '/' || c === '^' || c === '!') {
      const t: Token = { type: 'op', value: c };
      tokens.push(t); prev = t; i++; continue;
    }
    if (c === '-') {
      const isUnary = prev === null || (prev.type === 'op' && prev.value !== ')') || (prev.type === 'uminus');
      if (isUnary) { const t: Token = { type: 'uminus', value: 'u-' }; tokens.push(t); prev = t; }
      else { const t: Token = { type: 'op', value: '-' }; tokens.push(t); prev = t; }
      i++; continue;
    }
    throw new Error(`Invalid character: ${c}`);
  }
  return tokens;
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3, '^': 4, '!': 5 };
const RIGHT_ASSOC = new Set(['u-', '^']);

function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type === 'num' || t.type === 'const') output.push(t);
    else if (t.type === 'func') stack.push(t);
    else if (t.type === 'uminus') stack.push(t);
    else if (t.type === 'op' && (t.value === '(' || t.value === ',')) stack.push(t);
    else if (t.type === 'op' && t.value === ')') {
      while (stack.length && !(stack[stack.length - 1].type === 'op' && stack[stack.length - 1].value === '(')) {
        output.push(stack.pop()!);
      }
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop(); // remove '('
      if (stack.length && stack[stack.length - 1].type === 'func') output.push(stack.pop()!);
    } else if (t.type === 'op') {
      while (
        stack.length &&
        !(stack[stack.length - 1].type === 'op' && stack[stack.length - 1].value === '(') &&
        (stack[stack.length - 1].type === 'func' ||
          (stack[stack.length - 1].value in PREC &&
            (PREC[stack[stack.length - 1].value] > PREC[t.value] ||
              (PREC[stack[stack.length - 1].value] === PREC[t.value] && !RIGHT_ASSOC.has(t.value)))))
      ) {
        output.push(stack.pop()!);
      }
      stack.push(t);
    }
  }
  while (stack.length) {
    const top = stack.pop()!;
    if (top.type === 'op' && (top.value === '(' || top.value === ')')) throw new Error('Mismatched parentheses');
    output.push(top);
  }
  return output;
}

function evaluate(tokens: Token[], mode: AngleMode): number {
  const rpn = toRPN(tokens);
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.type === 'num') stack.push(parseFloat(t.value));
    else if (t.type === 'const') stack.push(CONSTANTS[t.value]);
    else if (t.type === 'uminus') {
      if (stack.length < 1) throw new Error('Invalid expression');
      stack.push(-stack.pop()!);
    } else if (t.type === 'func') {
      if (stack.length < 1) throw new Error(`Missing argument for ${t.value}`);
      const x = stack.pop()!;
      const fn = FUNCTIONS[t.value];
      if (!fn) throw new Error(`Unknown function: ${t.value}`);
      stack.push(fn(x, mode));
    } else if (t.type === 'op' && t.value === '!') {
      if (stack.length < 1) throw new Error('Invalid factorial');
      stack.push(factorial(stack.pop()!));
    } else if (t.type === 'op') {
      if (stack.length < 2) throw new Error('Invalid expression');
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (t.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': if (b === 0) throw new Error('Division by zero'); stack.push(a / b); break;
        case '^': stack.push(Math.pow(a, b)); break;
        default: throw new Error(`Unknown operator: ${t.value}`);
      }
    }
  }
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function safeEval(expr: string, mode: AngleMode): string | null {
  if (!expr.trim()) return '0';
  try {
    const result = evaluate(tokenize(expr), mode);
    if (!Number.isFinite(result)) return null;
    if (Number.isInteger(result)) return result.toString();
    return parseFloat(result.toPrecision(12)).toString();
  } catch {
    return null;
  }
}

const KEYS: { label: string; value?: string; action?: string; className?: string }[] = [
  { label: 'sin', value: 'sin(' }, { label: 'cos', value: 'cos(' }, { label: 'tan', value: 'tan(' }, { label: '(' , value: '(' },
  { label: 'asin', value: 'asin(' }, { label: 'acos', value: 'acos(' }, { label: 'atan', value: 'atan(' }, { label: ')', value: ')' },
  { label: 'log', value: 'log(' }, { label: 'ln', value: 'ln(' }, { label: '√', value: 'sqrt(' }, { label: 'x²', value: '^2' },
  { label: 'xʸ', value: '^' }, { label: 'π', value: 'pi' }, { label: 'e', value: 'e' }, { label: '!' , value: '!' },
  { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' }, { label: '÷', value: '/' },
  { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' }, { label: '×', value: '*' },
  { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '−', value: '-' },
  { label: '0', value: '0' }, { label: '.', value: '.' }, { label: 'C', action: 'clear' }, { label: '+', value: '+' },
];

export default function ScientificCalculator() {
  const [input, setInput] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('rad');
  const [justEvaluated, setJustEvaluated] = useState(false);

  const result = safeEval(input, angleMode);

  const append = useCallback((val: string) => {
    setInput((prev) => (justEvaluated && /[0-9.(]/.test(val) ? val : prev + val));
    setJustEvaluated(false);
  }, [justEvaluated]);

  const clear = useCallback(() => { setInput(''); setJustEvaluated(false); }, []);
  const backspace = useCallback(() => { setInput((prev) => prev.slice(0, -1)); setJustEvaluated(false); }, []);

  const equals = useCallback(() => {
    const r = safeEval(input, angleMode);
    if (r !== null) { setInput(r); setJustEvaluated(true); }
  }, [input, angleMode]);

  const handleKey = useCallback((val: string, action?: string) => {
    if (action === 'clear') clear();
    else if (val) append(val);
  }, [append, clear]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') append(e.key);
      else if (e.key === '.') append('.');
      else if (e.key === '(' || e.key === ')') append(e.key);
      else if (e.key === '+' || e.key === '*' || e.key === '/') append(e.key);
      else if (e.key === '-') append('-');
      else if (e.key === '^') append('^');
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); }
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') clear();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [append, equals, backspace, clear]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">🔬 Scientific Calculator</h2>
        <div className="flex gap-1">
          {(['deg', 'rad'] as AngleMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setAngleMode(m)}
              className={`px-2 py-1 text-xs rounded ${angleMode === m ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
            >
              {m === 'deg' ? 'DEG' : 'RAD'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 p-3 bg-gray-50 rounded-lg text-right">
        <div className="text-sm text-gray-500 h-5 truncate">{input || '0'}</div>
        <div className="text-2xl font-bold text-gray-900 h-8 truncate">{result === null ? '—' : result}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <button
            key={k.label}
            onClick={() => handleKey(k.value ?? '', k.action)}
            className={`py-3 rounded-lg font-medium transition-colors ${
              k.action === 'clear'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : k.value && /[0-9.]/.test(k.value)
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
            }`}
          >
            {k.label}
          </button>
        ))}
        <button onClick={backspace} className="py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200">⌫</button>
        <button onClick={equals} className="py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 col-span-3">=</button>
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">Keyboard supported · DEG/RAD toggle for trig</p>
    </div>
  );
}
