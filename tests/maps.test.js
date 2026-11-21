"use strict";

const assert = require("node:assert/strict");
const { MAPS, createMaps, validateMap } = require("../js/maps.js");
const { HEIGHT, WIDTH, PLAYER_RADIUS } = require("../js/constants.js");
require("../js/player.js");
const { Player } = global.CM;
const { LEVELS, levelWorlds } = require("../js/challenge.js");

function pointHitsBlock(point, block, radius) {
  const x = Math.max(block.x, Math.min(point.x, block.x + block.w));
  const y = Math.max(block.y, Math.min(point.y, block.y + block.h));
  return Math.hypot(point.x - x, point.y - y) < radius;
}

function lineIsClear(from, to, map) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.ceil(distance / 6);
  for (let index = 0; index <= steps; index++) {
    const progress = index / Math.max(steps, 1);
    const point = {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress
    };
    if (map.obstacles.some(block => pointHitsBlock(point, block, PLAYER_RADIUS))) return false;
  }
  return true;
}

function turnsAtLeastSixtyDegrees(points) {
  let count = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const before = points[index - 1];
    const current = points[index];
    const after = points[index + 1];
    const a = { x: current.x - before.x, y: current.y - before.y };
    const b = { x: after.x - current.x, y: after.y - current.y };
    const cosine = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
    if (Math.acos(Math.max(-1, Math.min(1, cosine))) >= Math.PI / 3) count++;
  }
  return count;
}

function shortestDistance(map, target) {
  const cell = 10;
  const columns = Math.floor(WIDTH / cell) + 1;
  const rows = Math.floor(HEIGHT / cell) + 1;
  const start = { x: Math.round(map.spawn.x / cell), y: Math.round(map.spawn.y / cell) };
  const encode = (x, y) => y * columns + x;
  const queue = [start];
  const distances = new Map([[encode(start.x, start.y), 0]]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const distance = distances.get(encode(current.x, current.y));
    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = encode(x, y);
      if (x < 2 || x >= columns - 2 || y < 2 || y >= rows - 2 || distances.has(key)) continue;
      const point = { x: x * cell, y: y * cell };
      if (map.obstacles.some(block => pointHitsBlock(point, block, PLAYER_RADIUS + 11))) continue;
      distances.set(key, distance + 1);
      queue.push({ x, y });
    }
  }
  const center = { x: target.x + (target.w || 0) / 2, y: target.y + (target.h || 0) / 2 };
  return distances.get(encode(Math.round(center.x / cell), Math.round(center.y / cell)));
}

function assertCircuit(map, requiredTurns = 3) {
  assert.equal(validateMap(map), true, `${map.stage} should be clear and reachable`);
  assert.ok(map.obstacles.length <= 25);
  assert.ok(map.waypoints.length >= 2);
  assert.ok(Math.hypot(map.spawn.x - map.waypoints[0].x, map.spawn.y - map.waypoints[0].y) <= 1);
  for (let index = 1; index < map.waypoints.length; index++) {
    assert.equal(lineIsClear(map.waypoints[index - 1], map.waypoints[index], map), true,
      `${map.stage} waypoint segment ${index} has clearance`);
  }
  assert.ok(turnsAtLeastSixtyDegrees(map.waypoints) >= requiredTurns);
  const gate = map.finish || map.gate;
  const destination = { x: gate.x + gate.w / 2, y: gate.y + gate.h / 2 };
  const directDistance = Math.hypot(destination.x - map.spawn.x, destination.y - map.spawn.y);
  const waypointDistance = map.pathLength;
  assert.ok(waypointDistance / directDistance >= 1.8 && waypointDistance / directDistance <= 3.6,
    `${map.stage} path/direct ratio is ${waypointDistance / directDistance}`);
  assert.ok(waypointDistance / 205 >= 6 && waypointDistance / 205 <= 14);
  assert.equal(lineIsClear(map.spawn, destination, map), false, `${map.stage} direct route must be blocked`);
  const allTargets = [...map.items, map.finish || map.gate];
  allTargets.forEach(target => assert.ok(Number.isFinite(shortestDistance(map, target)),
    `${map.stage} target at ${target.x},${target.y} must be reachable with comfortable clearance`));
}

assert.equal(MAPS.length, 6);
MAPS.forEach((map, index) => {
  assertCircuit(map, index === 0 ? 4 : 3);
  assert.equal(map.items.length, index === 0 ? 5 : 0);
});

assert.throws(() => validateMap({
  stage: "broken",
  spawn: { x: 100, y: 100 },
  obstacles: [{ x: 80, y: 80, w: 40, h: 40 }],
  items: [],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null,
  waypoints: []
}), /spawn sobreposto/);

assert.throws(() => validateMap({
  stage: "blocked",
  spawn: { x: 42, y: 280 },
  obstacles: [{ x: 80, y: 0, w: 20, h: 560 }],
  items: [],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null,
  waypoints: [{ x: 42, y: 280 }, { x: 850, y: 280 }]
}), /inalcançável/);

assert.throws(() => validateMap({
  stage: "overlap",
  spawn: { x: 42, y: 280 },
  obstacles: [],
  items: [{ key: "T", x: 100, y: 100 }, { key: "X", x: 110, y: 105 }],
  gate: { x: 850, y: 280, w: 24, h: 100 },
  finish: null,
  waypoints: [{ x: 42, y: 280 }, { x: 850, y: 280 }]
}), /sobrepostos/);

const collisionProbe = new Player({ x: 45, y: 280 });
collisionProbe.setDirection("right", true);
collisionProbe.update(1, [{ x: 100, y: 0, w: 20, h: HEIGHT }]);
assert.ok(collisionProbe.x < 100 - PLAYER_RADIUS,
  "large frame times must be subdivided so the player cannot pass through a wall");

for (const level of LEVELS) {
  const items = level.stock.map((key, order) => ({ key, order: order + 1 }));
  const maps = createMaps(["garage", ...levelWorlds(level).map(world => world.theme)], items);
  assert.equal(maps[0].items.length, level.stock.length);
  maps.forEach(map => assertCircuit(map, map.theme === "garage" ? 4 : 3));
  assert.equal(maps.at(-1).finish !== null, true);
}

for (const count of [5, 8]) {
  const items = Array.from({ length: count }, (_, index) => ({ key: "T", order: index + 1 }));
  const garage = createMaps(["garage", "desert"], items)[0];
  assert.equal(garage.items.length, count);
  garage.items.forEach((item, index) => {
    if (index) {
      const previous = garage.items[index - 1];
      assert.ok(Math.hypot(item.x - previous.x, item.y - previous.y) > 2);
    }
  });
  assertCircuit(garage, 4);
}

const phaseThreeMaps = createMaps(["garage", ...levelWorlds(LEVELS.at(-1)).map(world => world.theme)],
  LEVELS.at(-1).stock.map((key, order) => ({ key, order: order + 1 })));
const desertVisits = phaseThreeMaps.filter(map => map.theme === "desert");
assert.equal(desertVisits.length, 2);
assert.notDeepEqual(desertVisits[0].waypoints, desertVisits[1].waypoints);
assert.notDeepEqual(desertVisits[0].obstacles, desertVisits[1].obstacles);
assertCircuit(desertVisits[1]);

const signatures = MAPS.map(map => JSON.stringify([map.obstacles, map.waypoints]));
assert.equal(new Set(signatures).size, 6);
assert.equal(new Set(MAPS.map(map => `${map.theme}:${map.variant}`)).size, 6);

console.log("maps.test.js: six distinct circuits, measured paths, mirrored variants, and 5/8-item garages passed");
