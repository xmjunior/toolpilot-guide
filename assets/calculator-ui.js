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
  const sensitivity = document.createElement('p');
  sensitivity.id = 'rate-sensitivity';
  sensitivity.style.cssText = 'font-size:13px;line-height:1.5;margin-top:10px;opacity:.9';
  const requiredRate = document.createElement('p');
  requiredRate.id = 'required-purchase-rate';
  requiredRate.style.cssText = 'font-size:13px;line-height:1.5;margin:8px 0';
  threshold.insertAdjacentElement('afterend', requiredRate);
  requiredRate.insertAdjacentElement('afterend', sensitivity);
  const path = es ? '/es/herramientas/calculadora-newsletter.html' : '/tools/newsletter-break-even-calculator.html';
  const base = 'https://toolpilot-guide.onrender.com' + path;
  function restore() {
    const q = new URLSearchParams(location.hash.slice(1));
    ids.forEach((id, i) => { if (q.has(id) && ToolPilotMath.number(q.get(id), [1e8,100,1e7,1e7][i]) !== null) fields[i].value = q.get(id); });
  }
  function calculate() {
    const result = ToolPilotMath.breakEven(...fields.map(f => f.value));
    if (!result) {
      net.textContent = '—'; sales.textContent = t('Completa los cuatro campos con valores dentro de los límites indicados.', 'Complete all four fields with values within the displayed limits.'); threshold.textContent = ''; requiredRate.textContent = ''; sensitivity.textContent = ''; return null;
    }
    net.textContent = money(result.net);
    sales.textContent = t('Compras hipotéticas al mes: ', 'Hypothetical monthly purchases: ') + count(result.sales) + t(' · Margen total: ', ' · Total contribution: ') + money(result.contribution);
    threshold.textContent = result.needed === null ? t('No se pueden cubrir costes positivos con una tasa de compra o margen igual a cero.', 'Positive costs cannot be covered with a zero purchase rate or margin.') : t('Suscriptores necesarios para cubrir costes: ', 'Subscribers needed to cover costs: ') + count(result.needed);
    // Reverse the same model: what purchase rate would cover costs at the subscriber count entered?
    // Round the displayed threshold upward, so rounding cannot suggest a rate below break-even.
    const minRate = result.cost === 0 ? 0 :
      (result.subs > 0 && result.margin > 0 ? result.cost / (result.subs * result.margin) * 100 : null);
    if (minRate === null) {
      requiredRate.textContent = t('Con cero suscriptores o margen cero no se pueden cubrir costes positivos.', 'With zero subscribers or zero margin, positive costs cannot be covered.');
    } else if (minRate > 100) {
      requiredRate.textContent = t('Con estos suscriptores y margen, ni siquiera una tasa de compra del 100% cubriría los costes.', 'At this subscriber count and margin, even a 100% purchase rate would not cover costs.');
    } else {
      const shownRate = minRate === 0 ? 0 : Math.max(0.001, Math.ceil(minRate * 1000 - 1e-10) / 1000);
      const rateLabel = new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumFractionDigits:3}).format(shownRate);
      requiredRate.textContent = t('Tasa de compra para cubrir costes con estos suscriptores (redondeada al alza): ', 'Break-even purchase rate with these subscribers (rounded up): ') + rateLabel + '%. ' +
        t('Modelo hipotético de una compra por comprador al mes.', 'Hypothetical model with one purchase per buyer per month.');
    }
    // A small what-if comparison helps users avoid treating one conversion assumption as a prediction.
    sensitivity.textContent = '';
    if (result.rate > 0 && result.margin > 0 && result.cost > 0) {
      const lowerRate = result.rate / 2, higherRate = Math.min(100, result.rate * 2);
      const lower = ToolPilotMath.breakEven(0, lowerRate, result.margin, result.cost);
      const higher = ToolPilotMath.breakEven(0, higherRate, result.margin, result.cost);
      const fmtRate = n => new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {maximumSignificantDigits:8}).format(n);
      sensitivity.textContent = es
        ? `Sensibilidad (escenarios, no pronósticos): con una tasa de compra del ${fmtRate(lowerRate)}% necesitarías ${count(lower.needed)} suscriptores; con ${fmtRate(higherRate)}%, ${count(higher.needed)}.`
        : `Sensitivity (scenarios, not forecasts): a ${fmtRate(lowerRate)}% purchase rate would require ${count(lower.needed)} subscribers; at ${fmtRate(higherRate)}%, ${count(higher.needed)}.`;
    }
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
