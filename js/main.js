(function (root) {
  const {
    UI, Renderer, Game, Simulator, VERSION, MAPS, validateMap, LEVELS, EQUIPMENT,
    WORLD_THEMES, TERRAIN_ITEM, levelWorlds, sequenceFor, solutionString
  } = root.CM;
  const ui = new UI();
  const canvas = document.getElementById("gameCanvas");
  const renderer = new Renderer(canvas);
  const game = new Game(renderer, ui);
  const simulator = new Simulator(ui);
  root.CM.game = game;
  root.CM.simulator = simulator;
  if (new URLSearchParams(location.search).get("debug") === "1") {
    root.CM.debug = {
      gotoWorld(index) {
        if (!Number.isInteger(index) || index < 0 || index >= game.maps.length) {
          throw new RangeError("Índice de mundo inválido.");
        }
        game.stageIndex = index;
        game.items = index === 0 ? game.maps[index].items.map(item => ({ ...item })) : [];
        game.nextGuidedItem = 0;
        game.guideHint = 0;
        game.state = "PLAYING";
        game.player.reset(game.map.spawn);
        game.render();
      }
    };
    Object.defineProperty(root.CM.debug, "staticRebuilds", {
      get() { return renderer.staticRebuilds; }
    });
  }
  simulator.bindControls();

  const playTab = document.getElementById("playTab");
  const labTab = document.getElementById("labTab");
  const playView = document.getElementById("playView");
  const laboratory = document.getElementById("laboratorio");
  const startScreen = document.getElementById("startScreen");
  const coachmark = document.getElementById("coachmark");
  const coachText = document.getElementById("coachText");
  const keyCaps = document.getElementById("keyCaps");
  const coachShade = document.getElementById("coachShade");
  const technicalDrawer = document.getElementById("technicalDrawer");
  const challengeSelect = document.getElementById("challengeSelect");
  const briefingView = document.getElementById("briefingView");
  const routeReview = document.getElementById("routeReview");
  const endScreen = document.getElementById("endScreen");
  const championScreen = document.getElementById("championScreen");
  const forceTutorial = new URLSearchParams(location.search).get("tutorial") === "1";
  const unlockAll = new URLSearchParams(location.search).get("unlockAll") === "1";
  let activeTab = "play";
  let priorGameState = null;
  let lastFrame = performance.now();
  let frameCount = 0;
  let fps = 0;
  let fpsElapsed = 0;
  let lastKey = "—";
  let driveDistance = 0;
  let coachTimer = null;
  let tutorialStep = "idle";
  let nextItemNumber = 1;
  let playerMoved = false;
  const heldDirections = new Set();
  const numerals = ["①", "②", "③", "④", "⑤"];
  const attempts = new Map(LEVELS.map(level => [level.id, 0]));
  const routeViews = new Map(LEVELS.map(level => [level.id, 0]));
  let selectedLevel = null;
  let challengePlan = [];
  let challengeIntroStep = -1;

  function readFlag(key) {
    try { return root.localStorage.getItem(key) === "1"; }
    catch { return false; }
  }

  function writeFlag(key) {
    try { root.localStorage.setItem(key, "1"); }
    catch { /* Tutorial and gameplay do not depend on browser storage. */ }
  }

  function readProgress() {
    try {
      const progress = Number.parseInt(root.localStorage.getItem("cm-challenge-progress") || "0", 10);
      return Number.isFinite(progress) ? progress : 0;
    } catch {
      return 0;
    }
  }

  function writeProgress(progress) {
    try { root.localStorage.setItem("cm-challenge-progress", String(progress)); }
    catch { /* Challenge unlocks are a convenience, not a gameplay requirement. */ }
  }

  function clearCoachTarget() {
    document.querySelectorAll(".coach-target").forEach(element => element.classList.remove("coach-target"));
    document.getElementById("stack").classList.remove("coach-focus");
  }

  function showCoach(step, message, target, showKeys = false) {
    clearTimeout(coachTimer);
    clearCoachTarget();
    tutorialStep = step;
    coach.step = step;
    coachText.textContent = message;
    keyCaps.classList.toggle("hidden", !showKeys);
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        element.classList.add("coach-target");
        if (target === "#stack") element.classList.add("coach-focus");
      }
    }
    coachShade.classList.remove("hidden");
    coachmark.classList.remove("hidden");
    if (step === "drive") driveDistance = 0;
    game.render();
  }

  function completeTutorial(skipped = false) {
    clearTimeout(coachTimer);
    clearCoachTarget();
    coachmark.classList.add("hidden");
    coachShade.classList.add("hidden");
    keyCaps.classList.add("hidden");
    tutorialStep = skipped ? "skipped" : "complete";
    coach.step = tutorialStep;
    coach.hasMoved = true;
    writeFlag("cm-tutorial-completed");
    playerMoved = true;
    document.getElementById("keyHint").classList.add("hidden");
  }

  function showCollectCoach(order) {
    nextItemNumber = order;
    showCoach("collect", `Pegue o item ${numerals[order - 1]}.`, ".race-main");
  }

  function beginTutorial() {
    activeTab = "play";
    setActiveTab("play", false);
    game.configure({ mode: "tutorial" });
    startScreen.classList.add("hidden");
    challengeSelect.classList.add("hidden");
    briefingView.classList.add("hidden");
    endScreen.classList.add("hidden");
    championScreen.classList.add("hidden");
    playerMoved = false;
    coach.hasMoved = false;
    showCoach("drive", "Dirija com W A S D ou setas.", ".race-main", true);
  }

  const coach = {
    hasMoved: false,
    onMoved(distance) {
      this.hasMoved = true;
      playerMoved = true;
      document.getElementById("keyHint").classList.add("hidden");
      if (tutorialStep === "drive") {
        driveDistance += distance;
        if (driveDistance >= 100) showCollectCoach(1);
      }
    },
    onCollected(item) {
      if (!item || tutorialStep === "idle" || tutorialStep === "skipped" || tutorialStep === "complete") return;
      if (tutorialStep === "collect" && item.order === nextItemNumber) {
        nextItemNumber = item.order;
        if (item.order === 5) {
          showCoach("gate", "Agora vá ao portão e aperte E.", ".race-main");
          return;
        }
        showCoach("stack", "Ele entrou na pilha. O último a entrar fica no topo.", "#stack");
        coachTimer = setTimeout(() => showCollectCoach(item.order + 1), 3000);
      } else if (tutorialStep === "stack" && item.order === nextItemNumber + 1) {
        nextItemNumber = item.order;
        if (item.order === 5) {
          showCoach("gate", "Agora vá ao portão e aperte E.", ".race-main");
          return;
        }
        showCoach("stack", "Ele entrou na pilha. O último a entrar fica no topo.", "#stack");
        coachTimer = setTimeout(() => showCollectCoach(item.order + 1), 3000);
      }
    },
    onInstalled(symbol) {
      if (symbol !== "A" || tutorialStep !== "gate") return;
      showCoach("lifo", "Primeiro sai quem entrou por último!", "#stack");
      coachTimer = setTimeout(() => {
        showCoach("congratulations", "Parabéns, você entendeu a pilha.", "#stack");
        coachTimer = setTimeout(() => completeTutorial(), 3000);
      }, 3000);
    }
  };
  root.CM.coach = coach;

  function activatePlay() {
    activeTab = "play";
    playView.classList.remove("hidden");
    laboratory.classList.add("hidden");
    playTab.classList.add("active");
    labTab.classList.remove("active");
    playTab.setAttribute("aria-selected", "true");
    labTab.setAttribute("aria-selected", "false");
    if (priorGameState === "PLAYING" && game.state === "PAUSED") game.resume();
    priorGameState = null;
  }

  function setActiveTab(tab, pauseGame = true) {
    if (tab === activeTab && !playView.classList.contains("hidden")) return;
    if (tab === "lab") {
      if (pauseGame && game.state === "PLAYING") {
        priorGameState = "PLAYING";
        game.togglePause();
      }
      activeTab = "lab";
      playView.classList.add("hidden");
      laboratory.classList.remove("hidden");
      playTab.classList.remove("active");
      labTab.classList.add("active");
      playTab.setAttribute("aria-selected", "false");
      labTab.setAttribute("aria-selected", "true");
    } else {
      activatePlay();
    }
  }

  function unlockedLevelCount() {
    return unlockAll ? LEVELS.length : Math.max(1, readProgress());
  }

  function renderLevelCards() {
    document.getElementById("championBadge").classList.toggle("hidden", !readFlag("cm-challenge-complete"));
    const container = document.getElementById("levelCards");
    container.replaceChildren();
    const maxUnlocked = unlockedLevelCount();
    LEVELS.forEach((level, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `level-card${selectedLevel?.id === level.id ? " selected" : ""}`;
      card.disabled = index >= maxUnlocked;
      card.dataset.levelId = level.id;
      const difficulty = `${"●".repeat(level.difficulty)}${"○".repeat(3 - level.difficulty)}`;
      card.innerHTML = `<span>Fase ${index + 1} · ${difficulty}</span><strong></strong><span>${level.route.length} portais · ${level.stock.length} itens</span><span>${card.disabled ? "🔒 Vença a fase anterior" : "Disponível"}</span>`;
      card.querySelector("strong").textContent = level.name;
      card.addEventListener("click", () => {
        selectedLevel = level;
        container.querySelectorAll(".level-card").forEach(candidate =>
          candidate.classList.toggle("selected", candidate === card)
        );
        document.getElementById("planSelectedLevel").disabled = false;
      });
      container.append(card);
    });
    document.getElementById("planSelectedLevel").disabled = !selectedLevel;
  }

  function addRouteCard(container, theme, label, icon) {
    const world = WORLD_THEMES[theme];
    const card = document.createElement("div");
    card.className = "route-world-card";
    card.style.borderColor = world.color;
    const pictogram = document.createElement("span");
    pictogram.textContent = icon;
    const name = document.createElement("strong");
    name.textContent = label || world.name;
    card.append(pictogram, name);
    container.append(card);
  }

  function addPortalConnector(container, portal) {
    const connector = document.createElement("div");
    connector.className = "route-connector";
    const label = document.createElement("span");
    label.textContent = `Portal ${portal}`;
    const arrow = document.createElement("b");
    arrow.textContent = "→";
    connector.append(label, arrow);
    container.append(connector);
  }

  function renderRoute(container, level) {
    container.replaceChildren();
    addRouteCard(container, "garage", "Garagem", "🚗");
    level.worlds.forEach((theme, index) => {
      addPortalConnector(container, index + 1);
      addRouteCard(container, theme);
    });
    const finish = document.createElement("div");
    finish.className = "route-connector route-finish";
    finish.innerHTML = "<span>Linha final</span><b>🏁</b>";
    container.append(finish);
  }

  function renderBriefing() {
    if (!selectedLevel) return;
    document.getElementById("briefingTitle").textContent = selectedLevel.name;
    document.getElementById("briefingLevel").textContent = `${selectedLevel.subtitle} · ${selectedLevel.route.length} portais`;
    renderRoute(document.getElementById("briefingRoute"), selectedLevel);
    renderRoute(document.getElementById("routeReviewContent"), selectedLevel);
    const guide = document.getElementById("routeGuideContent");
    guide.replaceChildren();
    selectedLevel.worlds.forEach(theme => {
      const line = document.createElement("p");
      const equipment = EQUIPMENT[TERRAIN_ITEM[theme]];
      line.textContent = `${WORLD_THEMES[theme].name} ↔ ${equipment.name}`;
      guide.append(line);
    });

    const stock = document.getElementById("challengeStock");
    stock.replaceChildren();
    const counts = new Map();
    selectedLevel.stock.forEach(key => counts.set(key, (counts.get(key) || 0) + 1));
    for (const [key, total] of counts) {
      const selected = challengePlan.filter(item => item === key).length;
      const equipment = EQUIPMENT[key];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stock-card";
      button.dataset.item = key;
      button.disabled = selected >= total;
      const icon = document.createElement("span");
      icon.className = "stock-icon";
      icon.style.background = equipment.color;
      icon.textContent = equipment.icon;
      const name = document.createElement("strong");
      name.textContent = equipment.name;
      const amount = document.createElement("small");
      amount.textContent = `${total - selected} de ${total} disponíveis`;
      button.append(icon, name, amount);
      stock.append(button);
    }

    const planStack = document.getElementById("planStack");
    planStack.replaceChildren();
    if (challengePlan.length === 0) {
      const empty = document.createElement("span");
      empty.className = "plan-empty";
      empty.textContent = "Escolha itens do estoque";
      planStack.append(empty);
    } else {
      challengePlan.forEach((key, index) => {
        const piece = document.createElement("div");
        piece.className = "plan-piece";
        piece.style.background = EQUIPMENT[key].color;
        const number = document.createElement("b");
        number.textContent = String(index + 1);
        const name = document.createElement("span");
        name.textContent = EQUIPMENT[key].name;
        piece.append(number, name);
        planStack.append(piece);
      });
    }
    document.getElementById("undoPlan").disabled = challengePlan.length === 0;
    document.getElementById("clearPlan").disabled = challengePlan.length === 0;
    document.getElementById("confirmPlan").disabled = challengePlan.length === 0;
  }

  function showLevelSelection() {
    selectedLevel = null;
    challengePlan = [];
    startScreen.classList.add("hidden");
    briefingView.classList.add("hidden");
    routeReview.classList.add("hidden");
    endScreen.classList.add("hidden");
    championScreen.classList.add("hidden");
    renderLevelCards();
    challengeSelect.classList.remove("hidden");
  }

  function finishChallengeIntro() {
    challengeIntroStep = -1;
    writeFlag("cm-challenge-intro");
    clearCoachTarget();
    coachmark.classList.add("hidden");
    coachShade.classList.add("hidden");
  }

  const challengeIntro = [
    { text: "Veja a rota antes de escolher.", target: ".route-block" },
    { text: "Monte a pilha na ordem de coleta.", target: ".inventory-block" },
    { text: "Confirme o plano quando estiver pronto.", target: ".plan-block" }
  ];

  function showChallengeIntro(step) {
    challengeIntroStep = step;
    const tip = challengeIntro[step];
    showCoach(`challenge-intro-${step}`, tip.text, tip.target);
    document.getElementById("coachSkip").textContent = step === challengeIntro.length - 1 ? "Entendi" : "Próximo";
  }

  function openBriefing(level, plan = []) {
    selectedLevel = level;
    challengePlan = [...plan];
    challengeSelect.classList.add("hidden");
    startScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    championScreen.classList.add("hidden");
    briefingView.classList.remove("hidden");
    renderBriefing();
    document.getElementById("championBadge").classList.toggle("hidden", !readFlag("cm-challenge-complete"));
    if (!readFlag("cm-challenge-intro")) showChallengeIntro(0);
  }

  function confirmChallengePlan() {
    if (!selectedLevel || challengePlan.length === 0) return;
    const level = selectedLevel;
    const plan = [...challengePlan];
    briefingView.classList.add("hidden");
    routeReview.classList.add("hidden");
    endScreen.classList.add("hidden");
    championScreen.classList.add("hidden");
    game.configure({ mode: "challenge", level, plan });
    game.start();
    setActiveTab("play", false);
  }

  function completeLevelSelection() {
    if (!selectedLevel) return;
    challengeSelect.classList.add("hidden");
    openBriefing(selectedLevel);
  }

  function openChallengeLab(level, plan) {
    document.getElementById("endScreen").classList.add("hidden");
    championScreen.classList.add("hidden");
    simulator.setRoute(level.id);
    simulator.loadSequence(sequenceFor(level, plan));
    setActiveTab("lab");
  }

  function setEndActions(actions) {
    const buttons = [
      document.getElementById("endActionPrimary"),
      document.getElementById("endActionSecondary"),
      document.getElementById("endActionTertiary")
    ];
    buttons.forEach((button, index) => {
      button.textContent = actions[index].label;
      button.dataset.action = actions[index].action;
      button.className = `button ${actions[index].primary ? "primary" : index === 1 ? "secondary" : "outline"}`;
    });
  }

  function renderChampionSummary() {
    const summary = document.getElementById("championSummary");
    summary.replaceChildren();
    LEVELS.forEach((level, index) => {
      const row = document.createElement("li");
      const title = document.createElement("strong");
      const stats = document.createElement("span");
      title.textContent = `✔ Fase ${index + 1} · ${level.name}`;
      stats.textContent = `${attempts.get(level.id) || 0} tentativas · ${routeViews.get(level.id) || 0} consultas`;
      row.append(title, stats);
      summary.append(row);
    });
  }

  function renderChampionConfetti() {
    const container = document.getElementById("championConfetti");
    container.replaceChildren();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ffd04a", "#63e3a8", "#70dcff", "#ff8088", "#fff0a0"];
    for (let index = 0; index < 20; index++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--confetti-x", `${(index * 47) % 90}%`);
      piece.style.setProperty("--confetti-color", colors[index % colors.length]);
      piece.style.setProperty("--confetti-delay", `${(index % 7) * -0.19}s`);
      container.append(piece);
    }
  }

  function updateEndOutcome({ won, mode, level, failure }) {
    const comparison = document.getElementById("failureComparison");
    const solution = document.getElementById("showSolution");
    solution.classList.add("hidden");
    comparison.classList.add("hidden");
    if (mode === "tutorial") {
      if (won) {
        document.getElementById("challengeEntry").classList.remove("hidden");
        setEndActions([
          { label: "Refazer tutorial", action: "tutorial" },
          { label: "Ir ao Laboratório", action: "lab" },
          { label: "Começar o desafio", action: "select", primary: true }
        ]);
      } else {
        setEndActions([
          { label: "Tentar de novo", action: "tutorial", primary: true },
          { label: "Ir ao Laboratório", action: "lab" },
          { label: "Começar o desafio", action: "select" }
        ]);
      }
      return;
    }

    const levelIndex = LEVELS.findIndex(candidate => candidate.id === level.id);
    const attemptCount = (attempts.get(level.id) || 0) + 1;
    attempts.set(level.id, attemptCount);
    const routeCount = routeViews.get(level.id) || 0;
    const endMessage = document.getElementById("endMessage");
    endMessage.textContent += ` Tentativas: ${attemptCount} · Consultas de rota: ${routeCount}.`;
    if (won) {
      if (levelIndex < LEVELS.length - 1) writeProgress(Math.max(readProgress(), levelIndex + 2));
      if (levelIndex === LEVELS.length - 1) {
      writeFlag("cm-challenge-complete");
      document.getElementById("championBadge").classList.remove("hidden");
      renderChampionSummary();
      renderChampionConfetti();
      document.getElementById("championActionPrimary").focus();
      return;
    } else {
      setEndActions([
        { label: "Próxima fase", action: "next-level", primary: true },
        { label: "Laboratório", action: "challenge-lab" },
        { label: "Escolher fase", action: "select" }
        ]);
      }
      return;
    }

    if (failure) {
      comparison.classList.remove("hidden");
      document.getElementById("failureRequired").textContent = failure.portalIndex === "finish"
        ? "Linha final livre"
        : EQUIPMENT[failure.required]?.name || failure.required;
      document.getElementById("failureTop").textContent = failure.top === "Z0"
        ? "Pilha vazia"
        : EQUIPMENT[failure.top]?.name || failure.top;
    }
    if (attemptCount >= 2) solution.classList.remove("hidden");
    setEndActions([
      { label: "Tentar de novo", action: "retry-level", primary: true },
      { label: "Ver no Laboratório", action: "challenge-lab" },
      { label: "Escolher fase", action: "select" }
    ]);
  }

  function handleEndAction(action) {
    endScreen.classList.add("hidden");
    championScreen.classList.add("hidden");
    if (action === "tutorial") {
      beginTutorial();
    } else if (action === "lab") {
      setActiveTab("lab");
    } else if (action === "select") {
      showLevelSelection();
    } else if (action === "next-level") {
      const currentIndex = LEVELS.findIndex(level => level.id === game.level?.id);
      if (currentIndex >= 0 && LEVELS[currentIndex + 1]) openBriefing(LEVELS[currentIndex + 1]);
    } else if (action === "retry-level") {
      openBriefing(game.level);
    } else if (action === "challenge-lab") {
      openChallengeLab(game.level, game.plan);
    }
  }

  playTab.addEventListener("click", () => setActiveTab("play"));
  labTab.addEventListener("click", () => setActiveTab("lab"));
  document.getElementById("startBtn").addEventListener("click", () => {
    game.configure({ mode: "tutorial" });
    startScreen.classList.add("hidden");
    game.start();
    if (forceTutorial || !readFlag("cm-tutorial-completed")) {
      playerMoved = false;
      coach.hasMoved = false;
      showCoach("drive", "Dirija com W A S D ou setas.", ".race-main", true);
    }
  });
  document.getElementById("skipTutorial").addEventListener("click", beginTutorial);
  document.getElementById("tutorialBtn").addEventListener("click", beginTutorial);
  document.getElementById("challengeEntry").addEventListener("click", showLevelSelection);
  document.getElementById("planSelectedLevel").addEventListener("click", completeLevelSelection);
  document.getElementById("backFromLevels").addEventListener("click", () => {
    challengeSelect.classList.add("hidden");
    startScreen.classList.remove("hidden");
  });
  document.getElementById("challengeStock").addEventListener("click", event => {
    const card = event.target.closest("[data-item]");
    if (!card || card.disabled || !selectedLevel) return;
    challengePlan.push(card.dataset.item);
    renderBriefing();
  });
  document.getElementById("undoPlan").addEventListener("click", () => {
    challengePlan.pop();
    renderBriefing();
  });
  document.getElementById("clearPlan").addEventListener("click", () => {
    challengePlan = [];
    renderBriefing();
  });
  document.getElementById("confirmPlan").addEventListener("click", confirmChallengePlan);
  document.getElementById("replanBtn").addEventListener("click", () => {
    if (game.mode !== "challenge" || game.nextGuidedItem > 0) return;
    game.state = "PAUSED";
    document.getElementById("pauseOverlay").classList.add("hidden");
    openBriefing(game.level, game.plan);
  });
  document.getElementById("coachSkip").addEventListener("click", () => {
    if (challengeIntroStep >= 0) {
      if (challengeIntroStep === challengeIntro.length - 1) finishChallengeIntro();
      else showChallengeIntro(challengeIntroStep + 1);
    } else {
      completeTutorial(true);
    }
  });

  routeReview.addEventListener("click", event => {
    if (event.target === routeReview) return;
  });
  document.getElementById("worldTrail").addEventListener("click", event => {
    if (!event.target.closest("[data-action='review-route']") || game.mode !== "challenge") return;
    routeViews.set(game.level.id, (routeViews.get(game.level.id) || 0) + 1);
    renderRoute(document.getElementById("routeReviewContent"), game.level);
    game.togglePause();
    routeReview.classList.remove("hidden");
  });
  document.getElementById("closeRouteReview").addEventListener("click", () => {
    routeReview.classList.add("hidden");
    game.resume();
  });
  document.getElementById("showSolution").addEventListener("click", () => {
    const plan = [...game.route].reverse();
    const names = plan.map(key => EQUIPMENT[key].name);
    document.getElementById("endMessage").textContent += ` Plano que vence (de baixo para o topo): ${names.join(" → ")}. Sequência: ${solutionString(game.level)}.`;
    document.getElementById("showSolution").classList.add("hidden");
  });
  window.addEventListener("cm-game-end", event => updateEndOutcome(event.detail));
  ["endActionPrimary", "endActionSecondary", "endActionTertiary"].forEach(id => {
    document.getElementById(id).addEventListener("click", event => handleEndAction(event.currentTarget.dataset.action));
  });
  ["championActionPrimary", "championActionSecondary", "championActionTertiary"].forEach(id => {
    document.getElementById(id).addEventListener("click", event => handleEndAction(event.currentTarget.dataset.action));
  });

  document.getElementById("pauseBtn").addEventListener("click", () => game.togglePause());
  document.getElementById("resumeBtn").addEventListener("click", () => game.resume());
  function hasProgress() {
    return game.pda.input.length > 0 || game.stageIndex > 0 ||
      Math.hypot(game.player.x - game.map.spawn.x, game.player.y - game.map.spawn.y) > 20;
  }
  function restartGame() {
    if (hasProgress() && !root.confirm("Reiniciar a corrida e perder o progresso?")) return;
    if (game.mode === "challenge") {
      routeReview.classList.add("hidden");
      briefingView.classList.add("hidden");
      endScreen.classList.add("hidden");
      championScreen.classList.add("hidden");
      game.configure({ mode: "challenge", level: game.level, plan: game.plan });
      game.start();
      return;
    }
    if (!["idle", "skipped", "complete"].includes(tutorialStep)) completeTutorial(true);
    game.configure({ mode: "tutorial" });
    startScreen.classList.remove("hidden");
  }
  document.getElementById("resetBtn").addEventListener("click", restartGame);
  document.getElementById("clearLog").addEventListener("click", () => document.getElementById("history").replaceChildren());
  document.getElementById("muteBtn").addEventListener("click", event => {
    root.CM.muted = !root.CM.muted;
    event.currentTarget.textContent = root.CM.muted ? "♪" : "♫";
    event.currentTarget.setAttribute("aria-label", root.CM.muted ? "Ativar som" : "Desativar som");
    event.currentTarget.setAttribute("title", root.CM.muted ? "Som desligado" : "Som ligado");
    event.currentTarget.setAttribute("aria-pressed", String(root.CM.muted));
  });
  if (readFlag("cm-rally-won")) document.getElementById("challengeEntry").classList.remove("hidden");

  const keyDirections = {
    w: "up", arrowup: "up",
    s: "down", arrowdown: "down",
    a: "left", arrowleft: "left",
    d: "right", arrowright: "right"
  };
  const typingTarget = target => target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") || target.isContentEditable);
  function clearKeys() {
    game.player.keys.clear();
    heldDirections.clear();
    keyCaps.querySelectorAll("kbd").forEach(key => key.classList.remove("pressed"));
  }
  function updateKeycaps(key, pressed) {
    const label = key.startsWith("arrow") ? ({
      arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→"
    })[key] : key.toUpperCase();
    keyCaps.querySelectorAll("kbd").forEach(cap => {
      if (cap.textContent === label || cap.textContent === key.toUpperCase()) cap.classList.toggle("pressed", pressed);
    });
  }
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (key === "escape") {
      if (challengeIntroStep >= 0) finishChallengeIntro();
      else if (routeReview.classList.contains("hidden") === false) {
        routeReview.classList.add("hidden");
        game.resume();
      } else if (tutorialStep !== "idle" && tutorialStep !== "skipped" && tutorialStep !== "complete") completeTutorial(true);
      else if (technicalDrawer.open) technicalDrawer.open = false;
      else if (document.getElementById("advancedOptions").open) document.getElementById("advancedOptions").open = false;
      return;
    }
    if (typingTarget(event.target)) return;
    lastKey = event.key;
    if (document.getElementById("debugPanel").classList.contains("hidden") === false) {
      document.getElementById("debugKey").textContent = `Última tecla: ${lastKey}`;
    }
    const modalOpen = !startScreen.classList.contains("hidden") ||
      !endScreen.classList.contains("hidden") ||
      !championScreen.classList.contains("hidden") ||
      !challengeSelect.classList.contains("hidden") ||
      !briefingView.classList.contains("hidden") ||
      !routeReview.classList.contains("hidden");
    if (modalOpen || activeTab !== "play") return;
    if (key === "t") {
      technicalDrawer.open = !technicalDrawer.open;
      event.preventDefault();
    } else if (keyDirections[key]) {
      if (game.state === "PLAYING") {
        game.player.setDirection(keyDirections[key], true);
        heldDirections.add(key);
        updateKeycaps(key, true);
      }
      event.preventDefault();
    } else if (key === "e" || event.code === "Space") {
      game.interact();
      event.preventDefault();
    } else if (key === "p") {
      game.togglePause();
      event.preventDefault();
    } else if (key === "r") {
      restartGame();
      event.preventDefault();
    }
  });
  window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();
    const direction = keyDirections[key];
    if (!direction) return;
    game.player.setDirection(direction, false);
    heldDirections.delete(key);
    updateKeycaps(key, false);
  });
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearKeys();
  });

  const touchPad = document.getElementById("touchPad");
  function updateTouchDirection(event) {
    const bounds = touchPad.getBoundingClientRect();
    const dx = (event.clientX - bounds.left) / bounds.width - 0.5;
    const dy = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (Math.abs(dx) < 0.16 && Math.abs(dy) < 0.2) {
      technicalDrawer.open = !technicalDrawer.open;
      game.player.keys.clear();
      return;
    }
    const direction = Math.abs(dx) > Math.abs(dy)
      ? dx < 0 ? "left" : "right"
      : dy < 0 ? "up" : "down";
    ["up", "down", "left", "right"].forEach(key => game.player.setDirection(key, key === direction));
  }
  touchPad.addEventListener("pointerdown", event => {
    event.preventDefault();
    touchPad.setPointerCapture(event.pointerId);
    updateTouchDirection(event);
  });
  touchPad.addEventListener("pointermove", event => {
    if (event.buttons) updateTouchDirection(event);
  });
  const releaseTouch = () => game.player.keys.clear();
  touchPad.addEventListener("pointerup", releaseTouch);
  touchPad.addEventListener("pointercancel", releaseTouch);
  touchPad.addEventListener("lostpointercapture", releaseTouch);
  document.getElementById("touchAction").addEventListener("click", () => game.interact());
  document.getElementById("actionBtn").addEventListener("click", () => game.interact());

  function showError(message) {
    const banner = document.getElementById("errorBanner");
    banner.textContent = `Erro na aplicação: ${message}`;
    banner.classList.remove("hidden");
  }
  root.onerror = function (message, source, line, column, error) {
    showError(error?.message || `${message} (${source}:${line}:${column})`);
    return false;
  };
  root.addEventListener("unhandledrejection", event => showError(event.reason?.message || String(event.reason)));

  if (new URLSearchParams(location.search).has("debug")) {
    document.getElementById("debugPanel").classList.remove("hidden");
    document.getElementById("debugVersion").textContent = `v${VERSION}`;
    document.getElementById("debugModules").textContent = `Módulos: ${Object.keys(root.CM).filter(key => ["PDA", "Player", "Renderer", "UI", "Game", "Simulator", "LEVELS", "buildPath", "computeGuide"].includes(key)).join(", ")} · mapas ${MAPS.length} · static rebuilds ${root.CM.debug.staticRebuilds}`;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    game.update(dt);
    frameCount++;
    fpsElapsed += dt;
    if (fpsElapsed >= 0.5) {
      fps = Math.round(frameCount / fpsElapsed);
      frameCount = 0;
      fpsElapsed = 0;
      if (!document.getElementById("debugPanel").classList.contains("hidden")) {
        document.getElementById("debugPlayer").textContent = `Jogador: ${game.player.x.toFixed(1)}, ${game.player.y.toFixed(1)} · ${game.state}`;
        document.getElementById("debugPda").textContent = `PDA: ${game.pda.state} · ${game.pda.status} · pilha ${game.pda.stack.join(",")}`;
        document.getElementById("debugFps").textContent = `FPS: ${fps}`;
      }
    }
    requestAnimationFrame(frame);
  }

  try { MAPS.forEach(validateMap); }
  catch (error) { showError(error.message); }
  if (forceTutorial) startScreen.classList.remove("hidden");
  requestAnimationFrame(frame);
})(typeof globalThis !== "undefined" ? globalThis : this);
