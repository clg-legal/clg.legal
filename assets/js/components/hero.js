import { isPhoneComplete } from './phone-input.js';
import { showFieldError, submitForm } from './form-submit.js';

export function initHero() {
  const form = document.querySelector('[data-hero-form]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const phoneInput = form.querySelector('input[type="tel"]');
    if (!(phoneInput instanceof HTMLInputElement) || !isPhoneComplete(phoneInput)) {
      showFieldError(form, phoneInput, 'phone');
      return;
    }

    submitForm(form);
  });
}
