import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  FileText,
  Github,
  Layers,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { InteractiveBlock, InteractiveExplainerDoc } from './schema/dsl';
import { PRESET_DOCS } from './presets';
import { SimulatorBlock } from './components/SimulatorBlock';
import { StepFlowBlock } from './components/StepFlowBlock';
import { CompareMatrixBlock } from './components/CompareMatrixBlock';
import { DeepDiveCardsBlock } from './components/DeepDiveCardsBlock';
import { QuizBlock } from './components/QuizBlock';
import { PipelineInspector } from './components/PipelineInspector';
import { CompileModal } from './components/CompileModal';
import { exportStandaloneHtml } from './exporter/htmlExporter';

function renderBlock(block: InteractiveBlock) {
  switch (block.type) {
    case 'simulator':
      return <SimulatorBlock key={block.id} block={block} />;
    case 'step_flow':
      return <StepFlowBlock key={block.id} block={block} />;
    case 'compare_matrix':
      return <CompareMatrixBlock key={block.id} block={block} />;
    case 'deep_dive_cards':
      return <DeepDiveCardsBlock key={block.id} block={block} />;
    case 'quiz':
      return <QuizBlock key={block.id} block={block} />;
  }
}

export default function App() {
  const [docs, setDocs] = useState<InteractiveExplainerDoc[]>(PRESET_DOCS);
  const [activeId, setActiveId] = useState<string>(PRESET_DOCS[0].id);
  const [showInspector, setShowInspector] = useState(false);
  const [showCompileModal, setShowCompileModal] = useState(false);

  const activeDoc = docs.find((d) => d.id === activeId) ?? docs[0];

  const handleNewCompiledDoc = (newDoc: InteractiveExplainerDoc) => {
    setDocs((prev) => [newDoc, ...prev]);
    setActiveId(newDoc.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">ConceptPlay</span>
                <span className="hidden sm:inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  Interactive Explainer Compiler
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                将枯燥技术长文、论文与产品方案编译为「可动手实验」的受控交互网页
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInspector(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>编译透视 &amp; Eval</span>
            </button>

            <button
              type="button"
              onClick={() => exportStandaloneHtml(activeDoc)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>导出单文件 HTML</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCompileModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>编译新文章</span>
            </button>

            <a
              href="https://github.com/KellanZhuo/concept-play"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2 text-slate-600 transition"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 space-y-6 flex-1">
        {/* Preset / Document Switcher Strip */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              精选零延迟互动图解专题（点击切换体验，或右上角粘贴任意新文章实时编译）
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {docs.map((d) => {
              const isSelected = d.id === activeDoc.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveId(d.id)}
                  className={`text-left rounded-xl p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-white ring-2 ring-blue-600/15 shadow-sm'
                      : 'border-slate-200/90 bg-white/70 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {d.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {d.readingMinutes} min
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 line-clamp-1">{d.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{d.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Interactive Article Hero */}
        <article className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-md">
            <div className="flex flex-wrap items-center gap-2.5 text-xs mb-3">
              <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 font-semibold text-blue-300">
                {activeDoc.category}
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />约 {activeDoc.readingMinutes} 分钟交互实验阅读
              </span>
              <span className="text-emerald-300 flex items-center gap-1 ml-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                AST 校验通过 · {activeDoc.blocks.length} 个交互模块
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              {activeDoc.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed max-w-4xl">
              {activeDoc.subtitle}
            </p>

            {/* TL;DR Box */}
            <div className="mt-5 rounded-xl bg-white/7 border border-white/12 p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                30 秒核心结论导读 (TL;DR)
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {activeDoc.tldr.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>源材料摘要：{activeDoc.sourceSummary}</span>
              <button
                type="button"
                onClick={() => setShowInspector(true)}
                className="text-blue-300 hover:text-blue-200 font-semibold underline underline-offset-4 cursor-pointer"
              >
                查看本页编译管线 Trace 与 JSON AST →
              </button>
            </div>
          </div>

          {/* Interactive Blocks Stream */}
          <div className="space-y-6">{activeDoc.blocks.map((block) => renderBlock(block))}</div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <strong>ConceptPlay</strong> · Controlled DSL + Deterministic Validator + Auto-Fix Interactive Compiler
          </div>
          <div>
            Built by{' '}
            <a
              href="https://github.com/KellanZhuo"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 hover:underline"
            >
              Kellan Zhuo (卓凯珩)
            </a>{' '}
            · 20-Doc Eval Pass Rate: <strong>100%</strong> (vs 55% Raw LLM HTML)
          </div>
        </div>
      </footer>

      {showInspector && <PipelineInspector doc={activeDoc} onClose={() => setShowInspector(false)} />}
      {showCompileModal && (
        <CompileModal onClose={() => setShowCompileModal(false)} onCompiled={handleNewCompiledDoc} />
      )}
    </div>
  );
}
