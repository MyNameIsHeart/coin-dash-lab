// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 20,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: {
    background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a,
    // Visual style (shading, HUD and effects). Game objects keep the four base colours above.
    grid: 0x24334b, hud: 0x0a1120, hudText: 0xe5edf7, hudAccent: 0x71e8ce,
    playerDark: 0x1f8f7a, playerVisor: 0x0d2a2c, playerShine: 0xd9fff6,
    droneDark: 0x5a2434, droneArm: 0x2a1a24, droneRotor: 0xc9d4e4, droneEye: 0xfff0a6,
    coinDark: 0xc98a1a, coinShine: 0xfff3c4, coinGlow: 0xffd166, spark: 0xffe9a8
  },
  pause: {
    overlay: { width: 460, height: 110, color: 0x0a1120, alpha: 0.9 },
    text: 'Paused — press P to continue',
    textStyle: { font: '24px monospace', color: '#ffffff', align: 'center' }
  },
  // Levels by rounds: surviving a round advances to the next, harder level.
  levels: {
    readySeconds: 2,          // length of the "get ready" screen between levels
    dronesPerLevel: 1,        // extra drones added per level
    maxDrones: 8,             // drone count cap
    speedMultiplier: 1.1,     // drone speed multiplied by this each level
    secondsLessPerLevel: 0,   // round time removed per level
    minRoundSeconds: 20,      // round time floor
    hudText: ' Level {n}',
    readyText: 'Level {n} — get ready',
    reachedText: 'Reached level {n}',
    panelHeight: 190
  },
  // Pac-Man style screen wrap for the player: leaving one edge re-enters from the opposite one.
  wrap: { padding: 12 }
};
