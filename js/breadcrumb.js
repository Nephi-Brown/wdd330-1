document.addEventListener('DOMContentLoaded', () => {
  const crumb = document.getElementById('breadcrumbs');
  if (!crumb) return;

  const path = window.location.pathname;
  const params = new URLSearchParams(location.search);

  const isHome = /^(?:\/|\/index\.html)$/.test(path);

  if (isHome) {
    crumb.style.display = 'none';
    return;
  }

  const getCategoryFromParam = () =>
    params.get('category')?.charAt(0).toUpperCase() +
      params.get('category')?.slice(1) || null;
  const getCategoryFromTitle = () => {
    const h2 = document.querySelector('.product-detail h2');
    if (!h2) return 'Product';

    const text = h2.textContent.toLowerCase();
    const keywords = ['music', 'theatre', 'cinema', 'sport'];

    const match = keywords.find((word) => text.includes(word));

    return match ? match.charAt(0).toUpperCase() + match.slice(1) : 'Product';
  };
  const getCategoryFromList = () =>
    document.querySelector('.product-list')?.dataset?.category || null;

  const rememberCategory = (cat) => {
    if (cat) localStorage.setItem('last-category', cat);
  };
  const recallCategory = () => localStorage.getItem('last-category');

  const setCrumb = (html) => {
    crumb.innerHTML = `<a href="/index.html">Home</a> &gt; ${html}`;
    crumb.style.display = '';
  };

  const isDetail = path.includes('/product_pages/');
  const isCart = path.includes('/cart/');
  const isList = !!document.querySelector('.product-list');

  if (isCart) {
    const category = 'Cart';
    setCrumb(`<span>${category}</span>`);
    return;
  }

  if (isDetail) {
    const category = recallCategory() || 'Products';

    setCrumb(`<span>${category}</span>`);
    return;
  }

  if (isList) {
    const listEl = document.querySelector('.product-list');

    const update = () => {
      const category =
        getCategoryFromParam() ||
        getCategoryFromTitle() ||
        getCategoryFromList() ||
        'Products';

      rememberCategory(category);

      const count = listEl.querySelectorAll('.product-card').length;
      setCrumb(`<span>${category}</span> &gt; <span>(${count} items)</span>`);
    };

    const observer = new MutationObserver(update);
    observer.observe(listEl, { childList: true });

    update(); 
    return;
  }

  crumb.style.display = 'none';
});
