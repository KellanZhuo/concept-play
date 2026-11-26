import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { evaluateSafeFormula, validateExplainerDoc } from './dsl';
import { PRESET_DOCS } from '../presets';
import App from '../App';

describe('ConceptPlay Safe Formula Evaluator & Deterministic Validator', () => {
  it('evaluates arithmetic, power, comparison, and helper functions safely', () => {
    expect(evaluateSafeFormula('2 * d * r', { d: 64, r: 4 })).toBe(512);
    expect(evaluateSafeFormula('clamp(round((1 - 512 / 4160) * 100, 1), 0, 100)', {})).toBe(87.7);
    expect(evaluateSafeFormula('ifelse(fallback >= 1, 12, 7)', { fallback: 1 })).toBe(12);
    expect(evaluateSafeFormula('ifelse(fallback >= 1, 12, 7)', { fallback: 0 })).toBe(7);
  });

  it('rejects undefined variables and disallowed characters', () => {
    expect(() => evaluateSafeFormula('2 * unknown_var', { r: 4 })).toThrow(/Undefined parameter/);
    expect(() => evaluateSafeFormula('alert(1)', {})).toThrow(/Unknown function/);
    expect(() => evaluateSafeFormula('r; window', { r: 2 })).toThrow(/Disallowed character/);
  });

  it('validates all 3 built-in flagship preset documents with zero errors', () => {
    expect(PRESET_DOCS.length).toBe(3);
    for (const doc of PRESET_DOCS) {
      const res = validateExplainerDoc(doc);
      expect(res.errors).toEqual([]);
      expect(res.valid).toBe(true);
    }
  });

  it('catches broken formula closures and out-of-bounds compare scores for Auto-Fix', () => {
    const broken = structuredClone(PRESET_DOCS[0]);
    if (broken.blocks[0].type === 'simulator') {
      broken.blocks[0].outputs[0].formula = '100 - typo_param * 2';
      broken.blocks[0].sweepParamId = 'non_existent_axis';
    }
    const check = validateExplainerDoc(broken);
    expect(check.valid).toBe(false);
    expect(check.errors.some((e) => e.includes('typo_param'))).toBe(true);
    expect(check.errors.some((e) => e.includes('non_existent_axis'))).toBe(true);
  });

  it('renders App, switches between preset topics, and opens Compiler X-Ray inspector', () => {
    render(<App />);
    expect(screen.getAllByText(/LoRA 低秩微调/i).length).toBeGreaterThan(0);

    // Switch to 3rd preset (PSNR vs CER metric mismatch)
    const presetButtons = screen.getAllByText(/当 AI 指标欺骗你/i);
    fireEvent.click(presetButtons[0]);
    expect(screen.getByText(/像素平滑度 vs 字符笔画锐度/i)).toBeTruthy();

    // Open Compiler X-Ray & Eval modal
    const inspectBtn = screen.getByRole('button', { name: /编译透视/i });
    fireEvent.click(inspectBtn);
    expect(screen.getByText(/20 篇文档 Eval 对比报告/i)).toBeTruthy();
  });
});
