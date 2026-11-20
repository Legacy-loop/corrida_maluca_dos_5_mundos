const { test, expect } = require("@playwright/test");
const path = require("node:path");

const appUrl = `file://${path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/")}`;
test.describe.configure({ timeout: 180000 });

async function openGame(page, query = "") {
  await page.goto(`${appUrl}${query}`);
  await page.getByRole("button", { name: "JOGAR", exact: true }).click();
}

async function move(page, key, distance) {
  const axis = key === "a" || key === "d" ? "x" : "y";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const position = await page.evaluate(() => ({
      x: window.CM.game.player.x,
      y: window.CM.game.player.y
    }));
    const remaining = distance - position[axis];
    if (Math.abs(remaining) <= 10) return;
    const direction = remaining < 0 ? (axis === "x" ? "a" : "w") : (axis === "x" ? "d" : "s");
    const duration = Math.max(40, Math.ceil((Math.abs(remaining) - 8) / 205 * 1000));
    await page.keyboard.down(direction);
    await page.waitForTimeout(duration);
    await page.keyboard.up(direction);
    await page.waitForTimeout(50);
  }
}

async function driveTo(page, waypoints) {
  for (const [x, y] of waypoints) {
    const position = await page.evaluate(() => ({
      x: window.CM.game.player.x,
      y: window.CM.game.player.y
    }));
    if (Math.abs(x - position.x) > 4) await move(page, x < position.x ? "a" : "d", x);
    const afterX = await page.evaluate(() => window.CM.game.player.y);
    if (Math.abs(y - afterX) > 4) await move(page, y < afterX ? "w" : "s", y);
  }
}

async function collectItem(page, route, order) {
  await driveTo(page, route);
  await expect.poll(() => page.evaluate(() => window.CM.game.items.length)).toBe(5 - order);
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
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await expect(page.locator("#coachText")).toHaveText("Pegue o item ①.");
  expect(await page.evaluate(() => window.CM.game.player.x)).toBeGreaterThan(120);

  await collectItem(page, [[110, 145], [110, 112]], 1);
  await expect(page.locator("#coachText")).toContainText("Ele entrou na pilha");
  await collectItem(page, [[110, 145], [270, 145], [270, 420]], 2);
  await collectItem(page, [[270, 360], [460, 360], [460, 120]], 3);
  await collectItem(page, [[460, 145], [610, 145], [610, 370], [610, 420]], 4);
  await collectItem(page, [[610, 340], [760, 340], [760, 120]], 5);
  await driveTo(page, [[760, 280], [810, 280]]);
  await expect(page.locator("#coachText")).toHaveText("Agora vá ao portão e aperte E.");
  await page.keyboard.press("e");
  await expect(page.locator("#coachText")).toHaveText("Primeiro sai quem entrou por último!");
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(1);
  await expect(page.locator("#coachText")).toHaveText("Parabéns, você entendeu a pilha.", { timeout: 8000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cm-tutorial-completed"))).toBe("1");

  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", true);
  await page.keyboard.press("t");
  await expect(page.locator("#technicalDrawer")).toHaveJSProperty("open", false);

  for (let stage = 1; stage <= 4; stage += 1) {
    await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
    await move(page, "d", 810);
    await page.keyboard.press("e");
    await expect.poll(() => page.evaluate(() => window.CM.game.stageIndex)).toBe(stage + 1);
  }
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("PLAYING");
  await move(page, "d", 810);
  await expect.poll(() => page.evaluate(() => window.CM.game.state)).toBe("WON");
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
