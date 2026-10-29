// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  // Levels by coins: every coinsPerLevel coins the level rises by one (starting at startLevel).
  levels: {
    startLevel: 1,
    coinsPerLevel: 5,
    dronesPerLevelUp: 1,
    maxDrones: 8,
    droneSpeedMultiplier: 1.1,
    timePenaltySeconds: 3,
    minRemainingSeconds: 5,
    spawnMinDistance: 160,
    spawnAttempts: 30,
    hudLabel: ' Level ',
    flashText: 'Level {level}',
    flashMs: 1000,
    flashStyle: { font: 'bold 48px monospace', color: '#ffd166', stroke: '#0a1120', strokeThickness: 6 },
    panelLine: 'Level {level} reached'
  }
};
