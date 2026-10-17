(function () {
  'use strict';

  var MIN_TIME = 1000;     // ms, hiện tối thiểu để không bị chớp
  var MAX_TIME = 15000;    // ms, quá thời gian này thì mở luôn (tránh kẹt)
  var COLORS = ['#e8892f', '#c4202a', '#f6f3ea', '#2147b0', '#3a1f1f'];
  var EXTRA_IMAGES = ['assets/binder5.png', 'assets/binder.png', 'assets/binder-rings.png']; // ảnh nền CSS

  var pre = document.getElementById('pre');
  if (!pre) return;
  var html = document.documentElement;
  var q = function (s) { return pre.querySelector(s); };
  var numEl = q('#preNum'), msgEl = q('#preMsg'), keyEl = q('#preKey'), cass = q('#preCass');
  var rollL = q('#rollL'), rollR = q('#rollR'), tape = q('#tape'), dot = q('#preDot');
  var bars = [].slice.call(pre.querySelectorAll('.pre__bars i'));
  var fades = [q('#preCount'), msgEl, keyEl].concat([].slice.call(pre.querySelectorAll('.pre__tag')));

  function remove() {
    if (pre.parentNode) pre.parentNode.removeChild(pre);
    html.classList.remove('is-loading');
    document.dispatchEvent(new Event('preloader-done'));
  }
  if (!window.gsap) { remove(); return; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- răng của 2 bánh cuốn ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  [].slice.call(pre.querySelectorAll('.reel')).forEach(function (g) {
    var o = g.getAttribute('data-o').split(' '), cx = +o[0], cy = +o[1];
    for (var i = 0; i < 6; i++) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', cx - 1.6); r.setAttribute('y', cy - 12);
      r.setAttribute('width', 3.2); r.setAttribute('height', 6);
      r.setAttribute('fill', '#2a2724');
      r.setAttribute('transform', 'rotate(' + i * 60 + ' ' + cx + ' ' + cy + ')');
      g.appendChild(r);
    }
  });

  /* ---------- theo dõi tải thật ---------- */
  var st = { fonts: 0, load: 0, imgs: 0 };
  var bookReady = !!window.__bookReady;
  document.addEventListener('book-ready', function () { bookReady = true; });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { st.fonts = 1; });
  else st.fonts = 1;

  if (document.readyState === 'complete') st.load = 1;
  else window.addEventListener('load', function () { st.load = 1; });

  var list = [].slice.call(document.images);
  EXTRA_IMAGES.forEach(function (u) { var im = new Image(); im.src = u; list.push(im); });
  var done = 0, total = list.length;
  function mark() { done++; st.imgs = done / total; }
  if (!total) st.imgs = 1;
  list.forEach(function (img) {
    if (img.complete) mark();
    else { img.addEventListener('load', mark, { once: true }); img.addEventListener('error', mark, { once: true }); }
  });

  /* ---------- hiển thị ---------- */
  var W = { fonts: .08, load: .12, imgs: .30, book: .50 };
  var t0 = performance.now(), tBook = null, shown = 0, lastMsg = '', finished = false;

  function render(p) {
    var rL = 25 - 12 * p, rR = 13 + 12 * p;
    rollL.setAttribute('r', rL.toFixed(2));
    rollR.setAttribute('r', rR.toFixed(2));
    tape.setAttribute('points', '125,' + (133 + rL).toFixed(2) + ' 275,' + (133 + rR).toFixed(2) +
      ' 275,' + (135 + rR).toFixed(2) + ' 125,' + (135 + rL).toFixed(2));
    numEl.textContent = Math.round(p * 100);
    var m = p < .2 ? 'Winding the tape…' : p < .45 ? 'Developing photos…' : p < .7 ? 'Dusting the pages…' : p < .95 ? 'Warming up the TV…' : 'Press play';
    if (m !== lastMsg) { msgEl.textContent = m; lastMsg = m; }
  }

  function tick() {
    if (finished) return;
    var now = performance.now(), el = now - t0;
    if (el > MAX_TIME) { st.fonts = st.load = st.imgs = 1; bookReady = true; }
    if (st.load === 1 && tBook === null) tBook = now;
    // chụp trang 3D không biết trước thời gian: nhích dần tới 90%, xong thật mới lên 100%
    var bookP = bookReady ? 1 : (tBook === null ? 0 : .9 * (1 - Math.exp(-(now - tBook) / 1800)));
    var target = W.fonts * st.fonts + W.load * st.load + W.imgs * st.imgs + W.book * bookP;
    if (target > shown) shown = Math.min(target, shown + Math.max((target - shown) * .16, .004));
    render(shown);
    if (bookReady && st.fonts && st.load && st.imgs === 1 && shown >= .995 && el >= MIN_TIME) finish();
  }

  /* ---------- hiệu ứng vào ---------- */
  var spin = [].slice.call(pre.querySelectorAll('.reel')).map(function (g) {
    return gsap.to(g, { rotation: 360, svgOrigin: g.getAttribute('data-o'), duration: 2.4, ease: 'none', repeat: -1 });
  });
  gsap.from(cass, { y: -90, rotation: -5, opacity: 0, duration: .95, ease: 'back.out(1.7)' });
  gsap.from(['#preCount', '#preMsg'].map(q), { y: 24, opacity: 0, duration: .6, stagger: .1, delay: .45, ease: 'power2.out' });
  var floatTw = gsap.to(cass, { y: -5, rotation: .8, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.1 });
  gsap.to(dot, { opacity: .15, duration: .6, ease: 'steps(1)', yoyo: true, repeat: -1 });

  gsap.ticker.add(tick);

  /* ---------- hiệu ứng ra ---------- */
  function finish() {
    finished = true;
    gsap.ticker.remove(tick);
    render(1);
    floatTw.kill();

    if (reduce) { gsap.to(pre, { opacity: 0, duration: .3, onComplete: remove }); return; }

    var tl = gsap.timeline({ onComplete: remove });
    tl.timeScale(1.5);   
    tl.to(keyEl, { opacity: 1, duration: .15 })
      .to(keyEl, { y: 4, boxShadow: '0 0 0 #e8892f', duration: .08, ease: 'power1.in' })
      .to(keyEl, { y: 0, boxShadow: '0 4px 0 #e8892f', duration: .14 })
      .add(function () { spin.forEach(function (tw) { gsap.to(tw, { timeScale: 8, duration: .5 }); }); }, '<')
      .to(cass, { scale: 1.06, y: 0, rotation: 0, duration: .25, ease: 'power2.out' }, '+=.2')
      .to(cass, { y: -(window.innerHeight * .95), rotation: -8, duration: .75, ease: 'back.in(1.5)' })
      .to(fades, { opacity: 0, y: -16, duration: .3, stagger: .03 }, '<.1')
      .to(bars, { backgroundColor: function (i) { return COLORS[i]; }, duration: .3, stagger: .05 }, '<.25')
      .to(bars, { yPercent: -100, duration: .95, stagger: .07, ease: 'power4.inOut' }, '+=.12')
      .set(pre, { pointerEvents: 'none' }, '<');
  }
})();