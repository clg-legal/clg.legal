// Sends a Netlify Form via fetch and reports the result in the form's [data-form-status] element.
export async function submitForm(form) {
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');

  const showStatus = (state, text) => {
    if (!status) {
      return;
    }
    status.dataset.state = state;
    status.textContent = text;
    status.hidden = false;
  };

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
    showStatus('success', form.dataset.success || '');
  } catch (error) {
    console.error(error);
    showStatus('error', form.dataset.error || '');
  } finally {
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = false;
    }
  }
}
