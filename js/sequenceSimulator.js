(function (root) {
  const { PDA, EQUIPMENT, LEVELS, CLASSIC_ROUTE } = root.CM;
  class Simulator {
    constructor(ui) {
      this.ui = ui;
      this.routeId = "classic";
      this.route = [...CLASSIC_ROUTE];
      this.pda = new PDA({ route: this.route });
      this.sequence = "";
      this.index = 0;
      this.busy = false;
      this.snapshots = [];
      this.stepping = false;
      this.sequence = document.getElementById("sequenceInput").value;
      this.renderReference();
      this.render();
    }

    bindControls() {
      const input = document.getElementById("sequenceInput");
      input.addEventListener("input", () => {
        if (this.busy) return;
        this.sequence = input.value;
        this.reset();
      });
      document.querySelectorAll("[data-sequence-symbol]").forEach(button => {
        button.addEventListener("click", () => this.appendSymbol(button.dataset.sequenceSymbol));
      });
      document.getElementById("liveMode").addEventListener("change", () => {
        this.stepping = false;
        this.reset();
        this.render();
      });
      document.getElementById("deleteLastSymbol").addEventListener("click", () => this.deleteLast());
      document.getElementById("clearSequence").addEventListener("click", () => this.clear());
      document.getElementById("runSequence").addEventListener("click", () => this.runFromInput());
      document.getElementById("stepSequence").addEventListener("click", () => {
        if (this.busy) return;
        this.sequence = input.value;
        this.stepping = true;
        this.next();
      });
      document.getElementById("nextSymbol").addEventListener("click", () => this.next());
      document.getElementById("undoSequence").addEventListener("click", () => this.undo());
      document.getElementById("resetSimulator").addEventListener("click", () => this.reset());
      document.getElementById("simulatorRoute").addEventListener("change", event => this.setRoute(event.target.value));
      document.querySelectorAll("[data-example]").forEach(button => {
        button.addEventListener("click", () => this.load(button.dataset.example));
      });
      document.getElementById("tableTab").addEventListener("click", () => this.showReference("table"));
      document.getElementById("diagramTab").addEventListener("click", () => this.showReference("diagram"));
    }

    showReference(reference) {
      const table = reference === "table";
      document.getElementById("transitionTableView").classList.toggle("hidden", !table);
      document.getElementById("diagramView").classList.toggle("hidden", table);
      document.getElementById("tableTab").classList.toggle("active", table);
      document.getElementById("diagramTab").classList.toggle("active", !table);
      document.getElementById("tableTab").setAttribute("aria-selected", String(table));
      document.getElementById("diagramTab").setAttribute("aria-selected", String(!table));
    }

    reset() {
      this.pda.reset();
      this.index = 0;
      this.snapshots = [];
      this.stepping = false;
      this.sequence = document.getElementById("sequenceInput").value;
      document.getElementById("simHistory").replaceChildren();
      this.render();
    }

    load(value) {
      document.getElementById("sequenceInput").value = value;
      this.sequence = value;
      this.reset();
    }

    setRoute(routeId) {
      const selected = routeId === "classic"
        ? { route: CLASSIC_ROUTE }
        : LEVELS.find(level => level.id === routeId);
      if (!selected) throw new TypeError(`Rota do laboratório inválida: ${routeId}.`);
      this.routeId = routeId;
      this.route = [...selected.route];
      this.pda = new PDA({ route: this.route });
      document.getElementById("simulatorRoute").value = routeId;
      document.querySelector(".examples").classList.toggle("hidden", routeId !== "classic");
      this.renderReference();
      this.reset();
    }

    loadSequence(sequence) {
      const input = document.getElementById("sequenceInput");
      input.value = sequence;
      this.sequence = sequence;
      this.reset();
    }

    renderReference() {
      const tableBody = document.getElementById("transitionTableBody");
      tableBody.replaceChildren();
      const rows = [{
        state: "q0", input: "t, x, n, l, a", top: "qualquer",
        operation: "PUSH T, X, N, L, A", next: "q0", edge: "push"
      }];
      this.route.forEach((symbol, index) => rows.push({
        state: `q${index}`, input: symbol, top: symbol,
        operation: `POP ${symbol}`, next: `q${index + 1}`, edge: `portal-${index}`
      }));
      rows.push({
        state: `q${this.route.length}`, input: "f", top: "Z0",
        operation: "FINALIZA", next: `q${this.route.length + 1}`, edge: "finish"
      });
      rows.forEach(row => {
        const tr = document.createElement("tr");
        tr.dataset.transition = row.edge;
        [row.state, row.input, row.top, row.operation, row.next].forEach(value => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.append(td);
        });
        tableBody.append(tr);
      });

      const svg = document.getElementById("pdaSvg");
      const ns = "http://www.w3.org/2000/svg";
      svg.replaceChildren();
      const defs = document.createElementNS(ns, "defs");
      const marker = document.createElementNS(ns, "marker");
      marker.setAttribute("id", "arrow");
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("refX", "7");
      marker.setAttribute("refY", "4");
      marker.setAttribute("orient", "auto");
      const arrow = document.createElementNS(ns, "path");
      arrow.setAttribute("d", "M0,0 L8,4 L0,8 z");
      arrow.setAttribute("fill", "currentColor");
      marker.append(arrow);
      defs.append(marker);
      svg.append(defs);

      const nodeCount = this.route.length + 2;
      const spacing = 140;
      const width = Math.max(700, nodeCount * spacing + 30);
      const positions = Array.from({ length: nodeCount }, (_, index) => 70 + index * spacing);
      svg.setAttribute("viewBox", `0 0 ${width} 180`);
      svg.setAttribute("aria-label", `Diagrama da rota com ${this.route.length} portais`);

      const push = document.createElementNS(ns, "path");
      push.setAttribute("class", "edge active-edge");
      push.dataset.edge = "push";
      push.setAttribute("d", `M${positions[0]} 62 C${positions[0] - 50} 8,${positions[0] + 50} 8,${positions[0]} 62`);
      push.setAttribute("marker-end", "url(#arrow)");
      const pushLabel = document.createElementNS(ns, "text");
      pushLabel.setAttribute("x", String(positions[0]));
      pushLabel.setAttribute("y", "16");
      pushLabel.textContent = "t,x,n,l,a · ε/PUSH";
      svg.append(push, pushLabel);
      this.route.forEach((symbol, index) => this.appendDiagramEdge(
        svg, ns, `portal-${index}`, positions[index], positions[index + 1], `${symbol},${symbol}/ε`
      ));
      this.appendDiagramEdge(svg, ns, "finish", positions[nodeCount - 2], positions[nodeCount - 1], "f,Z0/Z0");

      positions.forEach((x, index) => {
        const node = document.createElementNS(ns, "g");
        node.setAttribute("class", `state-node${index === 0 ? " active" : ""}${index === nodeCount - 1 ? " final-node" : ""}`);
        node.dataset.state = `q${index}`;
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", "96");
        circle.setAttribute("r", "25");
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", String(x));
        label.setAttribute("y", "101");
        label.textContent = `q${index}`;
        node.append(circle, label);
        svg.append(node);
      });
    }

    appendDiagramEdge(svg, ns, id, from, to, label) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", "edge");
      path.dataset.edge = id;
      path.setAttribute("d", `M${from + 39} 88 L${to - 39} 88`);
      path.setAttribute("marker-end", "url(#arrow)");
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String((from + to) / 2));
      text.setAttribute("y", "72");
      text.textContent = label;
      svg.append(path, text);
    }

    appendSymbol(symbol) {
      if (this.busy) return;
      const input = document.getElementById("sequenceInput");
      if (document.getElementById("liveMode").checked) {
        this.snapshots.push({ pda: this.pda.snapshot(), index: this.index });
        input.value += symbol;
        this.sequence = input.value;
        this.index++;
        this.processSymbol(symbol);
        return;
      }
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      input.value = input.value.slice(0, start) + symbol + input.value.slice(end);
      input.focus();
      input.setSelectionRange(start + symbol.length, start + symbol.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    deleteLast() {
      if (this.busy) return;
      const input = document.getElementById("sequenceInput");
      if (document.getElementById("liveMode").checked && this.snapshots.length) this.undo();
      input.value = input.value.slice(0, -1);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    clear() {
      if (this.busy) return;
      document.getElementById("sequenceInput").value = "";
      this.reset();
    }

    saveSnapshot() {
      this.snapshots.push({ pda: this.pda.snapshot(), index: this.index });
    }

    next(fromRun = false) {
      if ((this.busy && !fromRun) || this.pda.status !== "running") return this.pda.finishInput();
      this.sequence = document.getElementById("sequenceInput").value;
      if (this.index >= this.sequence.length) {
        const result = this.pda.finishInput();
        this.showResult(result);
        return result;
      }
      this.saveSnapshot();
      const symbol = this.sequence[this.index];
      this.index++;
      return this.processSymbol(symbol);
    }

    processSymbol(symbol) {
      const result = this.pda.processSymbol(symbol);
      this.ui.log(result, "simHistory");
      this.render();
      if (this.pda.status !== "running") this.showResult(this.pda.finishInput());
      else if (this.index >= this.sequence.length && !document.getElementById("liveMode").checked) this.showResult(this.pda.finishInput());
      return result;
    }

    undo() {
      if (this.busy || !this.snapshots.length) return;
      const snapshot = this.snapshots.pop();
      this.pda.restore(snapshot.pda);
      this.index = snapshot.index;
      const history = document.getElementById("simHistory");
      if (history.firstElementChild) history.firstElementChild.remove();
      this.render();
      this.showResult(null);
    }

    runFromInput() {
      this.sequence = document.getElementById("sequenceInput").value;
      this.stepping = false;
      return this.run();
    }

    async run() {
      if (this.busy) return;
      this.setBusy(true);
      try {
        this.reset(false);
        this.sequence = document.getElementById("sequenceInput").value;
        while (this.index < this.sequence.length && this.pda.status === "running") {
          this.next(true);
          await new Promise(resolve => setTimeout(resolve, Number(document.getElementById("simSpeed").value)));
        }
        const result = this.pda.finishInput();
        this.showResult(result);
        return result;
      } finally {
        this.setBusy(false);
      }
    }

    setBusy(value) {
      this.busy = value;
      document.querySelectorAll("[data-sequence-symbol],[data-example],#deleteLastSymbol,#clearSequence,#runSequence,#stepSequence,#nextSymbol,#resetSimulator,#undoSequence,#liveMode,#sequenceInput,#simSpeed,#simulatorRoute").forEach(button => {
        button.disabled = value;
      });
    }

    render() {
      const snapshot = this.pda.snapshot();
      const stack = document.getElementById("simStack");
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
      const tape = document.getElementById("simTape");
      tape.replaceChildren();
      [...this.sequence].forEach((symbol, index) => {
        const cell = document.createElement("span");
        cell.textContent = symbol;
        if (index < this.index) cell.classList.add("processed");
        if (index === this.index && this.pda.status === "running") cell.classList.add("current");
        tape.append(cell);
      });
      document.getElementById("simState").textContent = `${snapshot.state} · topo ${snapshot.stack[snapshot.stack.length - 1]}`;
      document.getElementById("simPointer").textContent = `posição ${Math.min(this.index, this.sequence.length)} de ${this.sequence.length}`;
      document.getElementById("simLast").textContent = snapshot.last?.message || "Pronta para executar.";
      document.getElementById("simDetail").textContent = `Estado ${snapshot.state} · pilha ${snapshot.stack.join(" → ")}`;
      document.querySelectorAll(".state-node").forEach(node => node.classList.toggle("active", node.dataset.state === snapshot.state));
      const last = snapshot.last;
      const edge = !last || last.operation.startsWith("PUSH")
        ? "push"
        : last.symbol === "f" ? "finish" : `portal-${Number(last.previousState.slice(1))}`;
      document.querySelectorAll(".edge").forEach(node => node.classList.toggle("active-edge", node.dataset.edge === edge));
      document.querySelectorAll(".transition-table [data-transition]").forEach(row => row.classList.toggle("applied", row.dataset.transition === edge));
      this.showResult(null);
    }

    showResult(result) {
      const label = document.getElementById("simStatus");
      const status = result?.status || this.pda.status;
      if (status === "accepted") {
        label.textContent = "ACEITA ✅";
        label.className = "result-accepted";
      } else if (status === "rejected") {
        label.textContent = "REJEITADA ❌";
        label.className = "result-rejected";
      } else if (status === "incomplete") {
        label.textContent = "INCOMPLETA ⚠️";
        label.className = "result-incomplete";
      } else {
        label.textContent = this.index ? "Em execução…" : "Aguardando execução";
        label.className = "result-running";
      }
    }
  }
  root.CM.Simulator = Simulator;
})(typeof globalThis !== "undefined" ? globalThis : this);
