import { loadHeaderFooter, getLocalStorage, setLocalStorage } from './utils.mjs';

function card(item){
  return `
  <div class="card">
    <img class="card__img" src="${item.poster}" alt="${item.title}">
    <div class="card__body">
      <h3>${item.title}</h3>
      <p class="meta">${item.year || ''} — ${item.type.toUpperCase()}</p>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <a class="btn btn--ghost" href="/details.html?id=${item.id}&type=${item.type}">Details</a>
        <button class="btn btn--primary" data-remove="${item.id}|${item.type}">Remove</button>
      </div>
    </div>
  </div>`;
}

function render(){
  const grid = document.getElementById('fav-grid');
  const list = getLocalStorage('ct-favorites') || [];
  if (!list.length){
    grid.innerHTML = `<p>You haven’t added anything yet.</p>`;
    return;
  }
  grid.innerHTML = list.map(card).join('');
}

function wire(){
  document.getElementById('fav-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const [id, type] = btn.dataset.remove.split('|');
    const list = (getLocalStorage('ct-favorites') || []).filter(x => !(String(x.id)===String(id) && x.type===type));
    setLocalStorage('ct-favorites', list);
    render();
  });
}

(async function(){
  await loadHeaderFooter();
  render();
  wire();
})();
