/* global Phaser, COIN_DASH */
// Level progress lives outside the scene so it survives scene.restart() between levels.
const levelState = { level: 1, score: 0 };
const COIN_DASH_BEST_KEY = 'coinDashHighScore';
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.best = this.loadBest();
    const lv = this.beginLevel();
    this.deadline = this.time.now + lv.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.makeTextures();
    this.drawBackground();
    this.hud = this.add.text(18, 12, '', this.hudStyle());
    this.player = this.add.sprite(c.width / 2, c.height / 2, 'player');
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(false); // the player wraps instead of hitting the walls
    this.coin = this.add.sprite(100, 100, 'coin0').play('coin-spin');
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < lv.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * lv.droneSpeed, Math.sin(angle) * lv.droneSpeed);
    }
    this.dressActors();
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.resetLevels());
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  togglePause() {
    if (this.finished) return;
    const c = COIN_DASH;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
        this.add.rectangle(0, 0, c.pause.overlay.width, c.pause.overlay.height,
          c.pause.overlay.color, c.pause.overlay.alpha),
        this.add.text(0, 0, c.pause.text, c.pause.textStyle).setOrigin(0.5)
      ]);
    } else {
      // Push the deadline forward by the paused duration so the countdown does not lose time.
      this.deadline += this.time.now - this.pausedAt;
      this.pauseOverlay.destroy();
      this.physics.resume();
    }
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    this.physics.world.wrap(this.player, COIN_DASH.wrap.padding);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}      Best: ${this.bestLabel()}      Time: ${seconds}s${this.levelHud()}`);
    if (seconds === 0) this.levelComplete();
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    // One extra line (Best) on top of the levels panel.
    this.add.rectangle(c.width / 2, c.height / 2, 460, c.levels.panelHeight + 40, 0x0a1120, 0.95);
    const endText = this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.levelReached()}\n${this.score} coins collected\nBest: ${this.bestLabel()}\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
    if (this.score > 0 && this.score > this.best.score) {
      const oldLabel = this.bestLabel();
      this.askName((name) => {
        this.best = { score: this.score, name };
        this.saveBest(this.best);
        endText.setText(`${reason}\n${this.levelReached()}\n${this.score} coins collected\nNew best: ${this.bestLabel()}\nPress R to try again`);
        this.hud.setText(this.hud.text.replace(oldLabel, this.bestLabel()));
      });
    }
  }

  // ---- High score helpers: one localStorage key, every access wrapped in try/catch. ----
  loadBest() {
    try {
      const saved = JSON.parse(localStorage.getItem(COIN_DASH_BEST_KEY));
      if (saved && Number.isFinite(saved.score) && saved.score > 0) {
        return { score: saved.score, name: String(saved.name || 'Anonymous') };
      }
    } catch (e) { /* storage blocked or corrupt entry: play without a saved best */ }
    return { score: 0, name: '' };
  }

  saveBest(best) {
    try {
      localStorage.setItem(COIN_DASH_BEST_KEY, JSON.stringify(best));
    } catch (e) { /* storage blocked: the best still lives for this page session */ }
  }

  bestLabel() {
    return this.best.score > 0 ? `${this.best.score} (${this.best.name})` : 'none yet';
  }

  // Shows the HTML name prompt from index.html; calls onDone(name) once the player submits.
  askName(onDone) {
    const overlay = document.getElementById('name-overlay');
    const form = document.getElementById('name-form');
    const input = document.getElementById('name-input');
    if (!overlay || !form || !input) { onDone('Anonymous'); return; }
    const keyboard = this.input.keyboard;
    keyboard.enabled = false; // typing a name must not move the player or restart the round
    const swallow = (e) => e.stopPropagation(); // keep key events away from Phaser's window listener
    input.addEventListener('keydown', swallow);
    input.addEventListener('keyup', swallow);
    form.onsubmit = (e) => {
      e.preventDefault();
      form.onsubmit = null;
      input.removeEventListener('keydown', swallow);
      input.removeEventListener('keyup', swallow);
      const name = input.value.trim() || 'Anonymous';
      overlay.hidden = true;
      input.blur();
      keyboard.enabled = true;
      keyboard.resetKeys();
      const canvas = this.game.canvas; // hand focus back so R restarts right away
      if (canvas) { canvas.setAttribute('tabindex', '-1'); canvas.focus(); }
      onDone(name);
    };
    input.value = '';
    overlay.hidden = false;
    input.focus();
  }

  // --- Levels by rounds ---------------------------------------------------
  // Derive this level's tunables from the base settings and COIN_DASH.levels.
  beginLevel() {
    const c = COIN_DASH, L = c.levels;
    const n = levelState.level - 1;
    this.level = levelState.level;
    this.score = levelState.score;
    return {
      droneCount: Math.min(L.maxDrones, c.droneCount + n * L.dronesPerLevel),
      droneSpeed: c.droneSpeed * Math.pow(L.speedMultiplier, n),
      roundSeconds: Math.max(L.minRoundSeconds, c.roundSeconds - n * L.secondsLessPerLevel)
    };
  }

  levelHud() {
    return COIN_DASH.levels.hudText.replace('{n}', this.level);
  }

  levelReached() {
    return COIN_DASH.levels.reachedText.replace('{n}', this.level);
  }

  // Round survived: show the "get ready" screen, then restart the scene one level up.
  levelComplete() {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH, L = c.levels;
    levelState.level = this.level + 1;
    levelState.score = this.score;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      L.readyText.replace('{n}', levelState.level),
      { font: '24px monospace', color: '#ffffff', align: 'center' }
    ).setOrigin(0.5);
    this.time.delayedCall(L.readySeconds * 1000, () => this.scene.restart());
  }

  // R always restarts from level 1 with zero coins.
  resetLevels() {
    levelState.level = 1;
    levelState.score = 0;
  }

  // ---- Visual style: everything below only draws; it never changes gameplay or hitboxes. ----

  // Draw every sprite texture in code (there are no image assets). Texture sizes match the
  // physics bodies created in create(): player 24x24, coin 18x18 (circle radius 9). Drones keep
  // their 26x26 rectangle as an invisible hitbox and carry a larger decorative sprite.
  makeTextures() {
    const k = COIN_DASH.colors;
    const css = CoinDash.css;
    const rgba = CoinDash.rgba;
    const TAU = Math.PI * 2;
    // Simple shapes come from a Phaser Graphics object...
    const draw = (key, w, h, fn) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      fn(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    // ...and shaded ones (gradients, text) from a 2D canvas.
    const paint = (key, w, h, fn) => {
      if (this.textures.exists(key)) return;
      const t = this.textures.createCanvas(key, w, h);
      fn(t.context);
      t.refresh();
    };

    // Player: a rounded pod with a visor on its front (the texture faces +x and is rotated).
    draw('player', 24, 24, (g) => {
      g.fillStyle(k.playerDark); g.fillRoundedRect(1, 1, 22, 22, 7);
      g.fillStyle(k.player); g.fillRoundedRect(2, 2, 20, 20, 6);
      g.fillStyle(k.playerShine, 0.5); g.fillRoundedRect(4, 4, 8, 5, 2);
      g.fillStyle(k.playerDark); g.fillRect(2, 8, 3, 2); g.fillRect(2, 14, 3, 2);
      g.fillStyle(k.playerVisor); g.fillRoundedRect(13, 7, 8, 10, 3);
      g.fillStyle(k.playerShine, 0.9); g.fillCircle(18.5, 10, 1.5);
    });

    // Coin: six frames of a gold coin spinning on its vertical axis. Each frame is the full coin
    // (rim, shaded inner disc, embossed mark, glint) squashed horizontally.
    const widths = [1, 0.85, 0.55, 0.18, 0.55, 0.85];
    widths.forEach((w, f) => {
      paint(`coin${f}`, 18, 18, (ctx) => {
        ctx.save();
        ctx.translate(9, 9);
        ctx.scale(w, 1);
        // Edge of the coin shows as the disc turns side-on.
        ctx.fillStyle = css(k.coinDark);
        ctx.beginPath(); ctx.ellipse(0, 0, 8.5 / Math.max(w, 0.35), 8.5, 0, 0, TAU); ctx.fill();
        // Rim with a diagonal metal sheen.
        const rim = ctx.createLinearGradient(-8, -8, 8, 8);
        rim.addColorStop(0, css(k.coinShine)); rim.addColorStop(0.45, css(k.coin)); rim.addColorStop(1, css(k.coinDark));
        ctx.fillStyle = rim;
        ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, TAU); ctx.fill();
        // Inner disc, slightly recessed, lit from the top left.
        const disc = ctx.createRadialGradient(-2.5, -2.5, 0.5, 0, 0, 7);
        disc.addColorStop(0, css(k.coinShine)); disc.addColorStop(0.5, css(k.coin)); disc.addColorStop(1, css(k.coinDark));
        ctx.fillStyle = disc;
        ctx.beginPath(); ctx.arc(0, 0, 6.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgba(k.coinDark, 0.8); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 6.2, 0, TAU); ctx.stroke();
        // Embossed mark: a light copy offset below a darker one.
        ctx.font = 'bold 10px Arial, Helvetica, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(k.coinShine, 0.9); ctx.fillText('$', 0.6, 1.1);
        ctx.fillStyle = css(k.coinDark); ctx.fillText('$', 0, 0.5);
        // Glint along the top-left of the rim.
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, 7.2, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
        ctx.restore();
      });
    });

    // Drone: a quadcopter seen from above. Four frames turn the rotor blades; a translucent disc
    // under each rotor reads as motion blur. The glowing eye marks the front (-y), and the sprite
    // is rotated towards the drone's heading.
    for (let f = 0; f < 4; f++) {
      paint(`drone${f}`, 36, 36, (ctx) => {
        const cx = 18, cy = 18;
        const corners = [[7, 7], [29, 7], [7, 29], [29, 29]];
        // Arms.
        ctx.strokeStyle = css(k.droneArm); ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        corners.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); });
        ctx.strokeStyle = rgba(k.droneRotor, 0.35); ctx.lineWidth = 1;
        corners.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); });
        // Rotors: blur disc, two blades, hub.
        corners.forEach(([x, y], i) => {
          ctx.fillStyle = rgba(k.droneRotor, 0.16);
          ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgba(k.droneRotor, 0.3); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.stroke();
          const a = (f * 22.5 + (i % 2) * 45) * Math.PI / 180;
          ctx.strokeStyle = css(k.droneRotor); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          [a, a + Math.PI / 2].forEach((b) => {
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(b) * 6, y - Math.sin(b) * 6);
            ctx.lineTo(x + Math.cos(b) * 6, y + Math.sin(b) * 6);
            ctx.stroke();
          });
          ctx.fillStyle = css(k.droneDark);
          ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
          ctx.fillStyle = css(k.droneRotor);
          ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill();
        });
        // Body: shaded shell with a darker outline and a lighter top plate.
        const shell = ctx.createLinearGradient(10, 10, 26, 26);
        shell.addColorStop(0, css(k.drone)); shell.addColorStop(1, css(k.droneDark));
        ctx.fillStyle = css(k.droneArm);
        ctx.beginPath(); ctx.roundRect(9, 9, 18, 18, 6); ctx.fill();
        ctx.fillStyle = shell;
        ctx.beginPath(); ctx.roundRect(10, 10, 16, 16, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath(); ctx.roundRect(12, 12, 12, 5, 2.5); ctx.fill();
        ctx.strokeStyle = rgba(k.droneArm, 0.8); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(12, 20); ctx.lineTo(24, 20); ctx.stroke();
        // Eye: glow, dark socket, bright iris, glint.
        const glow = ctx.createRadialGradient(cx, 15, 0.5, cx, 15, 6);
        glow.addColorStop(0, rgba(k.droneEye, 0.85)); glow.addColorStop(1, rgba(k.droneEye, 0));
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, 15, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = css(k.droneArm);
        ctx.beginPath(); ctx.arc(cx, 15, 3.6, 0, TAU); ctx.fill();
        ctx.fillStyle = css(k.droneEye);
        ctx.beginPath(); ctx.arc(cx, 15, 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx + 0.9, 14.1, 0.9, 0, TAU); ctx.fill();
        // Navigation lights at the rear.
        ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(12.5, 23.5, 1.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5affa0'; ctx.beginPath(); ctx.arc(23.5, 23.5, 1.2, 0, TAU); ctx.fill();
      });
    }

    // Soft halos (coin, drone eye) and a small spark for the pick-up burst.
    draw('glow', 48, 48, (g) => {
      [22, 18, 14, 10].forEach((r) => { g.fillStyle(k.coinGlow, 0.07); g.fillCircle(24, 24, r); });
    });
    draw('eyeglow', 16, 16, (g) => {
      [7, 5, 3].forEach((r) => { g.fillStyle(k.droneEye, 0.12); g.fillCircle(8, 8, r); });
    });
    draw('spark', 6, 6, (g) => { g.fillStyle(k.spark); g.fillCircle(3, 3, 3); });

    if (!this.anims.exists('coin-spin')) {
      this.anims.create({
        key: 'coin-spin', frameRate: 9, repeat: -1,
        frames: widths.map((_, f) => ({ key: `coin${f}` }))
      });
    }
    if (!this.anims.exists('drone-rotors')) {
      this.anims.create({
        key: 'drone-rotors', frameRate: 20, repeat: -1,
        frames: [0, 1, 2, 3].map((f) => ({ key: `drone${f}` }))
      });
    }
  }

  // Grid floor with faint speckles, and a darker band with an accent line for the HUD.
  drawBackground() {
    const c = COIN_DASH;
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, c.colors.grid, 0.45);
    const dots = this.add.graphics();
    dots.fillStyle(0xffffff, 0.07);
    for (let i = 0; i < 40; i++) {
      dots.fillCircle((i * 173 + 20) % c.width, 60 + (i * 251) % (c.height - 80), 1.5);
    }
    this.hudBand = this.add.rectangle(c.width / 2, 22, c.width, 44, c.colors.hud, 0.92);
    this.hudLine = this.add.rectangle(c.width / 2, 44, c.width, 2, c.colors.hudAccent, 0.6);
  }

  hudStyle() {
    return {
      fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '18px', fontStyle: 'bold',
      color: CoinDash.css(COIN_DASH.colors.hudText),
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 4, fill: true }
    };
  }

  // Dress the actors created in create(): the coin gets a pulsing halo, each drone rectangle
  // becomes an invisible hitbox carrying an animated drone sprite with a pulsing eye light,
  // and the HUD is kept on top.
  dressActors() {
    const c = COIN_DASH;
    this.coinGlow = this.add.image(this.coin.x, this.coin.y, 'glow');
    this.children.moveBelow(this.coinGlow, this.coin);
    this.tweens.add({ targets: this.coinGlow, scale: { from: 0.85, to: 1.2 }, alpha: { from: 0.6, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.drones.getChildren().forEach((drone, i) => {
      drone.setVisible(false);
      drone.visual = this.add.sprite(drone.x, drone.y, 'drone0').play({ key: 'drone-rotors', startFrame: i % 4 });
      drone.eyeGlow = this.add.image(drone.x, drone.y, 'eyeglow').setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: drone.eyeGlow, alpha: { from: 0.35, to: 1 }, scale: { from: 0.8, to: 1.3 },
        duration: 650 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 70, max: 190 }, lifespan: 450, scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 }, tint: c.colors.spark, emitting: false
    });
    this.children.bringToTop(this.hudBand);
    this.children.bringToTop(this.hudLine);
    this.children.bringToTop(this.hud);
    this.lastScore = this.score;
    this.lastCoinPos = { x: this.coin.x, y: this.coin.y };
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncVisuals, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncVisuals, this);
    });
  }

  // Runs after physics each frame: face the player and drones along their velocity,
  // keep the halos and drone sprites on their hitboxes, and burst sparks when a coin is taken.
  syncVisuals() {
    if (!this.finished) {
      const v = this.player.body.velocity;
      if (v.x || v.y) this.player.setRotation(Math.atan2(v.y, v.x));
    }
    this.drones.getChildren().forEach((drone) => {
      const s = drone.visual;
      if (!s) return;
      s.setPosition(drone.x, drone.y);
      const dv = drone.body.velocity;
      if (!this.finished && (dv.x || dv.y)) s.setRotation(Math.atan2(dv.y, dv.x) + Math.PI / 2);
      // The eye sits 3px ahead of the centre; keep its glow there as the sprite turns.
      drone.eyeGlow.setPosition(drone.x + 3 * Math.sin(s.rotation), drone.y - 3 * Math.cos(s.rotation));
    });
    this.coinGlow.setPosition(this.coin.x, this.coin.y);
    if (this.score > this.lastScore) this.sparks.explode(12, this.lastCoinPos.x, this.lastCoinPos.y);
    this.lastScore = this.score;
    this.lastCoinPos.x = this.coin.x;
    this.lastCoinPos.y = this.coin.y;
  }

  static css(color) { return '#' + color.toString(16).padStart(6, '0'); }
  static rgba(color, alpha) {
    return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
