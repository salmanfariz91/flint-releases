// The realistic picture: an amber flint crystal standing on dark boulders at dusk.
// It is worked out per pixel on the graphics card (light bends through the crystal and
// bounces inside it, the sky reflects on it, the rocks catch the sunset and the glow).
// scene.js calls window.flintStone.draw(...) every frame. No libraries.
(function () {
  var canvas = document.getElementById('gl');
  if (!canvas) return;
  var gl = null;
  try {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {}
  if (!gl) return;

  var VERT = '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2 uCenter;', // where the crystal's middle sits, in picture dots
    'uniform float uSize;', // picture dots per unit of the scene
    'uniform float uGlow;',
    'uniform float uFade;',
    'uniform float uTime;',
    'uniform vec4 uPl[10];', // the crystal's flat faces: direction and distance from the middle
    'uniform sampler2D uNoise;',
    'uniform mat3 uObj;', // turns a spot in the scene into the same spot on the flint, so its markings move with it
    'out vec4 outColor;',

    'const vec3 BG = vec3(5.0, 5.0, 7.0) / 255.0;',
    'const vec3 KEY = vec3(-0.5145, 0.6860, 0.5145);', // a soft lamp, up and to the left of the viewer
    'const vec3 SUN = vec3(0.0, 0.03, -0.9995);', // the sunset, straight behind
    'const vec3 EYE = vec3(0.0, -0.2, 6.5);',

    'float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    // smooth lumpy noise read from a small random picture (fast)
    'float noise(vec3 x){',
    '  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  vec2 uv = i.xy + vec2(37.0, 17.0) * i.z + f.xy;',
    '  vec2 rg = textureLod(uNoise, (uv + 0.5) / 256.0, 0.0).xy;',
    '  return mix(rg.x, rg.y, f.z);',
    '}',

    // Where a straight line enters (tn, nn) and leaves (tf, nf) the crystal. Exact, no guessing.
    'bool crystal(vec3 ro, vec3 rd, out float tn, out float tf, out vec3 nn, out vec3 nf){',
    '  tn = -1e5; tf = 1e5; nn = vec3(0.0, 1.0, 0.0); nf = nn;',
    '  for(int i = 0; i < 10; i++){',
    '    vec3 n = uPl[i].xyz;',
    '    float dn = dot(rd, n);',
    '    float dist = uPl[i].w - dot(ro, n);',
    '    if(dn < -1e-5){ float t = dist / dn; if(t > tn){ tn = t; nn = n; } }',
    '    else if(dn > 1e-5){ float t = dist / dn; if(t < tf){ tf = t; nf = n; } }',
    '    else if(dist < 0.0){ tn = 1e5; }',
    '  }',
    '  return tn < tf && tf > 0.0;',
    '}',

    'float ell(vec3 p, vec3 c, vec3 r){ return (length((p - c) / r) - 1.0) * min(r.x, min(r.y, r.z)); }',
    'float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }',

    // The boulders: rounded lumps melted together, then roughened.
    'float sdRocks(vec3 p){',
    '  float d = ell(p, vec3(0.15, -1.62, 0.0), vec3(2.0, 0.85, 1.5));', // the middle boulder is high enough that the flint sits in it, not on it
    '  d = smin(d, ell(p, vec3(-2.9, -2.35, 0.5), vec3(1.9, 1.0, 1.4)), 0.3);',
    '  d = smin(d, ell(p, vec3(2.8, -2.3, -0.2), vec3(2.0, 0.95, 1.5)), 0.3);',
    '  d = smin(d, ell(p, vec3(0.4, -2.9, 1.7), vec3(2.6, 0.7, 1.2)), 0.3);',
    '  d = smin(d, ell(p, vec3(-5.6, -2.75, -0.5), vec3(2.3, 0.9, 1.5)), 0.3);',
    '  d = smin(d, ell(p, vec3(5.7, -2.8, 0.3), vec3(2.4, 0.85, 1.5)), 0.3);',
    '  d = smin(d, ell(p, vec3(0.0, -3.3, 0.9), vec3(9.0, 1.0, 3.4)), 0.45);', // a low bed of rock that fills the gaps, so no dark seam shows between the boulders
    '  float n = noise(p * 1.25) * 0.5 + noise(p * 2.6) * 0.25 + noise(p * 5.3) * 0.125;',
    '  return d - (n - 0.40) * 0.62;',
    '}',
    'float sdRocksFine(vec3 p){ return sdRocks(p) - noise(p * 11.0) * 0.035 - noise(p * 24.0) * 0.014; }',

    'vec3 sky(vec3 d){',
    '  float h = d.y;',
    '  vec3 c = mix(vec3(0.62, 0.24, 0.08), vec3(0.15, 0.06, 0.20), smoothstep(0.0, 0.07, h));',
    '  c = mix(c, vec3(0.028, 0.022, 0.095), smoothstep(0.04, 0.20, h));',
    '  c = mix(c, vec3(0.0008, 0.0008, 0.0013), smoothstep(0.14, 0.46, h));',
    '  c += vec3(1.0, 0.5, 0.2) * pow(max(dot(d, SUN), 0.0), 60.0) * 0.45;',
    '  return c;',
    '}',

    // What a mirror would see in a given direction: the sky, the dark ground, and the lamp.
    'vec3 env(vec3 d){',
    '  vec3 c = d.y >= 0.0 ? sky(d) : mix(vec3(0.012, 0.011, 0.025), sky(vec3(d.x, 0.0, d.z)) * 0.5, exp(d.y * 7.0));',
    '  float k = max(dot(d, KEY), 0.0);',
    '  c += vec3(1.0, 0.93, 0.85) * (pow(k, 60.0) * 7.0 + pow(k, 5.0) * 0.22);',
    '  c += vec3(0.30, 0.27, 0.40) * smoothstep(0.1, 1.0, d.z) * 0.5;', // soft room light from the viewer's side, so the near faces have something to mirror
    '  return c;',
    '}',

    // How far a point is outside the flint (below zero means inside).
    'float flintDist(vec3 p){',
    '  float d = -1e5;',
    '  for(int i = 0; i < 10; i++) d = max(d, dot(p, uPl[i].xyz) - uPl[i].w);',
    '  return d;',
    '}',

    // The flint as a real stone: the icon's outline, but with rounded corners, lumpy sides and the
    // shallow scooped scars left where flakes were knocked off. Returns how far a point is outside it.
    'float sdFlint(vec3 p){',
    '  float d = -1e5;',
    '  for(int i = 0; i < 10; i++){',
    '    float s = dot(p, uPl[i].xyz) - uPl[i].w;',
    '    float h = clamp(0.5 + 0.5 * (s - d) / 0.014, 0.0, 1.0);',
    '    d = mix(d, s, h) + 0.014 * h * (1.0 - h);', // the logo's flat faces, with a hair-thin bevel on each cut edge
    '  }',
    '  vec3 o = uObj * p;',
    '  float lump = noise(o * 1.6 + 3.0);',
    '  float scar = noise(o * 3.6 + 11.0);',
    '  d -= (lump - 0.5) * 0.004 + (scar - 0.5) * 0.002;', // polished faces are almost, but never perfectly, flat
    '  return d;',
    '}',
    'float sdFlintFine(vec3 p){ vec3 o = uObj * p; return sdFlint(p) - noise(o * 9.0) * 0.0022; }',

    // The flint as a polished amber crystal in the logo's shape. It is cloudy inside, not clear glass:
    // bright gold where it is thin, deep amber where it is thick, with a mirror-like polished surface.
    'vec3 shadeFlint(vec3 p, vec3 rd){',
    '  vec2 e = vec2(0.003, -0.003);',
    '  vec3 n = normalize(e.xyy * sdFlintFine(p + e.xyy) + e.yyx * sdFlintFine(p + e.yyx) + e.yxy * sdFlintFine(p + e.yxy) + e.xxx * sdFlintFine(p + e.xxx));',
    // how much crystal the line of sight passes through
    '  float tn; float tf; vec3 nn; vec3 nf;',
    '  float thick = crystal(EYE, rd, tn, tf, nn, nf) ? max(tf - tn, 0.0) : 0.15;',
    // how close this spot is to an edge between two faces
    '  float first = 1e5; float gap = 1e5;', // the nearest face is the one we are on; the second nearest tells how close an edge is
    '  for(int i = 0; i < 10; i++){ float s = uPl[i].w - dot(p, uPl[i].xyz); if(s < first){ gap = first; first = s; } else if(s < gap){ gap = s; } }',
    '  float edge = 1.0 - smoothstep(0.0, 0.05, gap);',
    '  float cosi = max(dot(-rd, n), 0.0);',
    '  float fres = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);',
    // body colour
    '  float depth = 1.0 - exp(-thick * 1.7);',
    '  vec3 body = mix(vec3(0.72, 0.30, 0.04), vec3(0.24, 0.05, 0.005), depth);',
    '  float wrap = 0.35 + 0.65 * (dot(n, KEY) * 0.5 + 0.5);', // light soaks in, so the shaded side is never black
    '  vec3 col = body * (wrap * 0.52 +vec3(0.25, 0.22, 0.40) * (0.5 + 0.5 * n.y) * 0.30);',
    // light bent inside and thrown back by the far faces: this is what shows the facets within
    '  vec3 ri = refract(rd, n, 1.0 / 1.55);',
    '  float an; float af; vec3 na; vec3 nb;',
    '  crystal(p - n * 0.004, ri, an, af, na, nb);',
    '  vec3 back = reflect(ri, -nb);',
    '  vec3 leave = refract(ri, -nb, 1.55);',
    '  vec3 seen = dot(leave, leave) > 0.01 ? env(leave) : env(back);',
    '  col += (seen * 1.0 + env(back) * 0.35) * exp(-max(af, 0.0) * vec3(0.45, 1.70, 4.60));',
    // the sunset glowing through the thin parts
    '  col += vec3(1.0, 0.42, 0.10) * exp(-thick * 2.0) * pow(max(dot(rd, SUN), 0.0), 2.0) * 0.9;',
    // polished surface: reflections, a sharp glint, and bright cut edges
    '  col = mix(col, env(reflect(rd, n)), fres);',
    '  vec3 h = normalize(KEY - rd);',
    '  col += vec3(1.0, 0.97, 0.92) * pow(max(dot(n, h), 0.0), 140.0) * 2.2;',
    '  col += vec3(1.0, 0.86, 0.60) * edge * edge * 0.16 * (0.4 + 0.6 * wrap);',
    '  float seat = smoothstep(-0.05, 0.50, sdRocks(p));', // darker where it sits in the rock
    '  return col * mix(0.30, 1.0, seat);',
    '}',

    'vec3 shadeRocks(vec3 p, vec3 rd, float t){',
    '  vec2 e = vec2(0.006, -0.006);',
    '  vec3 n = normalize(e.xyy * sdRocksFine(p + e.xyy) + e.yyx * sdRocksFine(p + e.yyx) + e.yxy * sdRocksFine(p + e.yxy) + e.xxx * sdRocksFine(p + e.xxx));',
    '  float grain = noise(p * 16.0);',
    '  vec3 base = mix(vec3(0.045, 0.050, 0.090), vec3(0.110, 0.105, 0.165), noise(p * 2.4)) * (0.7 + 0.6 * grain);',
    '  float ao = clamp(sdRocks(p + n * 0.22) / 0.22, 0.0, 1.0) * clamp(sdRocks(p + n * 0.7) / 0.7 + 0.3, 0.0, 1.0);',
    '  ao = 0.3 + 0.7 * ao;', // hollows stay readable, never pitch black
    '  vec3 lit = vec3(0.16, 0.18, 0.42) * (0.5 + 0.5 * n.y);', // sky from above
    // the flint throws a shadow on the rock, and the rock is darker right where they touch
    '  float tn; float tf; vec3 na; vec3 nb;',
    '  float shade = crystal(p + n * 0.03, KEY, tn, tf, na, nb) ? 0.18 : 1.0;',
    '  float touch = 0.35 + 0.65 * smoothstep(0.0, 0.55, flintDist(p));',
    '  lit += vec3(0.40, 0.44, 0.80) * max(dot(n, KEY), 0.0) * 0.55 * shade;', // cool lamp on the near side
    '  lit += vec3(1.0, 0.42, 0.14) * pow(max(dot(n, normalize(vec3(0.0, 0.35, -1.0))), 0.0), 1.5) * 1.8;', // sunset on the far edges
    '  vec3 toCrystal = vec3(0.0, -0.35, 0.0) - p;',
    '  float dist = length(toCrystal);',
    '  lit += vec3(1.0, 0.52, 0.16) * max(dot(n, toCrystal / dist), 0.0) * 0.45 / (1.0 + dist * dist * 2.5);', // warm light bounced off the flint
    '  vec3 col = base * lit * ao * touch;',
    '  vec3 r = reflect(rd, n);',
    '  col += vec3(1.0, 0.55, 0.25) * pow(max(dot(r, SUN), 0.0), 9.0) * 0.20 * ao;',
    '  col += sky(vec3(r.x, abs(r.y), r.z)) * pow(1.0 - max(dot(-rd, n), 0.0), 4.0) * 0.14 * ao;',
    '  return mix(col, vec3(0.20, 0.085, 0.14), 1.0 - exp(-max(t - 6.5, 0.0) * 0.10));', // far rocks sink into the haze
    '}',

    'void main(){',
    '  vec2 q = (gl_FragCoord.xy - uCenter) / uSize;',
    '  vec3 rd = normalize(vec3(q, 0.0) - EYE);',
    '  vec3 col;',
    '  float tRock = 1e5;',

    // what is behind the crystal: sky, water, or rocks
    '  if(rd.y >= 0.0){',
    '    col = sky(rd);',
    '  } else {',
    '    float t = max(4.0, 0.12 / -rd.y);', // nothing rocky is higher than this, so start looking here
    '    bool found = false;',
    '    if(t < 16.0){',
    '      for(int i = 0; i < 60; i++){',
    '        float d = sdRocks(EYE + rd * t);',
    '        if(d < 0.0015 * t){ found = true; break; }',
    '        t += d * 0.72;',
    '        if(t > 16.0) break;',
    '      }',
    '    }',
    '    if(found){',
    '      tRock = t;',
    '      col = shadeRocks(EYE + rd * t, rd, t);',
    '    } else {',
    // still water behind the rocks, mirroring the sky
    '      float wob = (noise(vec3(rd.x * 40.0 / -rd.y, 6.0 / -rd.y, uTime * 0.3)) - 0.5) * 0.03;',
    '      col = sky(vec3(rd.x, -rd.y + wob + 0.004, rd.z)) * mix(0.14, 0.7, pow(1.0 - min(-rd.y * 5.0, 1.0), 3.0));',
    '    }',
    '  }',

    // the flint: step along the line of sight until it touches the stone
    '  float b = dot(EYE, rd);',
    '  float disc = b * b - (dot(EYE, EYE) - 1.75 * 1.75);', // only look inside a ball that holds the whole stone
    '  if(disc > 0.0){',
    '    float t = -b - sqrt(disc);',
    '    float tEnd = -b + sqrt(disc);',
    '    float nearest = 1e5;',
    '    float tNear = t;',
    '    bool hit = false;',
    '    for(int i = 0; i < 64; i++){',
    '      float d = sdFlint(EYE + rd * t);',
    '      if(d < nearest){ nearest = d; tNear = t; }',
    '      if(d < 0.0018){ hit = true; break; }',
    '      t += d * 0.7;',
    '      if(t > tEnd) break;',
    '    }',
    '    float tt = hit ? t : tNear;',
    // a line that only just misses still tints its dot a little, which keeps the outline smooth
    '    float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.5 / uSize, nearest);',
    '    if(cover > 0.0 && tt < tRock) col = mix(col, shadeFlint(EYE + rd * tt, rd), cover);',
    '  }',

    '  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);',
    '  col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));',
    '  float keep = smoothstep(-4.0, -2.3, q.y) * uFade;',
    '  col = mix(BG, col, keep);',
    '  col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;', // hides colour steps in the sky
    '  outColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn('Flint scene: ' + gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = shader(gl.VERTEX_SHADER, VERT);
  var fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    if (window.console) console.warn('Flint scene: ' + gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['uCenter', 'uSize', 'uGlow', 'uFade', 'uTime', 'uPl', 'uNoise', 'uObj'].forEach(function (name) {
    U[name] = gl.getUniformLocation(prog, name);
  });

  // A small random picture the roughness of the rocks is read from.
  (function () {
    var N = 256;
    var seed = 1234567;
    var base = new Uint8Array(N * N);
    for (var i = 0; i < N * N; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      base[i] = (seed >>> 24) & 255;
    }
    var data = new Uint8Array(N * N * 4);
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        var k = (y * N + x) * 4;
        data[k] = base[y * N + x];
        data[k + 1] = base[((y + 17) & 255) * N + ((x + 37) & 255)];
        data[k + 3] = 255;
      }
    }
    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.uniform1i(U.uNoise, 0);
  })();

  // The crystal has the shape of the Flint icon: the icon's five outer corners, with five
  // faces rising to a point at the front (the icon's middle) and five more to a point at the back.
  var faces = [];
  (function () {
    var ring = [
      [-0.106, 1.131],
      [0.856, 0.275],
      [0.575, -0.9],
      [-0.575, -1.112],
      [-0.956, 0.062],
    ];
    [0.56, -0.46].forEach(function (depth) {
      for (var i = 0; i < 5; i++) {
        var a = ring[i];
        var b = ring[(i + 1) % 5];
        // the flat face through two neighbouring corners and the point
        var ux = b[0] - a[0];
        var uy = b[1] - a[1];
        var vx = -a[0];
        var vy = -a[1];
        var nx = uy * depth;
        var ny = -ux * depth;
        var nz = ux * vy - uy * vx;
        var l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= l;
        ny /= l;
        nz /= l;
        var h = nx * a[0] + ny * a[1];
        if (h < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
          h = -h;
        }
        faces.push([nx, ny, nz, h]);
      }
    });
  })();
  var planes = new Float32Array(40);

  // The picture is drawn at most a little sharper than the screen. If frames come slowly
  // it steps down so the page stays smooth on modest graphics cards.
  var detail = Math.min(window.devicePixelRatio || 1, 1.25);
  var W = 0;
  var H = 0;
  var lost = false;
  var blank = true;
  var slow = 0;
  var last = 0;

  function fit() {
    W = window.innerWidth;
    H = window.innerHeight;
    // Never draw more than about 1.7 million dots per frame, however large the screen is.
    var used = Math.min(detail, Math.sqrt(1700000 / Math.max(1, W * H)));
    canvas.width = Math.max(2, Math.round(W * used));
    canvas.height = Math.max(2, Math.round(H * used));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    lost = true;
    document.documentElement.classList.remove('gl');
    window.flintStone = null;
  });

  fit();
  window.addEventListener('resize', fit);
  document.documentElement.classList.add('gl');

  window.flintStone = {
    // cx, cy: middle of the crystal on screen. size: screen dots per scene unit. fade: 0 hidden to 1 shown.
    draw: function (cx, cy, size, fade, rot, glow, time) {
      if (lost) return;
      if (fade < 0.004) {
        if (!blank) {
          gl.clearColor(5 / 255, 5 / 255, 7 / 255, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          blank = true;
        }
        last = 0;
        return;
      }
      blank = false;

      var now = performance.now();
      if (last) {
        slow = now - last > 42 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 40 && detail > 0.4) {
          detail *= 0.75;
          slow = 0;
          fit();
        }
      }
      last = now;

      // turn the crystal, with a small lean so it never looks perfectly upright
      var c = Math.cos(rot);
      var s = Math.sin(rot);
      var lean = 0.14;
      var cl = Math.cos(lean);
      var sl = Math.sin(lean);
      for (var i = 0; i < 10; i++) {
        var f = faces[i];
        var x = f[0] * c + f[2] * s;
        var z = -f[0] * s + f[2] * c;
        planes[i * 4] = x * cl - f[1] * sl;
        planes[i * 4 + 1] = x * sl + f[1] * cl;
        planes[i * 4 + 2] = z;
        planes[i * 4 + 3] = f[3];
      }
      gl.uniform4fv(U.uPl, planes);
      // the reverse of that turn, as three columns: scene spot -> spot on the flint
      gl.uniformMatrix3fv(U.uObj, false, [c * cl, -sl, s * cl, c * sl, cl, s * sl, -s, 0, c]);

      var sx = canvas.width / W;
      var sy = canvas.height / H;
      gl.uniform2f(U.uCenter, cx * sx, (H - cy) * sy);
      gl.uniform1f(U.uSize, size * sy);
      gl.uniform1f(U.uGlow, glow);
      gl.uniform1f(U.uFade, fade);
      gl.uniform1f(U.uTime, time % 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
})();
