import {
  validateExplainerDoc,
  type CompilerTraceStage,
  type InteractiveExplainerDoc,
} from '../schema/dsl';

export type ProviderType = 'gemini' | 'openai_compat';

export type CompileConfig = {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string; // Used when provider === 'openai_compat'
};

export type CompileProgressCallback = (stepLabel: string, stageIndex: number) => void;

const DSL_SCHEMA_PROMPT = `You are the ConceptPlay Interactive Document Compiler.
Transform the user's raw technical/product/research text into a rich, accurate, interactive explainer JSON document strictly matching this TypeScript specification:

{
  "id": "kebab-case-id",
  "title": "吸引人且精准的中文主标题",
  "subtitle": "一句话副标题点明核心机制与交互实验内容",
  "category": "领域分类标签（如 AI 架构 / 算法原理 / 产品策略）",
  "readingMinutes": 4,
  "tldr": ["核心要点1（含具体机制或数字）", "核心要点2", "核心要点3"],
  "sourceSummary": "一句话概括源材料核心主题",
  "blocks": [
    // MUST include 3 to 4 blocks total, starting with a "simulator" block and a "step_flow" block, plus "compare_matrix" or "deep_dive_cards" and "quiz"!
    {
      "id": "sim-1",
      "type": "simulator",
      "title": "模拟器标题",
      "subtitle": "副标题",
      "intuition": "通俗解释参数之间的联动直觉",
      "params": [
        // 2 to 3 sliders. CRITICAL: id MUST be a valid ASCII identifier like "chunk_size", "top_k", "temp" (NO spaces or hyphens!)
        { "id": "param_a", "label": "中文参数名", "unit": "单位", "min": 1, "max": 100, "step": 1, "defaultValue": 20, "description": "简短说明" }
      ],
      "outputs": [
        // 2 to 3 KPI outputs. CRITICAL: formula may ONLY use numbers, +, -, *, /, ^, parentheses, param IDs defined above, and functions: min, max, abs, round, sqrt, log, exp, clamp, pow, ifelse
        { "id": "out_1", "label": "输出指标名", "unit": "%", "formula": "round(100 - param_a * 0.5, 1)", "precision": 1, "highlight": true, "interpretation": "一句话解读" }
      ],
      "sweepParamId": "param_a", // MUST exactly match one of params[].id!
      "chartType": "line", // "line" or "bar"
      "chartYLabel": "纵轴含义",
      "chartSeries": [
        { "label": "曲线1名称", "formula": "100 - param_a * 0.5", "color": "#2563EB" }
      ],
      "takeaway": "实验背后的核心规律总结"
    },
    {
      "id": "flow-1",
      "type": "step_flow",
      "title": "核心流程步进拆解",
      "subtitle": "点击逐步查看输入输出变化",
      "steps": [
        // 3 to 4 steps
        { "id": "s1", "badge": "Step 1 · 阶段名", "title": "步骤标题", "summary": "一句话摘要", "detail": "详细原理解释", "inputExample": "输入示例", "outputExample": "输出示例", "metricTag": "关键指标标签" }
      ]
    },
    {
      "id": "cmp-1",
      "type": "compare_matrix",
      "title": "不同方案权衡对比",
      "subtitle": "多维度评分（必须为 1 到 5 的整数）",
      "dimensions": [
        { "key": "d1", "label": "维度1" },
        { "key": "d2", "label": "维度2" },
        { "key": "d3", "label": "维度3" }
      ],
      "options": [
        {
          "id": "opt1",
          "name": "方案名称",
          "tagline": "定位简述",
          "recommended": true,
          "scores": { "d1": 5, "d2": 4, "d3": 4 }, // EVERY dimension key MUST have a number 1..5!
          "notes": { "d1": "说明1", "d2": "说明2", "d3": "说明3" }
        }
      ]
    },
    {
      "id": "quiz-1",
      "type": "quiz",
      "title": "核心概念盲区快测",
      "subtitle": "检验是否真正理解关键机制",
      "questions": [
        {
          "id": "q1",
          "question": "有深度的反直觉问题？",
          "choices": ["选项A", "选项B", "选项C", "选项D"],
          "correctIndex": 1, // 0-based valid index into choices
          "explanation": "清晰透彻的解析"
        }
      ]
    }
  ]
}

STRICT RULES:
1. Return ONLY raw valid JSON (no markdown code fences, no commentary).
2. Every variable name inside any "formula" MUST be defined in that simulator block's "params[].id" list! Never reference undefined variables.
3. All text content should be clear, insightful Simplified Chinese.`;

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model response did not contain a JSON object.');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

