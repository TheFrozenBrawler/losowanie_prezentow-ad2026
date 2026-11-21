import assert from 'node:assert/strict';
import { createDraw, openToken, drawDerangement, normalizeNames } from '../js/lib.js';

const names = ['Anna', 'Błażej', 'Cecylia', 'Dariusz', 'Ewa', 'Żaneta'];

// 1) wiele losowań: każdy obdarowuje jedną osobę, nie siebie, każdy jest obdarowany raz
for (let r = 0; r < 300; r++) {
  const noMutual = r % 2 === 0;
  const links = await createDraw(names, 'https://x.test/', { noMutual });
  const to = [];
  for (const { name, link } of links) {
    const tok = link.split('#/dar/')[1];
    const { from, to: t } = await openToken(tok);
    assert.equal(from, name);
    assert.notEqual(t, name);
    to.push(t);
    if (noMutual) {
      // brak par A<->B sprawdzamy poniżej
    }
  }
  assert.deepEqual([...to].sort(), [...names].sort());
  if (noMutual) {
    const m = Object.fromEntries(links.map((l, i) => [l.name, to[i]]));
    for (const a of names) assert.notEqual(m[m[a]], a, 'wzajemna para');
  }
}

// 2) rozkład: dla n=4 wszystkie 9 nieporządków powinny się pojawić
const seen = new Set();
for (let i = 0; i < 3000; i++) seen.add(drawDerangement(4).join(''));
assert.equal(seen.size, 9);

// 3) walidacja imion
assert.throws(() => normalizeNames(['A', 'a', 'B']));
assert.throws(() => normalizeNames(['A', 'B']));

// 4) uszkodzony token
const [{ link }] = await createDraw(names, '');
const tok = link.split('#/dar/')[1];
await assert.rejects(openToken(tok.slice(0, -3) + 'AAA'));
await assert.rejects(openToken('abc'));
console.log('OK');
