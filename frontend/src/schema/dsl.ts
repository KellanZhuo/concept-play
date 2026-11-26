/**
 * ConceptPlay Interactive Explainer DSL (Domain-Specific Language)
 *
 * Instead of letting LLMs emit brittle, unconstrained HTML/JS that often breaks or renders blank,
 * ConceptPlay compiles unstructured technical articles into a strongly-typed, deterministically
 * validated Interactive Document AST with 5 rich interactive primitives + a safe math evaluator.
 */

export type SimulatorParam = {
  id: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description?: string;
};

export type SimulatorOutput = {
  id: string;
  label: string;
  unit?: string;
  formula: string; // Safe arithmetic expression referencing param IDs, e.g. "round((1 - (202 * r) / 4810) * 100, 1)"
  precision?: number;
  highlight?: boolean;
  interpretation?: string;
};

export type SimulatorChartSeries = {
  label: string;
  formula: string; // Evaluated across sweep points of sweepParamId
  color?: string;
};

export type SimulatorBlockData = {
  id: string;
  type: 'simulator';
  title: string;
  subtitle: string;
  intuition: string;
  params: SimulatorParam[];
  outputs: SimulatorOutput[];
  sweepParamId: string;
  chartType: 'bar' | 'line';
  chartYLabel: string;
  chartSeries: SimulatorChartSeries[];
  takeaway: string;
};

export type FlowStep = {
  id: string;
  badge: string;
  title: string;
  summary: string;
  detail: string;
  inputExample?: string;
  outputExample?: string;
  metricTag?: string;
};

export type StepFlowBlockData = {
  id: string;
  type: 'step_flow';
  title: string;
  subtitle: string;
  steps: FlowStep[];
};

export type CompareDimension = {
  key: string;
  label: string;
};

export type CompareOption = {
  id: string;
  name: string;
  tagline: string;
  recommended?: boolean;
  scores: Record<string, number>; // 1..5 score per dimension key
  notes: Record<string, string>;  // concise evidence per dimension key
};

export type CompareMatrixBlockData = {
  id: string;
  type: 'compare_matrix';
  title: string;
  subtitle: string;
  dimensions: CompareDimension[];
  options: CompareOption[];
};

export type DeepDiveCard = {
  id: string;
  tag: string;
  title: string;
  oneLiner: string;
  deepExplanation: string;
  formulaOrCode?: string;
  sourceQuote?: string;
};

export type DeepDiveCardsBlockData = {
  id: string;
  type: 'deep_dive_cards';
  title: string;
  subtitle: string;
  cards: DeepDiveCard[];
};

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

export type QuizBlockData = {
  id: string;
  type: 'quiz';
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
};

export type InteractiveBlock =
  | SimulatorBlockData
  | StepFlowBlockData
  | CompareMatrixBlockData
  | DeepDiveCardsBlockData
  | QuizBlockData;

export type CompilerTraceStage = {
  stage: 'planner' | 'compiler' | 'validator' | 'autofix';
  status: 'passed' | 'repaired' | 'skipped';
  durationMs: number;
  detail: string;
  issuesCaught?: string[];
};

export type InteractiveExplainerDoc = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  readingMinutes: number;
  tldr: string[];
  sourceSummary: string;
  blocks: InteractiveBlock[];
  compilerTrace: {
    model: string;
    totalDurationMs: number;
    autoFixRounds: number;
    validationPassed: boolean;
    stages: CompilerTraceStage[];
  };
};

// ============================================================================
// Safe Deterministic Arithmetic Formula Evaluator (No eval / Function!)
// Supports: +, -, *, /, %, ^, parentheses, numbers, identifiers, and safe math
// functions: min, max, abs, round, sqrt, log, exp, clamp, pow, ifelse
// ============================================================================

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

const ALLOWED_FUNCS: Record<string, (...args: number[]) => number> = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(Math.max(0, x)),
  log: (x) => Math.log(Math.max(1e-9, x)),
  exp: (x) => Math.exp(Math.min(20, x)),
  pow: (a, b) => Math.pow(a, b),
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
  round: (x, digits = 0) => {
    const f = Math.pow(10, digits);
    return Math.round(x * f) / f;
  },
  ifelse: (cond, tVal, fVal) => (cond > 0 ? tVal : fVal),
};

function tokenizeFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i++];
      }
      const val = Number(numStr);
      if (Number.isNaN(val)) {
        throw new Error(`Invalid number literal "${numStr}"`);
      }
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i++];
      }
      tokens.push({ type: 'id', value: id });
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    if ('+-*/%^><='.includes(ch)) {
      if ((ch === '>' || ch === '<' || ch === '=') && expr[i + 1] === '=') {
        tokens.push({ type: 'op', value: ch + '=' });
        i += 2;
      } else {
        tokens.push({ type: 'op', value: ch });
        i++;
      }
      continue;
    }
    throw new Error(`Disallowed character "${ch}" in formula "${expr}"`);
  }
  return tokens;
}

