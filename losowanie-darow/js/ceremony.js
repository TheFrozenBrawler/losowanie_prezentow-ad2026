import { boardSVG, candleSVG } from './art.js';
import * as sound from './sound.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const K = reduced ? 0.35 : 1; // mnożnik czasu

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class Cancelled extends Error {}

function makeDust(canvas) {
  const c = canvas.getContext('2d');
  let parts = [];
  let raf = 0;
  let on = false;
  let last = 0;
  let w = 0;
  let h = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    const a = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * w * 0.34;
    parts.push({
      x: w / 2 + Math.cos(a) * rad,
      y: h * 0.375 + Math.sin(a) * rad,
      vx: (Math.random() - 0.5) * 6,
      vy: -(4 + Math.random() * 10),
      life: 0,
      max: 3 + Math.random() * 3,
      size: 0.8 + Math.random() * 2.2,
    });
  }

  function frame(t) {
    if (!on && !parts.length) return;
    const dt = Math.min((t - last) / 1000 || 0.016, 0.05);
    last = t;
    if (on && parts.length < 55 && Math.random() < dt * 28) spawn();
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = 'lighter';
    parts = parts.filter((p) => (p.life += dt) < p.max);
    for (const p of parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.sin((p.life / p.max) * Math.PI);
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      g.addColorStop(0, `rgba(255,236,170,${0.85 * a})`);
      g.addColorStop(1, 'rgba(255,200,90,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      c.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (reduced || on) return;
      resize();
      on = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      on = false;
    },
    destroy() {
      on = false;
      parts = [];
      cancelAnimationFrame(raf);
    },
  };
}

