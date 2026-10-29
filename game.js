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
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(false); // the player wraps instead of hitting the walls
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
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