export function evaluateSafeFormula(expr: string, vars: Record<string, number>): number {
  const tokens = tokenizeFormula(expr);
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseComparison(): number {
    let left = parseAddSub();
    while (peek()?.type === 'op' && ['>', '<', '>=', '<=', '=='].includes((peek() as { value: string }).value)) {
      const op = (consume() as { value: string }).value;
      const right = parseAddSub();
      if (op === '>') left = left > right ? 1 : 0;
      else if (op === '<') left = left < right ? 1 : 0;
      else if (op === '>=') left = left >= right ? 1 : 0;
      else if (op === '<=') left = left <= right ? 1 : 0;
      else if (op === '==') left = Math.abs(left - right) < 1e-9 ? 1 : 0;
    }
    return left;
  }

  function parseAddSub(): number {
    let left = parseMulDiv();
    while (peek()?.type === 'op' && ((peek() as { value: string }).value === '+' || (peek() as { value: string }).value === '-')) {
      const op = (consume() as { value: string }).value;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMulDiv(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && ['*', '/', '%'].includes((peek() as { value: string }).value)) {
      const op = (consume() as { value: string }).value;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left = Math.abs(right) < 1e-12 ? 0 : left / right;
      else left = Math.abs(right) < 1e-12 ? 0 : left % right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { value: string }).value === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op' && ((peek() as { value: string }).value === '-' || (peek() as { value: string }).value === '+')) {
      const op = (consume() as { value: string }).value;
      const v = parseUnary();
      return op === '-' ? -v : v;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error(`Unexpected end of formula "${expr}"`);

    if (tok.type === 'num') {
      consume();
      return tok.value;
    }

    if (tok.type === 'paren' && tok.value === '(') {
      consume();
      const val = parseComparison();
      const close = consume();
      if (!close || close.type !== 'paren' || close.value !== ')') {
        throw new Error(`Unclosed parenthesis in formula "${expr}"`);
      }
      return val;
    }

    if (tok.type === 'id') {
      consume();
      if (peek()?.type === 'paren' && (peek() as { value: string }).value === '(') {
        consume(); // '('
        const fn = ALLOWED_FUNCS[tok.value];
        if (!fn) {
          throw new Error(`Unknown function "${tok.value}" in formula "${expr}"`);
        }
        const args: number[] = [];
        if (!(peek()?.type === 'paren' && (peek() as { value: string }).value === ')')) {
          args.push(parseComparison());
          while (peek()?.type === 'comma') {
            consume();
            args.push(parseComparison());
          }
        }
        const close = consume();
        if (!close || close.type !== 'paren' || close.value !== ')') {
          throw new Error(`Missing closing ")" for function "${tok.value}"`);
        }
        return fn(...args);
      }

      if (tok.value === 'PI') return Math.PI;
      if (tok.value === 'E') return Math.E;
      if (!(tok.value in vars)) {
        throw new Error(`Undefined parameter "${tok.value}" referenced in formula "${expr}"`);
      }
      return vars[tok.value];
    }

    throw new Error(`Unexpected token in formula "${expr}"`);
  }

  const result = parseComparison();
  if (pos < tokens.length) {
    throw new Error(`Unexpected trailing tokens in formula "${expr}"`);
  }
  if (!Number.isFinite(result)) {
    throw new Error(`Formula "${expr}" evaluated to non-finite value`);
  }
  return result;
}

// ============================================================================
// Deterministic Semantic Validator (Drives the Compiler Auto-Fix Loop!)
// ============================================================================

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateExplainerDoc(doc: unknown): ValidationResult {
  const errors: string[] = [];
  if (!doc || typeof doc !== 'object') {
    return { valid: false, errors: ['Document root must be a JSON object.'] };
  }

  const d = doc as Partial<InteractiveExplainerDoc>;
  if (!d.title?.trim()) errors.push('Missing non-empty "title".');
  if (!d.subtitle?.trim()) errors.push('Missing non-empty "subtitle".');
  if (!Array.isArray(d.tldr) || d.tldr.length < 2) {
    errors.push('"tldr" must contain at least 2 key takeaway bullets.');
  }
  if (!Array.isArray(d.blocks) || d.blocks.length < 2) {
    errors.push('"blocks" must contain at least 2 interactive blocks.');
    return { valid: false, errors };
  }

  let hasInteractiveWidget = false;

  d.blocks.forEach((block, idx) => {
    const prefix = `blocks[${idx}] (${(block as { type?: string })?.type || 'unknown'})`;
    if (!block || typeof block !== 'object') {
      errors.push(`${prefix}: block must be an object.`);
      return;
    }

    switch (block.type) {
      case 'simulator': {
        hasInteractiveWidget = true;
        if (!Array.isArray(block.params) || block.params.length === 0) {
          errors.push(`${prefix}: simulator requires at least 1 parameter slider.`);
          break;
        }
        const env: Record<string, number> = {};
        for (const p of block.params) {
          if (!p.id || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p.id)) {
            errors.push(`${prefix}: invalid param id "${p.id}". Must be a valid identifier.`);
          }
          if (typeof p.min !== 'number' || typeof p.max !== 'number' || p.min >= p.max) {
            errors.push(`${prefix}: param "${p.id}" must have numeric min < max.`);
          }
          if (typeof p.step !== 'number' || p.step <= 0) {
            errors.push(`${prefix}: param "${p.id}" must have step > 0.`);
          }
          env[p.id] = typeof p.defaultValue === 'number' ? p.defaultValue : p.min;
        }
        if (!block.sweepParamId || !(block.sweepParamId in env)) {
          errors.push(
            `${prefix}: sweepParamId "${block.sweepParamId}" must match one of params (${Object.keys(env).join(', ')}).`,
          );
        }
        if (!Array.isArray(block.outputs) || block.outputs.length === 0) {
          errors.push(`${prefix}: simulator requires at least 1 computed output.`);
        } else {
          for (const out of block.outputs) {
            try {
              evaluateSafeFormula(out.formula, env);
            } catch (e) {
              errors.push(`${prefix} output "${out.id}": ${(e as Error).message}`);
            }
          }
        }
        if (!Array.isArray(block.chartSeries) || block.chartSeries.length === 0) {
          errors.push(`${prefix}: simulator requires at least 1 chartSeries.`);
        } else {
          for (const s of block.chartSeries) {
            try {
              evaluateSafeFormula(s.formula, env);
            } catch (e) {
              errors.push(`${prefix} chartSeries "${s.label}": ${(e as Error).message}`);
            }
          }
        }
        break;
      }

      case 'step_flow': {
        hasInteractiveWidget = true;
        if (!Array.isArray(block.steps) || block.steps.length < 2) {
          errors.push(`${prefix}: step_flow requires at least 2 steps.`);
        } else {
          block.steps.forEach((s, sIdx) => {
            if (!s.title?.trim() || !s.summary?.trim()) {
              errors.push(`${prefix}.steps[${sIdx}]: title and summary are required.`);
            }
          });
        }
        break;
      }

      case 'compare_matrix': {
        hasInteractiveWidget = true;
        if (!Array.isArray(block.dimensions) || block.dimensions.length < 2) {
          errors.push(`${prefix}: compare_matrix requires at least 2 dimensions.`);
          break;
        }
        if (!Array.isArray(block.options) || block.options.length < 2) {
          errors.push(`${prefix}: compare_matrix requires at least 2 options.`);
          break;
        }
        const dimKeys = block.dimensions.map((dm) => dm.key);
        for (const opt of block.options) {
          for (const k of dimKeys) {
            const sc = opt.scores?.[k];
            if (typeof sc !== 'number' || sc < 1 || sc > 5) {
              errors.push(`${prefix}: option "${opt.name}" missing valid score (1..5) for dimension "${k}".`);
            }
          }
        }
        break;
      }

      case 'deep_dive_cards': {
        if (!Array.isArray(block.cards) || block.cards.length < 2) {
          errors.push(`${prefix}: deep_dive_cards requires at least 2 cards.`);
        }
        break;
      }

      case 'quiz': {
        hasInteractiveWidget = true;
        if (!Array.isArray(block.questions) || block.questions.length === 0) {
          errors.push(`${prefix}: quiz requires at least 1 question.`);
        } else {
          block.questions.forEach((q, qIdx) => {
            if (!Array.isArray(q.choices) || q.choices.length < 2) {
              errors.push(`${prefix}.questions[${qIdx}]: must have at least 2 choices.`);
            } else if (q.correctIndex < 0 || q.correctIndex >= q.choices.length) {
              errors.push(`${prefix}.questions[${qIdx}]: correctIndex out of range.`);
            }
          });
        }
        break;
      }

      default:
        errors.push(`${prefix}: unsupported block type "${(block as { type?: string }).type}".`);
    }
  });

  if (!hasInteractiveWidget) {
    errors.push('Document must include at least one interactive block (simulator, step_flow, compare_matrix, or quiz).');
  }

  return { valid: errors.length === 0, errors };
}
