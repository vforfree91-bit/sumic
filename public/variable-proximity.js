export function initVariableProximity(elementOrId, options = {}) {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) return;

  const label = options.label || element.textContent || '';
  const fromFontVariationSettings = options.fromFontVariationSettings || "'wght' 400, 'opsz' 8";
  const toFontVariationSettings = options.toFontVariationSettings || "'wght' 1000, 'opsz' 40";
  const radius = options.radius ?? 100;
  const falloff = options.falloff || 'linear';

  // Find container
  const container = options.container || element.parentElement || document.body;

  // Set font family
  element.classList.add('variable-proximity');

  // Split label into letters/words
  element.innerHTML = '';
  const words = label.split(' ');
  const letterRefs = [];

  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';

    word.split('').forEach((letter, letterIdxInWord) => {
      const letterSpan = document.createElement('span');
      letterSpan.style.display = 'inline-block';
      letterSpan.style.fontVariationSettings = fromFontVariationSettings;
      letterSpan.style.transition = 'font-variation-settings 0.15s ease-out';
      letterSpan.textContent = letter;

      // Keep the brand color styling for the first two letters of "SUMIC" or "Sumic"
      if (wordIndex === 0 && letterIdxInWord < 2) {
        letterSpan.style.color = 'var(--primary)';
        letterSpan.style.webkitTextFillColor = 'var(--primary)';
      }

      wordSpan.appendChild(letterSpan);
      letterRefs.push(letterSpan);
    });

    element.appendChild(wordSpan);

    if (wordIndex < words.length - 1) {
      const spaceSpan = document.createElement('span');
      spaceSpan.style.display = 'inline-block';
      spaceSpan.innerHTML = '&nbsp;';
      element.appendChild(spaceSpan);
    }
  });

  const mousePos = { x: -9999, y: -9999 };
  let active = true;

  const updatePosition = (clientX, clientY) => {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mousePos.x = clientX - rect.left;
    mousePos.y = clientY - rect.top;
  };

  const onMouseMove = (e) => updatePosition(e.clientX, e.clientY);
  const onTouchMove = (e) => {
    if (e.touches.length > 0) {
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Settings Parser
  const parseSettings = (settingsStr) => {
    const map = new Map();
    settingsStr.split(',').forEach(s => {
      const trimmed = s.trim();
      const parts = trimmed.split(' ');
      if (parts.length >= 2) {
        const name = parts[0].replace(/['"]/g, '');
        const val = parseFloat(parts[1]);
        map.set(name, val);
      }
    });
    return map;
  };

  const fromSettings = parseSettings(fromFontVariationSettings);
  const toSettings = parseSettings(toFontVariationSettings);

  const parsedSettings = Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
    axis,
    fromValue,
    toValue: toSettings.get(axis) ?? fromValue
  }));

  const calculateFalloff = (distance) => {
    const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
    if (falloff === 'exponential') {
      return norm ** 2;
    } else if (falloff === 'gaussian') {
      return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
    } else {
      return norm;
    }
  };

  let frameId = null;
  const lastMousePos = { x: null, y: null };

  // Optimized animation loop with frame‑rate throttling and page‑visibility handling
  const maxFPS = 30;
  const frameDuration = 1000 / maxFPS;
  let lastFrameTime = 0;

  const loop = (timestamp) => {
    if (!active) return;
    if (document.hidden) {
      // Pause updates when tab is hidden to save CPU/GPU
      frameId = requestAnimationFrame(loop);
      return;
    }
    if (timestamp - lastFrameTime < frameDuration) {
      // Throttle to maxFPS
      frameId = requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = timestamp;

    if (lastMousePos.x === mousePos.x && lastMousePos.y === mousePos.y) {
      frameId = requestAnimationFrame(loop);
      return;
    }
    lastMousePos.x = mousePos.x;
    lastMousePos.y = mousePos.y;

    const containerRect = container.getBoundingClientRect();

    letterRefs.forEach((letterSpan) => {
      const rect = letterSpan.getBoundingClientRect();
      const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
      const letterCenterY = rect.top + rect.height / 2 - containerRect.top;

      const distance = Math.hypot(mousePos.x - letterCenterX, mousePos.y - letterCenterY);

      if (distance >= radius) {
        letterSpan.style.fontVariationSettings = fromFontVariationSettings;
        return;
      }

      const falloffValue = calculateFalloff(distance);
      const newSettings = parsedSettings
        .map(({ axis, fromValue, toValue }) => {
          const val = fromValue + (toValue - fromValue) * falloffValue;
          return `'${axis}' ${val}`;
        })
        .join(', ');

      letterSpan.style.fontVariationSettings = newSettings;
    });

    frameId = requestAnimationFrame(loop);
  };

  // Start loop with timestamp for throttling
  frameId = requestAnimationFrame(loop);

  // Hint for compositor to anticipate changes on the proximity letters
  element.style.willChange = 'font-variation-settings';

  return function destroy() {
    active = false;
    if (frameId) cancelAnimationFrame(frameId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
  };
}

if (typeof window !== 'undefined') {
  window.initVariableProximity = initVariableProximity;
}
