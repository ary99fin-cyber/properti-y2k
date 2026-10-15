(() => {
  'use strict';
  const audio = document.getElementById('bgMusic');
  if (!audio) return;

  audio.volume = 0.24;
  audio.loop = true;
  audio.preload = 'auto';
  let started = false;

  async function attemptPlayback() {
    if (started || !audio.paused) return;
    try {
      await audio.play();
      started = true;
      removeListeners();
    } catch (error) {
      // Browser blocks sound before interaction: try on the next user gesture.
      if (error?.name !== 'NotAllowedError') {
        console.info('Musik belum bisa diputar:', error?.message || error);
      }
    }
  }

  function removeListeners() {
    document.removeEventListener('pointerdown', attemptPlayback);
    document.removeEventListener('keydown', attemptPlayback);
    document.removeEventListener('touchend', attemptPlayback);
  }

  // Browsers may block audible autoplay; user interaction is the fallback.
  document.addEventListener('pointerdown', attemptPlayback, { passive: true });
  document.addEventListener('touchend', attemptPlayback, { passive: true });
  document.addEventListener('keydown', attemptPlayback);
  attemptPlayback();
})();
