"use strict";

const assert = require("node:assert/strict");
const PDA = require("../js/pda.js");
const { LEVELS, evaluatePlan, solutionString, sequenceFor } = require("../js/challenge.js");

function execute(route, sequence) {
  const pda = new PDA({ route });
  let result;
  for (const symbol of sequence) {
    result = pda.processSymbol(symbol);
    if (!result.accepted) break;
  }
  return { pda, result };
}

for (const level of LEVELS) {
  const plan = [...level.route].reverse();
  const solution = solutionString(level);
  assert.equal(solution, sequenceFor(level, plan));
  assert.equal(execute(level.route, solution).pda.status, "accepted", `${level.id} solution must be accepted`);
  assert.deepEqual(evaluatePlan(level, plan), { ok: true, failAt: null, required: null, top: "Z0", reason: null });

  let acceptedPlans = 0;
  const seenPlans = new Set();
  function enumerate(available, selected = []) {
    const signature = selected.join("");
    if (!seenPlans.has(signature)) {
      seenPlans.add(signature);
      if (evaluatePlan(level, selected).ok) acceptedPlans++;
    }
    for (let index = 0; index < available.length; index++) {
      enumerate([...available.slice(0, index), ...available.slice(index + 1)], [...selected, available[index]]);
    }
  }
  enumerate(level.stock);
  assert.equal(acceptedPlans, 1, `${level.id} must have one valid inventory plan`);

  const swapped = [...plan];
  [swapped[swapped.length - 1], swapped[swapped.length - 2]] =
    [swapped[swapped.length - 2], swapped[swapped.length - 1]];
  assert.deepEqual(evaluatePlan(level, swapped), {
    ok: false, failAt: 0, required: level.route[0], top: swapped.at(-1), reason: "wrong-top"
  });

  const omitted = plan.slice(1);
  const omittedResult = evaluatePlan(level, omitted);
  assert.equal(omittedResult.failAt, level.route.length - 1);
  assert.equal(omittedResult.reason, "empty-stack");

  const withSpare = ["X", ...plan];
  const leftover = evaluatePlan(level, withSpare);
  assert.deepEqual(leftover, {
    ok: false, failAt: "finish", required: "f", top: "X", reason: "leftover"
  });
  const pdaLeftover = execute(level.route, sequenceFor(level, withSpare));
  assert.equal(pdaLeftover.result.failure.portalIndex, "finish");
  assert.equal(pdaLeftover.result.failure.reason, "leftover");

  const wrongTop = execute(level.route, sequenceFor(level, swapped));
  assert.equal(wrongTop.result.failure.portalIndex, 0);
  assert.equal(wrongTop.result.failure.reason, "wrong-top");
  const empty = execute(level.route, level.route.join("") + "f");
  assert.equal(empty.result.failure.reason, "empty-stack");
}

const classic = execute(["A", "L", "N", "X", "T"], "txnlaALNXTf");
assert.equal(classic.pda.status, "accepted");
assert.equal(classic.pda.state, "q6");
assert.deepEqual(classic.pda.stack, ["Z0"]);

console.log("challenge.test.js: unique plans, portal failures, leftovers, and classic route passed");
