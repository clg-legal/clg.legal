import { isPhoneComplete } from './phone-input.js';
import { submitForm } from './form-submit.js';

export function initCasesCta() {
  initCasesCarousel();
  initCasesForm();
}

function initCasesCarousel() {
  const carousel = document.querySelector('[data-cases-carousel]');
  const track = document.querySelector('[data-cases-track]');
  const prevButton = document.querySelector('[data-cases-prev]');
  const nextButton = document.querySelector('[data-cases-next]');
  const pagination = document.querySelector('[data-cases-pagination]');

  if (!carousel || !track) {
    return;
  }

  const originalSlides = Array.from(track.querySelectorAll('.cases-cta__slide'));

  if (!originalSlides.length) {
    return;
  }

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cloneSlides = (slides, position) => {
    slides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.classList.add('cases-cta__slide--clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.dataset.clonePosition = position;

      if (position === 'before') {
        track.insertBefore(clone, track.firstChild);
      } else {
        track.appendChild(clone);
      }
    });
  };

  cloneSlides(originalSlides, 'before');
  cloneSlides(originalSlides, 'after');

  const slideCount = originalSlides.length;
  let isLoopJump = false;

  const getScrollStep = () => {
    const slide = originalSlides[0];

    if (!slide) {
      return track.clientWidth;
    }

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');

    return slide.getBoundingClientRect().width + gap;
  };

  const getSetWidth = () => getScrollStep() * slideCount;

  const scrollToOriginalIndex = (index, behavior = 'auto') => {
    track.scrollTo({
      left: getSetWidth() + index * getScrollStep(),
      behavior,
    });
  };

  const getActiveOriginalIndex = () => {
    const step = getScrollStep();
    const setWidth = getSetWidth();
    const relativeScroll = track.scrollLeft - setWidth;
    const index = Math.round(relativeScroll / step);

    return ((index % slideCount) + slideCount) % slideCount;
  };

  const jumpLoopIfNeeded = () => {
    if (isLoopJump) {
      return;
    }

    const setWidth = getSetWidth();
    const maxOriginalScroll = setWidth * 2;
    const edgeThreshold = step => step * 0.25;

    const step = getScrollStep();
    const threshold = edgeThreshold(step);

    if (track.scrollLeft <= threshold) {
      isLoopJump = true;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft += setWidth;
      track.style.scrollBehavior = '';
      isLoopJump = false;
      return;
    }

    if (track.scrollLeft >= maxOriginalScroll - threshold) {
      isLoopJump = true;
      track.style.scrollBehavior = 'auto';
      track.scrollLeft -= setWidth;
      track.style.scrollBehavior = '';
      isLoopJump = false;
    }
  };

  const dots = originalSlides.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'cases-cta__dot';
    dot.setAttribute('aria-label', `Перейти до слайду ${index + 1}`);
    dot.addEventListener('click', () => {
      scrollToOriginalIndex(index, prefersReducedMotion() ? 'auto' : 'smooth');
    });
    pagination?.appendChild(dot);
    return dot;
  });

  const scrollByStep = (direction) => {
    track.scrollBy({
      left: direction * getScrollStep(),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  const updatePagination = () => {
    if (!dots.length) {
      return;
    }

    const activeIndex = getActiveOriginalIndex();

    dots.forEach((dot, index) => {
      dot.classList.toggle('is-active', index === activeIndex);
    });
  };


  const scheduleLoopJump = () => {
    if ('onscrollend' in window) {
      return;
    }

    window.clearTimeout(scheduleLoopJump.timer);
    scheduleLoopJump.timer = window.setTimeout(jumpLoopIfNeeded, 150);
  };

  prevButton?.addEventListener('click', () => scrollByStep(-1));
  nextButton?.addEventListener('click', () => scrollByStep(1));
  track.addEventListener('scroll', () => {
    updatePagination();
    scheduleLoopJump();
  }, { passive: true });
  track.addEventListener('scrollend', jumpLoopIfNeeded);

  window.addEventListener('resize', () => {
    const activeIndex = getActiveOriginalIndex();
    scrollToOriginalIndex(activeIndex, 'auto');
    updatePagination();
  });

  requestAnimationFrame(() => {
    scrollToOriginalIndex(0, 'auto');
    updatePagination();
  });
}

function initCasesForm() {
  const forms = document.querySelectorAll('[data-cases-form]');

  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const nameInput = form.querySelector('input[name="name"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const personType = form.querySelector('select[name="person-type"]');
      const agreeInput = form.querySelector('input[name="agree"]');

      if (!(nameInput instanceof HTMLInputElement) || !nameInput.value.trim()) {
        nameInput?.focus();
        return;
      }

      if (!(phoneInput instanceof HTMLInputElement) || !isPhoneComplete(phoneInput)) {
        phoneInput?.focus();
        return;
      }

      if (!(personType instanceof HTMLSelectElement) || !personType.value) {
        personType?.focus();
        return;
      }

      if (!(agreeInput instanceof HTMLInputElement) || !agreeInput.checked) {
        agreeInput?.focus();
        return;
      }

      submitForm(form);
    });
  });
}
