import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Workflow } from 'lucide-react';
import type { StepFlowBlockData } from '../schema/dsl';

export function StepFlowBlock({ block }: { block: StepFlowBlockData }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => {
        if (prev + 1 >= block.steps.length) {
          setPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 2400);
    return () => window.clearInterval(timer);
  }, [playing, block.steps.length]);

  const current = block.steps[activeIdx] ?? block.steps[0];

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-0.5">
            <Workflow className="w-3.5 h-3.5" />
            Step-by-Step Mechanism · 交互步进机制拆解
          </div>
          <h3 className="text-lg font-bold text-slate-900">{block.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{block.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setActiveIdx((i) => Math.max(0, i - 1));
            }}
            disabled={activeIdx === 0}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            aria-label="上一步"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? '暂停演进' : '自动推演'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setActiveIdx((i) => Math.min(block.steps.length - 1, i + 1));
            }}
            disabled={activeIdx === block.steps.length - 1}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            aria-label="下一步"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Interactive pipeline nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {block.steps.map((step, idx) => {
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setActiveIdx(idx);
                }}
                className={`text-left rounded-xl p-3.5 border transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/15 shadow-sm'
                    : isPast
                      ? 'border-indigo-200 bg-white hover:border-indigo-300'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isPast
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {step.badge || `Step ${idx + 1}`}
                  </span>
                  {step.metricTag && (
                    <span className="text-[11px] font-mono font-semibold text-indigo-700">{step.metricTag}</span>
                  )}
                </div>
                <div className="font-semibold text-sm text-slate-900 line-clamp-1">{step.title}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{step.summary}</div>
              </button>
            );
          })}
        </div>

        {/* Active step detail stage */}
        {current && (
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                  {current.badge || `Step ${activeIdx + 1}`}
                </span>
                <h4 className="text-base font-bold text-slate-900">{current.title}</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {activeIdx + 1} / {block.steps.length}
              </span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{current.detail}</p>

            {(current.inputExample || current.outputExample) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {current.inputExample && (
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      输入状态 / Input
                    </div>
                    <div className="text-xs font-mono text-slate-700 leading-relaxed">{current.inputExample}</div>
                  </div>
                )}
                {current.outputExample && (
                  <div className="rounded-lg bg-white border border-indigo-200 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">
                      转换输出 / Output
                    </div>
                    <div className="text-xs font-mono text-slate-800 leading-relaxed">{current.outputExample}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
