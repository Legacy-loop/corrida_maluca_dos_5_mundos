"use strict";

const assert = require("node:assert/strict");
const { MAPS, createMaps, validateMap } = require("../js/maps.js");
const { LEVELS, levelWorlds } = require("../js/challenge.js");

assert.equal(MAPS.length, 6);
MAPS.forEach((map, index) => {
  assert.equal(validateMap(map), true, `map ${index} must be reachable and clear`);
  assert.equal(map.spawn.x < map.gate.x, true);
  assert.equal(Array.isArray(map.obstacles), true);
  if (index === 0) assert.equal(map.items.length, 5);
  else assert.equal(map.items.length, 0);
});

assert.throws(() => validateMap({
  stage: "broken",
  spawn: { x: 100, y: 100 },
  obstacles: [{ x: 80, y: 80, w: 40, h: 40 }],
  items: [],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null
}), /spawn sobreposto/);

assert.throws(() => validateMap({
  stage: "blocked",
  spawn: { x: 42, y: 280 },
  obstacles: [{ x: 80, y: 0, w: 20, h: 560 }],
  items: [],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null
}), /inalcançável/);

assert.throws(() => validateMap({
  stage: "overlap",
  spawn: { x: 42, y: 280 },
  obstacles: [],
  items: [{ key: "T", x: 100, y: 100 }, { key: "X", x: 110, y: 105 }],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null
}), /sobrepostos/);

for (const level of LEVELS) {
  const items = level.stock.map((key, order) => ({ key, order: order + 1 }));
  const maps = createMaps(["garage", ...levelWorlds(level).map(world => world.theme)], items);
  assert.equal(maps[0].items.length, level.stock.length);
  maps.forEach(map => assert.equal(validateMap(map), true, `${level.id} map ${map.stage} must be reachable`));
  assert.equal(maps.at(-1).finish !== null, true);
}

console.log("maps.test.js: classic and challenge maps, including eight garage slots, passed");
