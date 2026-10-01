import { isPhoneComplete } from './phone-input.js';

export function initHero() {
  const form = document.querySelector('[data-hero-form]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const phoneInput = form.querySelector('input[type="tel"]');
    if (!(phoneInput instanceof HTMLInputElement) || !isPhoneComplete(phoneInput)) {
      phoneInput?.focus();
      return;
    }

    // Placeholder until backend / Netlify Forms integration is added.
    console.info('Hero form submitted:', phoneInput.value.trim());
  });
}
