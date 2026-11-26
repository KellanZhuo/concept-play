import { useState } from 'react';
import { Scale } from 'lucide-react';
import type { CompareMatrixBlockData } from '../schema/dsl';

export function CompareMatrixBlock({ block }: { block: CompareMatrixBlockData }) {
  const [focusKey, setFocusKey] = useState<string>('all');

  const sortedOptions = [...block.options].sort((a, b) => {
    if (focusKey === 'all') return 0;
    return (b.scores[focusKey] ?? 0) - (a.scores[focusKey] ?? 0);
  });

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-0.5">
            <Scale className="w-3.5 h-3.5" />
            Multi-Dimension Tradeoff Matrix · 多维权衡对比
          </div>
          <h3 className="text-lg font-bold text-slate-900">{block.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{block.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">按维度聚焦排序：</span>
          <button
            type="button"
            onClick={() => setFocusKey('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              focusKey === 'all' ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            全部均衡
          </button>
          {block.dimensions.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setFocusKey(d.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                focusKey === d.key
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="py-2.5 pr-4 font-semibold w-48">方案 / 路线</th>
              {block.dimensions.map((d) => (
                <th
                  key={d.key}
                  className={`py-2.5 px-3 font-semibold ${focusKey === d.key ? 'text-teal-700 bg-teal-50/60 rounded-t-lg' : ''}`}
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedOptions.map((opt) => (
              <tr key={opt.id} className={opt.recommended ? 'bg-blue-50/35' : 'hover:bg-slate-50/70'}>
                <td className="py-3.5 pr-4 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{opt.name}</span>
                    {opt.recommended && (
                      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        推荐路线
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{opt.tagline}</div>
                </td>
                {block.dimensions.map((d) => {
                  const score = opt.scores[d.key] ?? 3;
                  const note = opt.notes[d.key] ?? '';
                  return (
                    <td
                      key={d.key}
                      className={`py-3.5 px-3 align-top ${focusKey === d.key ? 'bg-teal-50/40' : ''}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className={`h-1.5 w-4 rounded-full ${
                              dot <= score
                                ? score >= 4
                                  ? 'bg-teal-600'
                                  : score === 3
                                    ? 'bg-amber-500'
                                    : 'bg-rose-400'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-mono font-semibold text-slate-600">{score}/5</span>
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">{note}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
