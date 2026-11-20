(function (root, factory) {
  const constants = typeof module !== "undefined" && module.exports
    ? require("./constants.js")
    : root.CM;
  const values = factory(constants);
  if (typeof module !== "undefined" && module.exports) module.exports = values;
  root.CM = root.CM || {};
  Object.assign(root.CM, values);
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  const { EQUIPMENT, PLAYER_RADIUS, WIDTH, HEIGHT } = constants;
  const collectItems = [
    { key: "T", x: 110, y: 120, order: 1 },
    { key: "X", x: 270, y: 420, order: 2 },
    { key: "N", x: 440, y: 120, order: 3 },
    { key: "L", x: 610, y: 420, order: 4 },
    { key: "A", x: 760, y: 120, order: 5 }
  ];
  const layouts = {
    garage: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 180, y: 55, w: 105, h: 70 }, { x: 330, y: 395, w: 120, h: 75 }, { x: 530, y: 60, w: 95, h: 68 }, { x: 735, y: 385, w: 95, h: 85 }] },
    desert: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 115, y: 65, w: 120, h: 80 }, { x: 300, y: 390, w: 145, h: 70 }, { x: 505, y: 55, w: 130, h: 90 }, { x: 710, y: 395, w: 100, h: 75 }] },
    swamp: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 130, y: 65, w: 100, h: 92 }, { x: 290, y: 390, w: 120, h: 88 }, { x: 470, y: 45, w: 150, h: 96 }, { x: 720, y: 385, w: 90, h: 90 }] },
    snow: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 100, y: 390, w: 145, h: 80 }, { x: 290, y: 60, w: 110, h: 80 }, { x: 485, y: 395, w: 125, h: 76 }, { x: 690, y: 55, w: 120, h: 88 }] },
    track: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 115, y: 55, w: 145, h: 76 }, { x: 330, y: 395, w: 105, h: 75 }, { x: 505, y: 55, w: 135, h: 76 }, { x: 715, y: 395, w: 105, h: 75 }] },
    volcano: { spawn: { x: 42, y: 280 }, obstacles: [{ x: 105, y: 65, w: 100, h: 78 }, { x: 265, y: 390, w: 125, h: 85 }, { x: 460, y: 55, w: 150, h: 85 }, { x: 700, y: 390, w: 115, h: 85 }] }
  };
  const garageSlots = [
    { x: 110, y: 120 }, { x: 270, y: 420 }, { x: 440, y: 120 }, { x: 610, y: 420 },
    { x: 760, y: 120 }, { x: 150, y: 280 }, { x: 370, y: 280 }, { x: 670, y: 280 }
  ];
  function createMap(theme, { items = [], finish = false, stage = theme } = {}) {
    const layout = layouts[theme];
    if (!layout) throw new TypeError(`Tema de mapa inválido: ${theme}.`);
    const mapItems = items.map((item, index) => {
      const position = garageSlots[index];
      if (!position) throw new RangeError("A garagem aceita no máximo oito itens.");
      return { ...position, ...item };
    });
    return {
      stage,
      theme,
      spawn: { ...layout.spawn },
      obstacles: layout.obstacles.map(block => ({ ...block })),
      items: mapItems,
      gate: { x: 850, y: 280, w: 24, h: 100 },
      finish: finish ? { x: 820, y: 280, w: 24, h: 130 } : null,
      path: { x: 25, y: 232, w: 845, h: 96 }
    };
  }
  function createMaps(worlds, items = []) {
    if (!Array.isArray(worlds) || worlds.length < 2 || worlds[0] !== "garage") {
      throw new TypeError("Uma rota deve começar na garagem e conter ao menos um mundo.");
    }
    return worlds.map((theme, index) => createMap(theme, {
      items: index === 0 ? items : [],
      finish: index === worlds.length - 1,
      stage: `${index}: ${theme}`
    }));
  }
  const classicWorlds = ["garage", "desert", "swamp", "snow", "track", "volcano"];
  const MAPS = createMaps(classicWorlds, collectItems);
  function pointHitsBlock(point, block, radius) {
    const nearestX = Math.max(block.x, Math.min(point.x, block.x + block.w));
    const nearestY = Math.max(block.y, Math.min(point.y, block.y + block.h));
    return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
  }
  function validateMap(map) {
    const errors = [];
    if (!map || !map.spawn || !Array.isArray(map.obstacles)) {
      throw new Error("Mapa inválido: spawn e obstáculos são obrigatórios.");
    }
    if (map.spawn.x < PLAYER_RADIUS || map.spawn.x > WIDTH - PLAYER_RADIUS ||
        map.spawn.y < PLAYER_RADIUS || map.spawn.y > HEIGHT - PLAYER_RADIUS) {
      errors.push("spawn fora dos limites do mapa");
    }
    if (map.obstacles.some(block => pointHitsBlock(map.spawn, block, PLAYER_RADIUS))) {
      errors.push("spawn sobreposto a um obstáculo");
    }
    for (let i = 0; i < map.obstacles.length; i++) {
      for (let j = i + 1; j < map.obstacles.length; j++) {
        const a = map.obstacles[i];
        const b = map.obstacles[j];
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
          errors.push(`obstáculos ${i + 1} e ${j + 1} sobrepostos`);
        }
      }
    }
    const targets = [...(map.items || []), ...(map.gate ? [map.gate] : []), ...(map.finish ? [map.finish] : [])];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const center = { x: target.x + (target.w || 0) / 2, y: target.y + (target.h || 0) / 2 };
      if (map.obstacles.some(block => pointHitsBlock(center, block, PLAYER_RADIUS + 3))) {
        errors.push(`alvo ${i + 1} sobreposto a obstáculo`);
      }
      for (let j = i + 1; j < targets.length; j++) {
        const other = targets[j];
        const otherCenter = { x: other.x + (other.w || 0) / 2, y: other.y + (other.h || 0) / 2 };
        if (Math.hypot(center.x - otherCenter.x, center.y - otherCenter.y) < PLAYER_RADIUS * 2) {
          errors.push(`alvos ${i + 1} e ${j + 1} sobrepostos`);
        }
      }
    }
    const cell = 20;
    const columns = Math.floor(WIDTH / cell) + 1;
    const rows = Math.floor(HEIGHT / cell) + 1;
    const start = { x: Math.round(map.spawn.x / cell), y: Math.round(map.spawn.y / cell) };
    const key = (x, y) => `${x},${y}`;
    const queue = [start];
    const visited = new Set([key(start.x, start.y)]);
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const [dx, dy] of directions) {
        const x = current.x + dx;
        const y = current.y + dy;
        if (x < 1 || x >= columns - 1 || y < 1 || y >= rows - 1 || visited.has(key(x, y))) continue;
        const point = { x: x * cell, y: y * cell };
        if (map.obstacles.some(block => pointHitsBlock(point, block, PLAYER_RADIUS))) continue;
        visited.add(key(x, y));
        queue.push({ x, y });
      }
    }
    targets.forEach((target, index) => {
      const x = Math.round((target.x + (target.w || 0) / 2) / cell);
      const y = Math.round((target.y + (target.h || 0) / 2) / cell);
      if (!visited.has(key(x, y))) errors.push(`alvo ${index + 1} inalcançável`);
    });
    if (errors.length) throw new Error(`Mapa ${map.stage}: ${errors.join("; ")}`);
    return true;
  }
  MAPS.forEach(validateMap);
  return {
    ITEMS: collectItems,
    MAPS,
    createMap,
    createMaps,
    equipmentLabel: key => EQUIPMENT[key].name,
    validateMap
  };
});
