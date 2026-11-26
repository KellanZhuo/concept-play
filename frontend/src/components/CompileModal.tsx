import { useState } from 'react';
import { Loader2, Sparkles, Wand2, X } from 'lucide-react';
import {
  compileArticleToInteractiveDoc,
  type CompileConfig,
  type ProviderType,
} from '../compiler/clientCompiler';
import type { InteractiveExplainerDoc } from '../schema/dsl';
import { SAMPLE_RAW_ARTICLES } from '../presets';

export function CompileModal({
  onClose,
  onCompiled,
}: {
  onClose: () => void;
  onCompiled: (doc: InteractiveExplainerDoc) => void;
}) {
  const [provider, setProvider] = useState<ProviderType>(
    () => (sessionStorage.getItem('cp_provider') as ProviderType) || 'gemini',
  );
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('cp_api_key') || '');
  const [model, setModel] = useState(() => sessionStorage.getItem('cp_model') || 'gemini-2.5-flash');
  const [baseUrl, setBaseUrl] = useState(
    () => sessionStorage.getItem('cp_base_url') || 'https://api.deepseek.com/v1',
  );
  const [sourceText, setSourceText] = useState(SAMPLE_RAW_ARTICLES[0].content);

  const [compiling, setCompiling] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const switchProvider = (next: ProviderType) => {
    setProvider(next);
    if (next === 'gemini') {
      setModel('gemini-2.5-flash');
    } else {
      setModel('deepseek-chat');
    }
  };

  const handleCompile = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('请先填入 API Key（仅保存在当前浏览器会话内存中，绝不上传第三方服务器）。');
      return;
    }
    if (sourceText.trim().length < 60) {
      setErrorMsg('请输入至少 60 字的技术说明、论文片段或产品方案文档。');
      return;
    }

    setErrorMsg('');
    setCompiling(true);
    sessionStorage.setItem('cp_provider', provider);
    sessionStorage.setItem('cp_api_key', apiKey.trim());
    sessionStorage.setItem('cp_model', model.trim());
    sessionStorage.setItem('cp_base_url', baseUrl.trim());

    const cfg: CompileConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: baseUrl.trim(),
    };

    try {
      const compiledDoc = await compileArticleToInteractiveDoc(sourceText, cfg, (msg) => {
        setProgressMsg(msg);
      });
      onCompiled(compiledDoc);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message || '编译失败，请检查 API Key 或模型名称。');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Wand2 className="w-5 h-5 text-blue-200" />
            <div>
              <h2 className="text-base font-bold">现场编译新文章 → 互动图解网页</h2>
              <p className="text-xs text-blue-100">
                Planner 概念拆解 → 受控交互 DSL 生成 → 确定性校验 → Auto-Fix 自修复闭环
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={compiling}
            className="rounded-lg p-1.5 text-blue-100 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Provider selector */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">1. 选择编译模型接口（浏览器端直连，Key 不经过任何中转）</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => switchProvider('gemini')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer ${
                    provider === 'gemini'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  Google Gemini API (免费层可用)
                </button>
                <button
                  type="button"
                  onClick={() => switchProvider('openai_compat')}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer ${
                    provider === 'openai_compat'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  OpenAI 兼容 (DeepSeek / 千问 / GPT)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'gemini' ? 'AIzaSy... (aistudio.google.com 免费获取)' : 'sk-...'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">模型名称</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                />
              </div>
              {provider === 'openai_compat' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Base URL（DeepSeek: https://api.deepseek.com/v1 ｜ 通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1）
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono focus:border-blue-600 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sample raw texts + textarea */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">2. 粘贴任意长文 / 论文摘要 / 产品文档（或点选右侧测试原文）</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_RAW_ARTICLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSourceText(s.content)}
                    className="rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[11px] font-medium text-indigo-800 cursor-pointer"
                  >
                    示例：{s.title.slice(0, 10)}...
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="在此粘贴技术博客、论文核心章节、算法说明或产品 PRD..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          {compiling && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3.5 flex items-center gap-3 text-xs font-medium text-blue-900">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span>{progressMsg || '正在启动多阶段编译管线...'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            编译耗时通常约 12–25 秒，自动包含确定性公式校验与错误修复
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={compiling}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCompile}
              disabled={compiling}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {compiling ? '编译中...' : '开始编译互动网页'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
