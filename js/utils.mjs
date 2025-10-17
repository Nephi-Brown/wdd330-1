// js/utils.mjs
// CineTrack Utilities
// - Header/footer injection with path normalization for nested pages
// - Mobile nav (hamburger)
// - Favorites badge (0 hidden, >99 "99+")
// - Global search routing
// - Active nav highlighting
// - Skeleton loaders
// - Collapsible panel (Filter & Sort)
// - Staggered entrance reveal
// - Card Flip navigation to details
// - Small storage + DOM helpers

/* --------------------------------------
   General helpers
--------------------------------------- */
export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* --------------------------------------
   LocalStorage helpers
--------------------------------------- */
export function getLocalStorage(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}
export function setLocalStorage(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

/* --------------------------------------
   Favorites list + badge
--------------------------------------- */
export function getFavorites() {
  try { return JSON.parse(localStorage.getItem('ct-favorites') || '[]'); }
  catch { return []; }
}
export function setFavorites(list) {
  localStorage.setItem('ct-favorites', JSON.stringify(list));
  try { updateFavCount(); } catch {}
}
export function updateFavCount() {
  const badge = document.getElementById('fav-count');
  if (!badge) return;
  let count = 0;
  try {
    const favs = JSON.parse(localStorage.getItem('ct-favorites') || '[]');
    count = Array.isArray(favs) ? favs.length : 0;
  } catch { count = 0; }

  if (count <= 0) {
    badge.textContent = '';
    badge.style.display = 'none';
  } else {
    badge.style.display = 'grid';
    badge.textContent = count > 99 ? '99+' : String(count);
  }
}

/* --------------------------------------
   Mobile nav (hamburger menu)
--------------------------------------- */
function initMobileNav() {
  const btn = document.getElementById('menu');
  const navwrap = document.getElementById('navwrap');
  if (!btn || !navwrap) return;
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    const open = !navwrap.classList.contains('show');
    navwrap.classList.toggle('show', open);
    btn.classList.toggle('show', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  const DESKTOP_BP = 760;
  const resetForDesktop = () => {
    if (window.innerWidth >= DESKTOP_BP) {
      navwrap.classList.remove('show');
      btn.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    }
  };
  resetForDesktop();
  window.addEventListener('resize', resetForDesktop);
}

/* --------------------------------------
   Normalize header paths for nested pages (/search_results/)
--------------------------------------- */
function normalizeHeaderPaths(headerRoot) {
  if (!headerRoot) return;
  const isNested = location.pathname.includes('/search_results/');
  const prefix = isNested ? '../' : '';

  qsa('a[href]', headerRoot).forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (/^(https?:|mailto:|#|\/)/i.test(href)) return;
    if (isNested && href.startsWith('../')) return;
    a.setAttribute('href', prefix + href);
  });

  qsa('img[src]', headerRoot).forEach(img => {
    const src = img.getAttribute('src');
    if (!src) return;
    if (/^(https?:|data:|\/)/i.test(src)) return;
    if (isNested && src.startsWith('../')) return;
    img.setAttribute('src', prefix + src);
  });
}

/* --------------------------------------
   Global header search
--------------------------------------- */
function initGlobalSearch() {
  const form = document.querySelector('.ct-search');
  const input = document.getElementById('global-search');
  if (!form || !input) return;
  if (form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const isNested = location.pathname.includes('/search_results/');
    const target = isNested
      ? `index.html?q=${encodeURIComponent(q)}`
      : `search_results/index.html?q=${encodeURIComponent(q)}`;
    window.location.href = target;
  });
}

/* --------------------------------------
   Highlight active nav
--------------------------------------- */
function highlightActiveNav() {
  const nav = document.getElementById('navwrap');
  if (!nav) return;
  const links = nav.querySelectorAll('a[href]');
  const current = location.pathname.split('/').pop().toLowerCase();
  const isNested = location.pathname.includes('/search_results/');

  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const filename = href.split('/').pop().toLowerCase();
    link.classList.remove('active');
    if (isNested && current.includes('index.html')) return;
    if (current === filename) link.classList.add('active');
    else if ((current === '' || current === '/') && filename === 'index.html') link.classList.add('active');
  });
}

