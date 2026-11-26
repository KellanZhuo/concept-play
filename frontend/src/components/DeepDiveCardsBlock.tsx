import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { DeepDiveCardsBlockData } from '../schema/dsl';

export function DeepDiveCardsBlock({ block }: { block: DeepDiveCardsBlockData }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    [block.cards[0]?.id ?? '']: true,
  });

  const toggle = (id: string) => setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/70">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 mb-0.5">
          <BookOpen className="w-3.5 h-3.5" />
          Progressive Disclosure · 分层概念深潜卡
        </div>
        <h3 className="text-lg font-bold text-slate-900">{block.title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{block.subtitle}</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {block.cards.map((card) => {
          const isOpen = !!openIds[card.id];
          return (
            <div
              key={card.id}
              className={`rounded-xl border transition ${
                isOpen ? 'border-amber-300 bg-amber-50/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(card.id)}
                className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <span className="inline-block rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-semibold">
                    {card.tag}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{card.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{card.oneLiner}</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180 text-amber-700' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                  <p>{card.deepExplanation}</p>
                  {card.formulaOrCode && (
                    <pre className="rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-[11px] overflow-x-auto">
                      {card.formulaOrCode}
                    </pre>
                  )}
                  {card.sourceQuote && (
                    <blockquote className="border-l-2 border-amber-400 pl-2.5 italic text-slate-500">
                      原文依据：{card.sourceQuote}
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
