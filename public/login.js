import { initVariableProximity } from './variable-proximity.js';
import { initSoftAurora } from './soft-aurora.js';
import { initTrueFocus } from './true-focus.js';
import { initScrambledText } from './scrambled-text.js';

(function () {
  'use strict';

  // Initialize the premium SoftAurora background with performance‑friendly settings
  initSoftAurora('auroraBg', {
    speed: 0.5,
    scale: 1.2,
    brightness: 1.0,
    color1: '#f7f7f7',
    color2: '#e100ff',
    noiseFrequency: 0.5, // further reduced to cut shader workload
    noiseAmplitude: 0.5, // lower amplitude for less computation
    bandHeight: 0.5,
    bandSpread: 0.5,
    octaveDecay: 0.15,
    layerOffset: 0.0,
    colorSpeed: 0.8,
    enableMouseInteraction: true,
    mouseInfluence: 0.2
  });

  // Apply a CSS hint to the aurora canvas for smoother compositor handling
  const auroraCanvas = document.getElementById('auroraBg');
  if (auroraCanvas) {
    auroraCanvas.style.willChange = 'transform, opacity';
    auroraCanvas.style.pointerEvents = 'none';
  }


  const isMobileLogin = window.innerWidth <= 1023 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (!isMobileLogin) {
    // Initialize TrueFocus component (music, sumic.)
    initTrueFocus('trueFocusContainer', {
      sentence: 'music, sumic.',
      separator: ' ',
      manualMode: false,
      blurAmount: 5,
      borderColor: '#1db954',
      glowColor: 'rgba(29, 185, 84, 0.6)',
      animationDuration: 0.5,
      pauseBetweenAnimations: 1.0
    });

    // Initialize ScrambledText component with custom paragraph for sumic streaming app
    initScrambledText('scrambledTextContainer', {
      radius: 100,
      duration: 1.2,
      speed: 0.5,
      scrambleChars: '.:',
      text: 'Sumic redefines how you listen. A distraction-free music streaming experience designed for audiophiles, dreamers, and curators. Built for absolute robustness, seamless stability, and reliable performance.'
    });
  }

  // Initialize VariableProximity on the login page branding
  const brandTitle = document.querySelector('.auth-brand .brand-title');
  if (brandTitle) {
    initVariableProximity(brandTitle, {
      label: 'SUMIC',
      fromFontVariationSettings: "'wght' 300, 'opsz' 8",
      toFontVariationSettings: "'wght' 1000, 'opsz' 40",
      container: document.getElementById('authShell'),
      radius: 220,
      falloff: 'linear'
    });
  }

  // Fluid page transition overlay (CSS lives in styles.css)
  function initFluidPageTransitions() {
    if (document.getElementById('pageTransitionOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pageTransitionOverlay';
    const blob = document.createElement('div');
    blob.id = 'pageTransitionBlob';
    overlay.appendChild(blob);
    document.body.appendChild(overlay);

    // Reveal the login page by fading out the overlay
    requestAnimationFrame(() => {
      setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => { overlay.style.display = 'none'; }, 750);
      }, 100);
    });
  }

  window.triggerPageTransition = function(targetUrl) {
    const overlay = document.getElementById('pageTransitionOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.offsetHeight; // force reflow
      overlay.classList.remove('fade-out');
      setTimeout(() => { window.location.href = targetUrl; }, 850);
    } else {
      window.location.href = targetUrl;
    }
  };

  // Run page transitions on load
  initFluidPageTransitions();

  function setUser(user) {
    localStorage.setItem('sumic_user', JSON.stringify(user));
    if (window.triggerPageTransition) {
      window.triggerPageTransition('/');
    } else {
      window.location.href = '/';
    }
  }

  const loginForm = document.getElementById('loginForm');
  const guestBtn = document.getElementById('guestBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('userName')?.value?.trim();
      const email = document.getElementById('userEmail')?.value?.trim();
      if (!name && !email) {
        alert('Add your name or email to continue');
        return;
      }
      setUser({ name: name || 'Guest', email: email || '', guest: !email });
    });
  }
  
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      setUser({ name: 'Guest', email: '', guest: true });
    });
  }
})();
