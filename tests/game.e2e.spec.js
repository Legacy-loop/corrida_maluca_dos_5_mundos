const { test, expect } = require("@playwright/test");
const path = require("node:path");

const appUrl = `file://${path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/")}`;
test.describe.configure({ timeout: 600000 });

async function openGame(page, query = "") {
  await page.goto(`${appUrl}${query}`);
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
}

async function moveAxis(page, axis, target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const position = await page.evaluate(() => ({
      x: window.CM.game.player.x,
      y: window.CM.game.player.y,
      speed: window.CM.game.player.speed
    }));
    const remaining = target - position[axis];
    if (Math.abs(remaining) <= 3) return;
    const key = axis === "x"
      ? remaining > 0 ? "d" : "a"
      : remaining > 0 ? "s" : "w";
    const duration = Math.max(20, Math.ceil((Math.abs(remaining) - 1) / position.speed * 1000));
    await page.keyboard.down(key);
    await page.waitForTimeout(duration);
    await page.keyboard.up(key);
    await page.waitForTimeout(15);
  }
}

async function moveAlong(page, target) {
  const position = await page.evaluate(() => ({
    x: window.CM.game.player.x,
    y: window.CM.game.player.y
  }));
  if (Math.abs(target.x - position.x) > 3) await moveAxis(page, "x", target.x);
  if (Math.abs(target.y - position.y) > 3) await moveAxis(page, "y", target.y);
}

async function driveCurrentCircuit(page) {
  const waypoints = await page.evaluate(() => window.CM.game.map.waypoints.map(point => ({ ...point })));
  for (const waypoint of waypoints) {
    if (await page.evaluate(() => window.CM.game.state) !== "PLAYING") return;
    await moveAlong(page, waypoint);
  }
}

async function advancePortal(page) {
  await driveCurrentCircuit(page);
  await expect.poll(() => page.evaluate(() => window.CM.game.nearGate())).toBe(true);
  const stage = await page.evaluate(() => window.CM.game.stageIndex);
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  await page.keyboard.press("e");
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("TRANSITION");
  await expect.poll(() => page.evaluate(() => window.CM.game.state), { timeout: 5000 }).toBe("PLAYING");
  await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(stage + 1);
}

async function collectGarageItems(page) {
  const waypoints = await page.evaluate(() => window.CM.game.map.waypoints.map(point => ({ ...point })));
  for (const waypoint of waypoints) {
    await moveAlong(page, waypoint);
  }
  await expect.poll(() => page.evaluate(() => window.CM.game.items.length)).toBe(0);
}

async function selectAndStartChallenge(page, levelId) {
  await page.locator(`[data-level-id="${levelId}"]`).click();
  await page.getByRole("button", { name: "Planejar fase" }).click();
  const plan = await page.evaluate(id => {
    const level = window.CM.LEVELS.find(entry => entry.id === id);
    return [...level.route].reverse();
  }, levelId);
  for (const symbol of plan) await page.locator(`#challengeStock [data-item="${symbol}"]`).click();
  await page.getByRole("button", { name: "Confirmar plano e ir à garagem" }).click();
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  await page.evaluate(() => { window.CM.game.player.speed = 615; });
}

async function completeChallengeByDriving(page) {
  const routeLength = await page.evaluate(() => window.CM.game.route.length);
  await collectGarageItems(page);
  await page.keyboard.press("e");
  await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("TRANSITION");
  await expect.poll(() => page.evaluate(() => window.CM.game.state), { timeout: 5000 }).toBe("PLAYING");
  for (let stage = 1; stage < routeLength; stage += 1) await advancePortal(page);
  await driveCurrentCircuit(page);
  await expect.poll(() => page.evaluate(() => window.CM.game.state), { timeout: 10000 }).toBe("WON");
}

