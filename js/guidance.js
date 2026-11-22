(function (root, factory) {
  const values = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = values;
  root.CM = root.CM || {};
  Object.assign(root.CM, values);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function cleanPoints(waypoints) {
    if (!Array.isArray(waypoints)) return [];
    const points = [];
    waypoints.forEach(point => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      if (points.length && Math.hypot(point.x - points.at(-1).x, point.y - points.at(-1).y) <= 0.001) return;
      points.push({ x: point.x, y: point.y });
    });
    const result = [];
    points.forEach((point, index) => {
      if (index === 0 || index === points.length - 1) {
        result.push(point);
        return;
      }
      const before = points[index - 1];
      const after = points[index + 1];
      const cross = (point.x - before.x) * (after.y - point.y) -
        (point.y - before.y) * (after.x - point.x);
      if (Math.abs(cross) > 0.001) result.push(point);
    });
    if (result.length === 1) result.push({ ...points.at(-1) });
    return result;
  }

  function buildPath(waypoints) {
    const points = cleanPoints(waypoints);
    const s = [0];
    for (let index = 1; index < points.length; index++) {
      s.push(s[index - 1] + Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y
      ));
    }
    return { points, s, length: s.at(-1) || 0 };
  }

  function projectPath(path, point, hint = 0) {
    if (!path?.points?.length) return { s: 0, point: { x: point?.x || 0, y: point?.y || 0 }, distance: 0 };
    const safeHint = Number.isFinite(hint) ? hint : 0;
    const candidates = [];
    for (let index = 1; index < path.points.length; index++) {
      const from = path.points[index - 1];
      const to = path.points[index];
      const segmentStart = path.s[index - 1];
      const segmentEnd = path.s[index];
      if (segmentEnd < safeHint - 120 || segmentStart > safeHint + 240) continue;
      candidates.push({ from, to, segmentStart, segmentEnd });
    }
    const pool = candidates.length ? candidates : path.points.slice(1).map((to, index) => ({
      from: path.points[index],
      to,
      segmentStart: path.s[index],
      segmentEnd: path.s[index + 1]
    }));
    let best = null;
    pool.forEach(segment => {
      const dx = segment.to.x - segment.from.x;
      const dy = segment.to.y - segment.from.y;
      const lengthSquared = dx * dx + dy * dy;
      if (!lengthSquared) return;
      const progress = Math.max(0, Math.min(1,
        ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / lengthSquared
      ));
      const projected = { x: segment.from.x + dx * progress, y: segment.from.y + dy * progress };
      const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
      if (distance > 70 && pool.length !== path.points.length - 1) return;
      const localLength = Math.sqrt(lengthSquared);
      const arc = segment.segmentStart + progress * localLength;
      if (!best || distance < best.distance) best = { s: arc, point: projected, distance };
    });
    if (!best) {
      let global = null;
      for (let index = 1; index < path.points.length; index++) {
        const from = path.points[index - 1];
        const to = path.points[index];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) continue;
        const progress = Math.max(0, Math.min(1,
          ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared
        ));
        const projected = { x: from.x + dx * progress, y: from.y + dy * progress };
        const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
        const arc = path.s[index - 1] + progress * Math.sqrt(lengthSquared);
        if (!global || distance < global.distance) global = { s: arc, point: projected, distance };
      }
      if (global) best = global;
      else {
        const nearest = { x: path.points[0].x, y: path.points[0].y };
        return { s: 0, point: nearest, distance: Math.hypot(point.x - nearest.x, point.y - nearest.y) };
      }
    }
    if (best.distance > 70) {
      let global = null;
      for (let index = 1; index < path.points.length; index++) {
        const from = path.points[index - 1];
        const to = path.points[index];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) continue;
        const progress = Math.max(0, Math.min(1,
          ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared
        ));
        const projected = { x: from.x + dx * progress, y: from.y + dy * progress };
        const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
        const arc = path.s[index - 1] + progress * Math.sqrt(lengthSquared);
        if (!global || distance < global.distance) global = { s: arc, point: projected, distance };
      }
      if (global) best = global;
    }
    return best;
  }

  function pointAtArc(path, s) {
    if (!path?.points?.length) return { x: 0, y: 0 };
    const clamped = Math.max(0, Math.min(path.length, s));
    for (let index = 1; index < path.points.length; index++) {
      if (clamped <= path.s[index]) {
        const from = path.points[index - 1];
        const to = path.points[index];
        const length = path.s[index] - path.s[index - 1];
        const progress = length ? (clamped - path.s[index - 1]) / length : 0;
        return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
      }
    }
    return { ...path.points.at(-1) };
  }

  function computeGuide({ map, player, target, hint = 0 }) {
    const path = buildPath(map?.waypoints || []);
    const carProjection = projectPath(path, player, hint);
    const targetPoint = target?.w
      ? { x: target.x + target.w / 2, y: target.y + target.h / 2 }
      : target;
    const targetProjection = targetPoint ? projectPath(path, targetPoint, carProjection.s) : carProjection;
    const forward = targetProjection.s >= carProjection.s;
    const points = [];
    points.push({ x: player.x, y: player.y });
    if (forward) {
      for (let s = carProjection.s + 12; s < targetProjection.s; s += 12) points.push(pointAtArc(path, s));
    } else {
      for (let s = carProjection.s - 12; s > targetProjection.s; s -= 12) points.push(pointAtArc(path, s));
    }
    points.push(targetProjection.point);
    const chevrons = [];
    if (forward) {
      const chevronEnd = Math.min(targetProjection.s, carProjection.s + 320);
      for (let s = Math.ceil((carProjection.s + 36) / 44) * 44; s <= chevronEnd; s += 44) {
        chevrons.push({ s, point: pointAtArc(path, s) });
      }
    } else {
      const chevronStart = Math.max(targetProjection.s, carProjection.s - 320);
      for (let s = Math.floor((carProjection.s - 36) / 44) * 44; s >= chevronStart; s -= 44) {
        chevrons.push({ s, point: pointAtArc(path, s) });
      }
    }
    return {
      path,
      sCar: carProjection.s,
      sTarget: targetProjection.s,
      car: carProjection.point,
      target: targetProjection.point,
      targetDistance: targetProjection.point ? Math.hypot(player.x - targetProjection.point.x, player.y - targetProjection.point.y) : 0,
      forward,
      points,
      chevrons
    };
  }

  return { buildPath, projectPath, pointAtArc, computeGuide };
});
