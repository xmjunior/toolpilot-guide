(function () {
  'use strict';
  const es = document.documentElement.lang === 'es';
  const t = (a, b) => es ? a : b;
  const ids = ['subs', 'rate', 'margin', 'cost'];
  const fields = ids.map(id => document.getElementById(id));
  const money = n => new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {style:'currency', currency:es ? 'EUR' : 'USD', maximumFractionDigits:2}).format(n);
  const count = n => n.toLocaleString(es ? 'es-ES' : 'en-US', {maximumFractionDigits:1});
  const net = document.getElementById(es ? 'profit' : 'net');
  const sales = document.getElementById(es ? 'detail' : 'sales');
  const threshold = document.getElementById(es ? 'breakEven' : 'breakeven');
  const path = es ? '/es/herramientas/calculadora-newsletter.html' : '/tools/newsletter-break-even-calculator.html';
  const base = 'https://toolpilot-guide.onrender.com' + path;
  function restore() {
    const q = new URLSearchParams(location.hash.slice(1));
    ids.forEach((id, i) => { if (q.has(id) && ToolPilotMath.number(q.get(id), [1e8,100,1e7,1e7][i]) !== null) fields[i].value = q.get(id); });
  }
  function calculate() {
    const result = ToolPilotMath.breakEven(...fields.map(f => f.value));
    if (!result) {
      net.textContent = '—'; sales.textContent = t('Completa los cuatro campos con valores dentro de los límites indicados.', 'Complete all four fields with values within the displayed limits.'); threshold.textContent = ''; return null;
    }
    net.textContent = money(result.net);
    sales.textContent = t('Compras hipotéticas al mes: ', 'Hypothetical monthly purchases: ') + count(result.sales) + t(' · Margen total: ', ' · Total contribution: ') + money(result.contribution);
    threshold.textContent = result.needed === null ? t('No se pueden cubrir costes positivos con una tasa de compra o margen igual a cero.', 'Positive costs cannot be covered with a zero purchase rate or margin.') : t('Suscriptores necesarios para cubrir costes: ', 'Subscribers needed to cover costs: ') + count(result.needed);
    return result;
  }
  async function copy(text, button) {
    try { await navigator.clipboard.writeText(text); button.textContent = t('Copiado', 'Copied'); }
    catch (_) {
      let output = document.getElementById('copyFallback');
      if (!output) { output = document.createElement('textarea'); output.id = 'copyFallback'; output.setAttribute('aria-label', t('Texto para copiar', 'Text to copy')); output.style.cssText = 'width:100%;min-height:120px;margin-top:16px'; button.parentElement.appendChild(output); }
      output.value = text; output.focus(); output.select(); button.textContent = t('Texto seleccionado: copia manualmente', 'Text selected: copy manually');
    }
  }
  function on(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', () => fn(el)); }
  on('copy', button => {
    const r = calculate(); if (!r) return;
    copy(t('Escenario ToolPilot (no es una predicción)', 'ToolPilot scenario (not a forecast)') + '\n' + t('Suscriptores: ', 'Subscribers: ') + r.subs + '\n' + t('Tasa de compra: ', 'Purchase rate: ') + r.rate + '%\n' + t('Margen por compra: ', 'Margin per purchase: ') + money(r.margin) + '\n' + t('Costes al mes: ', 'Monthly costs: ') + money(r.cost) + '\n' + t('Resultado mensual: ', 'Monthly result: ') + money(r.net) + '\n' + threshold.textContent + '\n' + base, button);
  });
  ['share', 'copyShare'].forEach(id => on(id, button => copy(base + '?utm_source=share&utm_medium=referral&utm_campaign=free_calculator', button)));
  on('scenarioLink', button => { const r = calculate(); if (r) copy(base + '#' + new URLSearchParams(ids.map(id => [id, r[id]])), button); });
  on('copyEmbed', button => copy(document.getElementById('embedCode').value, button));
  fields.forEach(field => field.addEventListener('input', calculate));
  window.addEventListener('hashchange', () => { restore(); calculate(); });
  restore(); calculate();
})();
