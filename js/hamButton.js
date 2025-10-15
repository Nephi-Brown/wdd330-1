/*const mainnav = document.querySelector('.navigation');
const hamButton = document.querySelector('#menu');

hamButton.addEventListener('click', () => {
    mainnav.classList.toggle('show');
    hamButton.classList.toggle('show');
});*/

const mainnav = document.querySelector('.navigation');
const hamButton = document.querySelector('#menu');

if (mainnav && hamButton) {
  // a11y: reflect state
  hamButton.setAttribute('aria-expanded', 'false');

  hamButton.addEventListener('click', () => {
    const isOpen = mainnav.classList.toggle('show');
    hamButton.classList.toggle('show', isOpen);
    hamButton.setAttribute('aria-expanded', String(isOpen));
  });

  // Reset mobile state when resizing to desktop
  const DESKTOP_BP = 760; // matches your CSS media query
  const resetForDesktop = () => {
    if (window.innerWidth >= DESKTOP_BP) {
      mainnav.classList.remove('show');
      hamButton.classList.remove('show');
      hamButton.setAttribute('aria-expanded', 'false');
    }
  };

  // run once on load + on resize
  resetForDesktop();
  window.addEventListener('resize', resetForDesktop);
}
