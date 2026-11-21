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
    { key: "T", order: 1 },
    { key: "X", order: 2 },
    { key: "N", order: 3 },
    { key: "L", order: 4 },
    { key: "A", order: 5 }
  ];
  const barrierLayouts = {
    garage: {
      spawn: { x: 45, y: 280 }, xs: [165, 320, 475, 630, 785],
      gaps: [130, 430, 145, 415, 125], opening: 174
    },
    desert: {
      spawn: { x: 45, y: 410 }, xs: [155, 315, 475, 635, 795],
      gaps: [125, 430, 135, 420, 120], opening: 174
    },
    swamp: {
      spawn: { x: 45, y: 165 }, xs: [135, 275, 415, 555, 695, 835],
      gaps: [145, 415, 145, 415, 145, 415], opening: 168
    },
    snow: {
      spawn: { x: 45, y: 400 }, xs: [150, 305, 460, 615, 780],
      gaps: [125, 430, 145, 420, 120], opening: 174
    },
    track: {
      spawn: { x: 45, y: 280 }, xs: [165, 330, 495, 660, 805],
      gaps: [145, 420, 125, 435, 155], opening: 174
    },
    volcano: {
      spawn: { x: 45, y: 145 }, xs: [155, 315, 475, 635, 795],
      gaps: [420, 135, 410, 125, 430], opening: 174
    }
  };
  const PLAYER_STEP = 1 / 30;
  const CLEARANCE_RADIUS = PLAYER_RADIUS + 4;
  const COMFORT_RADIUS = PLAYER_RADIUS + 11;
  const garageItemCount = 8;

  function pointHitsBlock(point, block, radius) {
    const nearestX = Math.max(block.x, Math.min(point.x, block.x + block.w));
    const nearestY = Math.max(block.y, Math.min(point.y, block.y + block.h));
    return Math.hypot(point.x - nearestX, point.y - nearestY) < radius;
  }

  function lineIsClear(from, to, obstacles, radius) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / 6));
    for (let index = 0; index <= steps; index++) {
      const progress = index / steps;
      const point = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress
      };
      if (obstacles.some(block => pointHitsBlock(point, block, radius))) return false;
    }
    return true;
  }

  function createBarriers(layout) {
    const halfOpening = layout.opening / 2;
    const thickness = layout.theme === "track" ? 28 : layout.theme === "swamp" ? 20 : 24;
    return layout.xs.flatMap((x, index) => {
      const gap = layout.gaps[index];
      return [
        { x, y: 0, w: thickness, h: gap - halfOpening },
        { x, y: gap + halfOpening, w: thickness, h: HEIGHT - gap - halfOpening }
      ];
    });
  }

  function createWaypoints(layout) {
    const waypoints = [{ ...layout.spawn }];
    const thickness = layout.theme === "track" ? 28 : layout.theme === "swamp" ? 20 : 24;
    let previousY = layout.spawn.y;
    layout.xs.forEach((x, index) => {
      const before = x - 40;
      const after = Math.min(x + thickness + 30, WIDTH - 35);
      const gap = layout.gaps[index];
      waypoints.push({ x: before, y: previousY }, { x: before, y: gap }, { x: after, y: gap });
      previousY = gap;
    });
    const lastGap = layout.gaps[layout.gaps.length - 1];
    waypoints.push({ x: WIDTH - 35, y: lastGap });
    return waypoints;
  }

  function pathLength(waypoints) {
    return waypoints.slice(1).reduce((total, point, index) => {
      const previous = waypoints[index];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);
  }

  function pointAlongPath(waypoints, distance) {
    let remaining = distance;
    for (let index = 1; index < waypoints.length; index++) {
      const from = waypoints[index - 1];
      const to = waypoints[index];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (remaining <= length) {
        const progress = length ? remaining / length : 0;
        return {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress
        };
      }
      remaining -= length;
    }
    return { ...waypoints.at(-1) };
  }

  function pointClearance(point, obstacles) {
    return Math.min(...obstacles.map(block => {
      const nearestX = Math.max(block.x, Math.min(point.x, block.x + block.w));
      const nearestY = Math.max(block.y, Math.min(point.y, block.y + block.h));
      return Math.hypot(point.x - nearestX, point.y - nearestY);
    }));
  }

  function placeItems(items, waypoints, obstacles) {
    const length = pathLength(waypoints);
    let previousDistance = 0;
    return items.map((item, index) => {
      const desired = length * (index + 1) / (items.length + 1);
      const candidates = [];
      for (let distance = Math.max(previousDistance + 45, desired - 80);
        distance <= Math.min(length - 45, desired + 80); distance += 5) {
        const point = pointAlongPath(waypoints, distance);
        if (pointClearance(point, obstacles) >= COMFORT_RADIUS + 2) {
          candidates.push({ point, distance, offset: Math.abs(distance - desired) });
        }
      }
      candidates.sort((a, b) => a.offset - b.offset);
      const selected = candidates[0];
      if (!selected) throw new RangeError(`Não há espaço seguro para o item ${item.order || index + 1}.`);
      previousDistance = selected.distance;
      return { ...selected.point, ...item };
    });
  }

  function mirrorMap(map) {
    const mirrorPoint = point => ({ ...point, y: HEIGHT - point.y });
    const mirrorRect = rect => ({ ...rect, y: HEIGHT - rect.y - rect.h });
    map.spawn = mirrorPoint(map.spawn);
    map.waypoints = map.waypoints.map(mirrorPoint);
    map.items = map.items.map(mirrorPoint);
    map.obstacles = map.obstacles.map(mirrorRect);
    map.gate = mirrorRect(map.gate);
    if (map.finish) map.finish = mirrorRect(map.finish);
    map.pathLength = pathLength(map.waypoints);
    return map;
  }

  function createMap(theme, { items = [], finish = false, stage = theme, variant = 0 } = {}) {
    const source = barrierLayouts[theme];
    if (!source) throw new TypeError(`Tema de mapa inválido: ${theme}.`);
    if (items.length > garageItemCount) throw new RangeError("A garagem aceita no máximo oito itens.");
    const layout = { ...source, theme };
    const waypoints = createWaypoints(layout);
    const obstacles = createBarriers(layout);
    const lastGap = layout.gaps.at(-1);
    const gate = { x: WIDTH - 55, y: lastGap - 40, w: 40, h: 80 };
    const map = {
      stage,
      theme,
      variant,
      spawn: { ...layout.spawn },
      obstacles,
      items: placeItems(items, waypoints, obstacles),
      gate,
      finish: finish ? { ...gate } : null,
      waypoints,
      pathLength: pathLength(waypoints),
      path: { points: waypoints.map(point => ({ ...point })) }
    };
    return variant % 2 === 1 ? mirrorMap(map) : map;
  }

  function createMaps(worlds, items = []) {
    if (!Array.isArray(worlds) || worlds.length < 2 || worlds[0] !== "garage") {
      throw new TypeError("Uma rota deve começar na garagem e conter ao menos um mundo.");
    }
    const occurrences = new Map();
    return worlds.map((theme, index) => {
      const variant = occurrences.get(theme) || 0;
      occurrences.set(theme, variant + 1);
      return createMap(theme, {
        items: index === 0 ? items : [],
        finish: index === worlds.length - 1,
        stage: `${index}: ${theme}`,
        variant
      });
    });
  }

  const classicWorlds = ["garage", "desert", "swamp", "snow", "track", "volcano"];
  const MAPS = createMaps(classicWorlds, collectItems);

  function mapTargets(map) {
    return [...(map.items || []), ...(map.finish ? [map.finish] : [map.gate])];
  }

  function shortestReachableTargets(map, targets) {
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
        const position = encode(x, y);
        if (x < 2 || x >= columns - 2 || y < 2 || y >= rows - 2 || distances.has(position)) continue;
        const point = { x: x * cell, y: y * cell };
        if (map.obstacles.some(block => pointHitsBlock(point, block, COMFORT_RADIUS))) continue;
        distances.set(position, distance + 1);
        queue.push({ x, y });
      }
    }
    return targets.map(target => {
      const center = { x: target.x + (target.w || 0) / 2, y: target.y + (target.h || 0) / 2 };
      return distances.get(encode(Math.round(center.x / cell), Math.round(center.y / cell)));
    });
  }

  function turnCount(waypoints) {
    let turns = 0;
    for (let index = 1; index < waypoints.length - 1; index++) {
      const before = waypoints[index - 1];
      const current = waypoints[index];
      const after = waypoints[index + 1];
      const first = { x: current.x - before.x, y: current.y - before.y };
      const second = { x: after.x - current.x, y: after.y - current.y };
      const cosine = (first.x * second.x + first.y * second.y) /
        (Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y));
      if (Math.acos(Math.max(-1, Math.min(1, cosine))) >= Math.PI / 3) turns++;
    }
    return turns;
  }

  function validateMap(map) {
    const errors = [];
    if (!map || !map.spawn || !Array.isArray(map.obstacles)) {
      throw new Error("Mapa inválido: spawn e obstáculos são obrigatórios.");
    }
    if (!map.gate || !Array.isArray(map.waypoints)) errors.push("portão e waypoints são obrigatórios");
    if (map.obstacles.length > 25) errors.push("mais de 25 obstáculos");
    const rectangles = [...map.obstacles, ...mapTargets(map)];
    for (const rect of rectangles) {
      if (rect.x < 0 || rect.y < 0 || rect.x + (rect.w || 0) > WIDTH || rect.y + (rect.h || 0) > HEIGHT) {
        errors.push("obstáculo ou alvo fora dos limites do mapa");
        break;
      }
    }
    if (map.obstacles.some(block => pointHitsBlock(map.spawn, block, PLAYER_RADIUS))) {
      errors.push("spawn sobreposto a um obstáculo");
    }
    for (const target of mapTargets(map)) {
      const point = { x: target.x + (target.w || 0) / 2, y: target.y + (target.h || 0) / 2 };
      if (map.obstacles.some(block => pointHitsBlock(point, block, PLAYER_RADIUS))) {
        errors.push("alvo sobreposto a obstáculo");
      }
    }
    const targets = mapTargets(map);
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i];
        const b = targets[j];
        const aCenter = { x: a.x + (a.w || 0) / 2, y: a.y + (a.h || 0) / 2 };
        const bCenter = { x: b.x + (b.w || 0) / 2, y: b.y + (b.h || 0) / 2 };
        if (Math.hypot(aCenter.x - bCenter.x, aCenter.y - bCenter.y) < PLAYER_RADIUS * 2) {
          errors.push("alvos sobrepostos");
        }
      }
    }
    if (map.waypoints?.length < 2 || Math.hypot(map.spawn.x - map.waypoints[0].x, map.spawn.y - map.waypoints[0].y) > 1) {
      errors.push("waypoints não começam no spawn");
    }
    for (let index = 1; index < map.waypoints.length; index++) {
      if (!lineIsClear(map.waypoints[index - 1], map.waypoints[index], map.obstacles, CLEARANCE_RADIUS)) {
        errors.push(`segmento de waypoint ${index} bloqueado`);
        break;
      }
    }
    const target = map.finish || map.gate;
    const targetPoint = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    const directDistance = Math.hypot(targetPoint.x - map.spawn.x, targetPoint.y - map.spawn.y);
    const circuitLength = pathLength(map.waypoints);
    const ratio = circuitLength / directDistance;
    if (ratio < 1.8 || ratio > 3.6) errors.push(`proporção do circuito inválida (${ratio.toFixed(2)})`);
    if (circuitLength / 205 < 6 || circuitLength / 205 > 14) errors.push("duração estimada do circuito fora do intervalo");
    if (turnCount(map.waypoints) < (map.theme === "garage" ? 4 : 3)) errors.push("curvas insuficientes");
    if (lineIsClear(map.spawn, targetPoint, map.obstacles, PLAYER_RADIUS)) errors.push("reta entre spawn e portão sem bloqueio");
    const distances = shortestReachableTargets(map, targets);
    if (distances.some(distance => !Number.isFinite(distance))) errors.push("alvo inalcançável com folga confortável");
    if (errors.length) throw new Error(`Mapa ${map.stage}: ${errors.join("; ")}`);
    return true;
  }

  MAPS.forEach(validateMap);
  return {
    ITEMS: collectItems,
    MAPS,
    PLAYER_STEP,
    createMap,
    createMaps,
    equipmentLabel: key => EQUIPMENT[key].name,
    pathLength,
    validateMap
  };
});
