(function (root) {
  const { PDA, ITEMS, EQUIPMENT, CLASSIC_ROUTE, CLASSIC_WORLDS, WORLD_THEMES, createMaps, validateMap } = root.CM;

  class Game {
    constructor(renderer, ui) {
      this.renderer = renderer;
      this.ui = ui;
      this.mode = "tutorial";
      this.level = null;
      this.plan = [];
      this.route = [...CLASSIC_ROUTE];
      this.worlds = [...CLASSIC_WORLDS];
      this.configure({ mode: "tutorial" });
    }

    configure({ mode = "tutorial", level = null, plan = [] } = {}) {
      this.mode = mode;
      this.level = level;
      this.plan = [...plan];
      this.route = mode === "challenge" ? [...level.route] : [...CLASSIC_ROUTE];
      this.worlds = mode === "challenge" ? ["garage", ...level.worlds] : [...CLASSIC_WORLDS];
      const selectedItems = mode === "challenge"
        ? this.plan.map((key, index) => ({ key, order: index + 1 }))
        : ITEMS.map(item => ({ key: item.key, order: item.order }));
      this.maps = createMaps(this.worlds, selectedItems);
      this.maps.forEach(validateMap);
      this.pda = new PDA({ route: this.route });
      this.reset(false);
    }

    reset(showMenu = true) {
      this.pda.reset();
      this.stageIndex = 0;
      this.items = this.maps[0].items.map(item => ({ ...item }));
      this.nextGuidedItem = 0;
      this.guideHint = 0;
      this.state = showMenu ? "MENU" : "PLAYING";
      this.player = new root.CM.Player(this.maps[0].spawn);
      this.renderer.transition = null;
      this.renderer.particles = [];
      this.ui.clearTransient();
      this.ui.render(this.pda.snapshot(), this.stage, this);
      this.render();
    }

    start() {
      if (this.state === "MENU") this.state = "PLAYING";
      this.player.keys.clear();
      this.render();
    }

    get stage() {
      return WORLD_THEMES[this.worlds[this.stageIndex]];
    }

    get map() {
      return this.maps[this.stageIndex];
    }

    get mission() {
      if (this.state === "MENU") return "Inicie a corrida para ver sua primeira missão.";
      const coachStep = root.CM.coach?.step;
      if (this.mode === "tutorial") {
        if (coachStep === "drive") return "Encontre o primeiro item.";
        if (coachStep === "collect") {
          const item = this.items.find(entry => entry.order === this.nextGuidedItem + 1);
          return item ? `Pegue o item: ${EQUIPMENT[item.key].name}.` : "Siga até o portão.";
        }
        if (coachStep === "stack") return "Siga o item destacado.";
        if (coachStep === "gate") return "Portão à direita.";
      }
      if (this.stageIndex === 0 && this.items.length) {
        const item = this.items.find(entry => entry.order === this.nextGuidedItem + 1);
        const order = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"][item?.order - 1];
        return item ? `Pegue ${order} ${EQUIPMENT[item.key].name}.` : "Vá ao portal.";
      }
      if (this.stageIndex === this.route.length) return "Atravesse a linha de chegada.";
      return `Vá ao portal → ${this.stageForIndex(this.stageIndex + 1).name}.`;
    }

    stageForIndex(index) {
      return WORLD_THEMES[this.worlds[index]];
    }

    nearGate() {
      const target = this.map.finish || this.map.gate;
      const nearestX = Math.max(target.x, Math.min(this.player.x, target.x + target.w));
      const nearestY = Math.max(target.y, Math.min(this.player.y, target.y + target.h));
      return Math.hypot(this.player.x - nearestX, this.player.y - nearestY) <= root.CM.PLAYER_RADIUS + 14;
    }

    togglePause() {
      if (this.state === "PLAYING") {
        this.state = "PAUSED";
        this.player.keys.clear();
        document.getElementById("pauseOverlay").classList.remove("hidden");
        document.getElementById("pauseBtn").textContent = "▶";
        document.getElementById("pauseBtn").setAttribute("aria-label", "Continuar corrida");
        document.getElementById("pauseBtn").setAttribute("title", "Continuar");
      } else if (this.state === "PAUSED") {
        this.resume();
      }
    }

    resume() {
      if (this.state !== "PAUSED") return;
      this.state = "PLAYING";
      document.getElementById("pauseOverlay").classList.add("hidden");
      document.getElementById("pauseBtn").textContent = "Ⅱ";
      document.getElementById("pauseBtn").setAttribute("aria-label", "Pausar corrida");
      document.getElementById("pauseBtn").setAttribute("title", "Pausar");
    }

    process(symbol) {
      if (this.state !== "PLAYING") return { accepted: false, status: this.pda.status, message: "A corrida não está ativa." };
      if (this.pda.status !== "running") return { accepted: false, status: this.pda.status, message: "A corrida já terminou." };
      const collectedItem = symbol === "f" ? null : this.items.find(entry => EQUIPMENT[entry.key]?.collect === symbol);
      const result = this.pda.processSymbol(symbol);
      this.ui.log(result);
      if (!result.accepted) {
        this.state = "LOST";
        this.player.keys.clear();
        this.ui.toast("Ordem errada!");
        this.playTone(160, 0.18);
        this.showEnd(false, this.failureMessage(result.failure));
      } else {
        if (result.operation.startsWith("PUSH")) this.ui.toast("Item guardado!");
        else if (symbol === "f") this.ui.toast("Corrida aceita!");
        else this.ui.toast("Equipamento instalado!");
        if (result.operation.startsWith("PUSH")) this.playTone(680, 0.06);
        else this.playTone(480, 0.09);
        if (this.mode === "tutorial" && result.operation.startsWith("PUSH") && root.CM.coach) {
          if (collectedItem) root.CM.coach.onCollected(collectedItem);
        }
        if (this.mode === "tutorial" && symbol !== "f" && root.CM.coach) root.CM.coach.onInstalled(symbol);
        if (symbol === "f") {
          this.state = "WON";
          this.player.keys.clear();
          try { root.localStorage.setItem("cm-rally-won", "1"); }
          catch { /* Tutorial completion does not depend on browser storage. */ }
          this.showEnd(true, "Corrida aceita! Você equipou tudo na ordem certa.");
        } else if (result.operation.startsWith("POP")) {
          this.stageIndex++;
          this.guideHint = 0;
          this.state = "TRANSITION";
          this.player.keys.clear();
          this.renderer.beginTransition(this.stage);
        }
      }
      this.ui.render(this.pda.snapshot(), this.stage, this);
      this.render();
      return result;
    }

    failureMessage(failure) {
      if (!failure) return "A corrida foi rejeitada.";
      if (failure.portalIndex === "finish") {
        return failure.reason === "leftover"
          ? `Na chegada ainda sobrava ${EQUIPMENT[failure.top]?.name || failure.top} no topo da pilha.`
          : "A pilha ficou vazia antes da linha final.";
      }
      const portal = failure.portalIndex + 1;
      const world = this.stageForIndex(failure.portalIndex + 1).name;
      const topName = failure.top === "Z0" ? "a pilha estava vazia" : EQUIPMENT[failure.top]?.name || failure.top;
      const attempted = EQUIPMENT[this.pda.last?.symbol]?.name || this.pda.last?.symbol || "equipamento";
      return `Você tentou instalar ${attempted} no Portal ${portal} (${world}), mas ele exige ${EQUIPMENT[failure.required].name}; no topo está ${topName}.`;
    }

    collect() {
      if (this.stageIndex !== 0 || this.state !== "PLAYING") return;
      for (const item of [...this.items]) {
        if (Math.hypot(item.x - this.player.x, item.y - this.player.y) > 27) continue;
        if (item.order !== this.nextGuidedItem + 1) {
          this.ui.toast(`Pegue primeiro o item ${this.nextGuidedItem + 1}.`);
          this.playTone(180, 0.1);
          continue;
        }
        const result = this.process(EQUIPMENT[item.key].collect);
        if (result.accepted) {
          this.items = this.items.filter(candidate => candidate !== item);
          this.nextGuidedItem++;
        }
        break;
      }
    }

    interact() {
      if (this.state !== "PLAYING") return;
      if (!this.nearGate()) {
        this.ui.toast(this.stageIndex === this.route.length ? "Chegue perto da chegada!" : "Chegue mais perto do portão.");
        return;
      }
      if (this.stageIndex === 0 && this.items.length) {
        this.ui.toast("Ainda faltam itens!");
        return;
      }
      if (this.stageIndex === this.route.length) this.process("f");
      else this.process(this.route[this.stageIndex]);
    }

    update(dt) {
      if (this.state === "TRANSITION") {
        if (this.renderer.update(dt)) {
          this.state = "PLAYING";
          this.player.reset(this.map.spawn);
        }
        this.render();
        return;
      }
      if (this.state === "PLAYING") {
        const oldX = this.player.x;
        const oldY = this.player.y;
        this.player.moving = this.player.update(dt, this.map.obstacles);
        const distance = Math.hypot(this.player.x - oldX, this.player.y - oldY);
        if (distance > 0 && this.mode === "tutorial" && root.CM.coach) root.CM.coach.onMoved(distance);
        this.collect();
        if (this.stageIndex === this.route.length && this.nearGate()) this.process("f");
      } else {
        this.player.moving = false;
      }
      this.render();
    }

    showEnd(won, message) {
      const screen = document.getElementById("endScreen");
      const champion = this.mode === "challenge" && won &&
        this.level?.id === root.CM.LEVELS.at(-1).id;
      document.getElementById("championScreen").classList.toggle("hidden", !champion);
      screen.classList.toggle("hidden", champion);
      document.getElementById("endEyebrow").textContent = this.mode === "challenge"
        ? won ? "FASE CONCLUÍDA" : "FIM DE JOGO"
        : won ? "CORRIDA CONCLUÍDA" : "O PDA REJEITOU A CORRIDA";
      document.getElementById("endTitle").textContent = this.mode === "challenge"
        ? won ? this.level.id === root.CM.LEVELS.at(-1).id ? "Desafio concluído!" : "Você venceu!" : "Game over"
        : won ? "Corrida aceita!" : "Tente novamente";
      document.getElementById("endMessage").textContent = message;
      if (!champion) screen.classList.remove("hidden");
      if (champion) this.playFanfare();
      else if (won) this.playTone(900, 0.24);
      root.dispatchEvent(new CustomEvent("cm-game-end", { detail: { won, mode: this.mode, level: this.level, failure: this.pda.last?.failure || null } }));
    }

    playFanfare() {
      if (root.CM.muted) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = root.CM.audioContext || (root.CM.audioContext = new AudioContext());
      [659, 784, 988, 1318].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.16;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.055, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      });
    }

    playTone(frequency, duration) {
      if (root.CM.muted) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = root.CM.audioContext || (root.CM.audioContext = new AudioContext());
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    }

    render() {
      const stage = this.stage;
      const highlighted = this.stageIndex === 0
        ? this.items.find(item => item.order === this.nextGuidedItem + 1)
        : null;
      const isFinish = this.stageIndex === this.route.length;
      const destination = this.stageIndex < this.route.length ? this.stageForIndex(this.stageIndex + 1).name : null;
      const canUse = this.state === "PLAYING" && this.nearGate() &&
        (this.stageIndex !== 0 || this.items.length === 0);
      document.getElementById("actionBtn").classList.toggle("hidden", !canUse);
      document.getElementById("touchAction").classList.toggle("hidden", !canUse);
      document.getElementById("replanBtn").classList.toggle("hidden",
        this.mode !== "challenge" || this.stageIndex !== 0 || this.nextGuidedItem !== 0 || this.state !== "PLAYING");
      document.getElementById("keyHint").classList.toggle("hidden", Boolean(root.CM.coach?.hasMoved));
      this.ui.render(this.pda.snapshot(), stage, this);
      let guideTarget = this.map.finish || this.map.gate;
      if (this.stageIndex === 0) {
        const highlighted = this.items.find(item => item.order === this.nextGuidedItem + 1);
        if (highlighted) guideTarget = highlighted;
        else guideTarget = this.map.finish || this.map.gate;
      }
      const guide = root.CM.computeGuide({
        map: this.map,
        player: this.player,
        target: guideTarget,
        hint: this.guideHint
      });
      this.guideHint = guide.sCar;
      this.guide = guide;
      this.renderer.draw(stage, this.player, this.stageIndex === 0 ? this.items : [], this.map,
        this.stageIndex === 0 ? !this.items.length : true, isFinish, highlighted, destination, guide);
    }
  }
  root.CM.Game = Game;
})(typeof globalThis !== "undefined" ? globalThis : this);
