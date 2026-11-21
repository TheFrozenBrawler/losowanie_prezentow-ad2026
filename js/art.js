// Generatory grafiki SVG w stylu ikony (tempera, złoto płatkowe, rysunek w sjenie).

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

// Ścieżka o lekko "ręcznym" przebiegu: punkty co ~step jednostek z drganiem prostopadłym.
function wobble(points, { closed = true, amp = 1, step = 14, seed = 1 } = {}) {
  const r = rng(seed);
  const out = [];
  const n = points.length;
  const segs = closed ? n : n - 1;
  let drift = 0;
  for (let i = 0; i < segs; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const k = Math.max(1, Math.round(len / step));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (let j = 0; j < k; j++) {
      const t = j / k;
      drift = drift * 0.6 + (r() - 0.5) * amp * 1.4;
      out.push([x1 + (x2 - x1) * t + nx * drift, y1 + (y2 - y1) * t + ny * drift]);
    }
  }
  out.push(closed ? out[0] : points[n - 1]);
  return 'M' + out.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
}

function circlePts(cx, cy, r, n = 64) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}

function starPts(cx, cy, R, r, n = 8, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2 + rot;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return pts;
}

const poly = (pts) => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

const HALO = { cx: 300, cy: 300, r: 190 };

const FIELD = { x: 44, y: 44, w: 512, h: 712 };
const INNER = { x: 58, y: 58, w: 484, h: 684 };

const SMALL_STARS = [[83, 300], [517, 300], [112, 528], [488, 528]];

const SCROLL =
  'M104 566 C 190 556, 410 556, 496 566 L496 696 C 410 706, 190 706, 104 696 Z';

function defs() {
  return `
  <defs>
    <radialGradient id="gGold" cx="38%" cy="32%" r="80%">
      <stop offset="0" stop-color="#f6e29a"/><stop offset=".5" stop-color="#dba948"/>
      <stop offset="1" stop-color="#b5802a"/>
    </radialGradient>
    <radialGradient id="gField" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#93aebc"/><stop offset="1" stop-color="#6c8999"/>
    </radialGradient>
    <linearGradient id="gShine" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff8dc" stop-opacity=".75"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="fLeaf" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".022 .03" numOctaves="3" seed="4" result="n"/>
      <feDiffuseLighting in="n" lighting-color="#fff1c2" surfaceScale="2.2" result="l">
        <feDistantLight azimuth="225" elevation="58"/>
      </feDiffuseLighting>
      <feComposite in="l" in2="SourceGraphic" operator="in" result="lit"/>
      <feBlend in="lit" in2="SourceGraphic" mode="multiply"/>
    </filter>
    <filter id="fGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="9" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.12"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="fWood" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".012 .5" numOctaves="2" seed="3" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 .2  0 0 0 0 .05  0 0 0 0 .03  0 0 0 .5 -.15"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <mask id="mWash" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="800">
      <rect width="600" height="800" fill="#000"/>
      <circle class="wash-circle" cx="300" cy="360" r="640" fill="#fff"/>
    </mask>
    <clipPath id="cHalo"><circle cx="${HALO.cx}" cy="${HALO.cy}" r="${HALO.r}"/></clipPath>
  </defs>`;
}

