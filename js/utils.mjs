import ProductData from "./ExternalServices.mjs";

// qs: querySelector wrapper
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

// LocalStorage helpers (kept behavior for 'so-cart')
export function getLocalStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return key === 'so-cart' ? (Array.isArray(data) ? data : []) : data;
  } catch {
    return key === 'so-cart' ? [] : null;
  }
}
export function setLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Click helper
export function setClick(selector, callback) {
  const el = qs(selector);
  if (!el) return;
  el.addEventListener('touchend', (event) => { event.preventDefault(); callback(); });
  el.addEventListener('click', callback);
}

// URL param
export function getParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Render helpers
export function renderListWithTemplate(templateFn, parentElement, list, position = 'afterbegin', clear = false) {
  const parent = typeof parentElement === 'string' ? document.querySelector(parentElement) : parentElement;
  if (!parent) return;
  if (clear) parent.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) {
    parent.insertAdjacentHTML(position, '<p>No results found.</p>');
    return;
  }
  const htmlStrings = list.map(templateFn);
  parent.insertAdjacentHTML(position, htmlStrings.join(''));
}

export function renderWithTemplate(templateFn, parentElement, callback) {
  parentElement.innerHTML = templateFn;
  if (callback) callback();
}

export async function loadTemplate(path) {
  const res = await fetch(path);
  return await res.text();
}

/* === Header/Footer loader (robust path fallbacks) ===
   Looks for /partials/header.html (preferred),
   then ./header.html, then ../partials/header.html */
async function tryFetch(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) return await res.text();
    } catch(_) {}
  }
  return null;
}

export async function loadHeaderFooter() {
  const headerElement = document.querySelector("#main-head") || document.body.prepend(document.createElement('div'));
  const footerElement = document.querySelector("#main-foot") || document.body.append(document.createElement('div'));

  // header
  const headerHTML = await tryFetch([
    "/partials/header.html", "./partials/header.html", "../partials/header.html", "./header.html", "../header.html"
  ]);
  if (headerHTML) {
    (document.querySelector("#main-head") || document.body.firstElementChild).outerHTML =
      `<div id="main-head">${headerHTML}</div>`;
  }

  // footer
  const footerHTML = await tryFetch([
    "/partials/footer.html", "./partials/footer.html", "../partials/footer.html", "./footer.html", "../footer.html"
  ]);
  if (footerHTML) {
    (document.querySelector("#main-foot") || document.body.lastElementChild).outerHTML =
      `<div id="main-foot">${footerHTML}</div>`;
  }

  // init year
  const currentYearElement = document.getElementById("currentyear");
  if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();

  // init mobile nav toggle
  const mainnavWrap = document.getElementById('navwrap');
  const hamButton = document.getElementById('menu');
  if (hamButton && mainnavWrap) {
    hamButton.setAttribute('aria-expanded', 'false');
    hamButton.addEventListener('click', () => {
      const isOpen = mainnavWrap.classList.toggle('show');
      hamButton.classList.toggle('show', isOpen);
      hamButton.setAttribute('aria-expanded', String(isOpen));
    });
    const DESKTOP_BP = 760;
    const resetForDesktop = () => {
      if (window.innerWidth >= DESKTOP_BP) {
        mainnavWrap.classList.add('show');
        hamButton.classList.remove('show');
        hamButton.setAttribute('aria-expanded', 'true');
      } else {
        mainnavWrap.classList.remove('show');
        hamButton.setAttribute('aria-expanded', 'false');
      }
    };
    resetForDesktop();
    window.addEventListener('resize', resetForDesktop);
  }
}

// Legacy cart-related helpers (safe no-ops if not present)
export function updateCartBadge() {
  const cart = getLocalStorage('so-cart') || [];
  const badge = document.querySelector('.cart-count');
  if (!badge) return;
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  badge.textContent = totalCount;
  if (totalCount > 0) badge.classList.remove('hide');
  else badge.classList.add('hide');
}
export function bounceCartIcon() {
  const cartIcon = document.querySelector('.cart');
  if (!cartIcon) return;
  cartIcon.classList.remove('cart-bounce');
  void cartIcon.offsetWidth;
  cartIcon.classList.add('cart-bounce');
}

// Alerts
export function alertMessage(message, scroll = true) {
  const alert = document.createElement('div');
  const main = document.querySelector('main');
  alert.classList.add('alert');
  alert.innerHTML = `<h2>${message}</h2><button id='alert-close'>&times;</button>`;
  alert.addEventListener('click', function(e) {
    if(e.target.id === 'alert-close') { main.removeChild(this); }
  });
  main.prepend(alert);
  if(scroll) window.scrollTo(0,0);
}

export function removeAllAlerts() {
  const alerts = document.querySelectorAll(".alert");
  alerts.forEach((alert) => document.querySelector("main").removeChild(alert));
}
