(function (root, factory) {
  const values = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = values;
  root.CM = root.CM || {};
  Object.assign(root.CM, values);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EQUIPMENT = {
    T: { name: "Combustível térmico", collect: "t", color: "#ff785e", icon: "T" },
    X: { name: "Nitro", collect: "x", color: "#53d5ff", icon: "X" },
    N: { name: "Pneus de neve", collect: "n", color: "#e5f5ff", icon: "N" },
    L: { name: "Pneus lameiros", collect: "l", color: "#bd8b68", icon: "L" },
    A: { name: "Pneus de areia", collect: "a", color: "#ffd04a", icon: "A" }
  };
  const STAGES = [
    { state: "q0", name: "Garagem", theme: "garage", color: "#65809a", required: "A", objective: "Colete os equipamentos na ordem indicada." },
    { state: "q1", name: "Deserto", theme: "desert", color: "#d99a45", required: "L", objective: "Atravesse o deserto e alcance o portão." },
    { state: "q2", name: "Pântano", theme: "swamp", color: "#3f8061", required: "N", objective: "Cruze o pântano e alcance a passagem." },
    { state: "q3", name: "Montanhas nevadas", theme: "snow", color: "#8fc9e8", required: "X", objective: "Desça a montanha até o próximo portão." },
    { state: "q4", name: "Autódromo", theme: "track", color: "#4b5265", required: "T", objective: "Complete a reta e alcance a passagem." },
    { state: "q5", name: "Vulcão", theme: "volcano", color: "#9d4038", required: "f", objective: "Atravesse a linha de chegada." }
  ];
  return {
    VERSION: "3.1.1",
    WIDTH: 900,
    HEIGHT: 560,
    PLAYER_RADIUS: 13,
    EQUIPMENT,
    STAGES,
    CLASSIC_ROUTE: ["A", "L", "N", "X", "T"],
    CLASSIC_WORLDS: ["garage", "desert", "swamp", "snow", "track", "volcano"],
    WORLD_THEMES: {
      garage: { name: "Garagem", theme: "garage", color: "#65809a" },
      desert: { name: "Deserto", theme: "desert", color: "#d99a45" },
      swamp: { name: "Pântano", theme: "swamp", color: "#3f8061" },
      snow: { name: "Montanhas nevadas", theme: "snow", color: "#8fc9e8" },
      track: { name: "Autódromo", theme: "track", color: "#4b5265" },
      volcano: { name: "Vulcão", theme: "volcano", color: "#9d4038" }
    }
  };
});