function haloGroup(withShine) {
  const { cx, cy, r } = HALO;
  let rays = '';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = r - 36;
    const r2 = r - 14;
    rays += `M${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}L${f(cx + Math.cos(a) * r2)} ${f(cy + Math.sin(a) * r2)}`;
  }
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gGold)" filter="url(#fLeaf)"/>
    <path d="${rays}" stroke="#a87820" stroke-opacity=".35" stroke-width="1.2" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 40}" fill="none" stroke="#f6e29a" stroke-opacity=".7" stroke-width="1.4"/>
    ${withShine ? `<g clip-path="url(#cHalo)"><g class="shine"><rect x="-260" y="${cy - r}" width="220" height="${r * 2}" fill="url(#gShine)" transform="skewX(-18)"/></g></g>` : ''}`;
}

function starGroup() {
  const { cx, cy } = HALO;
  const big = starPts(cx, cy, 140, 60);
  const mid = starPts(cx, cy, 90, 38, 8, Math.PI / 8);
  let hi = '';
  // ożywki: jasne linie wzdłuż promieni
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(a) * 52;
    const y1 = cy + Math.sin(a) * 52;
    const x2 = cx + Math.cos(a) * 128;
    const y2 = cy + Math.sin(a) * 128;
    hi += `<path class="hi" pathLength="1" style="--i:${i}" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
  }
  return `
    <polygon points="${poly(big)}" fill="#2f5a7e" stroke="#1d3b55" stroke-width="2.5" stroke-linejoin="round"/>
    <g class="hi-lines" stroke="#dbe8ee" stroke-width="2" stroke-linecap="round" fill="none" opacity=".9">${hi}</g>
    <polygon points="${poly(mid)}" fill="#b8402f" stroke="#7d2a20" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${cx}" cy="${cy}" r="24" fill="#f3e6c4" stroke="#8a5a24" stroke-width="2"/>
    <path d="M${cx} ${cy - 13}V${cy + 13}M${cx - 13} ${cy}H${cx + 13}" stroke="#a83a2a" stroke-width="3" stroke-linecap="round"/>`;
}

function smallStars(fill) {
  return SMALL_STARS.map(([x, y]) =>
    `<polygon points="${poly(starPts(x, y, 15, 6.5))}" fill="${fill}" stroke="#8a5a24" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="2.6" fill="#a83a2a"/>`
  ).join('');
}

function titlo(x, y, w) {
  return `<path d="M${x} ${y}q${w / 4} -7 ${w / 2} 0t${w / 2} 0" fill="none" stroke="#efe3c2" stroke-width="2" stroke-linecap="round"/>`;
}

function inscriptions() {
  return `
    <g font-family="'Cormorant Unicase', serif" font-weight="600" font-size="32" fill="#efe3c2" letter-spacing="2">
      <text x="86" y="104">A·D</text>
      <text x="514" y="104" text-anchor="end">MMXXVI</text>
    </g>
    ${titlo(84, 66, 62)}${titlo(380, 66, 134)}`;
}

function lineWork() {
  const { cx, cy, r } = HALO;
  const paths = [
    wobble(rectPts(FIELD.x, FIELD.y, FIELD.w, FIELD.h), { amp: 1.1, seed: 11 }),
    wobble(rectPts(INNER.x, INNER.y, INNER.w, INNER.h), { amp: 1.1, seed: 12 }),
    wobble(circlePts(cx, cy, r), { amp: 1.4, seed: 13 }),
    wobble(circlePts(cx, cy, r - 14), { amp: 1.2, seed: 14 }),
    wobble(starPts(cx, cy, 140, 60), { amp: 0.7, seed: 15, step: 60 }),
    wobble(starPts(cx, cy, 90, 38, 8, Math.PI / 8), { amp: 0.6, seed: 16, step: 60 }),
    wobble(circlePts(cx, cy, 24, 24), { amp: 0.6, seed: 17, step: 8 }),
    ...SMALL_STARS.map(([x, y], i) => wobble(starPts(x, y, 15, 6.5), { amp: 0.25, seed: 20 + i, step: 40 })),
    SCROLL,
  ];
  return paths
    .map((d, i) => `<path class="ln" pathLength="1" style="--i:${i}" d="${d}"/>`)
    .join('');
}

