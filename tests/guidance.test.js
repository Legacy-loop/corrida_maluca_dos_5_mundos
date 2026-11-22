"use strict";

const assert = require("node:assert/strict");
const { createMaps, MAPS } = require("../js/maps.js");
require("../js/guidance.js");

const { buildPath, projectPath, computeGuide } = global.CM;

for (const map of MAPS) {
  const path = buildPath(map.waypoints);
  assert.equal(path.points[0].x, map.spawn.x);
  assert.equal(path.points[0].y, map.spawn.y);
  assert.ok(path.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));

  const gate = map.finish || map.gate;
  const target = { x: gate.x + gate.w / 2, y: gate.y + gate.h / 2 };
  let hint = 0;
  let previousRemaining = Infinity;
  const cutPoints = [];
  for (let s = 0; s <= path.length; s += 50) {
    cutPoints.push(require("../js/guidance.js").pointAtArc(path, s));
  }
  cutPoints.forEach(point => {
    const guide = computeGuide({ map, player: point, target, hint });
    hint = guide.sCar;
    assert.ok(Math.hypot(guide.points[0].x - point.x, guide.points[0].y - point.y) <= 1);
    const remaining = Math.abs(guide.sTarget - guide.sCar);
    assert.ok(remaining <= previousRemaining + 2,
      `${map.theme}: remaining guide distance increased from ${previousRemaining} to ${remaining}`);
    previousRemaining = remaining;
  });
}

const garage = MAPS[0];
let garageHint = 0;
for (const item of garage.items) {
  const player = { x: garage.spawn.x, y: garage.spawn.y };
  const guide = computeGuide({ map: garage, player, target: item, hint: garageHint });
  assert.ok(Math.hypot(guide.target.x - item.x, guide.target.y - item.y) <= 1);
  garageHint = guide.sCar;
}

const garageGate = garage.gate;
const garagePlayer = { x: garage.items.at(-1).x, y: garage.items.at(-1).y };
const gateGuide = computeGuide({
  map: garage,
  player: garagePlayer,
  target: { x: garageGate.x + garageGate.w / 2, y: garageGate.y + garageGate.h / 2 },
  hint: garageHint
});
assert.ok(gateGuide.targetDistance >= 0);

const firstGuide = computeGuide({
  map: garage,
  player: { x: 45, y: 280 },
  target: garage.items[0],
  hint: 0
});
const movedGuide = computeGuide({
  map: garage,
  player: { x: 55, y: 280 },
  target: garage.items[0],
  hint: firstGuide.sCar
});
const sameCar = computeGuide({
  map: garage,
  player: { x: 45, y: 280 },
  target: garage.items[0],
  hint: 0
});
const anchorA = firstGuide.chevrons.map(chevron => `${chevron.point.x}:${chevron.point.y}`);
const anchorB = sameCar.chevrons.map(chevron => `${chevron.point.x}:${chevron.point.y}`);
assert.deepEqual(anchorA, anchorB);
assert.ok(!movedGuide.chevrons.some(chevron => !Number.isFinite(chevron.point.x)));

const cleaned = buildPath([{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 10 }]);
assert.ok(cleaned.points.length >= 2);
assert.ok(!cleaned.s.some(value => !Number.isFinite(value)));

const phaseThree = createMaps([
  "garage",
  "desert", "volcano", "desert", "snow", "track", "swamp"
], []);
const mirroredDesert = phaseThree.filter(map => map.theme === "desert")[1];
const mirrorGuide = computeGuide({
  map: mirroredDesert,
  player: mirroredDesert.spawn,
  target: mirroredDesert.gate,
  hint: 0
});
assert.ok(Number.isFinite(mirrorGuide.sCar));

console.log("guidance.test.js: monotonic guidance, highlighted targets, anchored chevrons and mirrored maps passed");
