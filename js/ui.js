(function (root) {
  const { EQUIPMENT } = root.CM;
  class UI {
    constructor() {
      this.$ = id => document.getElementById(id);
      this.toastTimer = null;
      this.lastRenderKey = null;
    }

    render(snapshot, stage, game) {
      const renderKey = JSON.stringify([
        snapshot.state, snapshot.status, snapshot.stack, snapshot.input,
        snapshot.last?.symbol, snapshot.last?.operation, snapshot.last?.message,
        stage.name, game.state, game.mission, game.mode, game.stageIndex,
        game.route, game.level?.id
      ]);
      if (renderKey === this.lastRenderKey) return;
      this.lastRenderKey = renderKey;
      this.$("worldName").textContent = stage.name;
      this.$("objective").textContent = game.mission;

      const stack = this.$("stack");
      stack.replaceChildren();
      [...snapshot.stack].reverse().forEach((key, index) => {
        const block = document.createElement("div");
        const operation = snapshot.last?.operation || "";
        block.className = `stack-block${index === 0 ? " top" : ""}${key === "Z0" ? " z0" : ""}${index === 0 && operation.startsWith("POP") ? " pop-in" : ""}`;
        block.style.setProperty("--block-color", key === "Z0" ? "#8295aa" : EQUIPMENT[key].color);
        const symbol = document.createElement("strong");
        symbol.textContent = key;
        const label = document.createElement("small");
        label.textContent = key === "Z0" ? "BASE" : EQUIPMENT[key].name;
        block.append(symbol, label);
        stack.append(block);
      });

      const trail = this.$("worldTrail");
      trail.replaceChildren();
      if (game.level?.id === "crazy-rally") {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "route-review";
        button.dataset.action = "review-route";
        button.textContent = "Rever rota";
        item.append(button);
        trail.append(item);
      } else {
        game.worlds.slice(1).forEach((theme, index) => {
          const item = document.createElement("li");
          const world = game.stageForIndex(index + 1);
          item.setAttribute("aria-label", world.name);
          item.title = world.name;
          item.classList.toggle("current", game.stageIndex === index);
          item.classList.toggle("completed", game.stageIndex > index);
          item.textContent = String(index + 1);
          trail.append(item);
        });
      }

      this.$("stateValue").textContent = snapshot.state;
      this.$("symbolValue").textContent = snapshot.last?.symbol || "—";
      this.$("operationValue").textContent = snapshot.last?.operation || "—";
      this.$("topValue").textContent = snapshot.stack[snapshot.stack.length - 1];
      this.$("stackCount").textContent = `${snapshot.stack.length} elemento${snapshot.stack.length === 1 ? "" : "s"}`;
      this.$("message").textContent = snapshot.last?.message || "A corrida está pronta.";
      const tape = this.$("tape");
      tape.replaceChildren();
      snapshot.input.forEach(symbol => {
        const item = document.createElement("span");
        item.textContent = symbol;
        tape.append(item);
      });
      const badge = this.$("statusBadge");
      badge.textContent = snapshot.status === "accepted" ? "ACEITA" : snapshot.status === "rejected" ? "REJEITADA" : game.state === "PLAYING" ? "EM CORRIDA" : "PRONTO";
      badge.className = `badge ${snapshot.status}`;
    }

    log(result, target = "history") {
      if (!result?.message) return;
      const list = this.$(target);
      const entry = document.createElement("li");
      entry.textContent = `${result.symbol ? `${result.symbol} — ` : ""}${result.operation || ""} ${result.message}`.trim();
      entry.className = result.accepted ? "valid" : "error";
      list.prepend(entry);
      while (list.children.length > 100) list.lastElementChild.remove();
    }

    toast(message) {
      const target = this.$("toast");
      target.textContent = message;
      target.classList.remove("show");
      void target.offsetWidth;
      target.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => target.classList.remove("show"), 2300);
    }

    clearTransient() {
      clearTimeout(this.toastTimer);
      this.$("toast").classList.remove("show");
      this.$("toast").textContent = "";
      this.$("history").replaceChildren();
      this.$("pauseOverlay").classList.add("hidden");
      this.$("endScreen").classList.add("hidden");
    }
  }
  root.CM.UI = UI;
})(typeof globalThis !== "undefined" ? globalThis : this);
