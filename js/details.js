// js/details.js
// Safe, backwards-compatible Details page script:
// - Fills existing DOM (title/poster/overview/etc.)
// - Inserts meta/Credits block above description without rebuilding layout
// - Favorites toggle + header badge
// - Similar section rendering
// - Robust: no crashes if elements are missing

import { loadHeaderFooter, updateFavCount } from './utils.mjs';
import { tmdb, normalizeMedia, toMediaList } from './api.js';

const $ = (s, r = document) => r.querySelector(s);
const getParam = (k) => new URLSearchParams(location.search).get(k);

// ---------- small utils ----------
function setText(sel, text) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.textContent = text ?? '';
}
function setHTML(sel, html) {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el) el.innerHTML = html ?? '';
}
function setImg(sel, src, alt = '') {
  const el = typeof sel === 'string' ? $(sel) : sel;
  if (el && src) {
    el.src = src;
    if (alt) el.alt = alt;
  }
}

// ---------- meta/credits block ----------
function ensureMetaBlock() {
  // We want a block just ABOVE the description (#overview)
  const overview = $('#overview') || $('#detail-overview');
  if (!overview) return null;

  let metaWrap = $('#detail-meta');
  if (!metaWrap) {
    metaWrap = document.createElement('div');
    metaWrap.id = 'detail-meta';
    metaWrap.className = 'ct-detail__meta';
    overview.parentNode.insertBefore(metaWrap, overview);
  }

  // Build/ensure individual lines
  const ensureLine = (id) => {
    let p = $(`#${id}`) || metaWrap.querySelector(`#${id}`);
    if (!p) {
      p = document.createElement('p');
      p.id = id;
      p.className = 'meta';
      metaWrap.appendChild(p);
    }
    return p;
  };

  return {
    mediaEl: ensureLine('detail-type'),
    genresEl: ensureLine('detail-genres'),
    dirEl: ensureLine('credit-director'),
    prodEl: ensureLine('credit-producer'),
    starsEl: ensureLine('credit-stars'),
  };
}

function fillMetaCredits(item, raw) {
  const block = ensureMetaBlock();
  if (!block) return;

  // Media + Genres (match Director/Producer/Stars style)
  const genreText = item.genres?.length ? item.genres.join(', ') : '—';
  setHTML(block.mediaEl, `<strong>Media:</strong> ${item.typeLabel || ''}`);
  setHTML(block.genresEl, `<strong>Genre:</strong> ${genreText}`);

  // Credits
  const crew = raw.credits?.crew || [];
  const cast = raw.credits?.cast || [];
  const directors = crew.filter(p => p.job === 'Director').map(p => p.name);
  const producers = crew.filter(p => p.job === 'Producer').map(p => p.name);
  const leads = cast.slice(0, 3).map(a => a.name);

  setHTML(block.dirEl, directors.length ? `<strong>Director:</strong> ${directors.join(', ')}` : '');
  setHTML(block.prodEl, producers.length ? `<strong>Producer:</strong> ${producers.join(', ')}` : '');
  setHTML(block.starsEl, leads.length ? `<strong>Stars:</strong> ${leads.join(', ')}` : '');

  // Hide empty rows
  [block.mediaEl, block.genresEl, block.dirEl, block.prodEl, block.starsEl].forEach(el => {
    if (el && !el.textContent.trim()) el.style.display = 'none';
    else if (el) el.style.display = ''; // ensure visible if filled
  });
}

// ---------- favorites ----------
function getFavs() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
function setFavs(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  try { updateFavCount?.(); } catch {}
}
function inFavs(id, type) {
  return getFavs().some(f => f.id === id && f.type === type);
}
function wireFavoriteButton(item) {
  const btn = $('#fav-btn') || $('#favorite-btn');
  if (!btn) return;

  const updateLabel = () => {
    btn.textContent = inFavs(item.id, item.type) ? 'Remove from Favorites' : 'Add to Favorites';
  };
  updateLabel();

  btn.addEventListener('click', () => {
    const favs = getFavs();
    if (inFavs(item.id, item.type)) {
      setFavs(favs.filter(f => !(f.id === item.id && f.type === item.type)));
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
    }
    updateLabel();
  });
}

// ---------- share ----------
function wireShare(title) {
  const btn = $('#share-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard?.writeText(url);
      alert('Link copied to clipboard');
    } catch {
      alert('Copy this link:\n' + url);
    }
  });
}

// ---------- similar ----------
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

async function renderSimilar(list, type) {
  let grid = $('#similar-grid');
  if (!grid) {
    // create a minimal Similar section if missing
    const main = $('main') || document.body;
    const sec = document.createElement('section');
    sec.innerHTML = `<h2>Similar</h2><div id="similar-grid" class="ct-grid ct-grid--3"></div>`;
    main.appendChild(sec);
    grid = $('#similar-grid');
  }
  const media = await toMediaList(list.slice(0, 12), type);
  grid.innerHTML = media.length ? media.map(mediaCard).join('') : `<p class="meta">No similar titles found.</p>`;
}

// ---------- main render ----------
function renderPrimary(item, raw) {
  // Title, rating, poster, overview — use existing IDs if present
  setText('#title', item.title || raw.title || raw.name || 'Untitled');
  setHTML('#rating', item.rating ? `★ ${item.rating}` : '');
  setImg('#poster', item.poster, `${item.title || 'Poster'}`);

  // If your template has year/runtime spans:
  setText('#year', item.year || '');
  setText('#runtime', item.runtime || '');

  // Overview / description
  setText('#overview', raw.overview || '—');
  setText('#detail-overview', raw.overview || '—'); // support alt id

  // Insert/refresh meta/credits block above description
  fillMetaCredits(item, raw);

  // Wire buttons
  wireFavoriteButton(item);
  wireShare(item.title);
}

// ---------- bootstrap ----------
(async function init() {
  await loadHeaderFooter();

  const id = getParam('id');
  const type = getParam('type') || 'movie';
  if (!id) {
    const main = $('main') || document.body;
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.innerHTML = '<h2>Missing item id.</h2>';
    main.prepend(alert);
    return;
  }

  try {
    // Fetch primary record with credits + similar bundle
    const raw = await tmdb(`${type}/${id}`, { append_to_response: 'credits,similar' });
    const item = await normalizeMedia(raw, type);
    renderPrimary(item, raw);

    // Similar
    const similar = raw.similar?.results || [];
    if (similar.length) {
      await renderSimilar(similar, type);
    } else {
      const grid = $('#similar-grid');
      if (grid) grid.innerHTML = `<p class="meta">No similar titles found.</p>`;
    }
  } catch (err) {
    console.error('Details load error:', err);
    const main = $('main') || document.body;
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.innerHTML = '<h2>Failed to load details. Please try again.</h2>';
    main.prepend(alert);
  }
})();
