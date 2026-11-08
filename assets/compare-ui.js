(function () {
  'use strict';
  const es = document.documentElement.lang === 'es', t = (a,b) => es ? a : b;
  const money = n => new Intl.NumberFormat(es ? 'es-ES' : 'en-US', {style:'currency',currency:'USD'}).format(n);
  const ids = ['paid','price','fixedA','percentA','fixedB','percentB'];
  function render() {
    const r = ToolPilotMath.compare(...ids.map(id => document.getElementById(id).value));
    const status = document.getElementById('comparisonSummary');
    if (!r) { status.textContent = t('Completa los campos con valores válidos.', 'Complete all fields with valid values.'); ['costA','costB','revenue','remainingA','remainingB'].forEach(id => document.getElementById(id).textContent='—'); return; }
    document.getElementById('costA').textContent = money(r.a);
    document.getElementById('costB').textContent = money(r.b);
    document.getElementById('revenue').textContent = money(r.revenue);
    document.getElementById('remainingA').textContent = money(r.netA);
    document.getElementById('remainingB').textContent = money(r.netB);
    status.textContent = Math.abs(r.a-r.b)<0.005 ? t('Ambas opciones tienen el mismo coste de plataforma.', 'Both options have the same platform cost.') : (r.a < r.b ? t('Opción A', 'Option A') : t('Opción B','Option B')) + t(' cuesta ', ' costs ') + money(r.difference) + t(' menos al mes con estos supuestos.', ' less per month under these assumptions.');
    if (r.threshold !== null) status.textContent += t(' Se igualan con ingresos mensuales de ', ' Costs match at monthly revenue of ') + money(r.threshold) + '.';
  }
  document.getElementById('preset').addEventListener('change', function () {
    if (this.value === 'custom') return;
    document.getElementById('fixedA').value = this.value;
    document.getElementById('percentA').value = '0'; document.getElementById('fixedB').value = '0'; document.getElementById('percentB').value = '10'; render();
  });
  ids.forEach(id => document.getElementById(id).addEventListener('input', function () { if (['fixedA','percentA','fixedB','percentB'].includes(id)) document.getElementById('preset').value='custom'; render(); }));
  render();
})();
