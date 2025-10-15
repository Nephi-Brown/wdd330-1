import { loadHeaderFooter } from './utils.mjs';
import { getLocalStorage, setLocalStorage } from './utils.mjs';

async function init() {
  await loadHeaderFooter(); // wait for header/footer to load

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
}

init();

// Logic for the Welcome Modal for the first visit

window.addEventListener('DOMContentLoaded', () => {
  // Select modal elements in HTML
  const modalOverlay = document.getElementById('welcome-modal-overlay');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Define a unique key to use in localStorage
  const visitedKey = getLocalStorage('hasVisitedBefore');

  function showModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
    }
  }

  function hideModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  }

  // Checks if the 'hasVisitedBefore' key DOES NOT exist in localStorage
  if (!visitedKey) {
    // If it doesn't exist, it's the first visit.

    setTimeout(showModal, 300);

    setLocalStorage('hasVisitedBefore', 'true');
  }

  if (modalOverlay && closeModalBtn) {
    closeModalBtn.addEventListener('click', hideModal);

    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        hideModal();
      }
    });
  }
});
