"""Deterministic Python AST formula evaluator & semantic validator for ConceptPlay DSL.

Used both by the FastAPI server (`backend/app.py`) and the 20-Document Evaluation Suite
(`eval/run_eval.py`) to verify compiled JSON documents and generate exact error feedback
for the LLM Auto-Fix loop without executing untrusted Python/JS code.
"""

from __future__ import annotations

import ast
import math
import re
from typing import Any, Dict, List, Tuple

ALLOWED_FUNCS = {
    "min": min,
    "max": max,
    "abs": abs,
    "sqrt": lambda x: math.sqrt(max(0.0, float(x))),
    "log": lambda x: math.log(max(1e-9, float(x))),
    "exp": lambda x: math.exp(min(20.0, float(x))),
    "pow": math.pow,
    "clamp": lambda x, lo, hi: min(float(hi), max(float(lo), float(x))),
    "round": lambda x, d=0: round(float(x), int(d)),
    "ifelse": lambda cond, t_val, f_val: float(t_val) if float(cond) > 0 else float(f_val),
}

IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def eval_safe_formula(expr: str, env: Dict[str, float]) -> float:
    """Safely evaluate a ConceptPlay arithmetic expression via Python's AST (no eval!)."""
    py_expr = expr.replace("^", "**")
    try:
        tree = ast.parse(py_expr, mode="eval")
    except SyntaxError as exc:
        raise ValueError(f'Syntax error in formula "{expr}": {exc.msg}') from exc

    def _eval(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.Name):
            if node.id == "PI":
                return math.pi
            if node.id == "E":
                return math.e
            if node.id not in env:
                raise ValueError(f'Undefined parameter "{node.id}" referenced in formula "{expr}"')
            return float(env[node.id])
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            val = _eval(node.operand)
            return val if isinstance(node.op, ast.UAdd) else -val
        if isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return 0.0 if abs(right) < 1e-12 else left / right
            if isinstance(node.op, ast.Mod):
                return 0.0 if abs(right) < 1e-12 else left % right
            if isinstance(node.op, ast.Pow):
                return math.pow(left, right)
        if isinstance(node, ast.Compare) and len(node.ops) == 1 and len(node.comparators) == 1:
            left = _eval(node.left)
            right = _eval(node.comparators[0])
            op = node.ops[0]
            if isinstance(op, ast.Gt):
                return 1.0 if left > right else 0.0
            if isinstance(op, ast.Lt):
                return 1.0 if left < right else 0.0
            if isinstance(op, ast.GtE):
                return 1.0 if left >= right else 0.0
            if isinstance(op, ast.LtE):
                return 1.0 if left <= right else 0.0
            if isinstance(op, ast.Eq):
                return 1.0 if abs(left - right) < 1e-9 else 0.0
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            fn_name = node.func.id
            if fn_name not in ALLOWED_FUNCS:
                raise ValueError(f'Unknown function "{fn_name}" in formula "{expr}"')
            args = [_eval(arg) for arg in node.args]
            return float(ALLOWED_FUNCS[fn_name](*args))
        raise ValueError(f'Disallowed AST node "{type(node).__name__}" in formula "{expr}"')

    result = _eval(tree)
    if not math.isfinite(result):
        raise ValueError(f'Formula "{expr}" evaluated to non-finite value')
    return result


