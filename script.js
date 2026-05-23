const SONGS_URL = 'songs/index.json';
const STORAGE_KEY = 'minhascifras_favs';

let songs = [];
let favs = new Set();
let currentSongId = null;
let searchTerm = '';
let favFilterActive = false;
let wakeLock = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function loadFavs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    favs = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    favs = new Set();
  }
}

function saveFavs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favs]));
}

function toggleFav(id) {
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  saveFavs();
  renderList();
  updateViewerFavBtn();
}

async function loadSongs() {
  try {
    const res = await fetch(SONGS_URL);
    songs = await res.json();
    renderList();
  } catch (err) {
    console.error('Erro ao carregar músicas:', err);
    $('#songList').innerHTML = '<li class="empty-state">Erro ao carregar músicas.</li>';
  }
}

async function loadSongContent(id) {
  const res = await fetch(`songs/${id}.chordpro`);
  if (!res.ok) throw new Error('Arquivo não encontrado');
  return res.text();
}

function parseChordpro(text) {
  const lines = text.split('\n');
  const chunks = [];
  let inChorus = false;

  for (let raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('{')) {
      const tag = line.slice(1, -1);
      if (tag === 'chorus') { inChorus = true; chunks.push({ type: 'section', text: 'Refrão' }); continue; }
      if (tag === 'endchorus') { inChorus = false; continue; }
      continue;
    }

    if (line === '') {
      chunks.push({ type: 'blank' });
      continue;
    }

    const parts = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '[') {
        const end = line.indexOf(']', i);
        if (end !== -1) {
          parts.push({ chord: line.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }
      const textStart = i;
      while (i < line.length && line[i] !== '[') {
        i++;
      }
      parts.push({ text: line.slice(textStart, i) });
    }

    if (parts.length > 0) {
      chunks.push({ type: 'line', parts, isChorus: inChorus });
    }
  }

  return chunks;
}

function renderChordpro(chunks) {
  const container = document.createDocumentFragment();

  for (const chunk of chunks) {
    if (chunk.type === 'blank') {
      container.appendChild(document.createElement('br'));
      continue;
    }

    if (chunk.type === 'section') {
      const el = document.createElement('div');
      el.className = 'chordpro-section';
      el.textContent = chunk.text;
      container.appendChild(el);
      continue;
    }

    const lineEl = document.createElement('div');
    lineEl.className = 'chordpro-line';
    if (chunk.isChorus) {
      lineEl.classList.add('chorus');
    }

    let textOnly = '';
    const chords = [];
    for (const part of chunk.parts) {
      if (part.chord) {
        chords.push({ chord: part.chord, pos: textOnly.length });
      }
      if (part.text) {
        textOnly += part.text;
      }
    }

    if (chords.length === 0) {
      const textRow = document.createElement('div');
      textRow.className = 'chordpro-text-row';
      textRow.textContent = textOnly || '\u00A0';
      lineEl.appendChild(textRow);
    } else {
      let chordLine = '';
      for (const c of chords) {
        if (chordLine.length >= c.pos) {
          chordLine += ' ' + c.chord;
        } else {
          while (chordLine.length < c.pos) {
            chordLine += ' ';
          }
          chordLine += c.chord;
        }
      }
      const chordRow = document.createElement('div');
      chordRow.className = 'chordpro-chord-row';
      chordRow.textContent = chordLine;
      lineEl.appendChild(chordRow);

      const textRow = document.createElement('div');
      textRow.className = 'chordpro-text-row';
      textRow.textContent = textOnly;
      lineEl.appendChild(textRow);
    }

    container.appendChild(lineEl);
  }

  return container;
}

function renderList() {
  const list = $('#songList');
  const filtered = songs.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    const matchFav = !favFilterActive || favs.has(s.id);
    return matchSearch && matchFav;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-state">Nenhuma música encontrada.</li>';
    return;
  }

  list.innerHTML = '';
  for (const s of filtered) {
    const li = document.createElement('li');
    li.className = 'song-item';

    const star = document.createElement('span');
    star.className = 'fav-star' + (favs.has(s.id) ? ' active' : '');
    star.textContent = favs.has(s.id) ? '★' : '☆';
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFav(s.id);
    });

    const info = document.createElement('div');
    info.className = 'info';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = s.title;

    const artist = document.createElement('div');
    artist.className = 'artist';
    artist.textContent = s.artist;

    info.appendChild(title);
    info.appendChild(artist);

    const badge = document.createElement('span');
    badge.className = 'key-badge';
    badge.textContent = s.key;

    li.appendChild(star);
    li.appendChild(info);
    li.appendChild(badge);

    li.addEventListener('click', () => openSong(s.id));
    list.appendChild(li);
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {}
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentSongId) requestWakeLock();
});

async function openSong(id) {
  const song = songs.find((s) => s.id === id);
  if (!song) return;

  currentSongId = id;
  $('#viewerTitle').textContent = song.title;
  $('#viewerMeta').textContent = `${song.artist} · Tom ${song.key}`;
  updateViewerFavBtn();
  requestWakeLock();

  const content = $('#viewerContent');
  content.innerHTML = '<p style="color:var(--text-muted)">Carregando...</p>';
  $('#overlay').classList.remove('hidden');

  try {
    const raw = await loadSongContent(id);
    const parsed = parseChordpro(raw);
    content.innerHTML = '';
    content.appendChild(renderChordpro(parsed));
  } catch {
    content.innerHTML = '<p style="color:var(--text-muted)">Erro ao carregar cifra.</p>';
  }
}

function closeViewer() {
  $('#overlay').classList.add('hidden');
  currentSongId = null;
  releaseWakeLock();
}

function updateViewerFavBtn() {
  const btn = $('#btnFav');
  if (!currentSongId) return;
  const active = favs.has(currentSongId);
  btn.textContent = active ? '★' : '☆';
  btn.classList.toggle('active', active);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.getElementById('overlay').requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

$('#searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderList();
});

$('#favFilter').addEventListener('change', (e) => {
  favFilterActive = e.target.checked;
  renderList();
});

$('#btnClose').addEventListener('click', closeViewer);
$('#btnFav').addEventListener('click', () => {
  if (currentSongId) toggleFav(currentSongId);
});
$('#btnFullscreen').addEventListener('click', toggleFullscreen);

$('#overlay').addEventListener('click', (e) => {
  if (e.target === $('#overlay')) closeViewer();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeViewer();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

loadFavs();
loadSongs();
