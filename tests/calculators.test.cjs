const test = require('node:test');
const assert = require('node:assert/strict');
const {breakEven, compare} = require('../assets/calculator-core.js');
test('a 1,000-reader scenario yields 10 sales, 150 net and 250 break-even readers', () => {
  const r=breakEven(1000,1,20,50);assert.equal(r.sales,10);assert.equal(r.net,150);assert.equal(r.needed,250);
});
test('the first whole subscriber at break-even covers the costs, the preceding one does not', () => {
  const r=breakEven(1000,0.7,17,52);assert.equal(r.needed,437);
  assert.ok(breakEven(r.needed,0.7,17,52).net>=0);assert.ok(breakEven(r.needed-1,0.7,17,52).net<0);
});
test('zero costs require no sales; zero revenue cannot cover positive costs', () => {
  assert.equal(breakEven(0,0,0,0).needed,0);assert.equal(breakEven(1000,0,20,50).needed,null);assert.equal(breakEven(1000,1,0,50).net,-50);
});
test('blank, negative, non-finite and over-100% inputs do not become misleading results', () => {
  for (const v of ['',-1,Infinity,'bad']) assert.equal(breakEven(v,1,20,50),null);
  assert.equal(breakEven(1000,101,20,50),null);
});
test('49 fixed versus 10% costs cross at 490 revenue', () => {
  const r=compare(100,5,49,0,0,10);assert.equal(r.a,49);assert.equal(r.b,50);assert.equal(r.threshold,490);assert.equal(r.netA,451);
  assert.equal(compare(98,5,49,0,0,10).difference,0);
});
test('equal fee rates and identical plans do not invent a unique crossover', () => {
  assert.equal(compare(100,5,10,2,10,2).threshold,null);assert.equal(compare(100,5,10,2,10,2).difference,0);
});
