const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LdmYxwtAAAAAFMf0Z5mT6252Zvh7ivt3FV3Agfn';

let loaded = false;
let loading = null;

function loadScript() {
  if (loaded) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    const existing = document.querySelector('script[src*="recaptcha/api.js"]');
    if (existing) { loaded = true; resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.onload = () => { loaded = true; resolve(); };
    script.onerror = () => {
      console.warn('reCAPTCHA no disponible, continuando sin ella');
      loaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function getRecaptchaToken(action = 'submit') {
  if (!SITE_KEY) return '';
  try {
    await loadScript();
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.grecaptcha) { resolve(''); return; }
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(SITE_KEY, { action }).then(resolve);
      });
    });
  } catch {
    return '';
  }
}
