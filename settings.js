// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  // Levels by rounds: surviving a round advances to the next, harder level.
  levels: {
    readySeconds: 2,          // length of the "get ready" screen between levels
    dronesPerLevel: 1,        // extra drones added per level
    maxDrones: 8,             // drone count cap
    speedMultiplier: 1.1,     // drone speed multiplied by this each level
    secondsLessPerLevel: 5,   // round time removed per level
    minRoundSeconds: 20,      // round time floor
    hudText: ' Level {n}',
    readyText: 'Level {n} \u2014 get ready',
    reachedText: 'Reached level {n}',
    panelHeight: 190
  }
};