test("first run teaches by gameplay, completes the PDA race, and preserves lab features", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(appUrl);
  const startWords = await page.locator("#startScreen").innerText();
  expect(startWords.trim().split(/\s+/).length).toBeLessThanOrEqual(45);
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
  await expect(page.locator("#coachText")).toHaveText("Dirija com W A S D ou setas.");

  const visibleControls = await page.locator(
    "button:visible, input:visible, select:visible, summary:visible"
  ).count();
  expect(visibleControls).toBeLessThanOrEqual(8);
  expect(await page.locator("#objective, #missionText, #hint, #raceProgress, #stageValue").count()).toBe(1);
  expect(await page.locator("#objective").innerText()).not.toBe("");

  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", true);
  await page.getByRole("button", { name: "Limpar" }).click();
  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", false);

  await page.getByRole("button", { name: "Desativar som" }).click();
  await page.evaluate(() => { window.CM.game.player.speed = 615; });
  await moveAlong(page, { x: 125, y: 130 });
  await expect(page.locator("#coachText")).toHaveText("Pegue o item ①.");
  expect(await page.evaluate(() => Math.hypot(window.CM.game.player.x - 45, window.CM.game.player.y - 280))).toBeGreaterThan(100);
  await collectGarageItems(page);
  await expect(page.locator("#coachText")).toHaveText("Agora vá ao portão e aperte E.");
  await page.keyboard.press("e");
  await expect(page.locator("#coachText")).toHaveText("Primeiro sai quem entrou por último!");
  await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cm-tutorial-completed")), { timeout: 10000 }).toBe("1");
  await expect(page.locator("#coachText")).toHaveText("Parabéns, você entendeu a pilha.");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cm-tutorial-completed"))).toBe("1");

  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", true);
  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", false);

  for (let stage = 1; stage < 5; stage += 1) {
    await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
    await advancePortal(page);
    await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(stage + 1);
  }
  await driveCurrentCircuit(page);
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("WON");
  await expect(page.locator("#endScreen")).toBeVisible();
  await expect(page.locator(".end-actions .primary")).toHaveText("Começar o desafio");
  await expect(page.locator("#stateValue")).toHaveText("q6");
  await expect(page.locator("#topValue")).toHaveText("Z0");
  await expect(page.locator("#statusBadge")).toContainText("ACEITA");
  expect(await page.evaluate(() => window.CM.game.pda.stack)).toEqual(["Z0"]);

  await page.getByRole("button", { name: "Ir ao Laboratório" }).click();
  await expect(page.locator("#laboratorio")).toBeVisible();
  const examples = await page.locator(".example-chip").evaluateAll(buttons =>
    buttons.map(button => button.dataset.example)
  );
  expect(examples).toEqual([
    "txnlaALNXTf", "txnlaALNXTL", "txnlaANXTf", "txnlaALNXT", "tlnxaALNXTf"
  ]);
  for (const sequence of examples) {
    await page.locator(`[data-example="${sequence}"]`).click();
    await expect(page.locator("#sequenceInput")).toHaveValue(sequence);
  }
  await page.getByRole("button", { name: "Ordem errada" }).click();
  await expect(page.locator("#sequenceInput")).toHaveValue("txnlaANXTf");
  await page.getByRole("button", { name: "Passo a passo" }).click();
  await expect(page.locator("#simPointer")).toContainText("1");
  if (!await page.locator("#advancedOptions").evaluate(details => details.open)) {
    await page.locator("#advancedOptions > summary").click();
  }
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.locator("#simPointer")).toContainText("0");
  await page.getByRole("button", { name: "Avançar 1" }).click();
  await expect(page.locator("#simPointer")).toContainText("1");
  await page.getByRole("tab", { name: "Diagrama" }).click();
  await expect(page.locator("#diagramView")).toBeVisible();
  await page.getByRole("tab", { name: "Tabela" }).click();
  await expect(page.locator("#transitionTableView")).toBeVisible();
  await page.locator("#sequenceInput").fill("txnlaALNXTf");
  await page.getByRole("button", { name: "Executar" }).click();
  await expect(page.locator("#simStatus")).toHaveText(/^ACEITA/, { timeout: 15000 });
  await expect(page.locator("#simState")).toContainText("q6");
  await expect(page.locator("#simStack")).toContainText("Z0");
  await page.locator("#resetSimulator").click();
  await page.getByRole("button", { name: "Apagar último" }).click();
  await expect(page.locator("#sequenceInput")).toHaveValue("txnlaALNXT");
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(page.locator("#sequenceInput")).toHaveValue("");
  await page.getByLabel("Modo ao vivo").check();
  await page.locator('[data-sequence-symbol="t"]').click();
  expect(await page.evaluate(() => window.CM.simulator.pda.stack)).toEqual(["Z0", "T"]);
  await page.getByRole("button", { name: "Apagar último" }).click();
  await expect(page.locator("#sequenceInput")).toHaveValue("");
  expect(await page.evaluate(() => window.CM.simulator.pda.stack)).toEqual(["Z0"]);
  for (const symbol of ["t", "x", "n", "l", "a", "A", "L", "N", "X", "T", "f"]) {
    await page.locator(`[data-sequence-symbol="${symbol}"]`).click();
  }
  await expect(page.locator("#simStatus")).toHaveText(/^ACEITA/);
  await expect(page.locator("#simState")).toContainText("q6");
  expect(await page.evaluate(() => window.CM.simulator.pda.stack)).toEqual(["Z0"]);

  if (!await page.locator("#advancedOptions").evaluate(details => details.open)) {
    await page.locator("#advancedOptions > summary").click();
  }
  await page.locator("#simulatorRoute").selectOption("warmup");
  await expect(page.locator(".examples")).toBeHidden();
  await expect(page.locator("#transitionTableBody tr")).toHaveCount(5);
  await page.locator("#sequenceInput").fill("nlaALNf");
  await page.getByRole("button", { name: "Executar" }).click();
  await expect(page.locator("#simStatus")).toHaveText(/^ACEITA/, { timeout: 15000 });
  await expect(page.locator("#simState")).toContainText("q4");
  expect(await page.evaluate(() => window.CM.simulator.pda.stack)).toEqual(["Z0"]);
});

