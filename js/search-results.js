// js/search-results.js
// Search results page with collapsible filters, genre scroller (dynamic from loaded cards),
// skeletons and staggered entrance animations.

import {
  loadHeaderFooter,
  renderSkeletonCards,
  bindCollapsible,
  revealStaggered
} from './utils.mjs';
import { tmdb, toMediaList, getGenreMap } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const getParam = (k) => new URLSearchParams(location.search).get(k) || '';

/* Card template */
function mediaCard(i) {
  const g = i.genres?.length ? ` (${i.genres.join(', ')})` : '';
  const meta = `${i.year || '—'} — ${i.typeLabel}${g}`;
  return `
    <a class="card" href="../details.html?id=${i.id}&type=${i.type}">
      <div class="card__media">
        <img class="card__img" src="${i.poster}" alt="${i.title}">
      </div>
      <div class="card__body">
        <h3>${i.title}</h3>
        <p class="meta">${meta}</p>
        ${i.rating ? `<span class="badge">★ ${i.rating}</span>` : ''}
      </div>
    </a>`;
}

function normalizeTerm(raw) { return raw.trim(); }
function isYear(term) { return /^\d{4}$/.test(term); }

function findGenreIds(term, genreMap) {
  const t = term.toLowerCase();
  return Object.entries(genreMap)
    .filter(([, name]) => name.toLowerCase().includes(t))
    .map(([id]) => id);
}

/* ---- Search helpers ---- */
async function searchByYear(year) {
  const [m, t] = await Promise.all([
    tmdb('discover/movie', { sort_by: 'popularity.desc', primary_release_year: year, page: 1 }),
    tmdb('discover/tv',    { sort_by: 'popularity.desc', first_air_date_year: year, page: 1 })
  ]);
  return [...(m.results || []), ...(t.results || [])];
}
async function searchByGenre(term) {
  const [movieMap, tvMap] = await Promise.all([ getGenreMap('movie'), getGenreMap('tv') ]);
  const movieIds = findGenreIds(term, movieMap).join(',');
  const tvIds    = findGenreIds(term, tvMap).join(',');

  const [m, t] = await Promise.all([
    movieIds ? tmdb('discover/movie', { with_genres: movieIds, sort_by: 'popularity.desc', page: 1 }) : { results: [] },
    tvIds    ? tmdb('discover/tv',    { with_genres: tvIds,    sort_by: 'popularity.desc', page: 1 }) : { results: [] }
  ]);
  return [...(m.results || []), ...(t.results || [])];
}
async function searchByText(q) {
  const data = await tmdb('search/multi', { query: q, include_adult: 'false', page: 1 });
  const raw = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  const t = q.toLowerCase();
  return raw.filter(r => {
    const name = (r.title || r.name || '').toLowerCase();
    const year = (r.release_date || r.first_air_date || '').slice(0, 4);
    return name.includes(t) || year === q;
  });
}

/* ----------------- Filter/Sort state ----------------- */
let sourceList = [];   // normalized list from API (mixed movie/tv)
let viewList   = [];   // filtered/sorted list for rendering
const selectedGenres = new Set(); // names
function getSelectedGenres() { return Array.from(selectedGenres); }

/* ---- Genre scroller (Search: from loaded cards only) ---- */
function renderGenreScrollerFromList(list) {
  const scroller = $('#genre-scroller');
  if (!scroller) return;

  const nameSet = new Set();
  list.forEach(i => (i.genres || []).forEach(g => nameSet.add(g)));
  const genres = Array.from(nameSet).sort((a,b) => a.localeCompare(b));

  scroller.innerHTML = genres.map(name =>
    `<button class="genre-chip" type="button" data-name="${name}" aria-pressed="${selectedGenres.has(name) ? 'true' : 'false'}">${name}</button>`
  ).join('');

  scroller.querySelectorAll('.genre-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const on = btn.getAttribute('aria-pressed') === 'true';
      if (on) {
        selectedGenres.delete(name);
        btn.setAttribute('aria-pressed', 'false');
      } else {
        selectedGenres.add(name);
        btn.setAttribute('aria-pressed', 'true');
      }
    });
  });
}

