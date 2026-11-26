import type { InteractiveExplainerDoc } from '../schema/dsl';

/**
 * Exports any InteractiveExplainerDoc into a completely self-contained, zero-dependency
 * interactive single-file HTML document that works offline in any browser!
 */
export function exportStandaloneHtml(doc: InteractiveExplainerDoc): void {
  const safeJson = JSON.stringify(doc).replace(/</g, '\\u003c');
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.title)} · ConceptPlay 互动图解</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Inter", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif; background: #F8FAFC; color: #0F172A; line-height: 1.65; padding: 32px 16px 64px; }
    .wrap { max-width: 920px; margin: 0 auto; }
    .hero { background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%); color: #fff; padding: 32px; border-radius: 18px; margin-bottom: 24px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.14); color: #93C5FD; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
    h1 { font-size: 26px; line-height: 1.3; margin-bottom: 8px; }
    .sub { color: #CBD5E1; font-size: 14px; margin-bottom: 16px; }
    .tldr { background: rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 18px; font-size: 13px; }
    .tldr li { margin-left: 18px; margin-bottom: 4px; }
    .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); }
    .card h2 { font-size: 18px; margin-bottom: 4px; color: #0F172A; }
    .card .desc { font-size: 13px; color: #64748B; margin-bottom: 16px; }
    .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .slider-row { margin-bottom: 12px; background: #F8FAFC; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; }
    .slider-head { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    input[type=range] { width: 100%; accent-color: #2563EB; }
    .kpi { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 12px 14px; }
    .kpi .k-label { font-size: 12px; color: #1E40AF; }
    .kpi .k-val { font-size: 22px; font-weight: 700; color: #0F172A; font-family: monospace; }
    .step-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .step-btn { border: 1px solid #CBD5E1; background: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .step-btn.active { background: #2563EB; color: #fff; border-color: #2563EB; }
    .step-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; font-size: 14px; }
    .choice { display: block; width: 100%; text-align: left; border: 1px solid #CBD5E1; background: #fff; padding: 10px 12px; border-radius: 8px; margin-top: 8px; cursor: pointer; font-size: 13px; }
    .choice.ok { border-color: #10B981; background: #ECFDF5; color: #065F46; font-weight: 600; }
    .choice.bad { border-color: #F43F5E; background: #FFF1F2; color: #9F1239; }
    footer { text-align: center; font-size: 12px; color: #64748B; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="wrap" id="app"></div>
  <script>
    const DOC = ${safeJson};
    const FUNCS = {
      min: Math.min, max: Math.max, abs: Math.abs,
      sqrt: x => Math.sqrt(Math.max(0, x)),
      log: x => Math.log(Math.max(1e-9, x)),
      exp: x => Math.exp(Math.min(20, x)),
      pow: Math.pow,
      clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
      round: (x, d = 0) => { const f = Math.pow(10, d); return Math.round(x * f) / f; },
      ifelse: (c, a, b) => (c > 0 ? a : b)
    };
    function evalFormula(expr, vars) {
      // Replace ^ with ** for standard evaluation over validated safe AST expressions
      const jsExpr = expr.replace(/\\^/g, '**');
      const keys = [...Object.keys(FUNCS), ...Object.keys(vars)];
      const vals = [...Object.values(FUNCS), ...Object.values(vars)];
      return Function(...keys, 'return (' + jsExpr + ');')(...vals);
    }
    const root = document.getElementById('app');
    let html = '<div class="hero"><span class="badge">' + DOC.category + ' · 约 ' + DOC.readingMinutes + ' 分钟互动阅读</span>';
    html += '<h1>' + DOC.title + '</h1><div class="sub">' + DOC.subtitle + '</div>';
    html += '<ul class="tldr">' + DOC.tldr.map(t => '<li>' + t + '</li>').join('') + '</ul></div>';
    root.innerHTML = html;

    DOC.blocks.forEach((b, bIdx) => {
      const sec = document.createElement('div');
      sec.className = 'card';
      sec.innerHTML = '<h2>' + b.title + '</h2><div class="desc">' + (b.subtitle || '') + '</div>';
      if (b.type === 'simulator') {
        const state = {};
        b.params.forEach(p => state[p.id] = p.defaultValue);
        const container = document.createElement('div');
        container.className = 'grid2';
        const left = document.createElement('div');
        const right = document.createElement('div');
        right.style.display = 'grid';
        right.style.gap = '10px';
        function renderOutputs() {
          right.innerHTML = b.outputs.map(o => {
            const v = evalFormula(o.formula, state);
            const txt = Number(v).toFixed(o.precision ?? 1);
            return '<div class="kpi"><div class="k-label">' + o.label + '</div><div class="k-val">' + txt + ' ' + (o.unit || '') + '</div><div style="font-size:12px;color:#475569;margin-top:4px">' + (o.interpretation || '') + '</div></div>';
          }).join('');
        }
        b.params.forEach(p => {
          const row = document.createElement('div');
          row.className = 'slider-row';
          row.innerHTML = '<div class="slider-head"><span>' + p.label + '</span><span id="val-' + bIdx + '-' + p.id + '">' + p.defaultValue + (p.unit || '') + '</span></div>';
          const inp = document.createElement('input');
          inp.type = 'range'; inp.min = p.min; inp.max = p.max; inp.step = p.step; inp.value = p.defaultValue;
          inp.oninput = (e) => {
            state[p.id] = Number(e.target.value);
            row.querySelector('#val-' + bIdx + '-' + p.id).textContent = state[p.id] + (p.unit || '');
            renderOutputs();
          };
          row.appendChild(inp);
          left.appendChild(row);
        });
        renderOutputs();
        container.appendChild(left); container.appendChild(right);
        sec.appendChild(container);
      } else if (b.type === 'step_flow') {
        let active = 0;
        const tabs = document.createElement('div'); tabs.className = 'step-tabs';
        const box = document.createElement('div'); box.className = 'step-box';
        function renderStep() {
          tabs.innerHTML = '';
          b.steps.forEach((s, idx) => {
            const btn = document.createElement('button');
            btn.className = 'step-btn' + (idx === active ? ' active' : '');
            btn.textContent = (s.badge || ('Step ' + (idx + 1))) + ' · ' + s.title;
            btn.onclick = () => { active = idx; renderStep(); };
            tabs.appendChild(btn);
          });
          const cur = b.steps[active];
          box.innerHTML = '<strong>' + cur.title + '</strong><p style="margin-top:6px">' + cur.detail + '</p>';
        }
        renderStep();
        sec.appendChild(tabs); sec.appendChild(box);
      } else if (b.type === 'quiz') {
        b.questions.forEach((q, qIdx) => {
          const qDiv = document.createElement('div');
          qDiv.style.marginBottom = '14px';
          qDiv.innerHTML = '<div style="font-weight:600;font-size:14px">' + (qIdx + 1) + '. ' + q.question + '</div>';
          const exp = document.createElement('div');
          exp.style.cssText = 'display:none;margin-top:8px;padding:10px;background:#EFF6FF;border-radius:8px;font-size:12px;';
          q.choices.forEach((c, cIdx) => {
            const btn = document.createElement('button');
            btn.className = 'choice';
            btn.textContent = c;
            btn.onclick = () => {
              Array.from(qDiv.querySelectorAll('.choice')).forEach((el, i) => {
                el.className = 'choice' + (i === q.correctIndex ? ' ok' : (i === cIdx ? ' bad' : ''));
              });
              exp.style.display = 'block';
              exp.textContent = '解析：' + q.explanation;
            };
            qDiv.appendChild(btn);
          });
          qDiv.appendChild(exp);
          sec.appendChild(qDiv);
        });
      } else if (b.type === 'compare_matrix') {
        let tbl = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #CBD5E1"><th style="padding:8px;text-align:left">方案</th>' + b.dimensions.map(d => '<th style="padding:8px;text-align:left">' + d.label + '</th>').join('') + '</tr></thead><tbody>';
        b.options.forEach(o => {
          tbl += '<tr style="border-bottom:1px solid #F1F5F9"><td style="padding:8px;font-weight:600">' + o.name + '</td>' + b.dimensions.map(d => '<td style="padding:8px"><strong>' + o.scores[d.key] + '/5</strong> · ' + (o.notes[d.key] || '') + '</td>').join('') + '</tr>';
        });
        tbl += '</tbody></table>';
        const wrap = document.createElement('div'); wrap.innerHTML = tbl; sec.appendChild(wrap);
      } else if (b.type === 'deep_dive_cards') {
        const g = document.createElement('div'); g.className = 'grid2';
        b.cards.forEach(c => {
          const item = document.createElement('div');
          item.style.cssText = 'border:1px solid #E2E8F0;border-radius:10px;padding:14px;';
          item.innerHTML = '<div style="font-size:11px;color:#B45309;font-weight:700">' + c.tag + '</div><div style="font-weight:700;margin:4px 0">' + c.title + '</div><div style="font-size:13px;color:#475569">' + c.deepExplanation + '</div>';
          g.appendChild(item);
        });
        sec.appendChild(g);
      }
      root.appendChild(sec);
    });

    const ft = document.createElement('footer');
    ft.textContent = 'Generated by ConceptPlay · AI Interactive Explainer Compiler (github.com/KellanZhuo/concept-play)';
    root.appendChild(ft);
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.id || 'concept-play-explainer'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
