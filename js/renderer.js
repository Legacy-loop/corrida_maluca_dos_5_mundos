(function (root) {
  const { EQUIPMENT, WIDTH, HEIGHT } = root.CM;
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.dpr = 1;
      this.transition = null;
      this.particles = [];
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }

    resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = ratio;
      this.canvas.width = WIDTH * ratio;
      this.canvas.height = HEIGHT * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    beginTransition(stage) {
      this.transition = { stage, elapsed: 0 };
    }

    update(dt) {
      if (!this.transition) return false;
      this.transition.elapsed += dt;
      if (this.transition.elapsed < 0.9) return false;
      this.transition = null;
      return true;
    }

    draw(stage, player, items, map, gateOpen, finish, highlightedItem, destination, navigationIndex) {
      const c = this.ctx;
      c.clearRect(0, 0, WIDTH, HEIGHT);
      this.drawLandscape(c, stage);
      c.fillStyle = "#1824372e";
      c.fillRect(0, 0, WIDTH, HEIGHT);
      this.drawTrack(c, map.waypoints, stage.theme);
      this.drawObstacles(c, map.obstacles, stage.theme);
      items.forEach(item => this.drawItem(c, item, item === highlightedItem));
      this.drawGate(c, map.finish || map.gate, gateOpen, finish, destination);
      this.drawNavigation(c, player, map.waypoints, navigationIndex);
      if (player.moving) this.addDust(player);
      this.drawParticles(c);
      this.drawCar(c, player);
      if (this.transition) this.drawTransition(c, this.transition.stage);
    }

    drawLandscape(c, stage) {
      const colors = {
        garage: ["#344858", "#526d71"],
        desert: ["#d99a45", "#f0cb78"],
        swamp: ["#244f49", "#4c8066"],
        snow: ["#7db0c7", "#d9eff6"],
        track: ["#343947", "#68707c"],
        volcano: ["#522c32", "#a24a3b"]
      }[stage.theme];
      const gradient = c.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      c.fillStyle = gradient;
      c.fillRect(0, 0, WIDTH, HEIGHT);
      c.save();
      if (stage.theme === "garage") {
        c.fillStyle = "#d4e0e01c";
        for (let x = 25; x < WIDTH; x += 100) c.fillRect(x, 20, 2, HEIGHT - 40);
        c.fillStyle = "#ffe08a";
        c.fillRect(75, 38, 100, 8);
        c.fillRect(700, 42, 120, 8);
      } else if (stage.theme === "desert") {
        c.fillStyle = "#fff2c12b";
        for (let i = 0; i < 7; i++) {
          c.beginPath(); c.ellipse(i * 155 - 20, 70 + i % 2 * 24, 125, 35, 0, 0, Math.PI * 2); c.fill();
        }
      } else if (stage.theme === "swamp") {
        c.fillStyle = "#8ae0ae2a";
        for (let i = 0; i < 11; i++) {
          c.beginPath(); c.ellipse(i * 88, i % 2 ? 72 : 480, 38, 10, 0.12, 0, Math.PI * 2); c.fill();
        }
        this.drawReeds(c);
      } else if (stage.theme === "snow") {
        c.fillStyle = "#f4fdff4d";
        for (let i = 0; i < 8; i++) {
          c.beginPath(); c.moveTo(i * 135 - 20, 250); c.lineTo(i * 135 + 50, 50 + i % 3 * 20); c.lineTo(i * 135 + 130, 250); c.fill();
        }
        c.fillStyle = "#ffffff";
        for (let i = 0; i < 55; i++) c.fillRect((i * 197) % WIDTH, (i * 97) % HEIGHT, 2, 2);
      } else if (stage.theme === "track") {
        c.fillStyle = "#b5bac41c";
        for (let y = 16; y < HEIGHT; y += 28) c.fillRect(0, y, WIDTH, 2);
      } else {
        c.fillStyle = "#ffb13c26";
        for (let i = 0; i < 6; i++) {
          c.beginPath(); c.arc(115 + i * 145, 85 + i % 2 * 26, 30 + i % 3 * 8, 0, Math.PI * 2); c.fill();
        }
      }
      c.restore();
    }

    drawReeds(c) {
      c.strokeStyle = "#bdd26b";
      c.lineWidth = 4;
      for (let x = 30; x < WIDTH; x += 95) {
        c.beginPath(); c.moveTo(x, 195); c.lineTo(x - 5, 120); c.moveTo(x, 172); c.lineTo(x + 17, 142); c.stroke();
      }
    }

    drawTrack(c, waypoints, theme) {
      const path = () => {
        c.beginPath();
        c.moveTo(waypoints[0].x, waypoints[0].y);
        waypoints.slice(1).forEach(point => c.lineTo(point.x, point.y));
      };
      const surfaces = {
        garage: ["#192a36", "#54666a"],
        desert: ["#7a5028", "#deb16c"],
        swamp: ["#183d3b", "#9d8b54"],
        snow: ["#456b80", "#d9eff6"],
        track: ["#111720", "#707984"],
        volcano: ["#291d24", "#60403a"]
      };
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      path();
      c.strokeStyle = theme === "track" ? "#d9dce1" : "#101a25b8";
      c.lineWidth = theme === "swamp" ? 114 : 106;
      c.stroke();
      path();
      c.strokeStyle = surfaces[theme][0];
      c.lineWidth = theme === "swamp" ? 102 : 94;
      c.stroke();
      path();
      c.strokeStyle = surfaces[theme][1];
      c.globalAlpha = 0.34;
      c.lineWidth = 4;
      c.setLineDash(theme === "track" ? [16, 11] : [3, 17]);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
      if (theme === "track") {
        path();
        c.strokeStyle = "#d6464d";
        c.lineWidth = 7;
        c.setLineDash([12, 12]);
        c.stroke();
        c.setLineDash([12, 12]);
        c.lineDashOffset = 12;
        c.strokeStyle = "#f4f4f4";
        c.stroke();
      } else if (theme === "garage") {
        c.strokeStyle = "#c5a77a66";
        c.lineWidth = 2;
        waypoints.slice(1, -1).forEach(point => {
          c.beginPath(); c.moveTo(point.x - 26, point.y); c.lineTo(point.x + 26, point.y); c.stroke();
        });
      } else if (theme === "swamp") {
        c.strokeStyle = "#d9cb8b55";
        c.lineWidth = 5;
        waypoints.slice(1, -1).forEach(point => {
          c.beginPath(); c.moveTo(point.x - 31, point.y); c.lineTo(point.x + 31, point.y); c.stroke();
        });
      }
      c.restore();
    }

    drawObstacles(c, blocks, theme) {
      const styles = {
        garage: { fill: "#75553b", edge: "#e1c59a" },
        desert: { fill: "#b58b51", edge: "#f7d892" },
        swamp: { fill: "#244b47", edge: "#7da18c" },
        snow: { fill: "#bddbe6", edge: "#f6ffff" },
        track: { fill: "#292f38", edge: "#d84b51" },
        volcano: { fill: "#35252b", edge: "#ff7347" }
      };
      const style = styles[theme];
      blocks.forEach(block => {
        c.save();
        c.shadowColor = "#09101a88";
        c.shadowBlur = 12;
        c.fillStyle = style.fill;
        c.beginPath();
        c.roundRect(block.x, block.y, block.w, block.h, theme === "desert" ? 14 : 5);
        c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = style.edge;
        c.lineWidth = theme === "track" ? 4 : 2;
        c.stroke();
        c.save();
        c.beginPath();
        c.rect(block.x, block.y, block.w, block.h);
        c.clip();
        if (theme === "garage") {
          c.strokeStyle = "#211d1a66";
          c.lineWidth = 3;
          for (let y = block.y + 14; y < block.y + block.h; y += 25) {
            c.beginPath(); c.moveTo(block.x, y); c.lineTo(block.x + block.w, y); c.stroke();
          }
        } else if (theme === "desert") {
          c.strokeStyle = "#ffe4a466";
          c.lineWidth = 3;
          for (let y = block.y + 12; y < block.y + block.h; y += 34) {
            c.beginPath(); c.moveTo(block.x, y); c.quadraticCurveTo(block.x + block.w / 2, y - 10, block.x + block.w, y); c.stroke();
          }
        } else if (theme === "swamp") {
          c.strokeStyle = "#a8d7b755";
          c.lineWidth = 2;
          for (let y = block.y + 18; y < block.y + block.h; y += 42) {
            c.beginPath(); c.ellipse(block.x + block.w / 2, y, block.w * 0.35, 5, 0, 0, Math.PI * 2); c.stroke();
          }
        } else if (theme === "snow") {
          c.strokeStyle = "#ffffffa8";
          c.lineWidth = 3;
          for (let y = block.y + 10; y < block.y + block.h; y += 36) {
            c.beginPath(); c.moveTo(block.x + 3, y); c.lineTo(block.x + block.w - 3, y + 13); c.stroke();
          }
        } else if (theme === "track") {
          c.fillStyle = "#aeb5bd";
          for (let y = block.y + 14; y < block.y + block.h; y += 32) {
            c.beginPath(); c.arc(block.x + block.w / 2, y, Math.min(10, block.w / 2 - 2), 0, Math.PI * 2); c.fill();
          }
        } else {
          c.strokeStyle = "#ff7347";
          c.lineWidth = 4;
          for (let y = block.y + 14; y < block.y + block.h; y += 42) {
            c.beginPath(); c.moveTo(block.x + 3, y); c.lineTo(block.x + block.w - 3, y + 11); c.stroke();
          }
        }
        c.restore();
        c.restore();
      });
    }

    drawItem(c, item, highlighted) {
      const equipment = EQUIPMENT[item.key];
      const pulse = highlighted ? 1 + Math.sin(performance.now() / 160) * 0.09 : 1;
      c.save();
      c.translate(item.x, item.y);
      c.scale(pulse, pulse);
      if (highlighted) {
        c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.strokeStyle = "#ffd04a"; c.lineWidth = 3; c.stroke();
      }
      c.shadowColor = equipment.color;
      c.shadowBlur = highlighted ? 18 : 8;
      c.fillStyle = equipment.color;
      c.beginPath(); c.roundRect(-15, -15, 30, 30, 9); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = "#182332";
      c.font = "900 17px system-ui";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(item.key, 0, 0);
      c.fillStyle = "#fff";
      c.font = "700 10px system-ui";
      c.fillText(`${item.order}. ${equipment.name}`, 0, 29);
      c.restore();
    }

    drawGate(c, gate, open, finish, destination) {
      const x = gate.x + gate.w / 2;
      c.save();
      c.fillStyle = open || finish ? "#48d79a" : "#f36a72";
      c.shadowColor = c.fillStyle;
      c.shadowBlur = 20;
      c.fillRect(x - 7, gate.y, 14, gate.h);
      c.shadowBlur = 0;
      c.strokeStyle = "#f8fbff";
      c.lineWidth = 3;
      c.strokeRect(x - 11, gate.y - 4, 22, gate.h + 8);
      c.fillStyle = "#fff";
      c.font = "900 10px system-ui";
      c.textAlign = "center";
      c.fillText(finish ? "CHEGADA" : `PORTAL → ${destination || ""}`, x, gate.y - 12);
      if (finish) {
        for (let stripeY = gate.y + 4; stripeY < gate.y + gate.h - 4; stripeY += 20) {
          for (let x0 = x - 12; x0 < x + 12; x0 += 12) {
            if ((Math.floor(stripeY / 20) + Math.floor(x0 / 12)) % 2 === 0) {
              c.fillStyle = "#fff"; c.fillRect(x0, stripeY, 12, 10);
            }
          }
        }
      }
      c.restore();
    }

    drawNavigation(c, player, waypoints, navigationIndex) {
      const remaining = waypoints.slice(Math.max(1, navigationIndex));
      const target = remaining[0] || waypoints.at(-1);
      if (Math.hypot(target.x - player.x, target.y - player.y) < 40) return;
      const angle = Math.atan2(target.y - player.y, target.x - player.x);
      c.save();
      c.globalAlpha = 0.35;
      c.strokeStyle = "#ffd04a";
      c.lineWidth = 2;
      c.setLineDash([6, 9]);
      c.beginPath();
      c.moveTo(player.x, player.y);
      remaining.forEach(point => c.lineTo(point.x, point.y));
      c.stroke();
      c.setLineDash([]);
      c.translate(player.x + Math.cos(angle) * 28, player.y + Math.sin(angle) * 28);
      c.rotate(angle);
      c.fillStyle = "#ffd04a";
      c.beginPath();
      c.moveTo(-10, -7);
      c.lineTo(9, 0);
      c.lineTo(-10, 7);
      c.closePath();
      c.fill();
      c.restore();
    }

    addDust(player) {
      if (Math.random() > 0.45) return;
      this.particles.push({ x: player.x - Math.cos(player.angle) * 15, y: player.y - Math.sin(player.angle) * 15, life: 0.35, color: "#e5d6ad" });
    }

    drawParticles(c) {
      this.particles = this.particles.map(particle => ({ ...particle, life: particle.life - 0.025 })).filter(particle => particle.life > 0);
      this.particles.forEach(particle => {
        c.globalAlpha = particle.life * 1.7;
        c.fillStyle = particle.color;
        c.beginPath(); c.arc(particle.x, particle.y, 3 + particle.life * 5, 0, Math.PI * 2); c.fill();
      });
      c.globalAlpha = 1;
    }

    drawCar(c, player) {
      c.save();
      c.translate(player.x, player.y);
      c.rotate(player.angle);
      c.shadowColor = "#050b12a8";
      c.shadowBlur = 12;
      c.fillStyle = "#101722";
      c.beginPath(); c.roundRect(-19, -13, 39, 26, 8); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = "#ffbf43";
      c.beginPath(); c.roundRect(-11, -9, 23, 18, 5); c.fill();
      c.fillStyle = "#6bd5ed";
      c.beginPath(); c.roundRect(2, -7, 8, 14, 3); c.fill();
      c.fillStyle = "#080d13";
      c.fillRect(-14, -15, 10, 4); c.fillRect(8, -15, 10, 4);
      c.fillRect(-14, 11, 10, 4); c.fillRect(8, 11, 10, 4);
      c.fillStyle = "#fff3b7";
      c.fillRect(16, -8, 3, 5); c.fillRect(16, 3, 3, 5);
      c.restore();
    }

    drawTransition(c, stage) {
      const progress = Math.min(1, this.transition.elapsed / 0.9);
      c.save();
      c.fillStyle = `${stage.color}`;
      c.globalAlpha = Math.sin(progress * Math.PI) * 0.48;
      c.fillRect(0, 0, WIDTH, HEIGHT);
      c.globalAlpha = 1;
      c.fillStyle = "#fff";
      c.font = "900 28px system-ui";
      c.textAlign = "center";
      c.fillText(stage.name.toUpperCase(), WIDTH / 2, 95);
      c.restore();
    }
  }
  root.CM.Renderer = Renderer;
})(typeof globalThis !== "undefined" ? globalThis : this);
