// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  pause: {
    overlay: { width: 460, height: 110, color: 0x0a1120, alpha: 0.9 },
    text: 'Paused — press P to continue',
    textStyle: { font: '24px monospace', color: '#ffffff', align: 'center' }
  }
};
