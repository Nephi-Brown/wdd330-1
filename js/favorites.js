// js/favorites.js
// Favorites page: 15-per-page pagination, remove actions, enrichment,
// robust scroll-to-top + re-primed reveals on paginate.

import { loadHeaderFooter, revealStaggered, updateFavCount, renderSkeletonCards } from './utils.mjs';
import { tmdb, normalizeMedia } from './api.js';

const $ = (s, r = document) => r.querySelector(s);

/* Scroll — robust */
function getHeaderOffset() {
  const header = document.querySelector('header, #main-head');
  if (!header) return 0;
  const cs = getComputedStyle(header);
  const fixedLike = cs.position === 'fixed' || cs.position === 'sticky';
  return fixedLike ? header.offsetHeight : 0;
}
function smartScrollTop() {
  const targetY = Math.max(0, 0 - getHeaderOffset() - 6);
  try { window.scrollTo({ top: targetY, behavior: 'smooth' }); }
  catch { window.scrollTo(0, targetY); }
  requestAnimationFrame(() => {
    try { window.scrollTo({ top: targetY, behavior: 'smooth' }); }
    catch { window.scrollTo(0, targetY); }
  });
  setTimeout(() => { window.scrollTo(0, targetY); }, 380);
}

/* Reveal re-prime */
function primeCards(scope) {
  const grid = typeof scope === 'string' ? document.getElementById(scope) : scope;
  if (!grid) return;
  grid.querySelectorAll('.card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px) scale(0.98)';
    card.classList.remove('is-visible', 'reveal-in', 'io-seen');
  });
}
function triggerReveals(scope) {
  const grid = typeof scope === 'string' ? document.getElementById(scope) : scope;
  if (!grid) return;
  revealStaggered(grid);                       // now
  requestAnimationFrame(() => revealStaggered(grid)); // next frame
  setTimeout(() => revealStaggered(grid), 380);       // after scroll/transition
}

const state = {
  container: null,
  list: [],
  rawIds: [],
  page: 1,
  pageSize: 15
};

/* Storage helpers */
function getFavs() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
function setFavs(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  try { updateFavCount?.(); } catch {}
}

/* UI helpers */
function ensureContainer() {
  let grid = $('#fav-grid') || $('#favorites-grid');
  if (!grid) {
    const main = $('main') || document.body;
    const sec = document.createElement('section');
    sec.innerHTML = `<h2>Your Favorites</h2><div id="favorites-grid" class="ct-grid ct-grid--3"></div>`;
    main.appendChild(sec);
    grid = $('#favorites-grid');
  }
  state.container = grid;
  return grid;
}
function paginationMount() {
  const base = state.container?.id || 'favorites-grid';
  const id = `${base}-pagination`;
  let mount = document.getElementById(id);
  if (!mount) {
    mount = document.createElement('div');
    mount.id = id;
    mount.className = 'ct-pagination';
    mount.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:1rem;';
    state.container.parentElement.appendChild(mount);
  }
  return mount;
}

/* Rendering */
function card(i) {
  const genres = i.genres?.length ? ` (${i.genres.join(', ')})` : '';
  const meta = `${i.year || '—'} — ${i.typeLabel}${genres}`;
  const href = `details.html?id=${i.id}&type=${i.type}`;
  return `
    <div class="card">
      <a class="card__media" href="${href}">
        <img class="card__img" src="${i.poster}" alt="${i.title}">
      </a>
      <div class="card__body">
        <h3><a href="${href}">${i.title}</a></h3>
        <p class="meta">${meta}</p>
        ${i.rating ? `<span class="badge">★ ${i.rating}</span>` : ''}
        <div class="ct-actions" style="margin-top:12px;">
          <a class="btn btn--ghost" href="${href}">Details</a>
          <button class="btn btn--primary btn-remove" data-id="${i.id}" data-type="${i.type}" data-skip-flip type="button">
            Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const grid = state.container;
  if (!grid) return;

  const { page, pageSize } = state;
  const start = (page - 1) * pageSize;
  const slice = state.list.slice(start, start + pageSize);

  grid.innerHTML = slice.length
    ? slice.map(card).join('')
    : `<p class="meta">No favorites yet. Go add some!</p>`;

  // re-prime + multi-reveal
  primeCards(grid);
  triggerReveals(grid);

  // remove handling
  grid.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = Number(btn.getAttribute('data-id'));
      const type = btn.getAttribute('data-type');
      state.rawIds = state.rawIds.filter(x => !(String(x.id) === String(id) && x.type === type));
      setFavs(state.rawIds);
      state.list = state.list.filter(x => !(String(x.id) === String(id) && x.type === type));
      const startIdx = (state.page - 1) * state.pageSize;
      if (state.page > 1 && startIdx >= state.list.length) state.page--;
      render();
    });
  });

  // pagination
  const mount = paginationMount();
  const total = state.list.length;
  const hasPrev = state.page > 1;
  const hasNext = (start + state.pageSize) < total;

  mount.innerHTML = `
    <button id="${grid.id}-prev" class="btn btn--ghost" ${hasPrev ? '' : 'disabled'}>Prev</button>
    <span>${total ? (Math.min(total, start + 1) + '–' + Math.min(total, start + state.pageSize)) : '0–0'} of ${total}</span>
    <button id="${grid.id}-next" class="btn btn--ghost" ${hasNext ? '' : 'disabled'}>Next</button>
  `;
  const go = (nextPage) => {
    smartScrollTop();
    state.page = nextPage;
    render();
  };
  document.getElementById(`${grid.id}-prev`)?.addEventListener('click', () => {
    if (state.page > 1) go(state.page - 1);
  });
  document.getElementById(`${grid.id}-next`)?.addEventListener('click', () => {
    if ((state.page * state.pageSize) < total) go(state.page + 1);
  });
}

/* Data */
async function enrichFavorite(snapshot) {
  try {
    const raw = await tmdb(`${snapshot.type}/${snapshot.id}`);
    const item = await normalizeMedia(raw, snapshot.type);
    return {
      ...snapshot,
      ...item,
      rating: item.rating ?? snapshot.rating ?? null,
      year: item.year ?? snapshot.year ?? '',
      poster: item.poster || snapshot.poster || ''
    };
  } catch {
    return {
      ...snapshot,
      typeLabel: snapshot.type === 'tv' ? 'TV' : 'Movie',
      genres: snapshot.genres || []
    };
  }
}

/* Bootstrap */
(async function init() {
  await loadHeaderFooter();

  ensureContainer();
  const gridId = state.container.id;
  renderSkeletonCards(gridId, 6);

  state.rawIds = getFavs();
  if (!state.rawIds.length) {
    state.list = [];
    state.page = 1;
    render();
    return;
  }

  const enriched = await Promise.all(state.rawIds.map(enrichFavorite));
  const map = new Map(enriched.map(i => [`${i.type}:${i.id}`, i]));
  state.list = state.rawIds.map(x => map.get(`${x.type}:${x.id}`)).filter(Boolean);

  state.page = 1;
  render();
})();
