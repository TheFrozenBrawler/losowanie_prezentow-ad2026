import { createDraw, openToken } from './lib.js';
import { renderCeremony } from './ceremony.js';
import { headerSVG } from './art.js';

const root = document.getElementById('app');
const STORE = 'darow-losowanie';
let cleanup = null;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const baseUrl = () => location.href.split('#')[0];

function route() {
  cleanup?.();
  cleanup = null;
  window.scrollTo(0, 0);
  const m = location.hash.match(/^#\/dar\/(.+)$/);
  if (m) return showCeremony(m[1]);
  showOrganizer();
}

async function showCeremony(token) {
  document.body.className = 'view-ceremony';
  try {
    const data = await openToken(token);
    const isOrganizer = !!sessionStorage.getItem(STORE);
    cleanup = renderCeremony(root, data, isOrganizer ? { onBack: () => (location.hash = '#/') } : {});
  } catch (e) {
    root.innerHTML = `<main class="panel narrow"><h1>Coś poszło nie tak</h1><p>${esc(e.message)}</p></main>`;
  }
}

function showOrganizer() {
  document.body.className = 'view-organizer';
  const saved = sessionStorage.getItem(STORE);
  if (saved) return showResults(JSON.parse(saved));
  showForm();
}

const DEFAULT_ROWS = 6;

function showForm(prefill = {}) {
  const names = prefill.names || Array(DEFAULT_ROWS).fill('');
  root.innerHTML = `
  <main class="organizer">
    <header class="hero">${headerSVG()}</header>
    <section class="panel">
      <h1>Losowanie Darów</h1>
      <p class="lead">Każdy obdarowuje jedną osobę — nie siebie. Wynik zna tylko ten, kto otworzy swój link.</p>
      <form id="form" autocomplete="off">
        <ol class="names" id="names"></ol>
        <button type="button" class="btn btn-quiet" id="add">+ dodaj osobę</button>

        <label class="field">Ja (organizator) jestem:
          <select id="me" required></select>
        </label>
        <label class="check"><input type="checkbox" id="nomutual"> bez wzajemnych par (A↔B)</label>

        <details>
          <summary>Adres strony</summary>
          <p class="small">Linki będą wskazywać ten adres. Przy publikacji upewnij się, że jest to adres docelowy.</p>
          <input id="base" type="url" value="${esc(prefill.base || baseUrl())}">
        </details>

        <p class="error" id="err" role="alert"></p>
        <button class="btn btn-gold" type="submit">Losuj</button>
      </form>
    </section>
  </main>`;

  const list = root.querySelector('#names');
  const me = root.querySelector('#me');
  const err = root.querySelector('#err');

  const rowHTML = (v, i) => `<li><input class="name-in" placeholder="Imię" maxlength="24" value="${esc(v)}" aria-label="Osoba ${i + 1}"><button type="button" class="x" aria-label="Usuń">×</button></li>`;
  const draw = () => {
    list.innerHTML = names.map(rowHTML).join('');
  };
  const syncMe = () => {
    const cur = me.value;
    const opts = names.map((n) => n.trim()).filter(Boolean);
    me.innerHTML = `<option value="" disabled ${cur ? '' : 'selected'}>wybierz…</option>` + opts.map((n) => `<option ${n === cur ? 'selected' : ''}>${esc(n)}</option>`).join('');
  };
  draw();
  syncMe();

  list.addEventListener('input', (e) => {
    const i = [...list.children].indexOf(e.target.closest('li'));
    names[i] = e.target.value;
    syncMe();
  });
  list.addEventListener('click', (e) => {
    if (!e.target.classList.contains('x')) return;
    if (names.length <= 3) return;
    names.splice([...list.children].indexOf(e.target.closest('li')), 1);
    draw();
    syncMe();
  });
  root.querySelector('#add').onclick = () => {
    if (names.length >= 12) return;
    names.push('');
    draw();
    list.lastElementChild.querySelector('input').focus();
  };

  root.querySelector('#form').onsubmit = async (ev) => {
    ev.preventDefault();
    err.textContent = '';
    try {
      const myName = me.value;
      if (!myName) throw new Error('Wybierz, kim jesteś na liście.');
      const base = root.querySelector('#base').value.trim() || baseUrl();
      const res = await createDraw(names, base, { noMutual: root.querySelector('#nomutual').checked });
      const data = { me: myName, people: res };
      sessionStorage.setItem(STORE, JSON.stringify(data));
      showResults(data);
    } catch (e) {
      err.textContent = e.message;
    }
  };
}

function showResults(data) {
  root.innerHTML = `
  <main class="organizer">
    <header class="hero">${headerSVG()}</header>
    <section class="panel">
      <h1>Losowanie wykonane</h1>
      <p class="lead">Nie wyświetlamy ani nie zapisujemy tego, kto kogo wylosował. Wyślij każdej osobie jej własny link.</p>
      <ul class="results" id="results"></ul>
      <p class="small">Linki są sekretami. Nie otwieraj cudzych, nie wklejaj ich na wspólnych czatach.</p>
      <button class="btn btn-quiet" id="reset">Nowe losowanie</button>
    </section>
  </main>`;

  const ul = root.querySelector('#results');
  for (const p of data.people) {
    const li = document.createElement('li');
    const mine = p.name === data.me;
    li.className = mine ? 'mine' : '';
    const msg = `Cześć ${p.name}! To Twój tajny link do losowania prezentów: ${p.link}`;
    li.innerHTML = `<span class="who">${esc(p.name)}${mine ? ' <em>(Ty)</em>' : ''}</span><span class="btns"></span>`;
    const btns = li.querySelector('.btns');
    const add = (label, fn, cls = 'btn-small') => {
      const b = document.createElement('button');
      b.className = `btn ${cls}`;
      b.textContent = label;
      b.onclick = fn;
      btns.append(b);
      return b;
    };
    if (mine) {
      add('Otwórz mój dar', () => (location.hash = new URL(p.link).hash), 'btn-small btn-gold');
    } else {
      const copy = add('Kopiuj link', async () => {
        try {
          await navigator.clipboard.writeText(p.link);
        } catch {
          prompt('Skopiuj link:', p.link);
        }
        copy.textContent = 'Skopiowano ✓';
        setTimeout(() => (copy.textContent = 'Kopiuj link'), 2000);
      });
      add('WhatsApp', () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'));
      add('E-mail', () => (location.href = `mailto:?subject=${encodeURIComponent('Losowanie prezentów')}&body=${encodeURIComponent(msg)}`));
      if (navigator.share) add('Udostępnij', () => navigator.share({ text: msg }).catch(() => {}));
    }
    ul.append(li);
  }

  root.querySelector('#reset').onclick = () => {
    if (!confirm('Dotychczasowe linki przestaną być aktualne dla nowego losowania. Kontynuować?')) return;
    sessionStorage.removeItem(STORE);
    showForm({ names: data.people.map((p) => p.name), base: new URL(data.people[0].link).href.split('#')[0] });
  };
}

addEventListener('hashchange', route);
route();
