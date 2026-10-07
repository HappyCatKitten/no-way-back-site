/* Public demos only: no edits are applied to the production image files. */
(() => {
  const dialog = document.getElementById('screenshotDialog');
  const preview = document.getElementById('screenshotPreview');
  const title = document.getElementById('screenshotTitle');
  document.querySelectorAll('[data-screenshot]').forEach(button => {
    button.addEventListener('click', () => {
      preview.src = button.dataset.screenshot;
      preview.alt = button.querySelector('img').alt;
      title.textContent = button.dataset.caption;
      dialog.showModal();
    });
  });
  document.getElementById('closeScreenshot').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  const stage = document.getElementById('detailStage');
  const handle = document.getElementById('wipeHandle');
  let position = 50;
  function setPosition(value) {
    position = Math.max(0, Math.min(100, value));
    stage.style.setProperty('--wipe', position + '%');
    handle.setAttribute('aria-valuenow', Math.round(position));
    handle.setAttribute('aria-valuetext', Math.round(position) + '% earlier frame visible');
  }
  function drag(event) {
    const bounds = stage.getBoundingClientRect();
    setPosition((event.clientX - bounds.left) / bounds.width * 100);
  }
  handle.addEventListener('pointerdown', event => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    drag(event);
  });
  handle.addEventListener('pointermove', event => { if (handle.hasPointerCapture(event.pointerId)) drag(event); });
  handle.addEventListener('pointerup', event => { if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId); });
  handle.addEventListener('keydown', event => {
    const steps = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5 };
    if (event.key in steps) { event.preventDefault(); setPosition(position + steps[event.key]); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setPosition(event.key === 'Home' ? 0 : 100); }
  });
  const hold = document.getElementById('holdOriginal');
  const showOriginal = () => { stage.classList.add('hold-original'); hold.setAttribute('aria-pressed', 'true'); };
  const release = () => { stage.classList.remove('hold-original'); hold.setAttribute('aria-pressed', 'false'); };
  hold.addEventListener('pointerdown', event => { event.preventDefault(); hold.setPointerCapture(event.pointerId); showOriginal(); });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'blur'].forEach(type => hold.addEventListener(type, release));
  hold.addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); showOriginal(); } });
  hold.addEventListener('keyup', release);
  window.addEventListener('blur', release);
  document.getElementById('crtDemo').addEventListener('change', event => stage.classList.toggle('crt-enabled', event.target.checked));
})();
