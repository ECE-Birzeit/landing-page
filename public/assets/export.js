/* A week as a landscape image, laid out like the printed page: the week (days are the rows, time runs
   across), then the sections table, drawn on a canvas in the page's current theme at twice the print size.
   Used by the schedule builder and the weekly schedules:
     WeekImage.save({ title, sub, note, file, table, items: [{ day: 'M', s: 570, e: 650, code, line, inst, color }] })
   day is one of S U M T W R (Sat–Thu), s and e are minutes from midnight; line is what the page shows under
   the code (section, room) and inst the instructor, left out where the page is that instructor's week.
   table is the page's sections <table>, copied as it is shown (its swatches give the course colours). */
(function () {
  var W = 2000, PAD = 48;
  var ALL_DAYS = [['S', 'Sat'], ['U', 'Sun'], ['M', 'Mon'], ['T', 'Tue'], ['W', 'Wed'], ['R', 'Thu']];
  var FONT = "'Switzer', ui-sans-serif, system-ui, sans-serif";

  function hhmm(m) { return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + m % 60; }
  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function round(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // Shorten text with "…" until it fits
  function fit(c, text, max) {
    text = String(text || '');
    if (c.measureText(text).width <= max) return text;
    while (text.length > 1 && c.measureText(text + '…').width > max) text = text.slice(0, -1);
    return text + '…';
  }
  // An instructor's name in the space there is: in full, then first and last name, then initial and last name
  function name(c, full, max) {
    var people = String(full || '').split(/\s*,\s*/).filter(function (x) { return x && x !== 'TBA'; });
    if (!people.length) return '';
    var p = people[0].split(' '), more = people.length > 1 ? ' +' + (people.length - 1) : '';
    var tries = [people[0], p.length > 2 ? p[0] + ' ' + p[p.length - 1] : people[0], p.length > 1 ? p[0][0] + '. ' + p[p.length - 1] : people[0], p[p.length - 1]];
    for (var i = 0; i < tries.length; i++) if (c.measureText(tries[i] + more).width <= max) return tries[i] + more;
    return fit(c, tries[3], max);
  }
  // The page's table as it is shown: header labels, and for each row its cells and the swatch colour
  function readTable(t) {
    if (!t) return null;
    var head = Array.prototype.map.call(t.querySelectorAll('thead th'), function (th) { return { label: th.textContent.trim(), num: th.classList.contains('num') }; });
    var rows = Array.prototype.map.call(t.querySelectorAll('tbody tr'), function (tr) {
      var sw = tr.querySelector('.sw');
      return { color: sw ? getComputedStyle(sw).backgroundColor : '', cells: Array.prototype.map.call(tr.children, function (td) { return td.textContent.trim(); }) };
    });
    return head.length && rows.length ? { head: head, rows: rows } : null;
  }

  function draw(o) {
    var items = o.items || [], table = readTable(o.table);
    var days = ALL_DAYS.filter(function (d) { return d[0] !== 'U' || items.some(function (r) { return r.day === 'U'; }); });
    var h0 = Math.min.apply(null, [8].concat(items.map(function (r) { return Math.floor(r.s / 60); })));
    var h1 = Math.max.apply(null, [17].concat(items.map(function (r) { return Math.ceil(r.e / 60); })));

    // Sizes, twice the printed page's
    var TOP = 150, BAR = 56, HEAD = 52, ROW = 112, TROW = 46, GAP = 24;
    var weekH = BAR + HEAD + ROW * days.length;
    var tableH = table ? BAR + TROW * table.rows.length : 0;
    var H = TOP + weekH + (table ? GAP + tableH : 0) + 90;

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var bg = token('--p'), card = token('--card'), bar = token('--bar'), ink = token('--i'), mu = token('--mu'), mu2 = token('--mu2'), line = token('--line');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.textBaseline = 'alphabetic';

    // Title
    c.textAlign = 'left'; c.fillStyle = ink; c.font = '600 42px ' + FONT;
    c.fillText(fit(c, o.title || 'Timetable', W - 2 * PAD - 300), PAD, 78);
    if (o.sub) { c.fillStyle = mu; c.font = '400 24px ' + FONT; c.fillText(fit(c, o.sub, W - 2 * PAD), PAD, 118); }
    c.textAlign = 'right'; c.fillStyle = mu; c.font = '400 24px ' + FONT;
    c.fillText('birzeit.me', W - PAD, 78);

    // A card with a quiet header bar
    function panel(y, h, left, right) {
      c.save();
      round(c, PAD, y, W - 2 * PAD, h, 22); c.fillStyle = card; c.fill(); c.clip();
      c.fillStyle = bar; c.fillRect(PAD, y, W - 2 * PAD, BAR);
      c.strokeStyle = line; c.lineWidth = 2; c.beginPath(); c.moveTo(PAD, y + BAR); c.lineTo(W - PAD, y + BAR); c.stroke();
      c.restore();
      round(c, PAD, y, W - 2 * PAD, h, 22); c.strokeStyle = line; c.lineWidth = 2; c.stroke();
      c.font = '400 23px ' + FONT; c.fillStyle = mu;
      c.textAlign = 'left'; c.fillText(fit(c, left, W - 2 * PAD - 520), PAD + 28, y + 36);
      if (right) { c.textAlign = 'right'; c.fillText(right, W - PAD - 28, y + 36); }
    }

    // ---- The week
    var y0 = TOP;
    panel(y0, weekH, o.weekTitle || o.title || 'Week', hhmm(h0 * 60) + ' – ' + hhmm(h1 * 60) + ' · ' + days[0][1] + ' – ' + days[days.length - 1][1]);
    var gx = PAD + 144, gr = W - PAD, gy = y0 + BAR + HEAD;
    var pw = (gr - gx) / ((h1 - h0) * 60);
    var xOf = function (m) { return gx + (m - h0 * 60) * pw; };
    c.lineWidth = 2;
    for (var h = h0; h <= h1; h++) {
      var x = xOf(h * 60);
      c.strokeStyle = line; c.beginPath(); c.moveTo(x, gy); c.lineTo(x, y0 + weekH); c.stroke();
      c.fillStyle = mu; c.font = '400 22px ' + FONT;
      c.textAlign = h === h0 ? 'left' : h === h1 ? 'right' : 'center';
      c.fillText((h < 10 ? '0' : '') + h + ':00', h === h0 ? x + 8 : h === h1 ? x - 8 : x, y0 + BAR + 34);
    }
    c.strokeStyle = line; c.beginPath(); c.moveTo(PAD, gy); c.lineTo(gr, gy); c.stroke();
    days.forEach(function (d, i) {
      var y = gy + ROW * i;
      if (i) { c.strokeStyle = line; c.beginPath(); c.moveTo(PAD, y); c.lineTo(gr, y); c.stroke(); }
      c.textAlign = 'left'; c.fillStyle = mu2; c.font = '500 24px ' + FONT;
      c.fillText(d[1], PAD + 28, y + ROW / 2 + 8);
    });

    // Classes; meetings that overlap in time (sections of one course, in the course view) share the row
    var lanes = {}, laneOf = new Map();
    days.forEach(function (d) {
      var ends = [];
      items.filter(function (r) { return r.day === d[0]; }).sort(function (a, b) { return a.s - b.s; }).forEach(function (r) {
        var k = ends.findIndex(function (e) { return e <= r.s; });
        if (k < 0) { k = ends.length; ends.push(0); }
        ends[k] = r.e; laneOf.set(r, k);
      });
      lanes[d[0]] = Math.max(1, ends.length);
    });
    c.textAlign = 'left';
    items.forEach(function (r) {
      var di = days.map(function (d) { return d[0]; }).indexOf(r.day);
      if (di < 0) return;
      var n = lanes[r.day], lh = (ROW - 16) / n;
      var bx = xOf(r.s) + 4, bw = (r.e - r.s) * pw - 8;
      var by = gy + ROW * di + 8 + lh * laneOf.get(r) + 2, bh = lh - 4;
      round(c, bx, by, bw, bh, 12);
      c.save();
      c.globalAlpha = .16; c.fillStyle = r.color; c.fill();
      c.globalAlpha = 1; c.lineWidth = 2; c.strokeStyle = r.color; c.stroke();
      c.clip();
      // Code, then the instructor in the text colour, then section and room; as many lines as fit
      var tx = bx + 12, tw = bw - 20, ty = by + 28, gap = 25;
      var rows = [['700 22px', r.color, r.code]];
      c.font = '600 19px ' + FONT;
      if (r.inst) rows.push(['600 19px', ink, name(c, r.inst, tw)]);
      if (r.line) rows.push(['400 19px', mu2, r.line]);
      if (!r.inst) rows.push(['400 19px', mu, hhmm(r.s) + '–' + hhmm(r.e)]);
      rows.slice(0, Math.max(1, Math.floor((bh - 10) / gap))).forEach(function (t, k) {
        c.font = t[0] + ' ' + FONT; c.fillStyle = t[1];
        c.fillText(fit(c, t[2], tw), tx, ty + gap * k);
      });
      c.restore();
    });

    // ---- The sections table, columns sized to what's in them
    if (table) {
      var ty0 = y0 + weekH + GAP;
      panel(ty0, tableH, '', '');
      var cols = table.head.length, inner = W - 2 * PAD - 56;
      c.font = '400 21px ' + FONT;
      var want = table.head.map(function (hd, k) {
        var m = c.measureText(hd.label).width;
        table.rows.forEach(function (r) { m = Math.max(m, c.measureText(r.cells[k] || '').width + (k === 0 ? 26 : 0)); });
        return m + 40;
      });
      var total = want.reduce(function (a, b) { return a + b; }, 0);
      var widths = want.map(function (w) { return total > inner ? w * inner / total : w + (inner - total) / cols; });
      var xs = [PAD + 28];
      widths.forEach(function (w, k) { xs.push(xs[k] + w); });
      // Header labels sit in the panel's bar
      c.font = '500 21px ' + FONT; c.fillStyle = mu;
      table.head.forEach(function (hd, k) {
        c.textAlign = hd.num ? 'right' : 'left';
        c.fillText(fit(c, hd.label, widths[k] - 24), hd.num ? xs[k + 1] - 24 : xs[k], ty0 + 36);
      });
      table.rows.forEach(function (r, i) {
        var ry = ty0 + BAR + TROW * i;
        if (i) { c.strokeStyle = line; c.lineWidth = 2; c.beginPath(); c.moveTo(PAD, ry); c.lineTo(W - PAD, ry); c.stroke(); }
        r.cells.forEach(function (cell, k) {
          var x = xs[k], max = widths[k] - 24;
          var isInst = /instructor/i.test(table.head[k].label);
          c.textAlign = table.head[k].num ? 'right' : 'left';
          c.font = (k === 0 ? '600 21px ' : isInst ? '600 21px ' : '400 21px ') + FONT;
          c.fillStyle = k === 0 || isInst ? ink : mu2;
          if (k === 0 && r.color && cell) {
            round(c, x, ry + TROW / 2 - 8, 16, 16, 4); c.fillStyle = r.color; c.fill();
            c.fillStyle = ink; x += 26; max -= 26;
          }
          c.fillText(fit(c, cell, max), table.head[k].num ? xs[k + 1] - 24 : x, ry + TROW / 2 + 8);
        });
      });
    }

    if (o.note) { c.textAlign = 'left'; c.fillStyle = mu; c.font = '400 21px ' + FONT; c.fillText(fit(c, o.note, W - 2 * PAD), PAD, H - 36); }
    return cv;
  }

  function save(o) {
    var go = function () {
      var cv = draw(o);
      cv.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (o.file || 'timetable') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }, 'image/png');
    };
    // Wait for Switzer so the canvas doesn't fall back to the system font
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('600 42px Switzer'), document.fonts.load('400 21px Switzer'), document.fonts.load('700 22px Switzer'), document.fonts.load('500 21px Switzer')]).then(go, go);
    else go();
  }

  // Print: always on paper colours. The page redraws itself in the light theme before printing (its course
  // colours depend on the theme) and goes back afterwards; pages pass their redraw function.
  function printing(redraw) {
    var root = document.documentElement, was = null;
    window.addEventListener('beforeprint', function () {
      was = root.getAttribute('data-theme');
      if (was !== 'light') { root.setAttribute('data-theme', 'light'); redraw(); }
    });
    window.addEventListener('afterprint', function () {
      if (was && was !== 'light') { root.setAttribute('data-theme', was); redraw(); }
      was = null;
    });
  }

  // Copy the page's address (it always holds the current choice) and say so on the button for a moment
  function copyLink(button, label) {
    var done = function (t) { button.textContent = t; setTimeout(function () { button.textContent = label; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { done('Copied'); }, function () { done('Copy it from the address bar'); });
    else done('Copy it from the address bar');
  }

  window.WeekImage = { save: save, draw: draw, printing: printing, copyLink: copyLink };
})();
