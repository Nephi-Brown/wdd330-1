// js/favorites.js
// Favorites page — render normal cards with genres + Details/Remove,
// with skeletons while enriching saved items, and staggered reveal.

import { loadHeaderFooter, updateFavCount, renderSkeletonCards, revealStaggered } from './utils.mjs';
import { tmdb, normalizeMedia } from './api.js';

const $ = (s, r = document) => r.querySelector(s);

function getFavs() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
function setFavs(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  try { updateFavCount?.(); } catch {}
}

function removeFavorite(id, type) {
  const next = getFavs().filter(f => !(f.id === id && f.type === type));
  setFavs(next);
  renderFavorites(); // re-render
}

/** Card markup that matches the normal cards + actions */
function cardTemplate(item) {
  const genres = item.genres?.length ? ` (${item.genres.join(', ')})` : '';
  const meta = `${item.year || '—'} — ${item.typeLabel}${genres}`;
  const detailsHref = `details.html?id=${item.id}&type=${item.type}`;

  return `
    <div class="card">
      <a class="card__media" href="${detailsHref}">
        <img class="card__img" src="${item.poster}" alt="${item.title}">
      </a>
      <div class="card__body">
        <h3><a href="${detailsHref}">${item.title}</a></h3>
        <p class="meta">${meta}</p>
        ${item.rating ? `<span class="badge">★ ${item.rating}</span>` : ''}

        <div class="ct-actions" style="margin-top: 12px;">
          <a class="btn btn--ghost" href="${detailsHref}">Details</a>
          <button class="btn btn--primary btn-remove"
                  data-id="${item.id}" data-type="${item.type}" type="button">
            Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

async function enrichFavorite(fav) {
  // We saved a minimal snapshot in favorites; fetch full record to get genres
  const raw = await tmdb(`${fav.type}/${fav.id}`);
  const item = await normalizeMedia(raw, fav.type); // includes genres + typeLabel
  return {
    ...fav,
    ...item,
    rating: item.rating ?? fav.rating ?? null,
    year: item.year ?? fav.year ?? '',
    poster: item.poster || fav.poster || '',
  };
}

async function renderFavorites() {
  // Prefer existing #fav-grid (favorites.html) else create #favorites-grid
  const container =
    $('#fav-grid') ||
    $('#favorites-grid') ||
    (function () {
      const main = $('main') || document.body;
      const sec = document.createElement('section');
      sec.innerHTML = `<h2>Your Favorites</h2><div id="favorites-grid" class="ct-grid ct-grid--3"></div>`;
      main.appendChild(sec);
      return $('#favorites-grid');
    })();

  const favs = getFavs();

  if (!favs.length) {
    container.innerHTML = `<p class="meta">No favorites yet.</p>`;
    return;
  }

  // Skeleton while enriching
  const id = container.id || 'favorites-grid';
  renderSkeletonCards(id, Math.min(favs.length, 8));

  // Enrich in parallel (genres/typeLabel)
  let items = [];
  try {
    items = await Promise.all(favs.map(enrichFavorite));
  } catch (e) {
    console.error('Failed to enrich favorites:', e);
    items = favs.map(f => ({ ...f, typeLabel: f.type === 'movie' ? 'Movie' : 'TV', genres: [] }));
  }

  container.innerHTML = items.map(cardTemplate).join('');
  revealStaggered(container); // animate favorites

  // Wire Remove buttons
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      const type = btn.getAttribute('data-type');
      removeFavorite(id, type);
    });
  });
}

(async function init() {
  await loadHeaderFooter();
  await renderFavorites();
})();
