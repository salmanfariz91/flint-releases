// The moving scene behind the page: a faceted flint stone on a rock, drifting sparks that
// follow the pointer, a glowing cursor trail, and optional sound. No libraries.
(function () {
  var back = document.getElementById('scene');
  var front = document.getElementById('fx');
  if (!back || !back.getContext) return;
  var ctx = back.getContext('2d');
  var fx = front.getContext('2d');

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var whisper = document.querySelector('.whisper');

  var W = 0;
  var H = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [back, front].forEach(function (c) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  // ---- small maths ----

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function mix(a, b, t) {
    return a + (b - a) * t;
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function unit(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  // Turns points and triangles into faces whose normals point outward.
  function build(verts, tris) {
    return tris.map(function (f) {
      var a = verts[f[0]];
      var b = verts[f[1]];
      var c = verts[f[2]];
      var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      var v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      var n = unit([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
      var cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) n = [-n[0], -n[1], -n[2]];
      return { p: [a, b, c], n: n, c: cen };
    });
  }

  // ---- the flint stone: two uneven rings of five points between a top and a bottom tip ----

  var TAU = Math.PI * 2;
  var shard = (function () {
    var r = rng(7);
    var v = [[0.06, 1.28, 0]];
    var i, a, rad;
    for (i = 0; i < 5; i++) {
      a = (i * TAU) / 5 + 0.3;
      rad = 0.72 + r() * 0.16;
      v.push([Math.cos(a) * rad, 0.2 + r() * 0.22, Math.sin(a) * rad]);
    }
    for (i = 0; i < 5; i++) {
      a = ((i + 0.5) * TAU) / 5 + 0.3;
      rad = 0.5 + r() * 0.14;
      v.push([Math.cos(a) * rad, -0.6 + r() * 0.2, Math.sin(a) * rad]);
    }
    v.push([-0.08, -1.2, 0.05]);
    var t = [];
    for (i = 0; i < 5; i++) {
      var u1 = 1 + i;
      var u2 = 1 + ((i + 1) % 5);
      var l1 = 6 + i;
      var l2 = 6 + ((i + 1) % 5);
      t.push([0, u1, u2], [u1, l1, u2], [u2, l1, l2], [11, l2, l1]);
    }
    return build(v, t);
  })();

  // ---- the rock it stands on: a squashed, uneven dome ----

  var rock = (function () {
    var r = rng(21);
    var n = 8;
    var v = [[0, 0.42, 0]];
    var rings = [
      [0.25, 0.62],
      [-0.05, 1.0],
      [-0.5, 1.1],
    ];
    rings.forEach(function (ring, k) {
      for (var i = 0; i < n; i++) {
        var a = ((i + k * 0.5) * TAU) / n;
        var rad = ring[1] + (r() - 0.5) * 0.24;
        v.push([Math.cos(a) * rad * 1.75, (ring[0] + (r() - 0.5) * 0.12) * 0.62, Math.sin(a) * rad * 1.15]);
      }
    });
    var t = [];
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      t.push([0, 1 + i, 1 + j]);
      for (var k = 0; k < 2; k++) {
        var top = 1 + k * n;
        var low = 1 + (k + 1) * n;
        t.push([top + i, low + i, top + j], [top + j, low + i, low + j]);
      }
    }
    return build(v, t);
  })();

  var LIGHT = unit([-0.5, 0.8, 0.7]);
  var ROCK_LIGHT = unit([0.2, 0.9, 0.35]);
  var RAMP = [
    [0, 92, 44, 6],
    [0.3, 184, 106, 16],
    [0.55, 224, 154, 42],
    [0.75, 245, 181, 68],
    [0.9, 251, 210, 122],
    [1, 255, 244, 214],
  ];

  function shardColor(n, facing, open) {
    if (!facing) return 'rgb(255,' + Math.round(110 + open * 90) + ',' + Math.round(30 + open * 40) + ')';
    var t = 0.12 + 0.88 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    var i = 1;
    while (i < RAMP.length - 1 && RAMP[i][0] < t) i++;
    var a = RAMP[i - 1];
    var b = RAMP[i];
    var k = (t - a[0]) / (b[0] - a[0]);
    var cool = Math.max(0, -n[1]) * 0.4; // faces that look down pick up the purple sky
    var red = mix(mix(a[1], b[1], k), 112, cool);
    var green = mix(mix(a[2], b[2], k), 84, cool);
    var blue = mix(mix(a[3], b[3], k), 200, cool);
    return 'rgb(' + Math.round(red) + ',' + Math.round(green) + ',' + Math.round(blue) + ')';
  }

  function rockColor(n) {
    var d = Math.max(0, n[0] * ROCK_LIGHT[0] + n[1] * ROCK_LIGHT[1] + n[2] * ROCK_LIGHT[2]);
    var warm = d * d * d * 0.4;
    return (
      'rgb(' +
      Math.round(mix(8, 40, d) + 110 * warm) +
      ',' +
      Math.round(mix(7, 31, d) + 48 * warm) +
      ',' +
      Math.round(mix(14, 70, d) + 10 * warm) +
      ')'
    );
  }

  // Draws a shape turned by ry (around) and rx (tilt). "open" pushes the faces apart.
  function drawMesh(mesh, cx, cy, size, ry, rx, open, color, edge) {
    var cy1 = Math.cos(ry);
    var sy1 = Math.sin(ry);
    var cx1 = Math.cos(rx);
    var sx1 = Math.sin(rx);
    function turn(p) {
      var x = p[0] * cy1 + p[2] * sy1;
      var z = -p[0] * sy1 + p[2] * cy1;
      var y = p[1] * cx1 - z * sx1;
      return [x, y, p[1] * sx1 + z * cx1];
    }
    var list = mesh.map(function (f) {
      var n = turn(f.n);
      var push = open * 0.42;
      var pts = f.p.map(function (p) {
        var q = turn(p);
        q[0] += n[0] * push;
        q[1] += n[1] * push;
        q[2] += n[2] * push;
        var s = 6 / (6 - q[2]);
        return [cx + q[0] * size * s, cy - q[1] * size * s];
      });
      return { pts: pts, n: n, z: turn(f.c)[2] + n[2] * push };
    });
    list.sort(function (a, b) {
      return a.z - b.z;
    });
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    list.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      ctx.lineTo(f.pts[1][0], f.pts[1][1]);
      ctx.lineTo(f.pts[2][0], f.pts[2][1]);
      ctx.closePath();
      ctx.fillStyle = color(f.n, f.n[2] > 0, open);
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.stroke();
    });
  }

  // ---- pointer, scroll, sparks ----

  var mouse = { x: -999, y: -999, sx: 0, sy: 0, on: false, moved: 0 };
  var trail = [];
  for (var s = 0; s < 12; s++) trail.push({ x: 0, y: 0 });
  var lastScroll = window.scrollY;
  var scrollVel = 0;
  var kick = 0;
  var open = 0;
  var openVel = 0;
  var time = 0;

  var rand = rng(99);
  var dust = [];
  function seedDust() {
    dust = [];
    var count = Math.round(clamp((W * H) / 34000, 14, 44));
    for (var i = 0; i < count; i++) {
      dust.push({ x: rand() * W, y: rand() * H, vx: 0, vy: 0, r: 0.5 + rand() * 1.4, ph: rand() * TAU, tone: rand() });
    }
  }

  var bursts = [];
  function emit(x, y, count, power) {
    if (calm) return;
    for (var i = 0; i < count; i++) {
      var a = i * 2.39996 + rand() * 0.8; // golden angle keeps the spray even
      var sp = power * (0.35 + rand());
      bursts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.3, life: 1, fade: 0.012 + rand() * 0.02 });
    }
    if (bursts.length > 420) bursts.splice(0, bursts.length - 420);
  }
  window.flintSpark = emit;

  // ---- the little label by the cursor ----

  var said = '';
  var sayUntil = 0;
  function say(text, ms) {
    said = text;
    sayUntil = performance.now() + ms;
  }

  window.addEventListener(
    'pointermove',
    function (e) {
      if (!mouse.on) {
        trail.forEach(function (p) {
          p.x = e.clientX;
          p.y = e.clientY;
        });
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
      mouse.moved++;
    },
    { passive: true },
  );
  window.addEventListener(
    'pointerdown',
    function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.on = true;
      kick = Math.min(1, kick + 0.45);
    },
    { passive: true },
  );
  window.addEventListener('pointerup', function (e) {
    if (e.pointerType !== 'mouse') mouse.on = false;
  });
  document.addEventListener('pointerleave', function () {
    mouse.on = false;
  });
  window.addEventListener('keydown', function (e) {
    if (e.key.length !== 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
    var sel = window.getSelection && window.getSelection();
    var x = mouse.x;
    var y = mouse.y;
    if (sel && sel.rangeCount) {
      var box = sel.getRangeAt(0).getBoundingClientRect();
      if (box && (box.left || box.top)) {
        x = box.left;
        y = box.top + box.height / 2;
      }
    }
    if (x < 0) return;
    emit(x, y, 3, 2);
    kick = Math.min(1, kick + 0.08);
    say('Sparks flying', 1200);
  });

  // ---- one frame ----

  function frame() {
    time += 0.016;
    var y = window.scrollY;
    scrollVel = mix(scrollVel, y - lastScroll, 0.2);
    lastScroll = y;
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - H);

    // Where the stone stands: on the nearest "stage", or large and faint in between.
    var best = 0;
    var box = null;
    stages.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var v = 1 - Math.abs(r.top + r.height / 2 - H / 2) / (H * 0.8);
      if (v > best) {
        best = v;
        box = r;
      }
    });
    var k = smooth(best * 1.6);
    var size = Math.min(W, H) * 0.3;
    var cx = W / 2;
    var cy = H / 2;
    var real = window.flintStone;
    if (box && real) {
      // The realistic picture stays glued to its stage and simply fades in and out.
      size = Math.min(box.height / 3.5, box.width / 3.3, 170);
      cx = box.left + box.width / 2;
      cy = box.top + box.height * 0.42;
    } else if (box) {
      var stageSize = Math.min(box.height / 3.5, box.width / 4.4, 150);
      size = mix(size, stageSize, k);
      cx = mix(cx, box.left + box.width / 2, k);
      cy = mix(cy, box.top + box.height / 2 - stageSize * 0.4, k);
    }
    var alpha = mix(0.13, 1, k);

    // The stone opens as the page scrolls away from either end, with a springy settle.
    var target = clamp((Math.min(y, maxScroll - y) / (H * 0.7)) * 0.85 + kick, 0, 1.15);
    kick *= 0.94;
    if (calm) {
      open = 0;
    } else {
      openVel += (target - open) * 0.06;
      openVel *= 0.82;
      open += openVel;
    }

    mouse.sx = mix(mouse.sx, mouse.on ? (mouse.x / W - 0.5) * 2 : 0, 0.05);
    mouse.sy = mix(mouse.sy, mouse.on ? (mouse.y / H - 0.5) * 2 : 0, 0.05);
    var ry = time * 0.35 + mouse.sx * 0.6 + y * 0.0018;
    var rx = 0.2 + mouse.sy * 0.22;

    ctx.clearRect(0, 0, W, H);

    if (real) {
      real.draw(cx, cy, size, box ? k : 0, Math.sin(time * 0.5) * 0.55 + mouse.sx * 0.6, 0.62 + Math.max(0, open) * 0.3, time);
      if (!calm) {
        drawDust();
        drawFront(k);
        requestAnimationFrame(loop);
      }
      return;
    }

    // Fallback when the graphics card cannot draw the realistic picture: a simple faceted stone.
    // glow behind the stone
    ctx.globalCompositeOperation = 'lighter';
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 3.2);
    glow.addColorStop(0, 'rgba(255,176,90,' + (0.26 + open * 0.16) * alpha + ')');
    glow.addColorStop(0.45, 'rgba(190,110,200,' + 0.08 * alpha + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - size * 3.2, cy - size * 3.2, size * 6.4, size * 6.4);
    ctx.globalCompositeOperation = 'source-over';

    if (k > 0.02) {
      ctx.globalAlpha = smooth(k * 2.5);
      drawMesh(rock, cx, cy + size * 1.42, size, mouse.sx * 0.25 + 0.4, 0.34 + mouse.sy * 0.06, 0, rockColor, 'rgba(255,190,140,0.06)');
    }
    ctx.globalAlpha = alpha;
    drawMesh(shard, cx, cy + Math.sin(time * 1.1) * size * 0.03, size, ry, rx, Math.max(0, open), shardColor, 'rgba(255,244,220,0.42)');
    ctx.globalAlpha = 1;

    if (!calm) {
      drawDust();
      drawFront(k);
      requestAnimationFrame(loop);
    }
  }

  function drawDust() {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i];
      p.vx += Math.sin(time * 0.3 + p.ph) * 0.004;
      p.vy += Math.cos(time * 0.27 + p.ph * 1.3) * 0.004 - 0.0025;
      if (mouse.on) {
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 78400 && d2 > 4) {
          var d = Math.sqrt(d2);
          var f = (1 - d / 280) * 0.1;
          // pulled in, and swept sideways, so they circle the pointer
          p.vx += (dx / d) * f - (dy / d) * f * 0.9;
          p.vy += (dy / d) * f + (dx / d) * f * 0.9;
        }
      }
      p.vy -= scrollVel * 0.003 * p.r;
      p.vx *= 0.965;
      p.vy *= 0.965;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
      var a = 0.3 + 0.3 * Math.sin(time * 2 + p.ph);
      ctx.strokeStyle = p.tone < 0.55 ? 'rgba(255,190,110,' + a + ')' : p.tone < 0.8 ? 'rgba(255,255,255,' + a + ')' : 'rgba(190,170,255,' + a + ')';
      ctx.lineWidth = p.r;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 4, p.y - p.vy * 4);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFront(k) {
    fx.clearRect(0, 0, W, H);
    fx.lineCap = 'round';

    for (var i = bursts.length - 1; i >= 0; i--) {
      var b = bursts[i];
      b.vy += 0.06;
      b.vx *= 0.975;
      b.vy *= 0.975;
      b.x += b.vx;
      b.y += b.vy;
      b.life -= b.fade;
      if (b.life <= 0) {
        bursts.splice(i, 1);
        continue;
      }
      fx.strokeStyle = 'rgba(255,' + Math.round(150 + 105 * b.life) + ',' + Math.round(60 + 180 * b.life * b.life) + ',' + b.life + ')';
      fx.lineWidth = 1 + b.life;
      fx.beginPath();
      fx.moveTo(b.x - b.vx * 2.2, b.y - b.vy * 2.2);
      fx.lineTo(b.x, b.y);
      fx.stroke();
    }

    if (!fine || !mouse.on || mouse.moved < 2) {
      if (whisper) whisper.classList.remove('is-on');
      return;
    }

    var halo = fx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 170);
    halo.addColorStop(0, 'rgba(200,180,255,0.13)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    fx.fillStyle = halo;
    fx.fillRect(mouse.x - 170, mouse.y - 170, 340, 340);

    trail[0].x = mix(trail[0].x, mouse.x, 0.5);
    trail[0].y = mix(trail[0].y, mouse.y, 0.5);
    for (var s = 1; s < trail.length; s++) {
      trail[s].x = mix(trail[s].x, trail[s - 1].x, 0.62);
      trail[s].y = mix(trail[s].y, trail[s - 1].y, 0.62);
      var t = 1 - s / trail.length;
      fx.strokeStyle = 'rgba(255,225,190,' + t * 0.4 + ')';
      fx.lineWidth = 0.5 + t * 3;
      fx.beginPath();
      fx.moveTo(trail[s - 1].x, trail[s - 1].y);
      fx.lineTo(trail[s].x, trail[s].y);
      fx.stroke();
    }

    if (whisper) {
      var text = said;
      if (performance.now() > sayUntil) {
        var nearEnd = window.scrollY > (document.documentElement.scrollHeight - H) / 2;
        text = nearEnd ? 'Ready when you are' : window.scrollY > 60 ? 'Keep going' : mouse.moved > 160 ? 'Keep scrolling' : 'Hello';
      }
      if (whisper.textContent !== text) whisper.textContent = text;
      whisper.style.transform = 'translate(' + Math.round(trail[4].x + 16) + 'px,' + Math.round(trail[4].y + 18) + 'px)';
      whisper.classList.toggle('is-on', k > 0.3 || performance.now() < sayUntil);
    }
  }

  function loop() {
    if (document.hidden) return setTimeout(loop, 400);
    frame();
  }

  resize();
  seedDust();
  window.addEventListener('resize', function () {
    resize();
    seedDust();
    if (calm) frame();
  });

  if (calm) {
    // A still picture that only follows the page.
    window.addEventListener('scroll', frame, { passive: true });
    frame();
  } else {
    requestAnimationFrame(loop);
  }
})();
