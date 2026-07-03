/**
 * MetaBalls Logo – Vanilla JS (ported from React Bits MetaBalls component)
 * Renders an interactive metaball WebGL animation inside a container element.
 * No external dependencies required — uses raw WebGL2.
 */
(function () {
  'use strict';

  /* ── helpers ── */
  function parseHex(hex) {
    const c = hex.replace('#', '');
    return [
      parseInt(c.substring(0, 2), 16) / 255,
      parseInt(c.substring(2, 4), 16) / 255,
      parseInt(c.substring(4, 6), 16) / 255
    ];
  }

  function fract(x) { return x - Math.floor(x); }

  function hash31(p) {
    let r = [p * 0.1031, p * 0.103, p * 0.0973].map(fract);
    const yzx = [r[1], r[2], r[0]];
    const d = r[0] * (yzx[0] + 33.33) + r[1] * (yzx[1] + 33.33) + r[2] * (yzx[2] + 33.33);
    return r.map(v => fract(v + d));
  }

  function hash33(v) {
    let p = [v[0] * 0.1031, v[1] * 0.103, v[2] * 0.0973].map(fract);
    const yxz = [p[1], p[0], p[2]];
    const d = p[0] * (yxz[0] + 33.33) + p[1] * (yxz[1] + 33.33) + p[2] * (yxz[2] + 33.33);
    p = p.map(v => fract(v + d));
    const xxy = [p[0], p[0], p[1]];
    const yxx = [p[1], p[0], p[0]];
    const zyx = [p[2], p[1], p[0]];
    return [0, 1, 2].map(i => fract((xxy[i] + yxx[i]) * zyx[i]));
  }

  /* ── shaders ── */
  const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 position;
void main(){ gl_Position=vec4(position,0.0,1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
out vec4 outColor;

float mb(vec2 c,float r,vec2 p){
  vec2 d=p-c; return (r*r)/dot(d,d);
}

void main(){
  float scale=iAnimationSize/iResolution.y;
  vec2 coord=(gl_FragCoord.xy-iResolution.xy*0.5)*scale;
  vec2 mW=(iMouse.xy-iResolution.xy*0.5)*scale;
  float m1=0.0;
  for(int i=0;i<50;i++){
    if(i>=iBallCount) break;
    m1+=mb(iMetaBalls[i].xy,iMetaBalls[i].z,coord);
  }
  float m2=mb(mW,iCursorBallSize,coord);
  float total=m1+m2;
  float f=smoothstep(-1.0,1.0,(total-1.3)/min(1.0,fwidth(total)));
  vec3 cF=vec3(0.0);
  if(total>0.0){
    cF=iColor*(m1/total)+iCursorColor*(m2/total);
  }
  outColor=vec4(cF*f, enableTransparency ? f : 1.0);
}`;

  /* ── init ── */
  function initMetaBallsLogo(container, opts) {
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isMobile) {
      const gradId = 'logo-grad-' + Math.random().toString(36).substring(2, 9);
      container.innerHTML = `
        <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; display: block;">
          <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--primary, #1db954)"/>
              <stop offset="100%" stop-color="var(--primary-dark, #1ed760)"/>
            </linearGradient>
          </defs>
          <rect x="20" y="35" width="8" height="30" rx="4" fill="url(#${gradId})"/>
          <rect x="35" y="20" width="8" height="60" rx="4" fill="url(#${gradId})"/>
          <rect x="50" y="10" width="8" height="80" rx="4" fill="url(#${gradId})"/>
          <rect x="65" y="25" width="8" height="50" rx="4" fill="url(#${gradId})"/>
          <rect x="80" y="40" width="8" height="20" rx="4" fill="url(#${gradId})"/>
        </svg>
      `;
      return function destroy() {};
    }

    opts = Object.assign({
      color: '#b0b0b0',
      cursorBallColor: '#e0e0e0',
      cursorBallSize: 2,
      ballCount: 10,
      animationSize: 20,
      enableMouseInteraction: true,
      enableTransparency: true,
      hoverSmoothness: 0.05,
      clumpFactor: 0.8,
      speed: 0.3
    }, opts);

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.borderRadius = 'inherit';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    if (!gl) { container.textContent = '𝄞'; return; }
    gl.clearColor(0, 0, 0, 0);

    /* compile shader */
    function mkShader(src, type) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = mkShader(VERT, gl.VERTEX_SHADER);
    const fs = mkShader(FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) { container.textContent = '𝄞'; return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      container.textContent = '𝄞';
      return;
    }
    gl.useProgram(prog);

    /* full-screen triangle */
    const verts = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    /* uniforms */
    const loc = {};
    ['iResolution', 'iTime', 'iMouse', 'iColor', 'iCursorColor',
      'iAnimationSize', 'iBallCount', 'iCursorBallSize', 'iClumpFactor', 'enableTransparency'
    ].forEach(n => loc[n] = gl.getUniformLocation(prog, n));

    const ballLocs = [];
    for (let i = 0; i < 50; i++) ballLocs.push(gl.getUniformLocation(prog, `iMetaBalls[${i}]`));

    const [r1, g1, b1] = parseHex(opts.color);
    const [r2, g2, b2] = parseHex(opts.cursorBallColor);
    gl.uniform3f(loc.iColor, r1, g1, b1);
    gl.uniform3f(loc.iCursorColor, r2, g2, b2);
    gl.uniform1f(loc.iAnimationSize, opts.animationSize);
    gl.uniform1i(loc.iBallCount, opts.ballCount);
    gl.uniform1f(loc.iCursorBallSize, opts.cursorBallSize);
    gl.uniform1f(loc.iClumpFactor, opts.clumpFactor);
    gl.uniform1i(loc.enableTransparency, opts.enableTransparency ? 1 : 0);

    /* ball params */
    const maxBalls = Math.min(opts.ballCount, 50);
    const balls = [];
    for (let i = 0; i < maxBalls; i++) {
      const h1 = hash31(i + 1);
      const st = h1[0] * 2 * Math.PI;
      const dtF = 0.1 * Math.PI + h1[1] * 0.3 * Math.PI;
      const baseS = 4 + h1[1] * 4;
      const h2 = hash33(h1);
      const tog = Math.floor(h2[0] * 2);
      const rad = 0.8 + h2[2] * 1.8;
      balls.push({ st, dtF, baseS, tog, rad });
    }

    let mx = 0, my = 0, bx = 0, by = 0, inside = false;

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * (window.devicePixelRatio || 1);
      canvas.height = h * (window.devicePixelRatio || 1);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform3f(loc.iResolution, canvas.width, canvas.height, 0);
    }

    function onMove(e) {
      if (!opts.enableMouseInteraction) return;
      const r = container.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * canvas.width;
      my = (1 - (e.clientY - r.top) / r.height) * canvas.height;
    }
    function onEnter() { inside = true; }
    function onLeave() { inside = false; }

    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerenter', onEnter);
    container.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);
    resize();

    const t0 = performance.now();
    let raf;

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const elapsed = (t - t0) * 0.001;
      gl.uniform1f(loc.iTime, elapsed);

      for (let i = 0; i < maxBalls; i++) {
        const b = balls[i];
        const dt = elapsed * opts.speed * b.dtF;
        const th = b.st + dt;
        const px = Math.cos(th) * b.baseS * opts.clumpFactor;
        const py = Math.sin(th + dt * b.tog) * b.baseS * opts.clumpFactor;
        gl.uniform3f(ballLocs[i], px, py, b.rad);
      }

      let tx, ty;
      if (inside) { tx = mx; ty = my; }
      else {
        const cx = canvas.width * 0.5, cy = canvas.height * 0.5;
        tx = cx + Math.cos(elapsed * opts.speed) * canvas.width * 0.15;
        ty = cy + Math.sin(elapsed * opts.speed) * canvas.height * 0.15;
      }
      bx += (tx - bx) * opts.hoverSmoothness;
      by += (ty - by) * opts.hoverSmoothness;
      gl.uniform3f(loc.iMouse, bx, by, 0);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    raf = requestAnimationFrame(frame);

    return function destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerenter', onEnter);
      container.removeEventListener('pointerleave', onLeave);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }

  /* auto-init when DOM is ready */
  function boot() {
    const el = document.getElementById('metaballsLogo');
    if (el) initMetaBallsLogo(el, {
      color: '#b0b0b0',
      cursorBallColor: '#e0e0e0',
      cursorBallSize: 2,
      ballCount: 10,
      animationSize: 20,
      enableMouseInteraction: true,
      enableTransparency: true,
      hoverSmoothness: 0.05,
      clumpFactor: 0.8,
      speed: 0.3
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
