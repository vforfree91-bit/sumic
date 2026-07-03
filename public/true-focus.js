/**
 * TrueFocus – Standalone Vanilla JS implementation
 * Ported from React Bits TrueFocus component.
 * Uses high-performance CSS transitions for animations (no framer-motion dependency).
 */
export function initTrueFocus(containerOrId, options = {}) {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  const opts = Object.assign({
    sentence: 'music, sumic.',
    separator: ' ',
    manualMode: false,
    blurAmount: 5,
    borderColor: '#1db954',
    glowColor: 'rgba(29, 185, 84, 0.6)',
    animationDuration: 0.5,
    pauseBetweenAnimations: 1.0
  }, options);

  // Add styles
  const styleId = 'true-focus-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .focus-container {
        position: relative;
        display: flex;
        gap: 0.5em;
        justify-content: center;
        align-items: center;
        flex-wrap: nowrap;
        white-space: nowrap;
        outline: none;
        user-select: none;
        padding: 20px;
      }
      .focus-word {
        position: relative;
        font-family: 'Orbitron', 'Inter', sans-serif;
        font-size: clamp(1.8rem, 3.8vw, 3.4rem);
        font-weight: 900;
        cursor: pointer;
        transition: filter var(--anim-duration, 0.5s) ease, color var(--anim-duration, 0.5s) ease;
        outline: none;
        user-select: none;
        color: rgba(255, 255, 255, 0.2);
      }
      .focus-word.active {
        color: #ffffff;
      }
      .focus-frame {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        box-sizing: border-box;
        border: none;
        transition: transform var(--anim-duration, 0.5s) cubic-bezier(0.25, 1, 0.5, 1),
                    width var(--anim-duration, 0.5s) cubic-bezier(0.25, 1, 0.5, 1),
                    height var(--anim-duration, 0.5s) cubic-bezier(0.25, 1, 0.5, 1),
                    opacity var(--anim-duration, 0.5s) ease;
        transform: translate(0, 0);
        will-change: transform, width, height;
      }
      .focus-frame .corner {
        position: absolute;
        width: 1rem;
        height: 1rem;
        border: 3px solid var(--border-color, #1db954);
        filter: drop-shadow(0px 0px 6px var(--glow-color, rgba(29, 185, 84, 0.6)));
        border-radius: 3px;
      }
      .focus-frame .top-left {
        top: -8px;
        left: -8px;
        border-right: none;
        border-bottom: none;
      }
      .focus-frame .top-right {
        top: -8px;
        right: -8px;
        border-left: none;
        border-bottom: none;
      }
      .focus-frame .bottom-left {
        bottom: -8px;
        left: -8px;
        border-right: none;
        border-top: none;
      }
      .focus-frame .bottom-right {
        bottom: -8px;
        right: -8px;
        border-left: none;
        border-top: none;
      }
    `;
    document.head.appendChild(style);
  }

  const words = opts.sentence.split(opts.separator);
  container.innerHTML = '';
  container.className = 'focus-container';
  container.style.setProperty('--anim-duration', `${opts.animationDuration}s`);

  const wordSpans = [];
  words.forEach((word, idx) => {
    const span = document.createElement('span');
    span.className = 'focus-word';
    span.style.filter = `blur(${opts.blurAmount}px)`;
    span.textContent = word;
    container.appendChild(span);
    wordSpans.push(span);
  });

  const frame = document.createElement('div');
  frame.className = 'focus-frame';
  frame.style.setProperty('--border-color', opts.borderColor);
  frame.style.setProperty('--glow-color', opts.glowColor);
  frame.style.opacity = '0';
  
  ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(c => {
    const corner = document.createElement('span');
    corner.className = `corner ${c}`;
    frame.appendChild(corner);
  });
  
  container.appendChild(frame);

  let currentIndex = 0;
  let lastActiveIndex = null;
  let intervalId = null;

  function updateFocus(index) {
    if (index === null || index === -1 || !wordSpans[index]) {
      frame.style.opacity = '0';
      return;
    }

    wordSpans.forEach((span, idx) => {
      if (idx === index) {
        span.classList.add('active');
        span.style.filter = 'blur(0px)';
      } else {
        span.classList.remove('active');
        span.style.filter = `blur(${opts.blurAmount}px)`;
      }
    });

    const parentRect = container.getBoundingClientRect();
    const activeRect = wordSpans[index].getBoundingClientRect();

    const x = activeRect.left - parentRect.left;
    const y = activeRect.top - parentRect.top;
    const width = activeRect.width;
    const height = activeRect.height;

    frame.style.transform = `translate(${x}px, ${y}px)`;
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.opacity = '1';
  }

  // Handle Resize to keep frame positioned correctly
  const resizeObserver = new ResizeObserver(() => {
    updateFocus(currentIndex);
  });
  resizeObserver.observe(container);

  if (opts.manualMode) {
    wordSpans.forEach((span, idx) => {
      span.addEventListener('mouseenter', () => {
        lastActiveIndex = idx;
        currentIndex = idx;
        updateFocus(idx);
      });
    });

    container.addEventListener('mouseleave', () => {
      currentIndex = lastActiveIndex;
      updateFocus(lastActiveIndex);
    });
  } else {
    // Auto Mode loop
    function startAutoPlay() {
      intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % words.length;
        updateFocus(currentIndex);
      }, (opts.animationDuration + opts.pauseBetweenAnimations) * 1000);
    }
    
    startAutoPlay();
  }

  // Initial render
  setTimeout(() => updateFocus(currentIndex), 50);

  // Recalculate focus position after fonts load (to prevent layout shifts leaving focus frame misaligned)
  if (document.fonts) {
    document.fonts.ready.then(() => {
      updateFocus(currentIndex);
    });
  }

  return function destroy() {
    if (intervalId) clearInterval(intervalId);
    resizeObserver.disconnect();
  };
}
