// js/details.js
// Details page: formatted metadata, favorites, share, and similar section

import { loadHeaderFooter, updateFavCount } from './utils.mjs';
import { tmdb, normalizeMedia, toMediaList } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const getParam = (k) => new URLSearchParams(location.search).get(k);

function ensureEl(tag, attrs = {}, parent) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (parent) parent.appendChild(el);
  return el;
}

/* ---------- Favorites Helpers ---------- */
function getFavs() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
function setFavs(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  updateFavCount?.();
}
function isInFavs(list, id, type) {
  return list.some(f => f.id === id && f.type === type);
}
function toggleFavorite(item, btn) {
  const favs = getFavs();
  if (isInFavs(favs, item.id, item.type)) {
    const next = favs.filter(f => !(f.id === item.id && f.type === item.type));
    setFavs(next);
    btn.textContent = 'Add to Favorites';
  } else {
    favs.unshift({
      id: item.id, type: item.type,
      title: item.title, poster: item.poster,
      year: item.year, rating: item.rating
    });
    setFavs(favs);
    btn.textContent = 'Remove from Favorites';
  }
}

/* ---------- Share Helper ---------- */
async function shareOrCopy(title) {
  const url = location.href;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch {}
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

/* ---------- Layout Builders ---------- */
function getOrCreateInfoPanel() {
  let info = $('#detail-info') || $('.ct-detail__main');
  if (!info) {
    const main = $('main') || document.body;
    const wrap = ensureEl('section', { class: 'ct-detail' }, main);
    ensureEl('div', { id: 'detail-poster', class: 'ct-detail__poster' }, wrap)
      .innerHTML = `<div class="wf wf--block">Poster</div>`;
    info = ensureEl('article', { id: 'detail-info', class: 'ct-detail__main' }, wrap);
  }

  info.innerHTML = `
    <div class="detail-head" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <span id="detail-rating"></span>
      <h1 id="detail-title" style="margin:0;">Title</h1>
    </div>

    <div id="detail-meta" class="ct-detail__meta" style="margin:.75rem 0;">
      <p id="detail-type" class="meta"></p>
      <p id="detail-genres" class="meta"></p>
      <p id="credit-director" class="meta"></p>
      <p id="credit-producer" class="meta"></p>
      <p id="credit-stars" class="meta"></p>
    </div>

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

/* ---------- Renderer ---------- */
function renderDetails(item, raw) {
  const info = getOrCreateInfoPanel();

  // Title + Rating
  $('#detail-title', info).textContent = item.title;
  $('#detail-rating', info).innerHTML = item.rating ? `<span class="badge">★ ${item.rating}</span>` : '';

  // Media and Genre formatted same as credits
  const typeEl = $('#detail-type', info);
  const genresEl = $('#detail-genres', info);
  const genreText = item.genres?.length ? item.genres.join(', ') : '—';
  typeEl.innerHTML = `<strong>Media:</strong> ${item.typeLabel}`;
  genresEl.innerHTML = `<strong>Genre:</strong> ${genreText}`;

  // Credits lines
  const crew = raw.credits?.crew || [];
  const cast = raw.credits?.cast || [];
  const directors = crew.filter(p => p.job === 'Director').map(p => p.name);
  const producers = crew.filter(p => p.job === 'Producer').map(p => p.name);
  const leads = cast.slice(0, 3).map(a => a.name);

  const dirEl = $('#credit-director', info);
  const prodEl = $('#credit-producer', info);
  const starsEl = $('#credit-stars', info);

  dirEl.innerHTML = directors.length ? `<strong>Director:</strong> ${directors.join(', ')}` : '';
  prodEl.innerHTML = producers.length ? `<strong>Producer:</strong> ${producers.join(', ')}` : '';
  starsEl.innerHTML = leads.length ? `<strong>Stars:</strong> ${leads.join(', ')}` : '';

  [typeEl, genresEl, dirEl, prodEl, starsEl].forEach(el => {
    if (el && !el.textContent.trim()) el.style.display = 'none';
  });

  // Description
  $('#detail-overview', info).textContent = raw.overview || '—';

  // Poster
  const posterWrap = getPosterContainer();
  if (posterWrap) {
    posterWrap.innerHTML = item.poster
      ? `<img src="${item.poster}" alt="${item.title} poster">`
      : `<div class="wf wf--block">No Poster</div>`;
  }

  // Buttons
  const favBtn = $('#fav-btn', info);
  const inFavs = isInFavs(getFavs(), item.id, item.type);
  favBtn.textContent = inFavs ? 'Remove from Favorites' : 'Add to Favorites';
  favBtn.addEventListener('click', () => toggleFavorite(item, favBtn));

  $('#share-btn', info)?.addEventListener('click', () => shareOrCopy(item.title));
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

/* ---------- Init ---------- */
(async function init() {
  await loadHeaderFooter();

  const id = getParam('id');
  const type = getParam('type');
  if (!id || !type) {
    const main = $('main') || document.body;
    main.insertAdjacentHTML('afterbegin', `<div class="alert"><h2>Missing item id or type.</h2></div>`);
    return;
  }

  try {
    const raw = await tmdb(`${type}/${id}`, { append_to_response: 'credits' });
    const item = await normalizeMedia(raw, type);
    renderDetails(item, raw);

    const sim = await tmdb(`${type}/${id}/similar`, { page: 1 });
    const similarItems = await toMediaList((sim.results || []).slice(0, 12), type);
    renderSimilar(similarItems);
  } catch (err) {
    console.error('Details load error:', err);
    const main = $('main') || document.body;
    main.insertAdjacentHTML('afterbegin', `<div class="alert"><h2>Failed to load details. Please try again.</h2></div>`);
  }
})();
