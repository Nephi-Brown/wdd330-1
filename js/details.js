// js/details.js
// Details page: Rating Name / Media Type / Genre / Description / Buttons
// + Favorites toggle + Share fallback + Similar grid

import { loadHeaderFooter, updateFavCount } from './utils.mjs';
import { tmdb, normalizeMedia, toMediaList } from './api.js';

/* ----------------- tiny helpers ----------------- */
const $ = (s, r = document) => r.querySelector(s);
const getParam = (k) => new URLSearchParams(location.search).get(k);

function ensureEl(tag, attrs = {}, parent) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (parent) parent.appendChild(el);
  return el;
}

/* ----------------- favorites helpers ----------------- */
function getFavs() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
function setFavs(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  // update badge in header if present
  try { updateFavCount?.(); } catch {}
}
function isInFavs(list, id, type) {
  return list.some(f => f.id === id && f.type === type);
}
function toggleFavorite(item, btn) {
  const favs = getFavs();
  if (isInFavs(favs, item.id, item.type)) {
    const next = favs.filter(f => !(f.id === item.id && f.type === item.type));
    setFavs(next);
    if (btn) btn.textContent = 'Add to Favorites';
  } else {
    const entry = {
      id: item.id,
      type: item.type,
      title: item.title,
      poster: item.poster,
      year: item.year,
      rating: item.rating
    };
    setFavs([entry, ...favs]);
    if (btn) btn.textContent = 'Remove from Favorites';
  }
}

/* ----------------- share helper ----------------- */
async function shareOrCopy(title) {
  const url = location.href;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch { /* user canceled or not available */ }
  }
  try {
    await navigator.clipboard?.writeText(url);
    toast('Link copied to clipboard');
  } catch {
    alert('Copy this link:\n' + url);
  }
}
function toast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `
    position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
    background: #111827; color: #fff; padding: 10px 14px; border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,.25); z-index: 9999; font-weight: 700;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/* ----------------- layout helpers ----------------- */
function getOrCreateInfoPanel() {
  // Prefer an existing right-side container, otherwise create one.
  let info = $('#detail-info') || $('.ct-detail__main');
  if (!info) {
    // If no grid exists, create a minimal grid with poster + info
    const main = $('main') || document.body;
    const wrap = ensureEl('section', { class: 'ct-detail' }, main);
    const poster = ensureEl('div', { id: 'detail-poster', class: 'ct-detail__poster' }, wrap);
    poster.innerHTML = `<div class="wf wf--block">Poster</div>`;
    info = ensureEl('article', { id: 'detail-info', class: 'ct-detail__main' }, wrap);
  }

  // Rebuild the info contents in the exact order requested
  info.innerHTML = `
    <div class="detail-head" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <span id="detail-rating"></span>
      <h1 id="detail-title" style="margin:0;">Title</h1>
    </div>

    <p id="detail-type" class="meta" style="margin:.5rem 0 0;">Media Type: </p>
    <p id="detail-genres" class="meta" style="margin:.25rem 0 1rem;">Genre: </p>

    <h3 style="margin:.25rem 0 .25rem;">Description</h3>
    <p id="detail-overview" class="meta"></p>

    <div class="ct-actions" style="margin-top:1rem">
      <button class="btn btn--primary" id="fav-btn" type="button">Add to Favorites</button>
      <button class="btn btn--ghost" id="share-btn" type="button">Share</button>
    </div>
  `;

  return info;
}
function getPosterContainer() {
  return $('#detail-poster') || $('.ct-detail__poster');
}

/* ----------------- renderers ----------------- */
function renderDetails(item, raw) {
  // Ensure we have a stable info panel
  const info = getOrCreateInfoPanel();

  // Rating + Name
  const titleEl = $('#detail-title', info);
  if (titleEl) titleEl.textContent = item.title;

  const ratingEl = $('#detail-rating', info);
  if (ratingEl) {
    ratingEl.innerHTML = item.rating ? `<span class="badge">★ ${item.rating}</span>` : '';
  }

  // Media Type (bold, slightly larger handled in CSS you added)
  const typeEl = $('#detail-type', info);
  if (typeEl) typeEl.textContent = `Media: ${item.typeLabel}`;

  // Genres
  const genresEl = $('#detail-genres', info);
  const genresText = item.genres?.length ? item.genres.join(', ') : '—';
  if (genresEl) genresEl.textContent = `Genre: ${genresText}`;

  // Description
  const overviewEl = $('#detail-overview', info);
  if (overviewEl) overviewEl.textContent = raw.overview || '—';

  // Poster
  const posterWrap = getPosterContainer();
  if (posterWrap) {
    posterWrap.innerHTML = item.poster
      ? `<img src="${item.poster}" alt="${item.title} poster">`
      : `<div class="wf wf--block">No Poster</div>`;
  }

  // Wire buttons
  const favBtn = $('#fav-btn', info);
  if (favBtn) {
    const inList = isInFavs(getFavs(), item.id, item.type);
    favBtn.textContent = inList ? 'Remove from Favorites' : 'Add to Favorites';
    favBtn.addEventListener('click', () => toggleFavorite(item, favBtn));
  }
  const shareBtn = $('#share-btn', info);
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => { await shareOrCopy(item.title); });
  }
}

function mediaCard(i) {
  const g = i.genres?.length ? ` (${i.genres.join(', ')})` : '';
  const meta = `${i.year || '—'} — ${i.typeLabel}${g}`;
  return `
    <a class="card" href="details.html?id=${i.id}&type=${i.type}">
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

function renderSimilar(list) {
  let grid = $('#similar-grid');
  if (!grid) {
    const main = $('main') || document.body;
    const sec = ensureEl('section', {}, main);
    sec.insertAdjacentHTML('afterbegin', `<h2>Similar</h2>`);
    grid = ensureEl('div', { id: 'similar-grid', class: 'ct-grid ct-grid--3' }, sec);
  }
  grid.innerHTML = list?.length ? list.map(mediaCard).join('') : `<p class="meta">No similar titles found.</p>`;
}

/* ----------------- bootstrap ----------------- */
(async function init() {
  await loadHeaderFooter();

  const id = getParam('id');
  const type = getParam('type'); // 'movie' | 'tv'
  if (!id || !type) {
    const main = $('main') || document.body;
    main.insertAdjacentHTML('afterbegin', `<div class="alert"><h2>Missing item id or type.</h2></div>`);
    return;
  }

  try {
    // primary item
    const raw = await tmdb(`${type}/${id}`);
    const item = await normalizeMedia(raw, type);
    renderDetails(item, raw);

    // similar
    const sim = await tmdb(`${type}/${id}/similar`, { page: 1 });
    const similarItems = await toMediaList((sim.results || []).slice(0, 12), type);
    renderSimilar(similarItems);
  } catch (err) {
    console.error('Details load error:', err);
    const main = $('main') || document.body;
    main.insertAdjacentHTML('afterbegin', `<div class="alert"><h2>Failed to load details. Please try again.</h2></div>`);
  }
})();
