(function (root, factory) {
  const { PLAYER_RADIUS, WIDTH, HEIGHT } = root.CM;
  root.CM.Player = factory(PLAYER_RADIUS, WIDTH, HEIGHT);
})(typeof globalThis !== "undefined" ? globalThis : this, function (RADIUS, WIDTH, HEIGHT) {
  class Player {
    constructor(spawn) {
      this.reset(spawn);
    }

    reset(spawn = { x: 42, y: 280 }) {
      this.x = spawn.x;
      this.y = spawn.y;
      this.speed = 205;
      this.keys = new Set();
      this.angle = 0;
    }

    setDirection(direction, pressed) {
      if (pressed) this.keys.add(direction);
      else this.keys.delete(direction);
    }

    update(dt, blocks) {
      const dx = (this.keys.has("right") ? 1 : 0) - (this.keys.has("left") ? 1 : 0);
      const dy = (this.keys.has("down") ? 1 : 0) - (this.keys.has("up") ? 1 : 0);
      if (!dx && !dy) {
        this.moving = false;
        return false;
      }
      const length = Math.hypot(dx, dy);
      const oldX = this.x;
      const oldY = this.y;
      const stepCount = Math.max(1, Math.ceil(Math.max(0, dt) / (1 / 30)));
      const step = Math.max(0, dt) / stepCount;
      for (let index = 0; index < stepCount; index++) {
        const moveX = dx / length * this.speed * step;
        const moveY = dy / length * this.speed * step;
        this.resolvePenetration(blocks);
        this.x = this.moveAxis(this.x, this.y, moveX, true, blocks);
        this.y = this.moveAxis(this.x, this.y, moveY, false, blocks);
        this.x = Math.max(RADIUS, Math.min(WIDTH - RADIUS, this.x));
        this.y = Math.max(RADIUS, Math.min(HEIGHT - RADIUS, this.y));
      }
      if (this.x !== oldX || this.y !== oldY) this.angle = Math.atan2(this.y - oldY, this.x - oldX);
      this.moving = this.x !== oldX || this.y !== oldY;
      return this.x !== oldX || this.y !== oldY;
    }

    moveAxis(x, y, amount, horizontal, blocks) {
      const next = horizontal ? x + amount : y + amount;
      const candidate = horizontal ? { x: next, y } : { x, y: next };
      if (blocks.some(block => this.collides(candidate.x, candidate.y, block))) return horizontal ? x : y;
      return next;
    }

    collides(x, y, block) {
      const nearestX = Math.max(block.x, Math.min(x, block.x + block.w));
      const nearestY = Math.max(block.y, Math.min(y, block.y + block.h));
      return Math.hypot(x - nearestX, y - nearestY) < RADIUS;
    }

    resolvePenetration(blocks) {
      for (let pass = 0; pass < blocks.length + 1; pass++) {
        const block = blocks.find(candidate => this.collides(this.x, this.y, candidate));
        if (!block) return;
        const options = [
          { x: block.x - RADIUS - 0.1, y: this.y, distance: Math.abs(this.x - (block.x - RADIUS - 0.1)) },
          { x: block.x + block.w + RADIUS + 0.1, y: this.y, distance: Math.abs(this.x - (block.x + block.w + RADIUS + 0.1)) },
          { x: this.x, y: block.y - RADIUS - 0.1, distance: Math.abs(this.y - (block.y - RADIUS - 0.1)) },
          { x: this.x, y: block.y + block.h + RADIUS + 0.1, distance: Math.abs(this.y - (block.y + block.h + RADIUS + 0.1)) }
        ].sort((a, b) => a.distance - b.distance);
        const safe = options.find(point =>
          point.x >= RADIUS && point.x <= WIDTH - RADIUS &&
          point.y >= RADIUS && point.y <= HEIGHT - RADIUS &&
          !blocks.some(other => other !== block && this.collides(point.x, point.y, other))
        );
        if (!safe) return;
        this.x = safe.x;
        this.y = safe.y;
      }
    }
  }
  return Player;
});
