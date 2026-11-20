(function (root, factory) {
  const constants = typeof module !== "undefined" && module.exports
    ? require("./constants.js")
    : root.CM;
  const values = factory(constants);
  if (typeof module !== "undefined" && module.exports) module.exports = values;
  root.CM = root.CM || {};
  Object.assign(root.CM, values);
})(typeof globalThis !== "undefined" ? globalThis : this, function ({ EQUIPMENT, STAGES }) {
  const TERRAIN_ITEM = Object.freeze({
    desert: "A",
    swamp: "L",
    snow: "N",
    track: "X",
    volcano: "T"
  });
  const WORLD_BY_THEME = Object.freeze(Object.fromEntries(STAGES.slice(1).map(stage => [stage.theme, stage])));
  const LEVELS = Object.freeze([
    {
      id: "warmup",
      name: "Aquecimento",
      subtitle: "Fácil",
      difficulty: 1,
      route: ["A", "L", "N"],
      worlds: ["desert", "swamp", "snow"],
      stock: ["N", "L", "A"],
      hint: "O último item que entra é o primeiro que sai."
    },
    {
      id: "real-race",
      name: "Corrida de verdade",
      subtitle: "Média",
      difficulty: 2,
      route: ["L", "X", "N", "T"],
      worlds: ["swamp", "track", "snow", "volcano"],
      stock: ["T", "N", "X", "L", "A"]
    },
    {
      id: "crazy-rally",
      name: "Rally maluco",
      subtitle: "Difícil",
      difficulty: 3,
      route: ["A", "T", "A", "N", "X", "L"],
      worlds: ["desert", "volcano", "desert", "snow", "track", "swamp"],
      stock: ["L", "X", "N", "N", "A", "A", "T", "T"]
    }
  ].map(level => Object.freeze({
    ...level,
    route: Object.freeze([...level.route]),
    worlds: Object.freeze([...level.worlds]),
    stock: Object.freeze([...level.stock])
  })));

  function resolveLevel(level) {
    const resolved = typeof level === "string" ? LEVELS.find(entry => entry.id === level) : level;
    if (!resolved || !Array.isArray(resolved.route) || !Array.isArray(resolved.worlds) || !Array.isArray(resolved.stock)) {
      throw new TypeError("Fase de desafio inválida.");
    }
    return resolved;
  }

  function normalizePlan(plan) {
    if (Array.isArray(plan)) return [...plan];
    if (typeof plan === "string") return [...plan];
    throw new TypeError("O plano deve ser uma lista ordenada de equipamentos.");
  }

  function evaluatePlan(level, plan) {
    const selected = resolveLevel(level);
    const pieces = normalizePlan(plan);
    for (const symbol of pieces) {
      if (!EQUIPMENT[symbol]) {
        return { ok: false, failAt: "plan", required: null, top: pieces.at(-1) || "Z0", reason: "wrong-top" };
      }
    }

    const stack = [...pieces];
    for (let portalIndex = 0; portalIndex < selected.route.length; portalIndex++) {
      const required = selected.route[portalIndex];
      const top = stack.pop();
      if (!top) return { ok: false, failAt: portalIndex, required, top: "Z0", reason: "empty-stack" };
      if (top !== required) return { ok: false, failAt: portalIndex, required, top, reason: "wrong-top" };
    }
    if (stack.length) {
      return { ok: false, failAt: "finish", required: "f", top: stack[stack.length - 1], reason: "leftover" };
    }
    return { ok: true, failAt: null, required: null, top: "Z0", reason: null };
  }

  function solutionString(level) {
    const selected = resolveLevel(level);
    const stackPlan = [...selected.route].reverse().map(symbol => EQUIPMENT[symbol].collect).join("");
    return stackPlan + selected.route.join("") + "f";
  }

  function sequenceFor(level, plan) {
    const selected = resolveLevel(level);
    const pieces = normalizePlan(plan);
    return pieces.map(symbol => {
      if (!EQUIPMENT[symbol]) throw new TypeError(`Equipamento inválido no plano: ${symbol}.`);
      return EQUIPMENT[symbol].collect;
    }).join("") + selected.route.join("") + "f";
  }

  function levelWorlds(level) {
    const selected = resolveLevel(level);
    return selected.worlds.map(theme => {
      const world = WORLD_BY_THEME[theme];
      if (!world) throw new TypeError(`Tema de mundo inválido na rota: ${theme}.`);
      return world;
    });
  }

  return { LEVELS, TERRAIN_ITEM, WORLD_BY_THEME, evaluatePlan, solutionString, sequenceFor, levelWorlds };
});
