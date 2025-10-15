document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const successMessage = document.getElementById('success-message');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    formData.get('name');
    formData.get('email');
    formData.get('phone');

    form.classList.add('hidden');

    successMessage.classList.remove('hidden');
  });
});