export function renderCeremony(root, { from, to }, { onBack } = {}) {
  root.innerHTML = `
  <main class="ceremony">
    <div class="board" id="board">
      ${boardSVG()}
      <div class="scroll-text" aria-live="polite">
        <div class="label">Obdarujesz</div>
        <div class="name"></div>
      </div>
      <canvas class="dust" aria-hidden="true"></canvas>
    </div>
    <p class="caption" aria-live="polite"></p>
    <div class="actions" hidden>
      <button class="btn" data-act="again">Zobacz jeszcze raz</button>
      <button class="btn btn-quiet" data-act="hide">Ukryj</button>
      ${onBack ? '<button class="btn btn-quiet" data-act="back">Panel organizatora</button>' : ''}
    </div>
    <button class="skip" hidden>Pomiń animację</button>

    <div class="gate">
      <p class="gate-hi">${esc(from)},</p>
      <p class="gate-sub">Twoje losowanie jest gotowe.</p>
      <button class="candle" aria-label="Zapal świecę">${candleSVG()}</button>
      <button class="btn btn-gold gate-btn">Zapal świecę</button>
      <p class="gate-note">Upewnij się, że nikt nie patrzy na ekran.</p>
    </div>
    <div class="vignette"></div>
    <button class="sound-toggle" aria-label="Dźwięk"></button>
  </main>`;

  const $ = (s) => root.querySelector(s);
  const board = $('#board');
  const caption = $('.caption');
  const actions = $('.actions');
  const skipBtn = $('.skip');
  const gate = $('.gate');
  const nameEl = $('.name');
  const dust = makeDust($('.dust'));
  const toggle = $('.sound-toggle');

  let run = { cancelled: false };
  let finished = false;

  const syncToggle = () => {
    toggle.innerHTML = sound.isMuted()
      ? '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6m0-6l-5 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8c2 2.5 2 5.5 0 8M18.5 5.5c3.5 4 3.5 9 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    toggle.title = sound.isMuted() ? 'Włącz dźwięk' : 'Wyłącz dźwięk';
  };
  syncToggle();
  toggle.onclick = () => {
    sound.setMuted(!sound.isMuted());
    sound.unlock();
    syncToggle();
  };

  const sleep = (ms) =>
    new Promise((res, rej) => {
      const r = run;
      setTimeout(() => (r.cancelled ? rej(new Cancelled()) : res()), ms * K);
    });

  const say = (txt) => {
    caption.classList.remove('show');
    // krótka przerwa, aby przejście było widoczne
    setTimeout(() => {
      caption.textContent = txt;
      caption.classList.add('show');
    }, 250);
  };

  function setupName() {
    const L = [...to].length;
    board.style.setProperty('--fs', `${Math.min(13, 56 / (L * 0.62)).toFixed(2)}cqw`);
    nameEl.innerHTML = [...to]
      .map((ch, i) => `<span class="ch" style="--k:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`)
      .join('');
  }

  function resetBoard() {
    board.classList.add('no-anim');
    board.classList.remove('s-draw', 's-wash', 's-gold', 's-star', 's-scroll', 's-name');
    void board.offsetWidth;
    board.classList.remove('no-anim');
    caption.classList.remove('show');
    caption.textContent = '';
    actions.hidden = true;
    skipBtn.hidden = true;
    dust.destroy();
    finished = false;
    setupName();
  }

  async function play({ withGate }) {
    run.cancelled = true;
    run = { cancelled: false };
    resetBoard();
    skipBtn.hidden = false;
    try {
      if (withGate) {
        sound.unlock();
        sound.bell(196, 0, { gain: 0.1, dur: 3 });
        gate.classList.add('lit');
        document.body.classList.add('lit');
        say('W ciszy Adwentu…');
        await sleep(2400);
        gate.hidden = true;
      } else {
        say('W ciszy Adwentu…');
        await sleep(1200);
      }

      board.classList.add('s-draw');
      say('Najpierw powstaje rysunek.');
      sound.bell(392, 0, { gain: 0.05, dur: 2 });
      await sleep(5200);

      board.classList.add('s-wash');
      say('Potem przychodzą barwy.');
      sound.bell(329.63, 0, { gain: 0.07 });
      sound.bell(493.88, 0.5, { gain: 0.05 });
      await sleep(3000);

      board.classList.add('s-gold');
      dust.start();
      say('Na końcu — złoto.');
      sound.bell(659.25, 0, { gain: 0.09 });
      sound.bell(987.77, 0.35, { gain: 0.06 });
      await sleep(2600);

      board.classList.add('s-star');
      say('Gwiazda wskazuje drogę.');
      sound.bell(523.25, 0, { gain: 0.07 });
      await sleep(2300);

      board.classList.add('s-scroll');
      say('Kogo wskaże tym razem los?');
      await sleep(2300);

      board.classList.add('s-name');
      [...to].forEach((_, i) => sound.bell(sound.note(i * 2 + 1), i * 0.16, { gain: 0.05, dur: 1.6 }));
      await sleep(600 + [...to].length * 160);
      sound.bell(293.66, 0, { gain: 0.1, dur: 3.5 });
      sound.bell(440, 0.2, { gain: 0.08, dur: 3.5 });
      say('Zachowaj to w tajemnicy aż do Wigilii.');
      await sleep(900);
      done();
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
    }
  }

  function done() {
    finished = true;
    skipBtn.hidden = true;
    actions.hidden = false;
    dust.start();
  }

  function skip() {
    run.cancelled = true;
    gate.hidden = true;
    document.body.classList.add('lit');
    board.classList.add('no-anim', 's-draw', 's-wash', 's-gold', 's-star', 's-scroll', 's-name');
    setupName();
    void board.offsetWidth;
    board.classList.remove('no-anim');
    say('Zachowaj to w tajemnicy aż do Wigilii.');
    done();
  }

  const lightCandle = () => {
    if (!gate.classList.contains('lit')) play({ withGate: true });
  };
  $('.candle').onclick = lightCandle;
  $('.gate-btn').onclick = lightCandle;
  skipBtn.onclick = skip;
  actions.onclick = (e) => {
    const act = e.target.dataset.act;
    if (act === 'again') play({ withGate: false });
    if (act === 'hide') {
      run.cancelled = true;
      resetBoard();
      nameEl.textContent = '';
      document.body.classList.remove('lit');
      gate.hidden = false;
      gate.classList.remove('lit');
    }
    if (act === 'back' && onBack) onBack();
  };

  setupName();

  return () => {
    run.cancelled = true;
    dust.destroy();
    document.body.classList.remove('lit');
  };
}
