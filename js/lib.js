// Logika losowania i szyfrowania. Bez zależności, działa w przeglądarce i w Node 20+.

const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = globalThis.crypto.subtle;

export function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64u(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Równomierna liczba całkowita z [0, n) bez błędu modulo.
export function randInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % n;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Losowa permutacja bez punktów stałych (nikt nie wylosuje siebie).
// Równomierna po wszystkich takich permutacjach (odrzucanie, ~37% trafień).
// noMutual: dodatkowo odrzuca wzajemne pary (A->B i B->A).
export function drawDerangement(n, { noMutual = false } = {}) {
  if (n < 2) throw new Error('Potrzeba co najmniej dwóch osób.');
  if (noMutual && n < 3) throw new Error('Zakaz par wymaga co najmniej trzech osób.');
  const base = Array.from({ length: n }, (_, i) => i);
  for (;;) {
    const p = shuffle(base);
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      if (p[i] === i) ok = false;
      else if (noMutual && p[p[i]] === i) ok = false;
    }
    if (ok) return p; // p[i] = indeks osoby, którą obdarowuje i
  }
}

export function normalizeNames(raw) {
  const names = raw.map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const seen = new Set();
  for (const n of names) {
    const k = n.toLocaleLowerCase('pl');
    if (seen.has(k)) throw new Error(`Imię „${n}” występuje dwa razy.`);
    seen.add(k);
  }
  if (names.length < 3) throw new Error('Potrzeba co najmniej trzech osób.');
  return names;
}

// Token = iv+szyfrogram . klucz  (klucz jest tylko w linku, w części po #)
export async function makeToken(from, to) {
  const keyBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify({ f: from, t: to })))
  );
  const blob = new Uint8Array(iv.length + ct.length);
  blob.set(iv);
  blob.set(ct, iv.length);
  return `${b64u(blob)}.${b64u(keyBytes)}`;
}

export async function openToken(token) {
  const bad = new Error('Nie udało się otworzyć linku. Skopiuj go jeszcze raz w całości.');
  try {
    const [blobStr, keyStr] = token.split('.');
    const blob = unb64u(blobStr);
    const key = await subtle.importKey('raw', unb64u(keyStr), 'AES-GCM', false, ['decrypt']);
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12) }, key, blob.slice(12));
    const { f, t } = JSON.parse(dec.decode(pt));
    return { from: f, to: t };
  } catch {
    throw bad;
  }
}

// Zwraca [{name, link}] w kolejności imion. Mapowania nigdzie nie zwraca.
export async function createDraw(rawNames, base, opts = {}) {
  const names = normalizeNames(rawNames);
  const perm = drawDerangement(names.length, opts);
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const token = await makeToken(names[i], names[perm[i]]);
    out.push({ name: names[i], link: `${base}#/dar/${token}` });
  }
  return out;
}
