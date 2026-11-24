/* A small working copy of Flint for the download page: type, tick, follow links, drag the graph, switch light and dark. */
(function () {
  var NOTES = {
    kyoto: {
      title: 'Trip to Kyoto',
      folder: 'Travel',
      body:
        '<p>Planning the spring trip. See the [[packing]] and the [[budget]].</p>' +
        '<h3>Before we go</h3>' +
        '<ul class="d-checks">' +
        '<li>[x] Book the ryokan near Gion</li>' +
        '<li>[x] Rail pass for 7 days</li>' +
        '<li>[ ] Reserve the tea ceremony</li>' +
        '<li>[ ] Day trip to [[nara]]</li>' +
        '</ul>' +
        '<h3>Places</h3>' +
        '<ol><li>Fushimi Inari at sunrise</li><li>Arashiyama bamboo grove</li><li>Philosopher’s Path in the evening</li></ol>' +
        '<blockquote>Go early. Everything is quieter before 8 am.</blockquote>' +
        '<p class="d-tags">#travel #japan</p>',
    },
    packing: {
      title: 'Packing list',
      folder: 'Travel',
      body:
        '<ul class="d-checks"><li>[ ] Passport</li><li>[x] Rail pass</li><li>[ ] Power adapter</li><li>[ ] Walking shoes</li></ul>' +
        '<p>For the [[kyoto]].</p><p class="d-tags">#travel</p>',
    },
    nara: {
      title: 'Nara',
      folder: 'Travel',
      body: '<p>Deer park, Todai-ji and Isuien garden.</p><p>Part of the [[kyoto]].</p><p class="d-tags">#travel #japan</p>',
    },
    budget: {
      title: 'Budget 2027',
      folder: 'Personal',
      body:
        '<table><tr><th>Item</th><th>Amount</th></tr><tr><td>Rent</td><td>1,200</td></tr><tr><td>Travel</td><td>300</td></tr><tr><td>Savings</td><td>500</td></tr></table>' +
        '<p>Travel covers the [[kyoto]].</p><p class="d-tags">#money</p>',
    },
    reading: {
      title: 'Reading list',
      folder: 'Personal',
      body: '<ul class="d-checks"><li>[x] Deep Work</li><li>[ ] The Design of Everyday Things</li><li>[ ] Atomic Habits</li></ul><p class="d-tags">#books</p>',
    },
    weekly: {
      title: 'Weekly review',
      folder: 'Work',
      body:
        '<h3>Done</h3><ul class="d-checks"><li>[x] Ship version 1.2</li><li>[x] Call with the design team</li></ul>' +
        '<h3>Next</h3><ul class="d-checks"><li>[ ] Plan [[ideas]] for Q1</li><li>[ ] Notes from [[meeting]]</li></ul><p class="d-tags">#work</p>',
    },
    ideas: {
      title: 'Product ideas',
      folder: 'Work',
      body: '<ul><li>Offline mode for the field team</li><li>Dark mode everywhere</li><li>Faster search</li></ul><p>Discussed in [[meeting]].</p><p class="d-tags">#work #ideas</p>',
    },
    meeting: {
      title: 'Monday meeting',
      folder: 'Work',
      body: '<p>Attendees: design, product, support.</p><ol><li>Review the [[weekly]]</li><li>Roadmap for [[ideas]]</li></ol><p class="d-tags">#work</p>',
    },
  };
  // More notes, so the graph looks like a real notebook: [id, title, folder, text, links]. They open like any note.
  [
    ['tokyo', 'Tokyo', 'Travel', 'Two days in the city before Kyoto.', ['kyoto', 'flights', 'hotels', 'food']],
    ['osaka', 'Osaka', 'Travel', 'A day trip for the food and the castle.', ['kyoto', 'food', 'nara']],
    ['flights', 'Flights', 'Travel', 'Outbound on the 3rd, back on the 14th.', ['budget', 'packing']],
    ['hotels', 'Hotels', 'Travel', 'Ryokan in Kyoto, a small hotel in Tokyo.', ['budget', 'kyoto']],
    ['phrases', 'Japanese phrases', 'Travel', 'Hello, thank you, and where is the station.', ['kyoto', 'tokyo']],
    ['temples', 'Temples to visit', 'Travel', 'Kinkaku-ji, Kiyomizu-dera and Todai-ji.', ['kyoto', 'nara']],
    ['food', 'Places to eat', 'Travel', 'Ramen, okonomiyaki and a tea house.', ['ramen']],
    ['photos', 'Photo spots', 'Travel', 'Best light is early morning.', ['kyoto', 'temples', 'osaka']],
    ['railpass', 'Rail pass', 'Travel', 'Seven days covers every trip.', ['flights', 'packing', 'osaka']],
    ['recipes', 'Recipes', 'Personal', 'Things worth cooking again.', ['ramen', 'curry']],
    ['ramen', 'Ramen at home', 'Personal', 'Broth the day before, noodles fresh.', ['recipes']],
    ['curry', 'Weeknight curry', 'Personal', 'Thirty minutes, one pan.', ['recipes', 'groceries']],
    ['groceries', 'Groceries', 'Personal', 'The usual weekly list.', ['budget']],
    ['goals', 'Goals 2027', 'Personal', 'Travel more, read more, save more.', ['budget', 'reading', 'workout', 'savings']],
    ['savings', 'Savings plan', 'Personal', 'A fixed amount on the first of the month.', ['budget']],
    ['taxes', 'Taxes', 'Personal', 'Papers to collect before April.', ['budget', 'savings']],
    ['workout', 'Workout plan', 'Personal', 'Three short sessions a week.', ['sleep']],
    ['sleep', 'Sleep notes', 'Personal', 'No screens after ten.', ['habits']],
    ['gifts', 'Gift ideas', 'Personal', 'Written down as soon as someone mentions one.', ['budget']],
    ['garden', 'Garden', 'Personal', 'Herbs on the balcony.', ['groceries']],
    ['movies', 'Films to watch', 'Personal', 'For rainy weekends.', ['reading']],
    ['deepwork', 'Deep Work', 'Personal', 'Notes from the book.', ['reading', 'focus']],
    ['design', 'Design of Everyday Things', 'Personal', 'Notes from the book.', ['reading', 'ideas']],
    ['habits', 'Atomic Habits', 'Personal', 'Notes from the book.', ['reading', 'goals']],
    ['focus', 'Focus time', 'Personal', 'Two quiet hours every morning.', ['weekly', 'deepwork']],
    ['roadmap', 'Roadmap', 'Work', 'What ships this quarter and next.', ['ideas', 'meeting', 'okrs']],
    ['okrs', 'Goals for the quarter', 'Work', 'Three goals, each with a number.', ['weekly', 'roadmap']],
    ['search', 'Faster search', 'Work', 'Results should appear while typing.', ['ideas', 'roadmap']],
    ['offline', 'Offline mode', 'Work', 'The field team needs it most.', ['ideas', 'customers']],
    ['darkmode', 'Dark mode', 'Work', 'Every screen, not only the editor.', ['ideas', 'designteam']],
    ['release', 'Version 1.2', 'Work', 'Shipped on Friday.', ['weekly', 'roadmap', 'support']],
    ['designteam', 'Design team', 'Work', 'Who is working on what.', ['meeting', 'design']],
    ['support', 'Support notes', 'Work', 'The questions that keep coming back.', ['meeting', 'customers']],
    ['customers', 'Customer calls', 'Work', 'What people asked for this month.', ['ideas', 'pricing']],
    ['pricing', 'Pricing', 'Work', 'Keep it simple.', ['roadmap']],
    ['onboarding', 'Onboarding', 'Work', 'The first five minutes matter most.', ['customers', 'designteam']],
    ['hiring', 'Hiring', 'Work', 'One designer, one engineer.', ['meeting']],
    ['standup', 'Daily standup', 'Work', 'Ten minutes, standing.', ['weekly', 'release']],
    ['retro', 'Retro', 'Work', 'What went well and what did not.', ['weekly', 'standup', 'release']],
  ].forEach(function (m) {
    NOTES[m[0]] = {
      title: m[1],
      folder: m[2],
      body: '<p>' + m[3] + '</p><p>See also: ' + m[4].map(function (id) { return '[[' + id + ']]'; }).join(', ') + '.</p>',
    };
  });

  var TREE = [
    ['Personal', ['budget', 'reading']],
    ['Travel', ['packing', 'nara', 'kyoto']],
    ['Work', ['ideas', 'meeting', 'weekly']],
  ];
  var ICONS = {
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    graph: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="10" cy="18" r="2.5"/><path d="M8.3 7l7.4 .8M7 8.3l2 7.4M16.4 10l-4.6 6"/>',
    note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    pin: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  };
  var icon = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  };
  var esc = function (t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /** Turns the [[id]] and [x] markers into links and tick boxes that stay clickable while typing. */
  function render(body) {
    return body
      .replace(/\[\[(\w+)\]\]/g, function (_, id) {
        return '<span class="d-link" contenteditable="false" data-open="' + id + '">' + esc(NOTES[id].title) + '</span>';
      })
      .replace(/<li>\[( |x)\] /g, function (_, mark) {
        return '<li class="' + (mark === 'x' ? 'is-done' : '') + '"><span class="d-box" contenteditable="false" role="checkbox" aria-checked="' + (mark === 'x') + '" tabindex="0"></span>';
      });
  }

  function links() {
    var edges = [];
    Object.keys(NOTES).forEach(function (from) {
      var seen = {};
      NOTES[from].body.replace(/\[\[(\w+)\]\]/g, function (_, to) {
        var key = [from, to].sort().join('|');
        if (!seen[key] && from !== to) {
          seen[key] = true;
          if (!edges.some(function (e) { return e.key === key; })) edges.push({ key: key, a: from, b: to });
        }
      });
    });
    return edges;
  }

  var SETTLED = null;

  function Demo(root) {
    var theme = root.getAttribute('data-theme') || 'dark';
    var view = root.getAttribute('data-view') || 'note';
    var current = 'kyoto';
    var bodies = {};
    Object.keys(NOTES).forEach(function (id) { bodies[id] = render(NOTES[id].body); });

    var tree = TREE.map(function (folder) {
      return (
        '<div class="d-folder">' + icon('chevron') + '<span>' + folder[0] + '</span></div>' +
        folder[1].map(function (id) {
          return '<button type="button" class="d-row" data-open="' + id + '">' + esc(NOTES[id].title) + '</button>';
        }).join('')
      );
    }).join('');

    root.innerHTML =
      '<div class="d-win">' +
      '<aside class="d-side">' +
      '<div class="d-bar"><span class="d-dots"><i></i><i></i><i></i></span>' +
      '<button type="button" class="d-icon" data-act="note" aria-label="Notes">' + icon('folder') + '</button>' +
      '<span class="d-icon is-plain">' + icon('search') + '</span>' +
      '<button type="button" class="d-icon" data-act="graph" aria-label="Graph view">' + icon('graph') + '</button></div>' +
      '<div class="d-tree"><div class="d-label">Pinned</div>' +
      '<button type="button" class="d-row d-pinned" data-open="weekly">' + icon('pin') + 'Weekly review</button>' +
      '<div class="d-label">Notes</div>' + tree + '</div>' +
      '<div class="d-foot"><i></i>Stored on this device</div>' +
      '</aside>' +
      '<div class="d-main">' +
      '<div class="d-tabs"><span class="d-tab"></span><span class="d-grow"></span>' +
      '<button type="button" class="d-icon d-mobile" data-act="graph" aria-label="Graph view">' + icon('graph') + '</button>' +
      '<button type="button" class="d-icon d-theme" aria-label="Switch light and dark"></button></div>' +
      '<div class="d-crumb"></div>' +
      '<div class="d-scroll"><article class="d-page">' +
      '<h1 class="d-title" contenteditable="true" spellcheck="false"></h1>' +
      '<div class="d-meta"></div>' +
      '<div class="d-body" contenteditable="true" spellcheck="false"></div>' +
      '</article></div>' +
      '<svg class="d-graph" viewBox="0 0 800 460" preserveAspectRatio="xMidYMid meet"></svg>' +
      '<div class="d-zoom"><button type="button" data-zoom="in" aria-label="Zoom in">+</button>' +
      '<button type="button" data-zoom="out" aria-label="Zoom out">&minus;</button>' +
      '<button type="button" data-zoom="fit" aria-label="Show the whole graph">' + icon('fit') + '</button></div>' +
      '<div class="d-hint">Click the graph, then scroll to zoom. Drag to move.</div>' +
      '<div class="d-status"></div>' +
      '</div></div>';

    var $ = function (sel) { return root.querySelector(sel); };
    var title = $('.d-title'), body = $('.d-body'), graph = $('.d-graph');

    function count() {
      var words = (body.innerText || '').trim().split(/\s+/).filter(Boolean).length;
      $('.d-status').textContent = view === 'graph' ? Object.keys(NOTES).length + ' notes · ' + edges.length + ' links' : words + ' words';
    }

    function show() {
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-view', view);
      $('.d-theme').innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
      $('.d-tab').textContent = view === 'graph' ? 'Graph view' : NOTES[current].title;
      $('.d-crumb').textContent = view === 'graph' ? '' : NOTES[current].folder + ' / ' + NOTES[current].title;
      title.textContent = NOTES[current].title;
      $('.d-meta').textContent = NOTES[current].folder + ' · Edited just now';
      body.innerHTML = bodies[current];
      root.querySelectorAll('.d-row').forEach(function (r) {
        r.classList.toggle('is-active', view === 'note' && r.getAttribute('data-open') === current && !r.classList.contains('d-pinned'));
      });
      root.querySelectorAll('[data-act]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-act') === view);
      });
      count();
    }

    function open(id) {
      bodies[current] = body.innerHTML;
      current = id;
      view = 'note';
      show();
    }

    root.addEventListener('click', function (e) {
      var target = e.target.closest('[data-open], [data-act], .d-theme, .d-box');
      if (!target || !root.contains(target)) return;
      if (target.classList.contains('d-box')) {
        var li = target.closest('li');
        var done = !li.classList.contains('is-done');
        li.classList.toggle('is-done', done);
        target.setAttribute('aria-checked', String(done));
        return;
      }
      if (target.classList.contains('d-theme')) {
        theme = theme === 'dark' ? 'light' : 'dark';
        show();
        return;
      }
      if (target.hasAttribute('data-act')) {
        bodies[current] = body.innerHTML;
        view = target.getAttribute('data-act');
        show();
        return;
      }
      open(target.getAttribute('data-open'));
    });
    root.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && e.target.classList && e.target.classList.contains('d-box')) {
        e.preventDefault();
        e.target.click();
      }
    });
    body.addEventListener('input', count);
    title.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        body.focus();
      }
    });

    // ---- graph: every note is a dot, every link a line; it settles like a real graph, and can be zoomed and moved ----
    var GW = 800, GH = 460;
    var ids = Object.keys(NOTES);
    var edges = links();
    var degree = {}, near = {}, pos = {}, vel = {};
    ids.forEach(function (id, i) {
      degree[id] = 0;
      near[id] = {};
      // start on a spiral so the dots spread evenly before they settle
      var a = i * 2.39996, r = 15 * Math.sqrt(i + 1);
      pos[id] = { x: GW / 2 + Math.cos(a) * r * 1.5, y: GH / 2 + Math.sin(a) * r };
      vel[id] = { x: 0, y: 0 };
    });
    edges.forEach(function (e) {
      degree[e.a]++; degree[e.b]++;
      near[e.a][e.b] = true; near[e.b][e.a] = true;
    });
    var held = null;

    /** One small step: dots push each other away, links pull together, everything leans to the middle. */
    function tick() {
      var i, j, a, b, dx, dy, d2, d, f;
      for (i = 0; i < ids.length; i++) {
        a = pos[ids[i]];
        for (j = i + 1; j < ids.length; j++) {
          b = pos[ids[j]];
          dx = a.x - b.x; dy = a.y - b.y;
          d2 = Math.max(dx * dx + dy * dy, 36);
          if (d2 > 90000) continue;
          d = Math.sqrt(d2);
          f = 2600 / d2;
          vel[ids[i]].x += (dx / d) * f; vel[ids[i]].y += (dy / d) * f;
          vel[ids[j]].x -= (dx / d) * f; vel[ids[j]].y -= (dy / d) * f;
        }
        vel[ids[i]].x += (GW / 2 - a.x) * 0.0028;
        vel[ids[i]].y += (GH / 2 - a.y) * 0.0075;
      }
      edges.forEach(function (e) {
        dx = pos[e.b].x - pos[e.a].x; dy = pos[e.b].y - pos[e.a].y;
        d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        f = (d - 58) * 0.03;
        vel[e.a].x += (dx / d) * f; vel[e.a].y += (dy / d) * f;
        vel[e.b].x -= (dx / d) * f; vel[e.b].y -= (dy / d) * f;
      });
      ids.forEach(function (id) {
        vel[id].x *= 0.8; vel[id].y *= 0.8;
        if (id === held) return;
        pos[id].x += Math.max(-9, Math.min(9, vel[id].x));
        pos[id].y += Math.max(-9, Math.min(9, vel[id].y));
      });
    }
    // The first copy of the mini Flint works the layout out; the other copies reuse it, so the page starts faster.
    if (SETTLED) {
      ids.forEach(function (id) { pos[id] = { x: SETTLED[id].x, y: SETTLED[id].y }; });
    } else {
      for (var warmup = 0; warmup < 420; warmup++) tick();
      SETTLED = {};
      ids.forEach(function (id) { SETTLED[id] = { x: pos[id].x, y: pos[id].y }; });
    }

    var NS = 'http://www.w3.org/2000/svg';
    var world = document.createElementNS(NS, 'g');
    graph.appendChild(world);
    var lines = edges.map(function (e) {
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'd-edge');
      world.appendChild(l);
      return { e: e, el: l };
    });
    var nodes = ids.map(function (id) {
      var g = document.createElementNS(NS, 'g');
      var r = Math.min(13, 3.6 + degree[id] * 1.15);
      g.setAttribute('class', 'd-node is-' + NOTES[id].folder.toLowerCase() + (degree[id] >= 5 ? ' is-hub' : ''));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Open ' + NOTES[id].title);
      var halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('class', 'd-halo');
      halo.setAttribute('r', String(r + 7));
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'd-dot');
      c.setAttribute('r', String(r));
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('dy', String(r + 13));
      t.textContent = NOTES[id].title;
      g.appendChild(halo);
      g.appendChild(c);
      g.appendChild(t);
      world.appendChild(g);
      return { id: id, el: g };
    });
    function place() {
      lines.forEach(function (l) {
        l.el.setAttribute('x1', pos[l.e.a].x.toFixed(1)); l.el.setAttribute('y1', pos[l.e.a].y.toFixed(1));
        l.el.setAttribute('x2', pos[l.e.b].x.toFixed(1)); l.el.setAttribute('y2', pos[l.e.b].y.toFixed(1));
      });
      nodes.forEach(function (n) { n.el.setAttribute('transform', 'translate(' + pos[n.id].x.toFixed(1) + ' ' + pos[n.id].y.toFixed(1) + ')'); });
    }
    function highlight(id) {
      graph.classList.toggle('is-focus', !!id);
      nodes.forEach(function (n) { n.el.classList.toggle('is-near', !!id && (n.id === id || !!near[id][n.id])); });
      lines.forEach(function (l) { l.el.classList.toggle('is-near', !!id && (l.e.a === id || l.e.b === id)); });
    }
    place();

    // After a dot is moved the rest settle again for a moment.
    var heat = 0, running = false;
    function settle() {
      if (heat < 0.03) { running = false; return; }
      tick();
      heat *= 0.95;
      place();
      requestAnimationFrame(settle);
    }
    function warm(v) {
      heat = Math.max(heat, v);
      if (!running) { running = true; requestAnimationFrame(settle); }
    }

    // Zoom and move. cam.k is the zoom; cam.x / cam.y slide the picture.
    var cam = { k: 1, x: 0, y: 0 };
    function frame() {
      world.setAttribute('transform', 'translate(' + cam.x.toFixed(1) + ' ' + cam.y.toFixed(1) + ') scale(' + cam.k.toFixed(3) + ')');
      graph.classList.toggle('is-zoomed', cam.k > 1.55);
    }
    function rootPoint(e) {
      var p = graph.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(graph.getScreenCTM().inverse());
    }
    function point(e) {
      var p = rootPoint(e);
      return { x: (p.x - cam.x) / cam.k, y: (p.y - cam.y) / cam.k };
    }
    function zoomAt(cx, cy, by) {
      var k = Math.min(5, Math.max(0.55, cam.k * by));
      cam.x = cx - (cx - cam.x) * (k / cam.k);
      cam.y = cy - (cy - cam.y) * (k / cam.k);
      cam.k = k;
      frame();
    }
    root.querySelectorAll('[data-zoom]').forEach(function (b) {
      b.addEventListener('click', function () {
        var how = b.getAttribute('data-zoom');
        if (how === 'fit') { cam = { k: 1, x: 0, y: 0 }; frame(); }
        else zoomAt(GW / 2, GH / 2, how === 'in' ? 1.45 : 1 / 1.45);
      });
    });

    var drag = null, pan = null, touches = {}, pinch = 0, active = false;
    graph.addEventListener('pointerdown', function (e) {
      active = true;
      root.classList.add('is-graph-active');
      touches[e.pointerId] = rootPoint(e);
      if (e.target.closest && e.target.closest('.d-node')) return;
      graph.setPointerCapture(e.pointerId);
      var p = touches[e.pointerId];
      pan = { sx: p.x, sy: p.y, x: cam.x, y: cam.y };
      pinch = 0;
    });
    graph.addEventListener('pointermove', function (e) {
      if (!touches[e.pointerId]) return;
      touches[e.pointerId] = rootPoint(e);
      var keys = Object.keys(touches);
      if (keys.length === 2 && !drag) {
        var a = touches[keys[0]], b = touches[keys[1]];
        var gap = Math.max(Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)), 1);
        if (pinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, gap / pinch);
        pinch = gap;
        pan = null;
      } else if (pan) {
        var p = touches[e.pointerId];
        cam.x = pan.x + (p.x - pan.sx);
        cam.y = pan.y + (p.y - pan.sy);
        frame();
      }
    });
    var lift = function (e) {
      delete touches[e.pointerId];
      pan = null;
      pinch = 0;
    };
    graph.addEventListener('pointerup', lift);
    graph.addEventListener('pointercancel', lift);
    graph.addEventListener('pointerleave', function () {
      if (Object.keys(touches).length) return;
      active = false;
      root.classList.remove('is-graph-active');
    });
    // The wheel zooms only after a click inside the graph, so it never traps someone scrolling the page.
    graph.addEventListener('wheel', function (e) {
      if (!active && !e.ctrlKey) return;
      e.preventDefault();
      var p = rootPoint(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)));
    }, { passive: false });
    graph.addEventListener('dblclick', function (e) {
      if (e.target.closest && e.target.closest('.d-node')) return;
      var p = rootPoint(e);
      zoomAt(p.x, p.y, 1.6);
    });

    nodes.forEach(function (n) {
      n.el.addEventListener('pointerenter', function () { if (!drag) highlight(n.id); });
      n.el.addEventListener('pointerleave', function () { if (!drag) highlight(null); });
      n.el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        n.el.setPointerCapture(e.pointerId);
        var p = point(e);
        drag = { id: n.id, dx: pos[n.id].x - p.x, dy: pos[n.id].y - p.y, moved: 0, sx: e.clientX, sy: e.clientY };
        held = n.id;
        highlight(n.id);
      });
      n.el.addEventListener('pointermove', function (e) {
        if (!drag || drag.id !== n.id) return;
        var p = point(e);
        pos[n.id].x = p.x + drag.dx;
        pos[n.id].y = p.y + drag.dy;
        drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy));
        place();
        if (drag.moved > 5) warm(0.5);
      });
      var drop = function () {
        if (!drag) return;
        var clicked = drag.moved < 5;
        drag = null;
        held = null;
        highlight(null);
        if (clicked) open(n.id);
        else warm(0.4);
      };
      n.el.addEventListener('pointerup', drop);
      n.el.addEventListener('pointercancel', function () { drag = null; held = null; highlight(null); });
      n.el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(n.id);
        }
      });
    });

    show();
  }

  // The mini Flint is far down the page, so it is built once the top of the page is up and the browser is idle.
  var start = function () { document.querySelectorAll('[data-demo]').forEach(Demo); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 250);
})();
