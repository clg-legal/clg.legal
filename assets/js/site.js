import { initHeader } from './components/header.js';
import { initPhoneInputs } from './components/phone-input.js';
import { initAdsTracking } from './components/ads-tracking.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initPhoneInputs();
  initAdsTracking();
});