// Cała deska ikony 600x800.
export function boardSVG() {
  return `
<svg class="board-svg" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ikona z gwiazdą betlejemską">
  ${defs()}
  <rect width="600" height="800" fill="#ede2c8"/>
  <rect width="600" height="800" fill="#000" filter="url(#fGrain)" opacity=".55"/>

  <g class="col col-frame">
    <rect width="600" height="800" fill="#a8463d"/>
    <rect width="600" height="800" fill="#000" filter="url(#fWood)"/>
    <rect x="3" y="3" width="594" height="794" fill="none" stroke="#6c2a22" stroke-width="4"/>
    <rect x="20" y="20" width="560" height="760" fill="none" stroke="#c76a5c" stroke-opacity=".5" stroke-width="2"/>
  </g>

  <g mask="url(#mWash)"><g class="col col-field">
    <rect x="${FIELD.x}" y="${FIELD.y}" width="${FIELD.w}" height="${FIELD.h}" fill="url(#gField)"/>
    <rect x="${FIELD.x}" y="${FIELD.y}" width="${FIELD.w}" height="${FIELD.h}" fill="#000" filter="url(#fGrain)"/>
    <rect x="${INNER.x}" y="${INNER.y}" width="${INNER.w}" height="${INNER.h}" fill="none" stroke="#e4eee9" stroke-width="2.5"/>
    ${inscriptions()}
  </g></g>

  <g class="col col-gold">${haloGroup(true)}</g>
  <g class="col col-star">${starGroup()}${smallStars('#e9c76b')}</g>
  <g class="col col-scroll">
    <path d="${SCROLL}" fill="#efe0b6" stroke="#8a5a24" stroke-width="2.5"/>
    <path d="M118 580 C 200 572, 400 572, 482 580 M118 682 C 200 690, 400 690, 482 682" fill="none" stroke="#c9a85c" stroke-width="1.5"/>
  </g>

  <g class="lines" fill="none" stroke="#b0562a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${lineWork()}</g>
</svg>`;
}

// Nagłówek strony organizatora: sama gwiazda w aureoli na niebieskim polu.
export function headerSVG() {
  return `
<svg class="head-svg" viewBox="0 0 600 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gwiazda betlejemska">
  ${defs().replace('id="cHalo"', 'id="cHaloX"')}
  <rect width="600" height="330" fill="url(#gField)"/>
  <rect width="600" height="330" fill="#000" filter="url(#fGrain)"/>
  <g transform="translate(120 -15) scale(.6)">${haloGroup(false)}</g>
  <g transform="translate(120 -15) scale(.6)">${starGroup()}${smallStars('#e9c76b')}</g>
  <rect x="14" y="14" width="572" height="302" fill="none" stroke="#e4eee9" stroke-width="2.5"/>
  <g font-family="'Cormorant Unicase', serif" font-weight="600" font-size="30" fill="#efe3c2" letter-spacing="2">
    <text x="36" y="58">A·D</text><text x="564" y="58" text-anchor="end">MMXXVI</text>
  </g>
  ${titlo(34, 24, 56)}${titlo(430, 24, 130)}
</svg>`;
}

export function candleSVG() {
  return `
<svg class="candle-svg" viewBox="0 0 160 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffd27a" stop-opacity=".85"/>
      <stop offset="1" stop-color="#ffb347" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wax" x1="0" x2="1">
      <stop offset="0" stop-color="#cdbb94"/><stop offset=".45" stop-color="#f5ecd2"/><stop offset="1" stop-color="#bfa97c"/>
    </linearGradient>
    <radialGradient id="flameG" cx="50%" cy="75%" r="70%">
      <stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffc857"/><stop offset="1" stop-color="#e2641c"/>
    </radialGradient>
  </defs>
  <circle class="glow" cx="80" cy="82" r="78" fill="url(#glow)"/>
  <rect x="52" y="130" width="56" height="150" rx="5" fill="url(#wax)"/>
  <ellipse cx="80" cy="130" rx="28" ry="6" fill="#efe3c0"/>
  <path d="M80 132v-14" stroke="#2b1a12" stroke-width="2.4" stroke-linecap="round"/>
  <path class="flame" d="M80 52C95 78 100 96 80 118C60 96 65 78 80 52Z" fill="url(#flameG)"/>
</svg>`;
}
