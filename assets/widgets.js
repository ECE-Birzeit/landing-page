/* Analytics widgets for the home page and /stats/, drawn from /stats.json (written daily by the deploy).
   Each function fills a container element; nothing here invents data, and a missing field draws nothing.
   Styles: assets/widgets.css. */
(function () {
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WEEK = [6, 0, 1, 2, 3, 4, 5]; // Birzeit's week starts on Saturday
  var LABS = ['encs4110', 'encs4101', 'encs5150', 'encs5101'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function day(s) { // "20261029" or "2026-10-29" -> Date at local midnight
    s = String(s).replace(/-/g, '');
    return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  }
  function short(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function long(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }

  // Students per day, the busiest day in green; each bar has its numbers on hover
  function daily(box, v, height) {
    var rows = v.daily || [];
    if (!rows.length) return;
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
    var peak = rows.reduce(function (a, r) { return r[1] > a[1] ? r : a; });
    var w = el('div', 'w-daily');
    var bars = el('div', 'bars');
    if (height) bars.style.setProperty('--h', height + 'px');
    rows.forEach(function (r, k) {
      var b = el('i', r === peak ? 'peak' : '');
      b.style.setProperty('--k', k * 28 + 'ms');
      b.style.height = Math.max(3, Math.round(100 * r[1] / max)) + '%';
      b.title = long(day(r[0])) + ': ' + fmt(r[1]) + ' students, ' + fmt(r[2]) + ' page views';
      bars.appendChild(b);
    });
    bars.setAttribute('role', 'img');
    bars.setAttribute('aria-label', 'Students per day from ' + short(day(rows[0][0])) + ' to ' + short(day(rows[rows.length - 1][0])) + '; the busiest day was ' + long(day(peak[0])) + ' with ' + fmt(peak[1]) + ' students.');
    var axis = el('div', 'axis');
    axis.append(el('span', '', short(day(rows[0][0]))), el('span', '', 'peak ' + fmt(peak[1]) + ' · ' + long(day(peak[0]))), el('span', '', short(day(rows[rows.length - 1][0]))));
    w.append(bars, axis);
    box.replaceChildren(w);
    grow(w);
  }

  // Page views by weekday and hour
  function heat(box, v, from, to, ticks) {
    var cells = {}, max = 0;
    (v.week_hours || []).forEach(function (r) { var k = +r[0] + ':' + +r[1]; cells[k] = r[2]; if (r[2] > max) max = r[2]; });
    if (!max) return;
    var w = el('div', 'w-heat');
    w.setAttribute('role', 'img');
    var best = busiest(v);
    w.setAttribute('aria-label', 'Experiment page views by weekday and hour; busiest ' + DAYS[best[0]] + ' at ' + String(best[1]).padStart(2, '0') + ':00.');
    WEEK.forEach(function (d) {
      var row = el('div', 'row');
      row.appendChild(el('span', '', DAYS[d]));
      for (var h = from; h <= to; h++) {
        var n = cells[d + ':' + h] || 0;
        var c = el('i');
        // A square root scale so quiet hours still show; empty hours stay at the background
        c.style.setProperty('--v', n ? Math.round(8 + 92 * Math.pow(n / max, 0.6)) + '%' : '0%');
        c.title = DAYS[d] + ' ' + String(h).padStart(2, '0') + ':00 · ' + fmt(n) + ' page views';
        c.style.setProperty('--k', (h - from) * 22 + 'ms');
        row.appendChild(c);
      }
      w.appendChild(row);
    });
    var t = el('div', 'row ticks');
    t.appendChild(el('span'));
    for (var h = from; h <= to; h++) t.appendChild(el('span', '', ticks.indexOf(h) !== -1 ? String(h).padStart(2, '0') : ''));
    w.appendChild(t);
    box.replaceChildren(w);
    grow(w);
  }
  function busiest(v) {
    var best = [0, 0, -1];
    (v.week_hours || []).forEach(function (r) { if (r[2] > best[2]) best = [+r[0], +r[1], r[2]]; });
    return best;
  }
  function busiestDay(v) {
    var t = {};
    (v.week_hours || []).forEach(function (r) { t[r[0]] = (t[r[0]] || 0) + r[2]; });
    var d = Object.keys(t).sort(function (a, b) { return t[b] - t[a]; })[0];
    return d == null ? null : DAYS[+d];
  }

  // One bar per lab, longest first
  function labBars(box, labs, metric) {
    var list = LABS.filter(function (l) { return labs[l] && labs[l][metric] != null; })
      .sort(function (a, b) { return labs[b][metric] - labs[a][metric]; });
    if (!list.length) return;
    var max = labs[list[0]][metric] || 1;
    var w = el('div', 'w-labs');
    list.forEach(function (l) {
      var row = el('div', 'lab-row');
      row.dataset.lab = l;
      var top = el('div');
      var name = el('span');
      name.append(el('em', '', '■'), ' ' + l.toUpperCase());
      top.append(name, el('span', '', fmt(labs[l][metric])));
      var track = el('div', 'w-track');
      var fill = el('i');
      fill.style.width = Math.max(2, Math.round(100 * labs[l][metric] / max)) + '%';
      fill.style.setProperty('--k', w.children.length * 70 + 'ms');
      track.appendChild(fill);
      row.append(top, track);
      w.appendChild(row);
    });
    box.replaceChildren(w);
    grow(w);
  }

  function devices(box, v) {
    var d = v.devices || {};
    var total = Object.keys(d).reduce(function (a, k) { return a + d[k]; }, 0);
    if (!total) return;
    var order = [['desktop', 'var(--i)'], ['mobile', 'var(--ok)'], ['tablet', 'var(--mu)']];
    var w = el('div', 'w-dev');
    var stack = el('div', 'stack');
    order.forEach(function (o) {
      var i = el('i');
      i.style.width = (100 * (d[o[0]] || 0) / total) + '%';
      i.style.setProperty('--c', o[1]);
      stack.appendChild(i);
    });
    w.appendChild(stack);
    order.forEach(function (o) {
      var row = el('div', 'leg');
      row.style.setProperty('--c', o[1]);
      var name = el('span');
      name.append(el('em', '', '■'), ' ' + o[0][0].toUpperCase() + o[0].slice(1));
      row.append(name, el('span', '', Math.round(100 * (d[o[0]] || 0) / total) + '% · ' + fmt(d[o[0]])));
      w.appendChild(row);
    });
    box.replaceChildren(w);
    grow(w);
  }

  function top(box, v, n) {
    var list = (v.top_experiments || []).filter(function (t) { return !/\/experiments\/?$/.test(t.path); }).slice(0, n);
    if (!list.length) return;
    var max = list[0].views || 1;
    var w = el('div', 'w-top');
    list.forEach(function (t, k) {
      var a = el('a');
      a.href = 'https://' + t.lab + '.birzeit.me' + t.path;
      a.target = '_blank';
      a.rel = 'noopener';
      a.dataset.lab = t.lab;
      var num = (t.path.replace(/\/$/, '').split('/').pop().match(/\d+/) || [''])[0];
      var mid = el('span');
      mid.style.minWidth = '0';
      var meta = el('span', 'm');
      meta.append(el('em', '', '■'), ' ' + t.lab.toUpperCase() + (num ? ' · Exp ' + num : '') + ' · ' + fmt(t.students) + ' students');
      mid.append(el('span', 't', String(t.title).split(' | ')[0]), meta);
      var track = el('div', 'w-track');
      var fill = el('i');
      fill.style.width = Math.round(100 * t.views / max) + '%';
      fill.style.setProperty('--k', k * 60 + 'ms');
      track.appendChild(fill);
      a.append(el('span', 'n', String(k + 1).padStart(2, '0')), mid, el('span', 'v', fmt(t.views)), el('span'), track);
      w.appendChild(a);
    });
    box.replaceChildren(w);
    grow(w);
  }

  // Where we are in the semester; dates come from Ritaj's academic calendar via the course catalog
  function week(dates, today) {
    if (!dates || !dates.teaching_starts) return null;
    var s = day(dates.teaching_starts), e = day(dates.teaching_ends || dates.teaching_starts);
    today = today || new Date();
    return {
      now: Math.max(1, Math.floor((today - s) / 864e5 / 7) + 1),
      of: Math.ceil(((e - s) / 864e5 + 1) / 7),
      ends: short(e)
    };
  }
  function semester(box, dates, today) {
    if (!dates || !dates.teaching_starts || !dates.exams_end) return;
    var s = day(dates.teaching_starts), te = day(dates.teaching_ends), xe = day(dates.exams_end);
    today = today || new Date();
    var span = xe - s;
    var w = el('div', 'w-sem');
    var track = el('div', 'track');
    var done = el('i'), exams = el('b');
    done.style.width = Math.min(100, Math.max(0, 100 * (today - s) / span)) + '%';
    exams.style.left = (100 * (te - s) / span) + '%';
    track.append(done, exams);
    var axis = el('div', 'axis');
    axis.append(el('span', '', short(s) + ' teaching starts'), el('span', '', short(day(dates.exams_start)) + '–' + short(xe) + ' exams'));
    w.append(track, axis);
    box.replaceChildren(w);
    grow(w);
  }

  // Page views per weekday, Saturday first, as small bars with the numbers
  function byDay(box, v) {
    var t = {};
    (v.week_hours || []).forEach(function (r) { t[+r[0]] = (t[+r[0]] || 0) + r[2]; });
    var max = Math.max.apply(null, WEEK.map(function (d) { return t[d] || 0; }));
    if (!max) return;
    var w = el('div', 'w-days');
    w.setAttribute('aria-label', 'Experiment page views by weekday');
    WEEK.forEach(function (d, k) {
      var c = el('div');
      var top = el('span');
      top.append(DAYS[d], el('b', '', fmt(t[d] || 0)));
      var track = el('div', 'w-track');
      var fill = el('i');
      fill.style.width = Math.max(2, Math.round(100 * (t[d] || 0) / max)) + '%';
      fill.style.setProperty('--k', k * 50 + 'ms');
      track.appendChild(fill);
      c.append(top, track);
      w.appendChild(c);
    });
    box.appendChild(w);
    grow(w);
  }

  // /stats.json is written by the deploy, so a local preview of the repo doesn't have it: fall back to the
  // live file (GitHub Pages allows cross-origin reads)
  function load() {
    function get(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    return get('/stats.json').catch(function () { return get('https://birzeit.me/stats.json'); }).catch(function () { return null; });
  }

  // ---- Motion: reveal on scroll, charts that draw in, numbers that count up. Nothing moves for people
  // who ask for reduced motion, or where IntersectionObserver is missing; the content is there either way.
  var MOTION = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
  var seen = MOTION ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      seen.unobserve(e.target);
      if (e.target._onIn) e.target._onIn();
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  // Printing never scrolls, so show everything first
  if (MOTION) window.addEventListener('beforeprint', function () {
    document.querySelectorAll('.rv, .w-anim').forEach(function (e) { e.classList.add('in'); });
  });
  function grow(w) { if (!MOTION) return; w.classList.add('w-anim'); seen.observe(w); }
  // reveal(list, step): each element rises into place as it enters the view; siblings in one call stagger
  function reveal(list, step) {
    if (!MOTION) return;
    Array.prototype.forEach.call(list, function (e, k) {
      if (!e || e.classList.contains('rv')) return;
      // Already on screen at load: leave it alone rather than hide and re-show it
      var r = e.getBoundingClientRect();
      if (r.top < innerHeight * 0.9 && r.bottom > 0 && !step) return;
      e.classList.add('rv');
      e.style.setProperty('--d', (step ? k * step : 0) + 'ms');
      seen.observe(e);
    });
  }
  // countUp(el, n, format): the final text is set first, so it's right without motion or if anything fails
  function countUp(e, n, format) {
    format = format || fmt;
    e.textContent = format(n);
    e.classList.add('num');
    if (!MOTION || !(n > 0)) return;
    e._onIn = function () {
      var t0 = performance.now(), dur = 900;
      (function step(t) {
        var p = Math.min(1, (t - t0) / dur), q = 1 - Math.pow(1 - p, 3);
        e.textContent = format(p < 1 ? (n % 1 ? n * q : Math.round(n * q)) : n);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    };
    seen.observe(e);
  }

  window.ECEWidgets = { load: load, fmt: fmt, reveal: reveal, countUp: countUp, byDay: byDay, MOTION: MOTION, day: day, short: short, daily: daily, heat: heat, busiest: busiest, busiestDay: busiestDay,
    labBars: labBars, devices: devices, top: top, week: week, semester: semester, DAYS: DAYS };
})();
