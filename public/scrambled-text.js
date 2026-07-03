/**
 * ScrambledText – Standalone Vanilla JS implementation
 * Ported from React Bits ScrambledText component.
 * Uses high-performance vanilla pointer events and custom animation loops (no GSAP/SplitText required).
 */
export function initScrambledText(containerOrId, options = {}) {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  const opts = Object.assign({
    radius: 120,
    duration: 1.2,
    speed: 0.5,
    scrambleChars: '.:*#@%$!&',
    text: 'Sumic redefines how you listen. A distraction-free music streaming experience designed for audiophiles, dreamers, and curators. Search and stream millions of tracks instantly with premium sound quality, real-time synced lyrics, and ambient visual backdrops.'
  }, options);

  // Add styles
  const styleId = 'scrambled-text-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .scrambled-text-block {
        max-width: 600px;
        font-family: 'JetBrains Mono', monospace;
        font-size: clamp(14px, 1.2vw, 18px);
        line-height: 1.8;
        color: rgba(255, 255, 255, 0.7);
        user-select: none;
        pointer-events: auto;
      }
      .scrambled-char {
        display: inline-block;
        will-change: transform;
        transition: color 0.15s ease;
      }
      .scrambled-char.scrambling {
        color: #1db954;
      }
    `;
    document.head.appendChild(style);
  }

  container.className = 'scrambled-text-block';
  container.innerHTML = '';

  const paragraph = document.createElement('p');
  container.appendChild(paragraph);

  const charSpans = [];
  const words = opts.text.split(' ');
  words.forEach((word, wordIdx) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'scrambled-word';
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';

    const chars = word.split('');
    chars.forEach(char => {
      const span = document.createElement('span');
      span.className = 'scrambled-char';
      span.textContent = char;
      span.dataset.original = char;
      wordSpan.appendChild(span);
      charSpans.push(span);
    });

    paragraph.appendChild(wordSpan);

    if (wordIdx < words.length - 1) {
      paragraph.appendChild(document.createTextNode(' '));
    }
  });

  // Track active animation states for each span to avoid double-triggers
  const activeAnimations = new Map();

  function triggerScramble(span, distance) {
    if (activeAnimations.has(span)) return;

    const originalText = span.dataset.original;
    // Speed maps to interval tick rate
    const tickRate = 50 / opts.speed; // higher speed = lower delay
    const totalTicks = Math.max(5, Math.floor((opts.duration * 1000) / tickRate));
    let currentTick = 0;

    span.classList.add('scrambling');

    const intervalId = setInterval(() => {
      currentTick++;
      if (currentTick >= totalTicks) {
        clearInterval(intervalId);
        span.textContent = originalText;
        span.classList.remove('scrambling');
        activeAnimations.delete(span);
      } else {
        // Scramble with a random character
        const randomIndex = Math.floor(Math.random() * opts.scrambleChars.length);
        span.textContent = opts.scrambleChars[randomIndex];
      }
    }, tickRate);

    activeAnimations.set(span, intervalId);
  }

  function handlePointerMove(e) {
    charSpans.forEach(span => {
      const rect = span.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < opts.radius) {
        triggerScramble(span, dist);
      }
    });
  }

  // Throttled pointermove handler to limit scrambles per animation frame
  let pendingEvent = null;
  const onPointerMoveThrottled = (e) => {
    if (pendingEvent) return; // already scheduled
    pendingEvent = e;
    requestAnimationFrame(() => {
      handlePointerMove(pendingEvent);
      pendingEvent = null;
    });
  };

  window.addEventListener('pointermove', onPointerMoveThrottled);

  return function destroy() {
    window.removeEventListener('pointermove', handlePointerMove);
    activeAnimations.forEach((intervalId) => clearInterval(intervalId));
  };
}
