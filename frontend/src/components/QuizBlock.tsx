import { useState } from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import type { QuizBlockData } from '../schema/dsl';

export function QuizBlock({ block }: { block: QuizBlockData }) {
  const [selected, setSelected] = useState<Record<string, number>>({});

  const answeredCount = Object.keys(selected).length;
  const correctCount = block.questions.filter((q) => selected[q.id] === q.correctIndex).length;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/70 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-0.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Instant Concept Check · 反直觉盲区快测
          </div>
          <h3 className="text-lg font-bold text-slate-900">{block.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{block.subtitle}</p>
        </div>
        {answeredCount > 0 && (
          <div className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
            得分：{correctCount} / {block.questions.length}
          </div>
        )}
      </div>

      <div className="p-6 space-y-5">
        {block.questions.map((q, qIdx) => {
          const picked = selected[q.id];
          const hasPicked = picked !== undefined;
          const isCorrect = picked === q.correctIndex;

          return (
            <div key={q.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="font-semibold text-sm text-slate-900">
                {qIdx + 1}. {q.question}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.choices.map((choice, cIdx) => {
                  const isThisPicked = picked === cIdx;
                  const isRightChoice = cIdx === q.correctIndex;
                  let style = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                  if (hasPicked) {
                    if (isRightChoice) {
                      style = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                    } else if (isThisPicked) {
                      style = 'border-rose-400 bg-rose-50 text-rose-900';
                    } else {
                      style = 'border-slate-200 bg-slate-50/50 text-slate-400';
                    }
                  }
                  return (
                    <button
                      key={cIdx}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [q.id]: cIdx }))}
                      className={`rounded-lg border px-3.5 py-2.5 text-left text-xs transition flex items-center justify-between gap-2 cursor-pointer ${style}`}
                    >
                      <span>{choice}</span>
                      {hasPicked && isRightChoice && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {hasPicked && isThisPicked && !isRightChoice && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {hasPicked && (
                <div
                  className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                    isCorrect ? 'bg-emerald-50/80 text-emerald-900' : 'bg-amber-50 text-amber-950'
                  }`}
                >
                  <span className="font-bold">{isCorrect ? '回答正确：' : '核心解析：'}</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
