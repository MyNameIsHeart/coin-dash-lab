/* global Phaser, COIN_DASH */
// Level progress lives outside the scene so it survives scene.restart() between levels.
const levelState = { level: 1, score: 0 };
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    const lv = this.beginLevel();
    this.deadline = this.time.now + lv.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
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
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s${this.levelHud()}`);
    if (seconds === 0) this.levelComplete();
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, c.levels.panelHeight, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.levelReached()}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
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
