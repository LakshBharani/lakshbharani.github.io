export function shouldShowIntro(hash, entered) {
  return !entered && (!hash || hash === '#');
}

export function setupIntro() {
  const dialog = document.querySelector('#flight-intro');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const start = dialog.querySelector('.intro-start');
  const skip = dialog.querySelector('.intro-skip');
  const plane = dialog.querySelector('.intro-plane');
  const replay = document.querySelector('.intro-replay');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'laksh-flight-entered';
  let generation = 0, launch = null;
  const remember = () => { try { sessionStorage.setItem(sessionKey, '1'); } catch {} };
  const finish = () => {
    generation++;
    remember();
    dialog.close();
    launch?.cancel();
    document.documentElement.classList.remove('intro-open');
    document.querySelector('.hero-actions .button').focus({ preventScroll: true });
  };
  const show = () => {
    generation++;
    launch?.cancel();
    dialog.classList.remove('is-folding', 'is-launching');
    start.disabled = false;
    document.documentElement.classList.add('intro-open');
    scrollTo(0, 0);
    dialog.showModal();
    start.focus({ preventScroll: true });
  };
  start.addEventListener('click', async () => {
    if (start.disabled) return;
    remember();
    if (reduced.matches) { finish(); return; }
    const run = ++generation;
    start.disabled = true;
    dialog.classList.add('is-folding');
    await new Promise(resolve => setTimeout(resolve, 1900));
    if (run !== generation || !dialog.open) return;
    dialog.classList.add('is-launching');
    const from = plane.getBoundingClientRect();
    const to = document.querySelector('#flight-bearing .plane-model').getBoundingClientRect();
    const dx = to.left + to.width / 2 - from.left - from.width / 2;
    const dy = to.top + to.height / 2 - from.top - from.height / 2;
    const model = plane.querySelector('use').getBoundingClientRect();
    const scale = to.width / Math.max(model.width, 1);
    launch = plane.animate([
      { transform: 'rotate(-18deg) scale(1)', offset: 0 },
      { transform: `translate(${dx * .6}px,${dy * .82}px) rotate(-28deg) scale(${Math.max(scale, .5)})`, offset: .65 },
      { transform: `translate(${dx}px,${dy}px) rotate(-12deg) scale(${scale})`, offset: 1 }
    ], { duration: 1050, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'forwards' });
    await launch.finished.catch(() => {});
    if (run === generation && dialog.open) finish();
  });
  skip.addEventListener('click', finish);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  reduced.addEventListener('change', () => { if (reduced.matches && dialog.open) finish(); });
  replay.hidden = false;
  replay.addEventListener('click', show);
  let entered = false;
  try { entered = sessionStorage.getItem(sessionKey) === '1'; } catch {}
  if (shouldShowIntro(location.hash, entered)) show();
}