test("completed tutorial stays hidden on the next visit and query override forces it", async ({ page }) => {
  await openGame(page);
  await expect(page.locator("#coachText")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#coachmark")).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
  await expect(page.locator("#coachmark")).toBeHidden();

  await page.goto(`${appUrl}?tutorial=1`);
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
  await expect(page.locator("#coachText")).toHaveText("Dirija com W A S D ou setas.");
  await page.keyboard.press("Escape");
  await expect(page.locator("#coachmark")).toBeHidden();
});

test("challenge plans configure a route-specific race and accept its valid sequence", async ({ page }) => {
  await page.goto(appUrl);
  await page.evaluate(() => {
    localStorage.setItem("cm-rally-won", "1");
    localStorage.setItem("cm-challenge-intro", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: /Desafio/ }).click();
  await page.locator('[data-level-id="warmup"]').click();
  await page.getByRole("button", { name: "Planejar fase" }).click();
  await expect(page.locator("#briefingView")).toBeVisible();
  for (const symbol of ["N", "L", "A"]) {
    await page.locator(`#challengeStock [data-item="${symbol}"]`).click();
  }
  await page.getByRole("button", { name: "Confirmar plano e ir à garagem" }).click();
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  expect(await page.evaluate(() => window.CM.game.items.map(item => item.key))).toEqual(["N", "L", "A"]);
  await page.evaluate(() => {
    for (const symbol of ["n", "l", "a"]) window.CM.game.process(symbol);
  });
  for (const symbol of ["A", "L", "N"]) {
    await page.evaluate(value => window.CM.game.process(value), symbol);
    await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  }
  await page.evaluate(() => window.CM.game.process("f"));
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("WON");
  expect(await page.evaluate(() => ({
    state: window.CM.game.pda.state,
    status: window.CM.game.pda.status,
    stack: window.CM.game.pda.stack
  }))).toEqual({ state: "q4", status: "accepted", stack: ["Z0"] });
});

test("the three challenge phases are drivable and finish with the champion screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${appUrl}?unlockAll=1`);
  await page.evaluate(() => {
    localStorage.setItem("cm-rally-won", "1");
    localStorage.setItem("cm-challenge-intro", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: /Desafio/ }).click();

  for (const levelId of ["warmup", "real-race", "crazy-rally"]) {
    await selectAndStartChallenge(page, levelId);
    if (levelId === "crazy-rally") {
      const maps = await page.evaluate(() => window.CM.game.maps);
      expect(maps[1].theme).toBe("desert");
      expect(maps[3].theme).toBe("desert");
      expect(maps[1].variant).toBe(0);
      expect(maps[3].variant).toBe(1);
      expect(maps[1].waypoints).not.toEqual(maps[3].waypoints);
      expect(maps[3].waypoints.map(point => point.y)).toEqual(
        maps[1].waypoints.map(point => 560 - point.y)
      );
    }
    await completeChallengeByDriving(page);
    if (levelId === "crazy-rally") break;
    await page.getByRole("button", { name: "Escolher fase" }).click();
  }

  await expect(page.locator("#championScreen")).toBeVisible();
  await expect(page.locator("#championTitle")).toHaveText("Parabéns, campeão do Rally!");
  await expect(page.locator("#championScreen svg[aria-label*='Troféu']")).toBeVisible();
  await expect(page.locator("#championSummary li")).toHaveCount(3);
  await expect(page.locator("#championActionPrimary")).toBeFocused();
  await expect(page.locator("#endScreen")).toBeHidden();
  await expect(page.locator("#championScreen button")).toHaveCount(3);
  expect(await page.evaluate(() => ({
    state: window.CM.game.pda.state,
    status: window.CM.game.pda.status,
    stack: window.CM.game.pda.stack,
    complete: localStorage.getItem("cm-challenge-complete")
  }))).toEqual({ state: "q7", status: "accepted", stack: ["Z0"], complete: "1" });
  await page.screenshot({ path: path.resolve(__dirname, "..", "docs", "screenshots", "champion-1280x720.png") });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: path.resolve(__dirname, "..", "docs", "screenshots", "champion-768x1024.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth
  }));
  expect(mobileWidth.scroll).toBeLessThanOrEqual(mobileWidth.client);
  await page.screenshot({ path: path.resolve(__dirname, "..", "docs", "screenshots", "champion-390x844.png") });
  await page.getByRole("button", { name: "Jogar o desafio de novo" }).click();
  await expect(page.locator("#championBadge")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Desafio/ }).click();
  await expect(page.locator("#championBadge")).toBeVisible();
});

