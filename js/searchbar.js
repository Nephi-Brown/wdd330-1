// Now the search button exists in the DOM
const searchInput = document.querySelector('#item-search');
const searchButton = document.querySelector('#search-button');

searchButton.addEventListener('click', () => {
    const term = searchInput.value.trim();
    if (term) {
        window.location.href = `../search_results/index.html?query=${encodeURIComponent(term)}`;
    }
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const term = searchInput.value.trim();
        if (term) {
            window.location.href = `../search_results/index.html?query=${encodeURIComponent(term)}`;
        }
    }
});