/* --------------------------------------
   Skeleton helpers
--------------------------------------- */
export function renderSkeletonCards(targetId, count = 6) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const card = () => `
    <div class="card skeleton">
      <div class="card__media">
        <div class="skeleton-box" style="width:100%;"></div>
      </div>
      <div class="card__body">
        <div class="skeleton-line" style="width:70%"></div>
        <div class="skeleton-line" style="width:50%"></div>
      </div>
    </div>`;
  el.innerHTML = Array.from({ length: count }, card).join('');
}
export function renderDetailSkeleton() {
  const poster = document.querySelector('.ct-detail__poster');
  if (poster) poster.innerHTML = `<div class="skeleton-box" style="width:100%;aspect-ratio:2/3;"></div>`;
  const main = document.querySelector('.ct-detail__main');
  if (main) {
    main.innerHTML = `
      <div class="detail-head" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span class="skeleton-avatar"></span>
        <div class="skeleton-title skeleton-box"></div>
      </div>
      <div id="detail-meta" class="ct-detail__meta" style="margin:.75rem 0;">
        <div class="skeleton-meta skeleton-box"></div>
        <div class="skeleton-meta skeleton-box" style="width:55%"></div>
        <div class="skeleton-meta skeleton-box" style="width:60%"></div>
      </div>
      <h3 style="margin:.25rem 0 .25rem;">Description</h3>
      <div class="skeleton-line" style="width:100%"></div>
      <div class="skeleton-line" style="width:95%"></div>
      <div class="skeleton-line" style="width:90%"></div>
      <div class="ct-actions" style="margin-top:1rem">
        <div class="skeleton-box" style="width:160px;height:40px;border-radius:10px;"></div>
        <div class="skeleton-box" style="width:120px;height:40px;border-radius:10px;"></div>
      </div>`;
  }
}

/* --------------------------------------
   Collapsible (Filter & Sort)
--------------------------------------- */
export function bindCollapsible(toggleSel, panelSel) {
  const toggle = document.querySelector(toggleSel);
  const panel = document.querySelector(panelSel);
  if (!toggle || !panel) return;

  // initial state
  toggle.setAttribute('aria-expanded', 'false');
  panel.hidden = true;
  panel.style.overflow = 'hidden';
  panel.style.transition = 'height 0.3s ease, opacity 0.3s ease';
  panel.style.height = '0';
  panel.style.opacity = '0';

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));

    if (!expanded) {
      panel.hidden = false;
      const h = panel.scrollHeight;
      panel.style.height = h + 'px';
      panel.style.opacity = '1';
      setTimeout(() => { panel.style.height = 'auto'; }, 300);
    } else {
      const h = panel.scrollHeight;
      panel.style.height = h + 'px';
      panel.style.opacity = '0';
      requestAnimationFrame(() => { panel.style.height = '0'; });
      setTimeout(() => { panel.hidden = true; }, 300);
    }
  });
}

/* --------------------------------------
   Staggered entrance animation
--------------------------------------- */
export function revealStaggered(containerOrSelector, itemSelector = '.card', stepMs = 60, once = true) {
  const root = typeof containerOrSelector === 'string'
    ? document.querySelector(containerOrSelector)
    : containerOrSelector;
  if (!root) return () => {};

  const items = Array.from(root.querySelectorAll(itemSelector));
  if (!items.length) return () => {};

  items.forEach((el, i) => {
    el.classList.add('reveal-item');
    el.style.setProperty('--stagger', String(i * stepMs));
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-in');
      if (once) io.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });

  items.forEach(el => io.observe(el));
  return () => io.disconnect();
}

