/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
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
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.initLevels();
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
      this.checkLevelUp();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
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
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s${this.levelHudText()}`);
    if (seconds === 0) this.finish('Time is up!');
  }

  // --- Levels by coins -------------------------------------------------------
  initLevels() {
    const l = COIN_DASH.levels;
    this.level = l.startLevel;
    this.droneSpeedScale = 1;
  }

  levelHudText() {
    return `${COIN_DASH.levels.hudLabel}${this.level}`;
  }

  levelPanelLine() {
    return COIN_DASH.levels.panelLine.replace('{level}', this.level);
  }

  checkLevelUp() {
    const l = COIN_DASH.levels;
    const target = l.startLevel + Math.floor(this.score / l.coinsPerLevel);
    while (this.level < target && !this.finished) this.levelUp();
  }

  levelUp() {
    const l = COIN_DASH.levels;
    this.level++;
    // Every drone gets faster, including the ones spawned on this level-up.
    this.droneSpeedScale *= l.droneSpeedMultiplier;
    this.drones.getChildren().forEach((drone) => drone.body.velocity.scale(l.droneSpeedMultiplier));
    for (let i = 0; i < l.dronesPerLevelUp; i++) this.spawnLevelDrone();
    // Take time off the clock, but never drop below the minimum remaining time.
    const remaining = this.deadline - this.time.now;
    let next = remaining - l.timePenaltySeconds * 1000;
    if (next < l.minRemainingSeconds * 1000) next = Math.min(remaining, l.minRemainingSeconds * 1000);
    this.deadline = this.time.now + next;
    this.flashLevel();
  }

  spawnLevelDrone() {
    const c = COIN_DASH;
    const l = c.levels;
    if (this.drones.getLength() >= l.maxDrones) return;
    // Random position inside the playfield, away from the player.
    let x, y, attempts = 0;
    do {
      x = Phaser.Math.Between(30, c.width - 30);
      y = Phaser.Math.Between(75, c.height - 30);
      attempts++;
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < l.spawnMinDistance
      && attempts < l.spawnAttempts);
    const drone = this.add.rectangle(x, y, 26, 26, c.colors.drone);
    this.drones.add(drone);
    drone.body.setCollideWorldBounds(true).setBounce(1, 1);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = c.droneSpeed * this.droneSpeedScale;
    drone.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  flashLevel() {
    const c = COIN_DASH;
    const l = c.levels;
    const label = this.add.text(c.width / 2, c.height / 2, l.flashText.replace('{level}', this.level), l.flashStyle)
      .setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: label, alpha: 0, duration: l.flashMs, ease: 'Quad.easeIn',
      onComplete: () => label.destroy() });
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${this.levelPanelLine()}\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
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
