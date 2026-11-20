"use strict";

const assert = require("node:assert/strict");
const PDA = require("../js/pda.js");

function run(sequence) {
  const pda = new PDA();
  const results = [...sequence].map(symbol => pda.processSymbol(symbol));
  return { pda, results };
}

{
  const { pda, results } = run("txnlaALNXTf");
  assert.equal(results.every(result => result.accepted), true);
  assert.equal(pda.state, "q6");
  assert.deepEqual(pda.stack, ["Z0"]);
  assert.equal(pda.status, "accepted");
  assert.equal(pda.finishInput().status, "accepted");
  const before = pda.snapshot();
  const ignored = pda.processSymbol("t");
  assert.equal(ignored.accepted, false);
  assert.equal(ignored.status, "accepted");
  assert.deepEqual(pda.snapshot(), before);
}

for (const sequence of ["txnlaALNXTL", "txnlaANXTf", "tlnxaALNXTf"]) {
  const { pda } = run(sequence);
  assert.equal(pda.status, "rejected", `${sequence} should be rejected`);
  assert.ok(pda.last.message.length > 0);
  const before = pda.snapshot();
  const ignored = pda.processSymbol("f");
  assert.equal(ignored.accepted, false);
  assert.deepEqual(pda.snapshot(), before);
}

assert.match(run("txnlaANXTf").pda.last.message, /Você tentou instalar N.*topo atual é L.*LIFO/);
assert.match(run("tlnxaALNXTf").pda.last.message, /LIFO/);

{
  const { pda } = run("txnlaALNXT");
  const result = pda.finishInput();
  assert.equal(result.status, "incomplete");
  assert.equal(pda.state, "q5");
  assert.deepEqual(pda.stack, ["Z0"]);
  assert.match(result.message, /INCOMPLETA/);
}

{
  const pda = new PDA();
  assert.deepEqual(pda.stack, ["Z0"]);
  pda.processSymbol("t");
  assert.deepEqual(pda.stack, ["Z0", "T"]);
  assert.equal(pda.top, "T");
  assert.match(pda.last.message, /Combustível térmico/);
  const snapshot = pda.snapshot();
  pda.processSymbol("x");
  pda.restore(snapshot);
  assert.deepEqual(pda.stack, ["Z0", "T"]);
  assert.equal(pda.state, "q0");
}

console.log("pda.test.js: acceptance, rejection, incompleteness, stack, messages and terminal lock passed");
