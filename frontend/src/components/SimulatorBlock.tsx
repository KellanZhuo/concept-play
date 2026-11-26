import { useMemo, useState } from 'react';
import { RotateCcw, Sliders, Sparkles } from 'lucide-react';
import { evaluateSafeFormula, type SimulatorBlockData } from '../schema/dsl';

const SERIES_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED'];

export function SimulatorBlock({ block }: { block: SimulatorBlockData }) {
  const initialVars = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of block.params) map[p.id] = p.defaultValue;
    return map;
  }, [block]);

  const [vars, setVars] = useState<Record<string, number>>(initialVars);

  const reset = () => setVars(initialVars);

  const computedOutputs = useMemo(() => {
    return block.outputs.map((out) => {
      let val = 0;
      try {
        val = evaluateSafeFormula(out.formula, vars);
      } catch {
        val = 0;
      }
      const digits = out.precision ?? 1;
      const formatted = Number.isInteger(val) && digits === 0 ? String(val) : val.toFixed(digits);
      return { ...out, raw: val, formatted };
    });
  }, [block.outputs, vars]);

  const sweepParam = block.params.find((p) => p.id === block.sweepParamId) ?? block.params[0];

  const sweepPoints = useMemo(() => {
    if (!sweepParam) return [];
    const points: number[] = [];
    const span = sweepParam.max - sweepParam.min;
    const rawSteps = Math.round(span / sweepParam.step);
    if (rawSteps <= 16 && rawSteps >= 2) {
      const stride = rawSteps > 10 ? 2 : 1;
      for (let i = 0; i <= rawSteps; i += stride) {
        points.push(Number((sweepParam.min + i * sweepParam.step).toFixed(4)));
      }
      if (points[points.length - 1] !== sweepParam.max) {
        points.push(sweepParam.max);
      }
    } else {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const raw = sweepParam.min + (span * i) / (count - 1);
        points.push(Number.isInteger(sweepParam.step) ? Math.round(raw) : Number(raw.toFixed(2)));
      }
    }
    return points;
  }, [sweepParam]);

  const chartData = useMemo(() => {
    if (!sweepParam) return [];
    return sweepPoints.map((xVal) => {
      const env = { ...vars, [sweepParam.id]: xVal };
      const values = block.chartSeries.map((s) => {
        try {
          return evaluateSafeFormula(s.formula, env);
        } catch {
          return 0;
        }
      });
      return { x: xVal, values };
    });
  }, [block.chartSeries, sweepParam, sweepPoints, vars]);

  const maxY = useMemo(() => {
    let m = 1;
    for (const pt of chartData) {
      for (const v of pt.values) {
        if (v > m) m = v;
      }
    }
    return m * 1.12;
  }, [chartData]);

  const minY = useMemo(() => {
    let m = 0;
    for (const pt of chartData) {
      for (const v of pt.values) {
        if (v < m) m = v;
      }
    }
    return m < 0 ? m * 1.1 : 0;
  }, [chartData]);

  const currentSweepValue = sweepParam ? vars[sweepParam.id] : 0;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 px-6 py-4 text-white flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
            <Sliders className="w-3.5 h-3.5" />
            Interactive Parameter Simulator · 实时参数联动实验
          </div>
          <h3 className="text-lg font-bold tracking-tight">{block.title}</h3>
          <p className="text-xs text-slate-300 mt-0.5">{block.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置默认
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Intuition callout */}
        <div className="rounded-xl bg-blue-50/70 border border-blue-100 px-4 py-3 text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-blue-900">直觉引导：</span>
          {block.intuition}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sliders column */}
          <div className="lg:col-span-5 space-y-4 rounded-xl bg-slate-50 p-4 border border-slate-200/70">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              拖动参数观察实时变化
            </div>
            {block.params.map((p) => {
              const val = vars[p.id] ?? p.defaultValue;
              const isSweep = sweepParam?.id === p.id;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor={`param-${block.id}-${p.id}`} className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {p.label}
                      {isSweep && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          横轴变量
                        </span>
                      )}
                    </label>
                    <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {val}
                      {p.unit ? ` ${p.unit}` : ''}
                    </span>
                  </div>
                  <input
                    id={`param-${block.id}-${p.id}`}
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    onChange={(e) => setVars((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))}
                    className="w-full h-2 rounded-lg bg-slate-200 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{p.min}{p.unit || ''}</span>
                    {p.description && <span className="font-sans text-slate-500 truncate px-2">{p.description}</span>}
                    <span>{p.max}{p.unit || ''}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Outputs + Live SVG Chart column */}
          <div className="lg:col-span-7 space-y-4">
            {/* KPI Output Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {computedOutputs.map((out) => (
                <div
                  key={out.id}
                  className={`rounded-xl p-3.5 border transition ${
                    out.highlight
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className={`text-xs font-medium ${out.highlight ? 'text-blue-100' : 'text-slate-500'}`}>
                    {out.label}
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono tracking-tight">
                    {out.formatted}
                    {out.unit && <span className="text-xs font-normal ml-1 opacity-85">{out.unit}</span>}
                  </div>
                  {out.interpretation && (
                    <div className={`mt-1 text-[11px] leading-snug ${out.highlight ? 'text-blue-100' : 'text-slate-500'}`}>
                      {out.interpretation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Crisp Responsive SVG Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-xs font-semibold text-slate-700">
                  {block.chartYLabel}（随 <span className="text-blue-700">{sweepParam?.label}</span> 变化曲线）
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {block.chartSeries.map((s, idx) => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color || SERIES_COLORS[idx % SERIES_COLORS.length] }}
                      />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>

              <svg viewBox="0 0 520 205" className="w-full h-48 overflow-visible select-none">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const y = 18 + (1 - t) * 150;
                  const val = minY + t * (maxY - minY);
                  return (
                    <g key={t}>
                      <line x1={44} y1={y} x2={504} y2={y} stroke="#E2E8F0" strokeDasharray={t === 0 ? undefined : '3 3'} />
                      <text x={38} y={y + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
                        {Math.abs(val) >= 100 ? Math.round(val) : val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Bars or Lines */}
                {block.chartType === 'bar' ? (
                  chartData.map((pt, i) => {
                    const groupW = 440 / Math.max(1, chartData.length);
                    const barW = Math.min(24, (groupW * 0.68) / Math.max(1, pt.values.length));
                    const centerX = 54 + i * groupW + groupW / 2;
                    const isCurrent = sweepParam && Math.abs(pt.x - currentSweepValue) <= sweepParam.step * 0.55;
                    return (
                      <g key={pt.x}>
                        {isCurrent && (
                          <rect
                            x={centerX - groupW * 0.44}
                            y={14}
                            width={groupW * 0.88}
                            height={158}
                            rx={6}
                            fill="#DBEAFE"
                            opacity={0.45}
                          />
                        )}
                        {pt.values.map((v, sIdx) => {
                          const norm = Math.max(0, (v - minY) / Math.max(1e-6, maxY - minY));
                          const h = norm * 150;
                          const x = centerX - (pt.values.length * barW) / 2 + sIdx * barW;
                          const color = block.chartSeries[sIdx]?.color || SERIES_COLORS[sIdx % SERIES_COLORS.length];
                          return (
                            <rect
                              key={sIdx}
                              x={x}
                              y={168 - h}
                              width={Math.max(4, barW - 2)}
                              height={Math.max(2, h)}
                              rx={3}
                              fill={color}
                              opacity={isCurrent ? 1 : 0.78}
                            />
                          );
                        })}
                        <text
                          x={centerX}
                          y={186}
                          textAnchor="middle"
                          className={`text-[10px] font-mono ${isCurrent ? 'fill-blue-700 font-bold' : 'fill-slate-500'}`}
                        >
                          {pt.x}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <>
                    {block.chartSeries.map((s, sIdx) => {
                      const color = s.color || SERIES_COLORS[sIdx % SERIES_COLORS.length];
                      const pts = chartData.map((pt, i) => {
                        const x = 56 + (i / Math.max(1, chartData.length - 1)) * 436;
                        const norm = (pt.values[sIdx] - minY) / Math.max(1e-6, maxY - minY);
                        const y = 168 - norm * 150;
                        return { x, y, rawX: pt.x, rawY: pt.values[sIdx] };
                      });
                      const pathD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                      return (
                        <g key={s.label}>
                          <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
                          {pts.map((p) => {
                            const isCurrent =
                              sweepParam &&
                              Math.abs(p.rawX - currentSweepValue) <=
                                Math.max(sweepParam.step * 0.6, (sweepParam.max - sweepParam.min) / 16);
                            return (
                              <circle
                                key={p.rawX}
                                cx={p.x}
                                cy={p.y}
                                r={isCurrent ? 5.5 : 3.2}
                                fill={isCurrent ? '#FFFFFF' : color}
                                stroke={color}
                                strokeWidth={isCurrent ? 2.8 : 1.5}
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                    {chartData.map((pt, i) => {
                      const x = 56 + (i / Math.max(1, chartData.length - 1)) * 436;
                      return (
                        <text key={pt.x} x={x} y={186} textAnchor="middle" className="fill-slate-500 text-[10px] font-mono">
                          {pt.x}
                        </text>
                      );
                    })}
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom insight */}
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-900 text-slate-100 px-4 py-3 text-xs leading-relaxed">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">核心实验洞察：</span>
            {block.takeaway}
          </div>
        </div>
      </div>
    </section>
  );
}
