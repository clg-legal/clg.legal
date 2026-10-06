// Shared helpers for Netlify Forms: status messages and fetch submission.
// Message texts live in a hidden [data-form-messages] block inside the form (data/contact_form.yaml).

function getMessage(form, key) {
  const node = form.querySelector(`[data-form-messages] [data-msg="${key}"]`);
  return node ? node.textContent.trim() : '';
}

export function showStatus(form, state, key) {
  const status = form.querySelector('[data-form-status]');
  if (!status) {
    return;
  }
  status.dataset.state = state;
  status.textContent = getMessage(form, key);
  status.hidden = false;
}

// Reports a validation problem: shows the message, marks the field and moves focus to it.
export function showFieldError(form, field, key) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
  showStatus(form, 'error', key);
  if (field instanceof HTMLElement) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

export async function submitForm(form) {
  const submit = form.querySelector('[type="submit"]');

  form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));

  const pageInput = form.querySelector('input[name="page"]');
  if (pageInput instanceof HTMLInputElement) {
    pageInput.value = window.location.href;
  }

  if (submit instanceof HTMLButtonElement) {
    submit.disabled = true;
  }

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });

    if (!response.ok) {
      throw new Error(`Form submit failed: ${response.status}`);
    }

    form.reset();
    showStatus(form, 'success', 'success');
  } catch (error) {
    console.error(error);
    showStatus(form, 'error', 'error');
  } finally {
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = false;
    }
  }
}
