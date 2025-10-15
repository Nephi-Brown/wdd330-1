import { loadHeaderFooter, getLocalStorage, setLocalStorage } from './utils.mjs';
import { tmdb, omdb, normalizeMedia } from './api.js';

function getParam(name){
  return new URLSearchParams(location.search).get(name);
}

function card(item){
  return `
    <a class="card" href="/details.html?id=${item.id}&type=${item.type}">
      <img class="card__img" src="${item.poster}" alt="${item.title}">
      <div class="card__body">
        <h3>${item.title}</h3>
        <p class="meta">${item.year || ''}</p>
      </div>
    </a>`;
}

function saveFavorite(media){
  const list = getLocalStorage('ct-favorites') || [];
  if (!list.find(m => m.id === media.id && m.type === media.type)){
    list.push(media);
    setLocalStorage('ct-favorites', list);
  }
}

(async function(){
  await loadHeaderFooter();

  const id = getParam('id');
  const type = getParam('type') || 'movie';

  // details
  const d = await tmdb(`${type}/${id}`);
  const media = normalizeMedia(d, type);

  // OMDb extra by title+year (fallback)
  try{
    const od = await omdb({ t: media.title, y: media.year });
    if (od && od.Runtime) media.runtime = od.Runtime;
    if (od && od.imdbRating) media.imdb = od.imdbRating;
  }catch(_){}

  // Populate UI
  document.getElementById('poster').src = media.poster;
  document.getElementById('poster').alt = media.title;
  document.getElementById('title').textContent = media.title;
  document.getElementById('year').textContent = media.year;
  document.getElementById('runtime').textContent = media.runtime ? `⏱ ${media.runtime}` : '';
  document.getElementById('rating').textContent = media.rating ? `★ ${media.rating}` : '';
  document.getElementById('overview').textContent = media.overview || '';

  document.getElementById('fav-btn').addEventListener('click', () => {
    saveFavorite(media);
    document.getElementById('fav-btn').textContent = 'Added!';
  });

  // Similar
  try{
    const sim = await tmdb(`${type}/${id}/similar`, { page: 1 });
    const list = sim.results.slice(0,9).map(r => normalizeMedia(r, type));
    document.getElementById('similar-grid').innerHTML = list.map(card).join('');
  }catch(_){}
})();
