(() => {
  'use strict';
  const video = document.getElementById('musicVideo');
  const button = document.getElementById('captionToggle');
  const element = video?.querySelector('track[kind="captions"]');
  if (!video || !element) return;
  const track = element.track;
  const fontChoice = document.getElementById('captionFont');
  const sample = document.getElementById('captionSample');
  const families = {
    manrope: '600 28px "NWB Manrope"',
    outfit: '500 28px "NWB Outfit"',
    barlow: '600 28px "NWB Barlow"',
    lora: '500 28px "NWB Lora"',
    original: '400 28px Arial',
  };
  const applyFont = () => {
    const key = Object.hasOwn(families, fontChoice?.value) ? fontChoice.value : 'manrope';
    video.dataset.captionFont = key;
    if (sample) sample.dataset.captionFont = key;
    try { localStorage.setItem('nwb-caption-font', key); } catch (_) {}
    // The sample explicitly loads the face, so native cues can use it as well.
    if (document.fonts) document.fonts.load(families[key]).catch(() => {});
  };
  if (fontChoice) {
    try {
      const saved = localStorage.getItem('nwb-caption-font');
      if (Object.hasOwn(families, saved)) fontChoice.value = saved;
    } catch (_) {}
    fontChoice.addEventListener('change', applyFont);
  }
  applyFont();
  // Preload cues without displaying them; captions start off on every visit.
  track.mode = 'hidden';
  const sync = () => {
    if (!button) return; // The published player uses its native captions menu.
    const showing = track.mode === 'showing';
    button.setAttribute('aria-pressed', String(showing));
    button.textContent = button.dataset.compact === 'true' ? 'CC' : showing ? 'CC · On' : 'CC · Off';
    button.title = showing ? 'Turn captions off' : 'Turn captions on';
    button.setAttribute('aria-label', showing ? 'Turn captions off' : 'Turn captions on');
  };
  button?.addEventListener('click', () => {
    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
    sync();
  });
  const previewLyric = () => {
    video.pause();
    video.currentTime = 21.2;
    track.mode = 'showing';
    sync();
  };
  document.getElementById('previewCaption')?.addEventListener('click', previewLyric);
  if (video.dataset.captionAudition === 'true') {
    if (video.readyState >= 1) previewLyric();
    else video.addEventListener('loadedmetadata', previewLyric, { once: true });
  }
  video.textTracks.addEventListener('change', sync);
  element.addEventListener('error', () => {
    if (!button) return;
    button.disabled = true;
    button.textContent = 'Captions unavailable';
    button.setAttribute('aria-label', 'Captions could not be loaded');
    button.setAttribute('aria-pressed', 'false');
  });
  sync();
})();
