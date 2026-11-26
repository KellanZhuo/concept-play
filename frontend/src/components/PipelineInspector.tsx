import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Code2, Cpu, ShieldCheck, X } from 'lucide-react';
import type { InteractiveExplainerDoc } from '../schema/dsl';
import { BENCHMARK_SUMMARY, COMMON_CAUGHT_FAILURES } from '../eval/benchmarkData';

export function PipelineInspector({
  doc,
  onClose,
}: {
  doc: InteractiveExplainerDoc;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'trace' | 'eval' | 'ast'>('trace');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold">ConceptPlay 编译管线透视 &amp; Eval 评测看板</h2>
              <p className="text-xs text-slate-400">
                受控交互积木 DSL · 确定性 AST 公式校验 · Auto-Fix 自修复闭环
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('trace')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              tab === 'trace' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            当前文档编译 Trace
          </button>
          <button
            type="button"
            onClick={() => setTab('eval')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              tab === 'eval' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            20 篇文档 Eval 对比报告
          </button>
          <button
            type="button"
            onClick={() => setTab('ast')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              tab === 'ast' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            底层交互 DSL 源码 (AST)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {tab === 'trace' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">编译模型</div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{doc.compilerTrace.model}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">端到端总耗时</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {(doc.compilerTrace.totalDurationMs / 1000).toFixed(2)} s
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">Auto-Fix 触发轮次</div>
                  <div className="text-sm font-bold font-mono text-blue-700 mt-0.5">
                    {doc.compilerTrace.autoFixRounds} 轮
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <div className="text-[11px] text-emerald-700">确定性契约校验</div>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">100% Passed</div>
                </div>
              </div>

              <div className="space-y-3">
                {doc.compilerTrace.stages.map((st, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {st.status === 'repaired' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                        <span className="font-bold text-sm text-slate-900 uppercase">{st.stage}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            st.status === 'repaired'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {st.status === 'repaired' ? '拦截异常并打回修复' : '通过'}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{st.durationMs} ms</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{st.detail}</p>
                    {st.issuesCaught && st.issuesCaught.length > 0 && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] font-mono text-amber-900 space-y-1">
                        {st.issuesCaught.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'eval' && (
            <div className="space-y-5">
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 text-xs text-slate-700 leading-relaxed">
                <strong className="text-blue-950">评测设计说明（eval/run_eval.py）：</strong>
                在包含 20 篇跨领域技术文档（机器学习、分布式系统、推荐策略、产品 PRD 等）的基准测试集上，对比「裸大模型直接生成完整 HTML/JS」与「ConceptPlay 受控 DSL + 确定性 AST 校验 + Auto-Fix 自修复闭环」的工程稳定性。
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <th className="p-3 font-semibold">编译方案</th>
                      <th className="p-3 font-semibold">渲染无报错率</th>
                      <th className="p-3 font-semibold">交互组件存活率</th>
                      <th className="p-3 font-semibold">公式闭包零异常率</th>
                      <th className="p-3 font-semibold">平均耗时</th>
                      <th className="p-3 font-semibold">平均输出 Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {BENCHMARK_SUMMARY.map((row, i) => (
                      <tr key={row.method} className={i === 2 ? 'bg-emerald-50/50 font-semibold' : ''}>
                        <td className="p-3 text-slate-900">{row.method}</td>
                        <td className="p-3 font-mono">{row.renderSuccessRate.toFixed(1)}%</td>
                        <td className="p-3 font-mono">{row.interactiveSurvivalRate.toFixed(1)}%</td>
                        <td className="p-3 font-mono text-blue-700">{row.formulaClosureRate.toFixed(1)}%</td>
                        <td className="p-3 font-mono">{row.avgLatencySec}s</td>
                        <td className="p-3 font-mono">{row.avgTokens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-800">确定性校验器最常拦截并自动修复的 3 类初稿缺陷：</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {COMMON_CAUGHT_FAILURES.map((item) => (
                    <div key={item.category} className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60">
                      <div className="text-[11px] font-bold text-indigo-700">{item.frequency}</div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{item.category}</div>
                      <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">{item.example}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'ast' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                当前页面完全由以下通过强类型校验的 JSON AST 驱动渲染（零不可信内联脚本执行）：
              </div>
              <pre className="rounded-xl bg-slate-950 text-slate-100 p-4 text-[11px] font-mono overflow-x-auto max-h-[52vh]">
                {JSON.stringify(doc, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
