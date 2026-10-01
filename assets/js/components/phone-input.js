const PREFIX = '+38 ';
const MAX_DIGITS = 10;

function extractDigits(raw) {
  let digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+38')) {
    // Our own static prefix.
    digits = digits.slice(2);
  } else if (digits.length > MAX_DIGITS && digits.startsWith('38')) {
    // Pasted number with the country code, e.g. 380675991234.
    digits = digits.slice(2);
  }

  return digits.slice(0, MAX_DIGITS);
}

function format(digits) {
  const [a, b, c, d] = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ];

  let result = PREFIX;
  if (a) result += `(${a}`;
  if (b) result += `) ${b}`;
  if (c) result += `-${c}`;
  if (d) result += `-${d}`;
  return result;
}

export function isPhoneComplete(input) {
  return extractDigits(input.value).length === MAX_DIGITS;
}

function placeCaretAtEnd(input) {
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

function bindPhoneInput(input) {
  input.setAttribute('maxlength', String(format('0'.repeat(MAX_DIGITS)).length));
  input.setAttribute('inputmode', 'numeric');

  const apply = () => {
    input.value = format(extractDigits(input.value));
  };

  input.addEventListener('focus', () => {
    if (!input.value) {
      input.value = PREFIX;
    }
    requestAnimationFrame(() => placeCaretAtEnd(input));
  });

  input.addEventListener('blur', () => {
    // Leave the field empty (placeholder visible) when nothing but the prefix is there.
    if (extractDigits(input.value).length === 0) {
      input.value = '';
    }
  });

  input.addEventListener('keydown', (event) => {
    const { selectionStart, selectionEnd } = input;
    const collapsed = selectionStart === selectionEnd;

    // The prefix is static: never let it be deleted.
    if (event.key === 'Backspace' && collapsed && selectionStart <= PREFIX.length) {
      event.preventDefault();
    }
    if (event.key === 'Delete' && collapsed && selectionStart < PREFIX.length) {
      event.preventDefault();
    }
  });

  input.addEventListener('input', () => {
    apply();
    placeCaretAtEnd(input);
  });

  input.addEventListener('click', () => {
    if (input.selectionStart < PREFIX.length && input.value.length >= PREFIX.length) {
      placeCaretAtEnd(input);
    }
  });
}

export function initPhoneInputs() {
  document.querySelectorAll('input[type="tel"]').forEach(bindPhoneInput);
}
