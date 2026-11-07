(() => {
  'use strict';
  const video = document.getElementById('musicVideo');
  const button = document.getElementById('captionToggle');
  const element = video?.querySelector('track[kind="captions"]');
  if (!video || !button || !element) return;
  const track = element.track;
  // Preload cues without displaying them; captions start off on every visit.
  track.mode = 'hidden';
  const sync = () => {
    const showing = track.mode === 'showing';
    button.setAttribute('aria-pressed', String(showing));
    button.textContent = showing ? 'CC · On' : 'CC · Off';
    button.setAttribute('aria-label', showing ? 'Turn captions off' : 'Turn captions on');
  };
  button.addEventListener('click', () => {
    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
    sync();
  });
  video.textTracks.addEventListener('change', sync);
  element.addEventListener('error', () => {
    button.disabled = true;
    button.textContent = 'Captions unavailable';
    button.setAttribute('aria-label', 'Captions could not be loaded');
    button.setAttribute('aria-pressed', 'false');
  });
  sync();
})();
