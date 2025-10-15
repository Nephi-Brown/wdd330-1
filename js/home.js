import { loadHeaderFooter } from './utils.mjs';
import { tmdb, normalizeMedia } from './api.js';

function mediaCard(item){
  return `
  <a class="card" href="details.html?id=${item.id}&type=${item.type}">
    <img class="card__img" src="${item.poster}" alt="${item.title}">
    <div class="card__body">
      <h3>${item.title}</h3>
      <p class="meta">${item.year || ''}</p>
      ${item.rating ? `<span class="badge">★ ${item.rating}</span>` : ''}
    </div>
  </a>`;
}

async function loadTrending(){
  const data = await tmdb('trending/all/day');
  const list = data.results.slice(0,9).map(r => normalizeMedia(r, r.media_type));
  document.getElementById('trending-grid').innerHTML = list.map(mediaCard).join('');
}

async function loadMovies(){
  const data = await tmdb('movie/popular', { page: 1 });
  const list = data.results.slice(0,9).map(r => normalizeMedia(r, 'movie'));
  const el = document.getElementById('movies-grid');
  if (el) el.innerHTML = list.map(mediaCard).join('');
}

async function loadTV(){
  const data = await tmdb('tv/popular', { page: 1 });
  const list = data.results.slice(0,9).map(r => normalizeMedia(r, 'tv'));
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
    window.location.href = `movies.html?q=${encodeURIComponent(q)}`;
  });
}

(async function(){
  await loadHeaderFooter();
  initSearch();

  if (document.getElementById('trending-grid')) loadTrending();
  if (document.getElementById('movies-grid')) loadMovies();
  if (document.getElementById('tv-grid')) loadTV();
})();