def validate_explainer_doc(doc: Any) -> Tuple[bool, List[str]]:
    """Validate an InteractiveExplainerDoc dict and return (is_valid, error_messages)."""
    errors: List[str] = []
    if not isinstance(doc, dict):
        return False, ["Document root must be a JSON object."]

    if not str(doc.get("title", "")).strip():
        errors.append('Missing non-empty "title".')
    if not str(doc.get("subtitle", "")).strip():
        errors.append('Missing non-empty "subtitle".')
    tldr = doc.get("tldr")
    if not isinstance(tldr, list) or len(tldr) < 2:
        errors.append('"tldr" must contain at least 2 takeaway bullets.')

    blocks = doc.get("blocks")
    if not isinstance(blocks, list) or len(blocks) < 2:
        errors.append('"blocks" must contain at least 2 blocks.')
        return False, errors

    has_interactive = False
    for idx, block in enumerate(blocks):
        if not isinstance(block, dict):
            errors.append(f"blocks[{idx}]: must be an object.")
            continue
        btype = block.get("type")
        prefix = f"blocks[{idx}] ({btype})"

        if btype == "simulator":
            has_interactive = True
            params = block.get("params")
            if not isinstance(params, list) or not params:
                errors.append(f"{prefix}: simulator requires non-empty params list.")
                continue
            env: Dict[str, float] = {}
            for p in params:
                pid = str(p.get("id", ""))
                if not IDENT_RE.match(pid):
                    errors.append(f'{prefix}: invalid param id "{pid}".')
                pmin, pmax, pstep = p.get("min"), p.get("max"), p.get("step")
                if not isinstance(pmin, (int, float)) or not isinstance(pmax, (int, float)) or pmin >= pmax:
                    errors.append(f'{prefix}: param "{pid}" must have numeric min < max.')
                if not isinstance(pstep, (int, float)) or pstep <= 0:
                    errors.append(f'{prefix}: param "{pid}" must have step > 0.')
                env[pid] = float(p.get("defaultValue", pmin if isinstance(pmin, (int, float)) else 1.0))

            sweep_id = block.get("sweepParamId")
            if sweep_id not in env:
                errors.append(f'{prefix}: sweepParamId "{sweep_id}" not in params {list(env.keys())}.')

            outputs = block.get("outputs")
            if not isinstance(outputs, list) or not outputs:
                errors.append(f"{prefix}: simulator requires non-empty outputs.")
            else:
                for out in outputs:
                    try:
                        eval_safe_formula(str(out.get("formula", "")), env)
                    except ValueError as exc:
                        errors.append(f'{prefix} output "{out.get("id")}": {exc}')

            series = block.get("chartSeries")
            if not isinstance(series, list) or not series:
                errors.append(f"{prefix}: simulator requires non-empty chartSeries.")
            else:
                for s in series:
                    try:
                        eval_safe_formula(str(s.get("formula", "")), env)
                    except ValueError as exc:
                        errors.append(f'{prefix} chartSeries "{s.get("label")}": {exc}')

        elif btype == "step_flow":
            has_interactive = True
            steps = block.get("steps")
            if not isinstance(steps, list) or len(steps) < 2:
                errors.append(f"{prefix}: step_flow requires at least 2 steps.")

        elif btype == "compare_matrix":
            has_interactive = True
            dims = block.get("dimensions")
            opts = block.get("options")
            if not isinstance(dims, list) or len(dims) < 2 or not isinstance(opts, list) or len(opts) < 2:
                errors.append(f"{prefix}: compare_matrix requires >=2 dimensions and >=2 options.")
            else:
                dim_keys = [d.get("key") for d in dims]
                for opt in opts:
                    scores = opt.get("scores", {})
                    for k in dim_keys:
                        sc = scores.get(k)
                        if not isinstance(sc, (int, float)) or sc < 1 or sc > 5:
                            errors.append(f'{prefix}: option "{opt.get("name")}" invalid score for "{k}".')

        elif btype == "deep_dive_cards":
            cards = block.get("cards")
            if not isinstance(cards, list) or len(cards) < 2:
                errors.append(f"{prefix}: deep_dive_cards requires at least 2 cards.")

        elif btype == "quiz":
            has_interactive = True
            qs = block.get("questions")
            if not isinstance(qs, list) or not qs:
                errors.append(f"{prefix}: quiz requires at least 1 question.")
            else:
                for q_idx, q in enumerate(qs):
                    choices = q.get("choices", [])
                    c_idx = q.get("correctIndex", -1)
                    if not isinstance(choices, list) or len(choices) < 2 or not (0 <= c_idx < len(choices)):
                        errors.append(f"{prefix}.questions[{q_idx}]: invalid choices or correctIndex.")
        else:
            errors.append(f'{prefix}: unsupported block type "{btype}".')

    if not has_interactive:
        errors.append("Document must include at least one interactive block.")

    return len(errors) == 0, errors