/* --------------------------------------
   Card Flip before navigating to details
   (hardened: double RAF, webkit end event, inline animation fallback)
--------------------------------------- */
export function enableCardFlipNavigation({
  selector = '.card',
  durationMs = 380,
  detailsRegex = /(^|\/)details\.html(\?|#|$)/i
} = {}) {
  if (document.documentElement.dataset.ctFlipBound === '1') return;
  document.documentElement.dataset.ctFlipBound = '1';

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href') || '';
    if (!detailsRegex.test(href)) return;

    const targetAttr = anchor.getAttribute('target');
    if (targetAttr && targetAttr.toLowerCase() === '_blank') return;

    // Don’t animate on actual buttons/controls
    if (e.target.closest('.btn,[data-skip-flip]')) return;
    if (prefersReduced) return;

    const card = anchor.matches(selector) ? anchor : anchor.closest(selector) || anchor;
    if (!card || card.classList.contains('skeleton')) return;

    e.preventDefault();

    const rect = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add('ct-flip-clone');

    // Position/size from viewport rect
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.zIndex = '9999';
    // GPU/compositor hints
    clone.style.willChange = 'transform,opacity,filter';
    clone.style.transform = 'translateZ(0)';
    clone.style.backfaceVisibility = 'hidden';
    clone.style.webkitBackfaceVisibility = 'hidden';
    clone.style.transformStyle = 'preserve-3d';
    clone.style.webkitTransformStyle = 'preserve-3d';
    // prevent inner hover transitions on the clone
    clone.querySelectorAll('img').forEach(img => {
      img.style.transition = 'none';
      img.style.transform = 'none';
    });

    const oldVisibility = card.style.visibility;
    card.style.visibility = 'hidden';
    document.body.appendChild(clone);

    // Double RAF so initial styles are committed before starting the animation
    const startAnim = () => {
      const timing = 'cubic-bezier(.22,.61,.36,1)';
      // Inline animation as a fallback even if CSS class fails to apply
      clone.style.animation = `ct-flip-zoom ${durationMs}ms ${timing} forwards`;
      clone.style.webkitAnimation = `ct-flip-zoom ${durationMs}ms ${timing} forwards`;
      clone.classList.add('ct-flip-animate');
    };

    requestAnimationFrame(() => {
      // force layout
      // eslint-disable-next-line no-unused-expressions
      clone.offsetHeight;
      requestAnimationFrame(startAnim);
    });

    const navigate = () => {
      try { clone.remove(); } catch {}
      card.style.visibility = oldVisibility;
      window.location.href = anchor.href;
    };

    const onEnd = () => {
      clearTimeout(fallbackTimer);
      navigate();
    };
    // Some WebKit builds only fire webkitAnimationEnd
    clone.addEventListener('animationend', onEnd, { once: true });
    clone.addEventListener('webkitAnimationEnd', onEnd, { once: true });

    // Fallback in case no event fires
    const fallbackTimer = setTimeout(navigate, durationMs + 150);
  }, true);
}

/* --------------------------------------
   Header / Footer injection
--------------------------------------- */
async function fetchFirst(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: 'no-cache' });
      if (res.ok) return await res.text();
    } catch {}
  }
  return '';
}
export async function loadHeaderFooter() {
  const headerHTML = await fetchFirst([
    'public/partials/header.html',
    '../public/partials/header.html',
    'header.html',
    '../header.html'
  ]);
  const footerHTML = await fetchFirst([
    'public/partials/footer.html',
    '../public/partials/footer.html',
    'footer.html',
    '../footer.html'
  ]);

  const headMount = document.getElementById('main-head');
  const footMount = document.getElementById('main-foot');

  if (headMount) headMount.innerHTML = headerHTML || '';
  if (footMount) footMount.innerHTML = footerHTML || '';

  if (headMount) normalizeHeaderPaths(headMount);

  initMobileNav();
  initGlobalSearch();
  updateFavCount();
  highlightActiveNav();

  // enable flip globally
  enableCardFlipNavigation();
}
export function reinitHeaderUI() {
  const headMount = document.getElementById('main-head');
  if (headMount) normalizeHeaderPaths(headMount);
  initMobileNav();
  initGlobalSearch();
  updateFavCount();
  highlightActiveNav();
  enableCardFlipNavigation();
}
