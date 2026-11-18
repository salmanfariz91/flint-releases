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

  /** Lays the notes out so linked ones sit near each other. */
  function layout(ids, edges, w, h) {
    var pos = {};
    ids.forEach(function (id, i) {
      var a = (i / ids.length) * Math.PI * 2;
      pos[id] = { x: w / 2 + Math.cos(a) * w * 0.3, y: h / 2 + Math.sin(a) * h * 0.3 };
    });
    for (var step = 0; step < 400; step++) {
      var force = {};
      ids.forEach(function (id) { force[id] = { x: 0, y: 0 }; });
      ids.forEach(function (a) {
        ids.forEach(function (b) {
          if (a === b) return;
          var dx = pos[a].x - pos[b].x, dy = pos[a].y - pos[b].y;
          var d2 = Math.max(dx * dx + dy * dy, 100);
          var f = 9000 / d2;
          force[a].x += (dx / Math.sqrt(d2)) * f;
          force[a].y += (dy / Math.sqrt(d2)) * f;
        });
        force[a].x += (w / 2 - pos[a].x) * 0.012;
        force[a].y += (h / 2 - pos[a].y) * 0.012;
      });
      edges.forEach(function (e) {
        var dx = pos[e.b].x - pos[e.a].x, dy = pos[e.b].y - pos[e.a].y;
        var d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        var f = (d - 120) * 0.04;
        force[e.a].x += (dx / d) * f; force[e.a].y += (dy / d) * f;
        force[e.b].x -= (dx / d) * f; force[e.b].y -= (dy / d) * f;
      });
      ids.forEach(function (id) {
        pos[id].x = Math.min(w - 70, Math.max(70, pos[id].x + Math.max(-12, Math.min(12, force[id].x))));
        pos[id].y = Math.min(h - 40, Math.max(30, pos[id].y + Math.max(-12, Math.min(12, force[id].y))));
      });
    }
    return pos;
  }

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

    // ---- graph ----
    var ids = Object.keys(NOTES);
    var edges = links();
    var degree = {};
    ids.forEach(function (id) { degree[id] = 0; });
    edges.forEach(function (e) { degree[e.a]++; degree[e.b]++; });
    var pos = layout(ids, edges, 800, 460);
    var NS = 'http://www.w3.org/2000/svg';
    var lines = edges.map(function (e) {
      var l = document.createElementNS(NS, 'line');
      l.setAttribute('class', 'd-edge');
      graph.appendChild(l);
      return { e: e, el: l };
    });
    var nodes = ids.map(function (id) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'd-node');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Open ' + NOTES[id].title);
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', String(7 + degree[id] * 2.2));
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('dy', String(24 + degree[id] * 2.2));
      t.textContent = NOTES[id].title;
      g.appendChild(c);
      g.appendChild(t);
      graph.appendChild(g);
      return { id: id, el: g };
    });
    function place() {
      lines.forEach(function (l) {
        l.el.setAttribute('x1', pos[l.e.a].x); l.el.setAttribute('y1', pos[l.e.a].y);
        l.el.setAttribute('x2', pos[l.e.b].x); l.el.setAttribute('y2', pos[l.e.b].y);
      });
      nodes.forEach(function (n) { n.el.setAttribute('transform', 'translate(' + pos[n.id].x + ' ' + pos[n.id].y + ')'); });
    }
    function highlight(id) {
      var near = {};
      if (id) {
        near[id] = true;
        edges.forEach(function (e) {
          if (e.a === id) near[e.b] = true;
          if (e.b === id) near[e.a] = true;
        });
      }
      graph.classList.toggle('is-focus', !!id);
      nodes.forEach(function (n) { n.el.classList.toggle('is-near', !!near[n.id]); });
      lines.forEach(function (l) { l.el.classList.toggle('is-near', !!id && (l.e.a === id || l.e.b === id)); });
    }
    place();
    var drag = null;
    function point(e) {
      var p = graph.createSVGPoint();
      p.x = e.clientX; p.y = e.clientY;
      return p.matrixTransform(graph.getScreenCTM().inverse());
    }
    nodes.forEach(function (n) {
      n.el.addEventListener('pointerenter', function () { if (!drag) highlight(n.id); });
      n.el.addEventListener('pointerleave', function () { if (!drag) highlight(null); });
      n.el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        n.el.setPointerCapture(e.pointerId);
        var p = point(e);
        drag = { id: n.id, dx: pos[n.id].x - p.x, dy: pos[n.id].y - p.y, moved: 0, sx: e.clientX, sy: e.clientY };
        highlight(n.id);
      });
      n.el.addEventListener('pointermove', function (e) {
        if (!drag || drag.id !== n.id) return;
        var p = point(e);
        pos[n.id].x = Math.min(780, Math.max(20, p.x + drag.dx));
        pos[n.id].y = Math.min(440, Math.max(20, p.y + drag.dy));
        drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy));
        place();
      });
      n.el.addEventListener('pointerup', function () {
        if (!drag) return;
        var clicked = drag.moved < 5;
        drag = null;
        highlight(null);
        if (clicked) open(n.id);
      });
      n.el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(n.id);
        }
      });
    });

    show();
  }

  document.querySelectorAll('[data-demo]').forEach(Demo);
})();