async function callLLMJson(config: CompileConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  if (config.provider === 'gemini') {
    const model = config.model.trim() || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey.trim())}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 240)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini API returned empty content.');
    return text;
  }

  // OpenAI-compatible (DeepSeek / Qwen / OpenAI)
  const base = (config.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim() || 'deepseek-chat',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API HTTP ${res.status}: ${errText.slice(0, 240)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('LLM API returned empty content.');
  return text;
}

export async function compileArticleToInteractiveDoc(
  sourceText: string,
  config: CompileConfig,
  onProgress?: CompileProgressCallback,
): Promise<InteractiveExplainerDoc> {
  const tStart = performance.now();
  const stages: CompilerTraceStage[] = [];

  // Stage 1: Concept & Pedagogical Structure Planning
  onProgress?.('Stage 1/3 · 拆解核心概念与可交互数学/流程结构...', 0);
  const tPlan0 = performance.now();
  const planRaw = await callLLMJson(
    config,
    'You are an expert technical educator and interactive visualization architect. Return JSON only.',
    `Analyze the following article and plan an interactive explainer blueprint in JSON with keys:
- "coreThesis": 1-sentence core thesis
- "simulatorIdea": what quantitative trade-off can be modeled with 2-3 sliders and formulas
- "flowStages": list of 3-4 sequential mechanism steps
- "quizTrap": 1 counter-intuitive misconception to test

SOURCE ARTICLE:
${sourceText.slice(0, 12000)}`,
  );
  const tPlanMs = Math.round(performance.now() - tPlan0);
  stages.push({
    stage: 'planner',
    status: 'passed',
    durationMs: tPlanMs,
    detail: '完成源文本核心命题抽取、参数权衡建模规划与步进链路拆解。',
  });

  // Stage 2: Compile to Structured Interactive DSL
  onProgress?.('Stage 2/3 · 编译生成 5 类受控交互积木 DSL...', 1);
  const tComp0 = performance.now();
  let currentRaw = await callLLMJson(
    config,
    DSL_SCHEMA_PROMPT,
    `PEDAGOGICAL PLAN:\n${planRaw}\n\nORIGINAL SOURCE TEXT:\n${sourceText.slice(0, 12000)}\n\nCompile the complete InteractiveExplainerDoc JSON now.`,
  );
  stages.push({
    stage: 'compiler',
    status: 'passed',
    durationMs: Math.round(performance.now() - tComp0),
    detail: '生成初始 InteractiveExplainerDoc 结构化蓝图。',
  });

  // Stage 3 & 4: Deterministic Validation + Up to 2 Self-Healing Auto-Fix Rounds
  let parsedDoc: unknown = null;
  let autoFixRounds = 0;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    onProgress?.(
      attempt === 0
        ? 'Stage 3/3 · 运行确定性 Schema、公式求值与引用闭包校验...'
        : `Auto-Fix 第 ${attempt} 轮 · 自动修复校验异常并重新验证...`,
      2,
    );

    const tVal0 = performance.now();
    let validationErrors: string[] = [];
    try {
      parsedDoc = extractJsonObject(currentRaw);
      const check = validateExplainerDoc(parsedDoc);
      validationErrors = check.errors;
    } catch (parseErr) {
      validationErrors = [`JSON Parse Error: ${(parseErr as Error).message}`];
    }
    const valMs = Math.round(performance.now() - tVal0);

    if (validationErrors.length === 0) {
      stages.push({
        stage: 'validator',
        status: 'passed',
        durationMs: Math.max(8, valMs),
        detail: `全部确定性语法、公式求值与维度边界校验通过（Auto-Fix 轮次：${autoFixRounds}）。`,
      });
      const finalDoc = parsedDoc as InteractiveExplainerDoc;
      finalDoc.id = finalDoc.id || `compiled-${Date.now()}`;
      finalDoc.compilerTrace = {
        model: `${config.model} (${config.provider})`,
        totalDurationMs: Math.round(performance.now() - tStart),
        autoFixRounds,
        validationPassed: true,
        stages,
      };
      return finalDoc;
    }

    // Record caught issues
    stages.push({
      stage: 'validator',
      status: 'repaired',
      durationMs: Math.max(8, valMs),
      detail: `捕获 ${validationErrors.length} 处确定性契约冲突，打回触发自动修复。`,
      issuesCaught: validationErrors,
    });

    if (attempt === maxRetries) {
      throw new Error(`编译产物经 ${maxRetries} 轮自修复仍有校验错误：${validationErrors.join('; ')}`);
    }

    autoFixRounds++;
    const tFix0 = performance.now();
    currentRaw = await callLLMJson(
      config,
      DSL_SCHEMA_PROMPT,
      `Your previous JSON output failed deterministic validation with these exact errors:
${validationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

PREVIOUS BROKEN JSON:
${currentRaw}

Fix ALL errors above and return the corrected complete JSON object ONLY.`,
    );
    stages.push({
      stage: 'autofix',
      status: 'passed',
      durationMs: Math.round(performance.now() - tFix0),
      detail: `完成第 ${autoFixRounds} 轮针对性错误修复重写。`,
    });
  }

  throw new Error('Unexpected compiler exit.');
}
