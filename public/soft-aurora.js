/**
 * SoftAurora – Standalone WebGL implementation
 * Ported from React Bits SoftAurora component.
 * Zero external dependencies (no OGL or Three.js required).
 */
export function initSoftAurora(containerOrId, options = {}) {
  const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isMobile) {
    container.style.background = 'radial-gradient(circle at 10% 20%, rgba(29, 185, 84, 0.15) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(225, 0, 255, 0.12) 0%, transparent 45%), #0c0c0e';
    return function destroy() {};
  }

  const opts = Object.assign({
    speed: 0.6,
    scale: 1.5,
    brightness: 1.0,
    color1: '#f7f7f7',
    color2: '#e100ff',
    noiseFrequency: 2.5,
    noiseAmplitude: 1.0,
    bandHeight: 0.5,
    bandSpread: 1.0,
    octaveDecay: 0.1,
    layerOffset: 0.0,
    colorSpeed: 1.0,
    enableMouseInteraction: true,
    mouseInfluence: 0.25
  }, options);

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) {
    console.error('WebGL not supported for SoftAurora');
    return;
  }

  // Shaders
  const VERT = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;

    uniform float uTime;
    uniform vec3 uResolution;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uBrightness;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uNoiseFreq;
    uniform float uNoiseAmp;
    uniform float uBandHeight;
    uniform float uBandSpread;
    uniform float uOctaveDecay;
    uniform float uLayerOffset;
    uniform float uColorSpeed;
    uniform vec2 uMouse;
    uniform float uMouseInfluence;
    uniform bool uEnableMouse;

    #define TAU 6.283185307179586

    vec3 gradientHash(vec3 p) {
      p = vec3(
        dot(p, vec3(127.1, 311.7, 234.6)),
        dot(p, vec3(269.5, 183.3, 198.3)),
        dot(p, vec3(169.5, 283.3, 156.9))
      );
      vec3 h = fract(sin(p) * 43758.5453123);
      float phi = acos(2.0 * h.x - 1.0);
      float theta = TAU * h.y;
      return vec3(cos(theta) * sin(phi), sin(theta) * cos(phi), cos(phi));
    }

    float quinticSmooth(float t) {
      float t2 = t * t;
      float t3 = t * t2;
      return 6.0 * t3 * t2 - 15.0 * t2 * t2 + 10.0 * t3;
    }

    vec3 cosineGradient(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
      return a + b * cos(TAU * (c * t + d));
    }

    float perlin3D(float amplitude, float frequency, float px, float py, float pz) {
      float x = px * frequency;
      float y = py * frequency;

      float fx = floor(x); float fy = floor(y); float fz = floor(pz);
      float cx = fx + 1.0;  float cy = fy + 1.0;  float cz = fz + 1.0;

      vec3 g000 = gradientHash(vec3(fx, fy, fz));
      vec3 g100 = gradientHash(vec3(cx, fy, fz));
      vec3 g010 = gradientHash(vec3(fx, cy, fz));
      vec3 g110 = gradientHash(vec3(cx, cy, fz));
      vec3 g001 = gradientHash(vec3(fx, fy, cz));
      vec3 g101 = gradientHash(vec3(cx, fy, cz));
      vec3 g011 = gradientHash(vec3(fx, cy, cz));
      vec3 g111 = gradientHash(vec3(cx, cy, cz));

      float d000 = dot(g000, vec3(x - fx, y - fy, pz - fz));
      float d100 = dot(g100, vec3(x - cx, y - fy, pz - fz));
      float d010 = dot(g010, vec3(x - fx, y - cy, pz - fz));
      float d110 = dot(g110, vec3(x - cx, y - cy, pz - fz));
      float d001 = dot(g001, vec3(x - fx, y - fy, pz - cz));
      float d101 = dot(g101, vec3(x - cx, y - fy, pz - cz));
      float d011 = dot(g011, vec3(x - fx, y - cy, pz - cz));
      float d111 = dot(g111, vec3(x - cx, y - cy, pz - cz));

      float sx = quinticSmooth(x - fx);
      float sy = quinticSmooth(y - fy);
      float sz = quinticSmooth(pz - fz);

      float lx00 = mix(d000, d100, sx);
      float lx10 = mix(d010, d110, sx);
      float lx01 = mix(d001, d101, sx);
      float lx11 = mix(d011, d111, sx);

      float ly0 = mix(lx00, lx10, sy);
      float ly1 = mix(lx01, lx11, sy);

      return amplitude * mix(ly0, ly1, sz);
    }

    float auroraGlow(float t, vec2 shift) {
      // Calculate aspect ratio corrected UV
      vec2 uv = gl_FragCoord.xy / uResolution.y;
      uv += shift;

      float noiseVal = 0.0;
      float freq = uNoiseFreq;
      float amp = uNoiseAmp;
      vec2 samplePos = uv * uScale;

      for (float i = 0.0; i < 3.0; i += 1.0) {
        noiseVal += perlin3D(amp, freq, samplePos.x, samplePos.y, t);
        amp *= uOctaveDecay;
        freq *= 2.0;
      }

      float yBand = uv.y * 10.0 - uBandHeight * 10.0;
      return 0.3 * max(exp(uBandSpread * (1.0 - 1.1 * abs(noiseVal + yBand))), 0.0);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      float t = uSpeed * 0.4 * uTime;

      vec2 shift = vec2(0.0);
      if (uEnableMouse) {
        shift = (uMouse - 0.5) * uMouseInfluence;
      }

      vec3 col = vec3(0.0);
      col += 0.99 * auroraGlow(t, shift) * cosineGradient(uv.x + uTime * uSpeed * 0.2 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.3, 0.20, 0.20)) * uColor1;
      col += 0.99 * auroraGlow(t + uLayerOffset, shift) * cosineGradient(uv.x + uTime * uSpeed * 0.1 * uColorSpeed, vec3(0.5), vec3(0.5), vec3(2.0, 1.0, 0.0), vec3(0.5, 0.20, 0.25)) * uColor2;

      col *= uBrightness;
      float alpha = clamp(length(col), 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `;

  function parseHex(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compileShader(VERT, gl.VERTEX_SHADER);
  const fs = compileShader(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const vertices = new Float32Array([
    -1, -1,
     3, -1,
    -1,  3
  ]);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const posAttr = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  [
    'uTime', 'uResolution', 'uSpeed', 'uScale', 'uBrightness',
    'uColor1', 'uColor2', 'uNoiseFreq', 'uNoiseAmp', 'uBandHeight',
    'uBandSpread', 'uOctaveDecay', 'uLayerOffset', 'uColorSpeed',
    'uMouse', 'uMouseInfluence', 'uEnableMouse'
  ].forEach(name => {
    uniforms[name] = gl.getUniformLocation(prog, name);
  });

  // Set initial uniform values
  gl.uniform1f(uniforms.uSpeed, opts.speed);
  gl.uniform1f(uniforms.uScale, opts.scale);
  gl.uniform1f(uniforms.uBrightness, opts.brightness);
  const [r1, g1, b1] = parseHex(opts.color1);
  const [r2, g2, b2] = parseHex(opts.color2);
  gl.uniform3f(uniforms.uColor1, r1, g1, b1);
  gl.uniform3f(uniforms.uColor2, r2, g2, b2);
  gl.uniform1f(uniforms.uNoiseFreq, opts.noiseFrequency);
  gl.uniform1f(uniforms.uNoiseAmp, opts.noiseAmplitude);
  gl.uniform1f(uniforms.uBandHeight, opts.bandHeight);
  gl.uniform1f(uniforms.uBandSpread, opts.bandSpread);
  gl.uniform1f(uniforms.uOctaveDecay, opts.octaveDecay);
  gl.uniform1f(uniforms.uLayerOffset, opts.layerOffset);
  gl.uniform1f(uniforms.uColorSpeed, opts.colorSpeed);
  gl.uniform2f(uniforms.uMouse, 0.5, 0.5);
  gl.uniform1f(uniforms.uMouseInfluence, opts.mouseInfluence);
  gl.uniform1i(uniforms.uEnableMouse, opts.enableMouseInteraction ? 1 : 0);

  let currentMouse = [0.5, 0.5];
  let targetMouse = [0.5, 0.5];

  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    targetMouse = [
      (e.clientX - rect.left) / rect.width,
      1.0 - (e.clientY - rect.top) / rect.height
    ];
  }

  function handleMouseLeave() {
    targetMouse = [0.5, 0.5];
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3f(uniforms.uResolution, canvas.width, canvas.height, canvas.width / canvas.height);
  }

  window.addEventListener('resize', resize);
  resize();

  if (opts.enableMouseInteraction) {
    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
  }

  let raf;
  const maxFPS = 30;
  const frameDuration = 1000 / maxFPS;
  let lastFrameTime = 0;

  function update(timestamp) {
    // Skip frames to achieve max FPS
    if (timestamp - lastFrameTime < frameDuration) {
      raf = requestAnimationFrame(update);
      return;
    }
    lastFrameTime = timestamp;

    // Pause rendering when tab is hidden
    if (document.hidden) {
      raf = requestAnimationFrame(update);
      return;
    }

    gl.uniform1f(uniforms.uTime, timestamp * 0.001);

    if (opts.enableMouseInteraction) {
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      gl.uniform2f(uniforms.uMouse, currentMouse[0], currentMouse[1]);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(update);
  }

  // Start the throttled animation loop
  raf = requestAnimationFrame(update);

  return function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (opts.enableMouseInteraction) {
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}

if (typeof window !== 'undefined') {
  window.initSoftAurora = initSoftAurora;
}