/* ---- Apply filters/sort ---- */
function applyFilterSort() {
  const movieOn = $('#filter-movie')?.checked ?? true;
  const tvOn    = $('#filter-tv')?.checked ?? true;
  const sortBy  = $('#sort-by')?.value || 'pop-desc';
  const genreNames = getSelectedGenres();

  // Filter
  let next = sourceList.filter(i => {
    if (i.type === 'movie' && !movieOn) return false;
    if (i.type === 'tv' && !tvOn) return false;
    if (genreNames.length) {
      const names = i.genres || [];
      if (!genreNames.every(g => names.includes(g))) return false;
    }
    return true;
  });

  // Sort
  const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  const byYear  = (a, b) => (parseInt(b.year || 0) - parseInt(a.year || 0)); // desc default
  const byRate  = (a, b) => (parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
  switch (sortBy) {
    case 'rating-desc': next.sort(byRate); break;
    case 'year-desc':   next.sort(byYear); break;
    case 'year-asc':    next.sort((a,b) => -byYear(a,b)); break;
    case 'title-asc':   next.sort(byTitle); break;
    case 'title-desc':  next.sort((a,b) => -byTitle(a,b)); break;
    default: break; // popularity order as-is
  }

  viewList = next;
  renderList();
}

function renderList() {
  const grid = $('#search-grid');
  if (!grid) return;
  grid.innerHTML = viewList.length
    ? viewList.map(mediaCard).join('')
    : `<p class="meta">No results. Adjust your filters or try another query.</p>`;
  $('#results-sub').textContent = `${viewList.length} result${viewList.length === 1 ? '' : 's'}`;
  revealStaggered(grid);
}

/* ----------------- Main search flow ----------------- */
async function runSearch() {
  await loadHeaderFooter();
  bindCollapsible('#filter-toggle', '#filter-panel');

  const qRaw = getParam('q') || getParam('query');
  const q = normalizeTerm(qRaw);

  const title = $('#results-title');
  if (title) title.textContent = q ? `Results for “${q}”` : 'Search';
  const grid  = $('#search-grid');
  const sub   = $('#results-sub');

  if (!q) {
    if (sub) sub.textContent = 'Try searching for a title, genre, or year.';
    if (grid) grid.innerHTML = '';
    return;
  }

  renderSkeletonCards('search-grid', 8);

  try {
    let raw = [];
    if (isYear(q)) {
      raw = await searchByYear(q);
    } else {
      const genreHits = await searchByGenre(q);
      raw = genreHits.length ? genreHits : await searchByText(q);
    }

    sourceList = await toMediaList(raw.slice(0, 60)); // normalize cards
    viewList = [...sourceList];

    // Build dynamic genre scroller from loaded cards
    renderGenreScrollerFromList(sourceList);

    // Initial render
    renderList();

    // Wire filter controls
    $('#apply-filters')?.addEventListener('click', applyFilterSort);
    $('#clear-filters')?.addEventListener('click', () => {
      const m = $('#filter-movie'); const t = $('#filter-tv'); const s = $('#sort-by');
      if (m) m.checked = true;
      if (t) t.checked = true;
      if (s) s.value = 'pop-desc';
      selectedGenres.clear();
      renderGenreScrollerFromList(sourceList); // reset chips
      applyFilterSort();
    });

    // Optional: live changes
    ['filter-movie', 'filter-tv', 'sort-by'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('change', applyFilterSort);
    });
  } catch (err) {
    console.error('Search error:', err);
    if (sub) sub.textContent = '';
    if (grid) grid.innerHTML = `<p class="meta">Something went wrong while searching. Please try again.</p>`;
  }
}
runSearch();