test("all six circuit screenshots render and straight-line driving never reaches a gate", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${appUrl}?debug=1`);
  await page.evaluate(() => localStorage.setItem("cm-tutorial-completed", "1"));
  await page.reload();
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
  await page.addStyleTag({ content: "#debugPanel { display: none !important; }" });
  const themes = ["garage", "desert", "swamp", "snow", "track", "volcano"];
  for (let index = 0; index < 6; index += 1) {
    await page.evaluate(world => window.CM.debug.gotoWorld(world), index);
    await page.screenshot({
      path: path.resolve(__dirname, "..", "docs", "screenshots", `circuit-${themes[index]}-1280x720.png`)
    });
    await page.keyboard.down("d");
    await page.waitForTimeout(3000);
    await page.keyboard.up("d");
    expect(await page.evaluate(() => window.CM.game.nearGate())).toBe(false);
  }
});

test("reduced motion removes confetti from the champion screen", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(appUrl);
  await page.evaluate(() => {
    const level = window.CM.LEVELS.at(-1);
    window.CM.game.configure({ mode: "challenge", level, plan: level.stock });
    window.CM.game.showEnd(true, "Desafio concluído.");
  });
  await expect(page.locator("#championScreen")).toBeVisible();
  await expect(page.locator("#championConfetti .confetti-piece")).toHaveCount(0);
  expect(await page.locator(".champion-trophy").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
});

test("the final challenge route control fits beside the mobile champion screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appUrl);
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
  await page.evaluate(() => {
    const level = window.CM.LEVELS.at(-1);
    window.CM.game.configure({ mode: "challenge", level, plan: [...level.route].reverse() });
    window.CM.game.start();
    window.CM.game.stageIndex = window.CM.game.maps.length - 1;
    window.CM.game.render();
    window.CM.game.showEnd(true, "Desafio concluído.");
  });
  await expect(page.locator("#championScreen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rever rota" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    routeButtonRight: document.querySelector("#worldTrail button").getBoundingClientRect().right
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  expect(dimensions.routeButtonRight).toBeLessThanOrEqual(dimensions.client);
});

test("play and touch layouts fit supported viewport widths", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openGame(page, "?tutorial=1");
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      action: getComputedStyle(document.getElementById("actionBtn")).display,
      touchPad: getComputedStyle(document.getElementById("touchPad").parentElement).display
    }));
    const controls = await page.locator(
      "button:visible, input:visible, select:visible, summary:visible"
    ).count();
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    expect(controls).toBeLessThanOrEqual(8);
    if (viewport.width <= 900) {
      expect(dimensions.action).toBe("none");
      await page.locator("#touchPad").click({
        position: { x: Math.round(viewport.width <= 600 ? 31 : 35), y: Math.round(viewport.width <= 600 ? 22 : 26) }
      });
      await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", true);
      await page.locator("#touchPad").click({
        position: { x: Math.round(viewport.width <= 600 ? 31 : 35), y: Math.round(viewport.width <= 600 ? 22 : 26) }
      });
      await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", false);
    }
    await page.reload();
  }
});
