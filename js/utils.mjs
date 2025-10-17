// js/utils.mjs
// CineTrack Utilities
// Handles header/footer injection, responsive nav, active link highlighting,
// favorites badge, and global search behavior.

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
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/* --------------------------------------
   Favorites badge logic
--------------------------------------- */
export function updateFavCount() {
  const badge = document.getElementById('fav-count');
  if (!badge) return;

  let count = 0;
  try {
    const favs = JSON.parse(localStorage.getItem('ct-favorites') || '[]');
    count = Array.isArray(favs) ? favs.length : 0;
  } catch {
    count = 0;
  }

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

  if (btn.dataset.bound === '1') return; // avoid rebinding
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
   Normalize header paths for nested pages
   (so links & images work inside /search_results/)
--------------------------------------- */
function normalizeHeaderPaths(headerRoot) {
  if (!headerRoot) return;

  const isNested = location.pathname.includes('/search_results/');
  const prefix = isNested ? '../' : '';

  // Fix <a> links
  qsa('a[href]', headerRoot).forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (/^(https?:|mailto:|#|\/)/i.test(href)) return; // ignore absolute, anchors, or root paths
    if (isNested && href.startsWith('../')) return;     // already prefixed
    a.setAttribute('href', prefix + href);
  });

  // Fix <img> sources
  qsa('img[src]', headerRoot).forEach(img => {
    const src = img.getAttribute('src');
    if (!src) return;
    if (/^(https?:|data:|\/)/i.test(src)) return;       // ignore absolute or root paths
    if (isNested && src.startsWith('../')) return;
    img.setAttribute('src', prefix + src);
  });
}

/* --------------------------------------
   Global header search (works on all pages)
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
   Highlight active navigation link
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

    // Don’t highlight anything on search results pages
    if (isNested && current.includes('index.html')) return;

    if (current === filename) {
      link.classList.add('active');
    } else if ((current === '' || current === '/') && filename === 'index.html') {
      link.classList.add('active');
    }
  });
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
  // Works from both root and nested pages
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

  // Fix relative paths if inside nested folders
  if (headMount) normalizeHeaderPaths(headMount);

  // Initialize interactive elements
  initMobileNav();
  initGlobalSearch();
  updateFavCount();
  highlightActiveNav();
}

/* --------------------------------------
   Optional: manual re-init if header/footer swapped dynamically
--------------------------------------- */
export function reinitHeaderUI() {
  const headMount = document.getElementById('main-head');
  if (headMount) normalizeHeaderPaths(headMount);
  initMobileNav();
  initGlobalSearch();
  updateFavCount();
  highlightActiveNav();
}
