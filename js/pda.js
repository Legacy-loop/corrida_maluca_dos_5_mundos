(function (root, factory) {
  const constants = typeof module !== "undefined" && module.exports
    ? require("./constants.js")
    : root.CM;
  const PDA = factory(constants);
  if (typeof module !== "undefined" && module.exports) module.exports = PDA;
  root.CM = root.CM || {};
  root.CM.PDA = PDA;
})(typeof globalThis !== "undefined" ? globalThis : this, function ({ EQUIPMENT }) {
  const DEFAULT_ROUTE = ["A", "L", "N", "X", "T"];

  class PDA {
    constructor({ route = DEFAULT_ROUTE } = {}) {
      if (!Array.isArray(route) || route.some(symbol => !EQUIPMENT[symbol])) {
        throw new TypeError("A rota do PDA deve conter símbolos válidos de equipamento.");
      }
      this.route = [...route];
      this.reset();
    }

    reset() {
      this.stateIndex = 0;
      this.state = "q0";
      this.stack = ["Z0"];
      this.input = [];
      this.history = [];
      this.status = "running";
      this.last = null;
    }

    get top() {
      return this.stack[this.stack.length - 1];
    }

    stateName(index = this.stateIndex) {
      return `q${index}`;
    }

    snapshot() {
      return {
        state: this.state,
        stateIndex: this.stateIndex,
        route: [...this.route],
        stack: [...this.stack],
        input: [...this.input],
        history: this.history.map(entry => ({ ...entry, stackBefore: [...entry.stackBefore], stackAfter: [...entry.stackAfter], failure: entry.failure ? { ...entry.failure } : null })),
        status: this.status,
        last: this.last ? { ...this.last, stackBefore: [...this.last.stackBefore], stackAfter: [...this.last.stackAfter], failure: this.last.failure ? { ...this.last.failure } : null } : null
      };
    }

    restore(snapshot) {
      this.stateIndex = snapshot.stateIndex ?? Number(snapshot.state.slice(1));
      this.state = snapshot.state;
      this.stack = [...snapshot.stack];
      this.input = [...snapshot.input];
      this.history = snapshot.history.map(entry => ({ ...entry, stackBefore: [...entry.stackBefore], stackAfter: [...entry.stackAfter], failure: entry.failure ? { ...entry.failure } : null }));
      this.status = snapshot.status;
      this.last = snapshot.last ? { ...snapshot.last, stackBefore: [...snapshot.last.stackBefore], stackAfter: [...snapshot.last.stackAfter], failure: snapshot.last.failure ? { ...snapshot.last.failure } : null } : null;
    }

    processSymbol(symbol) {
      if (this.status !== "running") {
        return { accepted: false, status: this.status, symbol, operation: "IGNORADA", message: "A execução já terminou; reinicie o PDA para processar outra entrada." };
      }

      const before = [...this.stack];
      const previousState = this.state;
      const item = Object.entries(EQUIPMENT).find(([, equipment]) => equipment.collect === symbol);
      let operation;
      let message;
      let failure = null;

      if (this.stateIndex === 0 && item) {
        const [key, equipment] = item;
        this.stack.push(key);
        operation = `PUSH ${key}`;
        message = `${equipment.name} adicionado à pilha.`;
      } else if (this.stateIndex < this.route.length) {
        const required = this.route[this.stateIndex];
        if (symbol === required && this.top === required) {
          this.stack.pop();
          operation = `POP ${required}`;
          message = `${EQUIPMENT[required].name} instalado; o topo correto foi removido.`;
          this.stateIndex++;
          this.state = this.stateName();
        } else {
          failure = {
            portalIndex: this.stateIndex,
            required,
            top: this.top,
            reason: this.top === "Z0" ? "empty-stack" : "wrong-top"
          };
          const tried = EQUIPMENT[symbol]
            ? `Você tentou instalar ${symbol} (${EQUIPMENT[symbol].name})`
            : `A entrada ${symbol}`;
          const message = symbol !== required
            ? this.route.length === DEFAULT_ROUTE.length && this.route.every((entry, index) => entry === DEFAULT_ROUTE[index])
              ? this.classicRouteMessage(required, tried)
              : `${tried}, mas no portal ${this.stateIndex + 1} é preciso ${required} (${EQUIPMENT[required].name}); o topo atual é ${this.top}.`
            : this.classicRouteMessage(required, tried);
          return this.reject(symbol, previousState, before, message, failure);
        }
      } else if (symbol === "f" && this.top === "Z0") {
        operation = "FINALIZA";
        message = "Linha final cruzada. PDA aceitou a corrida.";
        this.stateIndex++;
        this.state = this.stateName();
      } else {
        failure = {
          portalIndex: "finish",
          required: "f",
          top: this.top,
          reason: this.top === "Z0" ? "empty-stack" : "leftover"
        };
        const message = failure.reason === "leftover"
          ? `A linha final chegou com ${this.top} sobrando no topo da pilha.`
          : `A entrada ${symbol} não pode finalizar: é esperado f com Z0 no topo.`;
        return this.reject(symbol, previousState, before, message, failure);
      }

      this.input.push(symbol);
      this.last = {
        symbol,
        operation,
        previousState,
        currentState: this.state,
        stackBefore: before,
        stackAfter: [...this.stack],
        message,
        failure
      };
      this.history.push(this.last);
      if (this.stateIndex > this.route.length) this.status = "accepted";
      return { accepted: true, status: this.status, ...this.last };
    }

    classicRouteMessage(required, tried) {
      if (this.route.length !== DEFAULT_ROUTE.length || this.route.some((symbol, index) => symbol !== DEFAULT_ROUTE[index])) {
        return `${tried}, mas é preciso ${required} (${EQUIPMENT[required].name}); o topo atual é ${this.top}.`;
      }
      return `${tried}, mas em ${this.state} é esperado ${required} (${EQUIPMENT[required].name}); o topo atual é ${this.top}. A pilha segue LIFO: só o elemento do topo pode ser removido.`;
    }

    reject(symbol, previousState, before, message, failure) {
      this.status = "rejected";
      this.last = {
        symbol,
        operation: "REJEITADA",
        previousState,
        currentState: this.state,
        stackBefore: before,
        stackAfter: [...this.stack],
        message,
        failure
      };
      this.input.push(symbol);
      this.history.push(this.last);
      return { accepted: false, status: this.status, ...this.last };
    }

    finishInput() {
      if (this.status === "accepted") return { accepted: true, status: "accepted", message: `ACEITA: estado ${this.state} e pilha Z0.` };
      if (this.status === "rejected") return { accepted: false, status: "rejected", message: this.last.message, failure: this.last.failure };
      const finish = this.stateIndex >= this.route.length;
      const failure = finish
        ? { portalIndex: "finish", required: "f", top: this.top, reason: this.top === "Z0" ? "empty-stack" : "leftover" }
        : { portalIndex: this.stateIndex, required: this.route[this.stateIndex], top: this.top, reason: this.top === "Z0" ? "empty-stack" : "wrong-top" };
      return {
        accepted: false,
        status: "incomplete",
        failure,
        message: finish && failure.reason === "leftover"
          ? `INCOMPLETA: a linha final chegou com ${this.top} sobrando na pilha.`
          : `INCOMPLETA: estado ${this.state}, topo ${this.top}. Falta concluir a sequência.`
      };
    }
  }
  return PDA;
});
