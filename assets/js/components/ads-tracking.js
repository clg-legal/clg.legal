// Google Ads conversions, same as on the old WordPress site.
// The tag and conversion labels come from layouts/partials/google-ads.html (window.clgAds);
// outside the production build for clg.legal they are absent and everything here is a no-op.

function track(...args) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

function getMessenger(href) {
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
    return 'whatsapp';
  }
  if (/^https?:\/\/(t\.me|telegram\.me)\//.test(href)) {
    return 'telegram';
  }
  return null;
}

// Successful form submission (any Netlify form on the site).
export function trackFormConversion() {
  const label = window.clgAds && window.clgAds.formConversion;
  if (label) {
    track('event', 'conversion', { send_to: label });
  }
}

export function initAdsTracking() {
  const config = window.clgAds;
  if (!config) {
    return;
  }

  // Capture phase, so the event is sent before the browser leaves for tel:/messenger.
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link) {
        return;
      }
      const href = link.getAttribute('href') || '';

      if (href.startsWith('tel:')) {
        track('event', 'conversion', { send_to: config.phoneConversion });
        return;
      }

      const messenger = getMessenger(href);
      if (messenger) {
        track('event', 'messenger_click', { messenger });
      }
    },
    true,
  );
}
