import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from validator import eval_safe_formula, validate_explainer_doc


def sample_valid_doc():
    return {
        "id": "demo-doc",
        "title": "RAG 分块粒度与检索精度权衡",
        "subtitle": "探索 Chunk Size 与 Top-K 之间的延迟与召回平衡",
        "category": "LLM 工程",
        "readingMinutes": 4,
        "tldr": ["子块检索提升语义聚焦度", "重排器抑制中间迷失效应"],
        "sourceSummary": "RAG 核心参数工程实践",
        "blocks": [
            {
                "id": "sim-1",
                "type": "simulator",
                "title": "Chunk Size 模拟器",
                "subtitle": "测试不同分块大小下的 Token 消耗",
                "intuition": "块越大单次上下文成本越高",
                "params": [
                    {"id": "chunk_sz", "label": "Chunk Size", "min": 128, "max": 1024, "step": 128, "defaultValue": 512},
                    {"id": "top_k", "label": "Top-K", "min": 1, "max": 10, "step": 1, "defaultValue": 5},
                ],
                "outputs": [
                    {"id": "ctx_tokens", "label": "Prompt Tokens", "formula": "chunk_sz * top_k", "precision": 0}
                ],
                "sweepParamId": "chunk_sz",
                "chartType": "line",
                "chartYLabel": "Context Tokens",
                "chartSeries": [{"label": "Tokens", "formula": "chunk_sz * top_k"}],
                "takeaway": "控制总预算在 2500 tokens 内兼顾延迟与精度。",
            },
            {
                "id": "quiz-1",
                "type": "quiz",
                "title": "概念自测",
                "subtitle": "快测",
                "questions": [
                    {
                        "id": "q1",
                        "question": "Top-K 过大最容易导致什么现象？",
                        "choices": ["Lost in the Middle", "梯度消失"],
                        "correctIndex": 0,
                        "explanation": "过多低相关上下文会稀释注意力。",
                    }
                ],
            },
        ],
    }


def test_safe_formula_math_and_security():
    assert eval_safe_formula("2 * d * r", {"d": 64, "r": 4}) == 512.0
    assert eval_safe_formula("ifelse(k >= 5, 100, 50)", {"k": 6}) == 100.0
    assert eval_safe_formula("clamp(round(10 / 3, 2), 0, 5)", {}) == 3.33

    try:
        eval_safe_formula("__import__('os').system('echo hi')", {})
        assert False, "Should have blocked unsafe call"
    except ValueError as exc:
        assert "Unknown function" in str(exc) or "Disallowed" in str(exc)


def test_validator_accepts_valid_and_flags_broken_closure():
    doc = sample_valid_doc()
    valid, errors = validate_explainer_doc(doc)
    assert valid is True
    assert errors == []

    # Break variable name and quiz index
    doc["blocks"][0]["outputs"][0]["formula"] = "wrong_var * top_k"
    doc["blocks"][1]["questions"][0]["correctIndex"] = 9
    valid2, errors2 = validate_explainer_doc(doc)
    assert valid2 is False
    assert any("wrong_var" in e for e in errors2)
    assert any("correctIndex" in e for e in errors2)
