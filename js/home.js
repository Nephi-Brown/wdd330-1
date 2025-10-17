// js/home.js
// Renders 15 cards and shows: Year — Media Type (Genre, Genre)

import { loadHeaderFooter } from './utils.mjs';
import { tmdb, toMediaList } from './api.js';

/* Card template */
function mediaCard(item){
  const genreText = item.genres && item.genres.length ? ` (${item.genres.join(', ')})` : '';
  const metaLine = `${item.year || '—'} — ${item.typeLabel}${genreText}`;

  return `
  <a class="card" href="details.html?id=${item.id}&type=${item.type}">
    <div class="card__media">
      <img class="card__img" src="${item.poster}" alt="${item.title}">
    </div>
    <div class="card__body">
      <h3>${item.title}</h3>
      <p class="meta">${metaLine}</p>
      ${item.rating ? `<span class="badge">★ ${item.rating}</span>` : ''}
    </div>
  </a>`;
}

async function loadTrending(){
  const data = await tmdb('trending/all/day');
  const raw = (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 15);
  const list = await toMediaList(raw); // mixed list → movie + tv genre maps
  const el = document.getElementById('trending-grid');
  if (el) el.innerHTML = list.map(mediaCard).join('');
}

async function loadMovies(){
  const data = await tmdb('movie/popular', { page: 1 });
  const raw = (data.results || []).slice(0, 15);
  const list = await toMediaList(raw, 'movie'); // single type → faster
  const el = document.getElementById('movies-grid');
  if (el) el.innerHTML = list.map(mediaCard).join('');
}

async function loadTV(){
  const data = await tmdb('tv/popular', { page: 1 });
  const raw = (data.results || []).slice(0, 15);
  const list = await toMediaList(raw, 'tv'); // single type → faster
  const el = document.getElementById('tv-grid');
  if (el) el.innerHTML = list.map(mediaCard).join('');
}

function initSearch(){
  const form = document.querySelector('.ct-search');
  const input = document.getElementById('global-search');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input?.value?.trim();
    if (!q) return;
    // ⬇️ point to the search_results page
    window.location.href = `search_results/index.html?q=${encodeURIComponent(q)}`;
  });
}


(async function(){
  await loadHeaderFooter();
  initSearch();

  if (document.getElementById('trending-grid')) loadTrending();
  if (document.getElementById('movies-grid')) loadMovies();
  if (document.getElementById('tv-grid')) loadTV();
})();
