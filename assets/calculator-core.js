/* Shared, dependency-free maths for ToolPilot's free tools. */
(function (root) {
  'use strict';
  function number(value, max) {
    if (String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
  }
  function breakEven(subs, rate, margin, cost) {
    const values = [number(subs, 1e8), number(rate, 100), number(margin, 1e7), number(cost, 1e7)];
    if (values.includes(null)) return null;
    [subs, rate, margin, cost] = values;
    const sales = subs * rate / 100, contribution = sales * margin;
    const ratio = rate * margin > 0 ? cost / (rate / 100 * margin) : null;
    const needed = cost === 0 ? 0 : ratio === null ? null : Math.ceil(ratio - Number.EPSILON * Math.max(1, ratio) * 4);
    return {subs, rate, margin, cost, sales, contribution, net: contribution - cost, needed};
  }
  function compare(paid, price, fixedA, percentA, fixedB, percentB) {
    const v = [number(paid, 1e8), number(price, 1e7), number(fixedA, 1e7), number(percentA, 100), number(fixedB, 1e7), number(percentB, 100)];
    if (v.includes(null)) return null;
    [paid, price, fixedA, percentA, fixedB, percentB] = v;
    const revenue = paid * price, a = fixedA + revenue * percentA / 100, b = fixedB + revenue * percentB / 100;
    const threshold = percentA === percentB ? null : (fixedB - fixedA) / ((percentA - percentB) / 100);
    return {revenue, a, b, netA: revenue - a, netB: revenue - b, difference: Math.abs(a - b), threshold: threshold !== null && threshold >= 0 ? threshold : null};
  }
  const api = {breakEven, compare, number};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ToolPilotMath = api;
})(typeof window !== 'undefined' ? window : this);
