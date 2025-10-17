// js/search-results.js
// Search results page: supports title text, year (YYYY), and genre names.
// Pulls from both movies and TV.

import { loadHeaderFooter } from './utils.mjs';
import { tmdb, toMediaList, getGenreMap } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const getParam = (k) => new URLSearchParams(location.search).get(k) || '';

/* Card template shared with the rest of the site */
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

function normalizeTerm(raw) {
  return raw.trim();
}

function isYear(term) {
  return /^\d{4}$/.test(term);
}

function findGenreIds(term, genreMap) {
  const t = term.toLowerCase();
  return Object.entries(genreMap)
    .filter(([id, name]) => name.toLowerCase().includes(t))
    .map(([id]) => id);
}

async function searchByYear(year) {
  // discover endpoints work well for year filters
  const [m, t] = await Promise.all([
    tmdb('discover/movie', { sort_by: 'popularity.desc', primary_release_year: year, page: 1 }),
    tmdb('discover/tv',    { sort_by: 'popularity.desc', first_air_date_year: year, page: 1 })
  ]);
  return [...(m.results || []), ...(t.results || [])];
}

async function searchByGenre(term) {
  const [movieMap, tvMap] = await Promise.all([
    getGenreMap('movie'),
    getGenreMap('tv')
  ]);

  const movieIds = findGenreIds(term, movieMap).join(',');
  const tvIds    = findGenreIds(term, tvMap).join(',');

  const [m, t] = await Promise.all([
    movieIds ? tmdb('discover/movie', { with_genres: movieIds, sort_by: 'popularity.desc', page: 1 }) : { results: [] },
    tvIds    ? tmdb('discover/tv',    { with_genres: tvIds,    sort_by: 'popularity.desc', page: 1 }) : { results: [] }
  ]);

  return [...(m.results || []), ...(t.results || [])];
}

async function searchByText(q) {
  // multi search then filter to movie/tv
  const data = await tmdb('search/multi', { query: q, include_adult: 'false', page: 1 });
  const raw = (data.results || []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
  // light client-side boost: keep items whose title/year also match text loosely
  const t = q.toLowerCase();
  return raw.filter(r => {
    const name = (r.title || r.name || '').toLowerCase();
    const year = (r.release_date || r.first_air_date || '').slice(0, 4);
    return name.includes(t) || year === q;
  });
}

async function runSearch() {
  await loadHeaderFooter();

  const qRaw = getParam('q') || getParam('query'); // support both "q" and "query"
  const q = normalizeTerm(qRaw);

  const title = $('#results-title');
  const sub   = $('#results-sub');
  const grid  = $('#search-grid');

  if (title) title.textContent = q ? `Results for “${q}”` : 'Search';
  if (!q) {
    if (sub) sub.textContent = 'Try searching for a title, genre, or year.';
    if (grid) grid.innerHTML = '';
    return;
  }

  try {
    let raw = [];
    if (isYear(q)) {
      raw = await searchByYear(q);
    } else {
      // try genre first; if no hits, fall back to text search
      const genreHits = await searchByGenre(q);
      raw = genreHits.length ? genreHits : await searchByText(q);
    }

    const list = await toMediaList(raw.slice(0, 30)); // mixed types supported
    if (sub) sub.textContent = `${list.length} result${list.length === 1 ? '' : 's'}`;

    if (!list.length) {
      grid.innerHTML = `<p class="meta">No results. Try a different title, genre, or year.</p>`;
      return;
    }

    grid.innerHTML = list.map(mediaCard).join('');
  } catch (err) {
    console.error('Search error:', err);
    if (sub) sub.textContent = '';
    if (grid) grid.innerHTML = `<p class="meta">Something went wrong while searching. Please try again.</p>`;
  }
}

runSearch();
