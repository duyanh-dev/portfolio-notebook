(function () {
  'use strict';

  /* =====================================================
     CONFIG: thay bằng file của bạn
     ===================================================== */
  // Nhạc nền (mp3). Để trống = dùng nhạc ambient tạo bằng WebAudio.
  var MUSIC_SRC = '';

  // Video cho tivi cổ. Điền src (mp4) để dùng video thật, để trống = hiệu ứng tự vẽ.
  var TV_CHANNELS = [
    { name: 'CH 1', src: 'assets/video/video1.mp4' },
    { name: 'CH 2', src: 'assets/video/video2.mp4' },
    { name: 'CH 3', src: 'assets/video/video3.mp4' }
  ];

  // Nội dung cho máy ảnh. Mỗi item có thể thêm: src: 'anh.jpg' hoặc 'clip.mp4'
  var WORK = {
    photo: [
      { title: 'Golden Hour', kind: 'hills', sky: ['#ffb88c', '#de6262'], sun: '#fff1b8', c1: '#8c4a4a', c2: '#4d2a3a' },
      { title: 'City Blue', kind: 'city', sky: ['#a8c0ff', '#3f2b96'], sun: '#ffffff', c1: '#2c2a66', c2: '#1b1a44' },
      { title: 'Green Fields', kind: 'hills', sky: ['#c1f0d0', '#6ed3a1'], sun: '#fffbd0', c1: '#2f8f6b', c2: '#1e5f48' },
      { title: 'Late Dusk', kind: 'hills', sky: ['#355c7d', '#c06c84'], sun: '#ffd9a8', c1: '#3a2a4a', c2: '#241833' },
      { title: 'Paper Skies', kind: 'city', sky: ['#f9f1c6', '#e6c75a'], sun: '#fff', c1: '#8c6d2f', c2: '#5a4519' }
    ],
    video: [
      { title: 'Moving Still', kind: 'city', video: true, sky: ['#3a3a52', '#141420'], sun: '#ffd27a', c1: '#222238', c2: '#12121f' },
      { title: 'Night Train', kind: 'hills', video: true, sky: ['#232526', '#b8604a'], sun: '#ffe2b0', c1: '#2d2022', c2: '#171011' },
      { title: 'Short Film', kind: 'hills', video: true, sky: ['#a1c4fd', '#c2e9fb'], sun: '#fff7c0', c1: '#4f8f6a', c2: '#2d6048' }
    ],
    editing: [
      { title: 'Colour Grade', kind: 'hills', edit: true, sky: ['#ff9a8b', '#ff6a88'], sun: '#fff1b8', c1: '#8a3a52', c2: '#4a1f33' },
      { title: 'Retouch', kind: 'city', edit: true, sky: ['#84fab0', '#8fd3f4'], sun: '#fff', c1: '#2f6b6b', c2: '#1b4545' },
      { title: 'Rough Cut', kind: 'abstract', edit: true, sky: ['#fbc2eb', '#a6c1ee'], sun: '#ffffff', c1: '#6a4bd0', c2: '#e0457b' }
    ],
    design: [
      { title: 'Poster', kind: 'abstract', sky: ['#ffd27a', '#ff6b6b'], sun: '#2147b0', c1: '#fff7ea', c2: '#1d1d1d' },
      { title: 'Brand ID', kind: 'abstract', sky: ['#b8f2e6', '#5fb3b3'], sun: '#f2545b', c1: '#fffaf0', c2: '#2a2f45' },
      { title: 'Packaging', kind: 'abstract', sky: ['#e0c3fc', '#8ec5fc'], sun: '#3d348b', c1: '#ffffff', c2: '#f7b801' },
      { title: 'Logo Set', kind: 'abstract', sky: ['#fdfbfb', '#ebedee'], sun: '#c4202a', c1: '#2147b0', c2: '#1d1d1d' }
    ]
  };

  /* ===================================================== */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var body = document.body;
  var mqMobile = window.matchMedia('(max-width: 820px)');
var mqRot = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
var isMobile = function () { return mqRot.matches; };   // SP dọc = chế độ 1 trang           // sổ luôn dùng logic lật 3D
var isNarrow = function () { return mqMobile.matches; };  // chỉ dùng cho màn Work
var isRot = function () { return mqRot.matches; };
var _rotWas = mqRot.matches;
function onRotChange() { if (mqRot.matches !== _rotWas) location.reload(); }
if (mqRot.addEventListener) mqRot.addEventListener('change', onRotChange);
else mqRot.addListener(onRotChange);

  var toastEl = $('#toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2400);
  }

  /* =====================================================
     NAVIGATION / PAGE FLIP
     ===================================================== */
  var stage = $('#stage');
  var bookWrap = $('#bookWrap');
  var workWrap = $('#workWrap');
  var leaves = $$('.leaf');
  var pages = $$('.page');
  var navLinks = $$('.nav-link');
  var nextBtn = $('#nextBtn'), prevBtn = $('#prevBtn');
  var mNext = $('#mNext'), mPrev = $('#mPrev'), mDots = $('#mDots');
  var TOTAL_SPREADS = leaves.length + 1;     // 4
  var TOTAL_PAGES = pages.length;            // 8

  var spread = 0;     // desktop: số lá đã lật
  var mPage = 0;      // mobile: trang đang hiển thị
  var view = 'book';
  var moving = {};
  var flipTimer = null;

  mDots.innerHTML = new Array(TOTAL_PAGES + 1).join('<i></i>');

  /* =====================================================
     3D PAGE CURL (three.js + html2canvas) - bản tối ưu
     -----------------------------------------------------
     1. Chụp trang (html2canvas) chạy NỐI TIẾP trong hàng đợi, chỉ khi rảnh,
        không bao giờ chạy lúc đang lật (và có "khoảng yên" quanh mỗi lần lật).
     2. Không chụp lại sau mỗi lần lật. Chỉ chụp lại mặt trang đang hiện
        nếu bạn vừa tương tác (kéo thẻ, bấm Add...).
     3. Texture được đẩy lên GPU và shader được biên dịch trước (warm-up).
     4. Chưa có texture thì lật bằng CSS luôn, không chờ.
     5. Lưới nhỏ hơn (36x22), DPR tối đa 1.5, tivi vẽ 30fps và nghỉ khi lật.
     6. Bù blur của box-shadow khi chụp để bóng card không bị gắt.
     ===================================================== */
  var spreadEl = $('#spread');
  var CURL = { top: .28, bot: -.30, corner: -.60, dur: 1.45 };   // chỉnh độ cong ở đây
  var NX = 36, NY = 22, MARGIN = 60;
  var DPR = Math.min(window.devicePixelRatio || 1, isRot() ? 2 : 1.5);
  var G = {}, GL = null, shadowTex = null;
  var refreshTimer = null;
  var quietUntil = 0;   // không chụp texture ngay trước/sau khi lật

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.THREE && window.html2canvas && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  var useGL = webglOK();
  var ROT_GL = false;   // false = SP dọc lật bằng CSS (ổn định). true = thử lại lật cong WebGL
function glActive() { return useGL && !isMobile(); }
  leaves.forEach(function (l) { l._dirty = { front: false, back: false }; l._p = 0; l._on = false; });
  function anyFlip() { return leaves.some(function (l) { return l._on; }); }

  function measure() {
    G.SW = spreadEl.offsetWidth; G.SH = spreadEl.offsetHeight;
    var leafW = G.SW / 2;
    G.gap = leafW * 0.09;     // khớp CSS: .leaf .face{left:9%}
    G.PW = leafW * 0.9074;    // khớp CSS: width:90.74%
  }

  function fitGL() {
    measure();
    if (!GL) return;
    var CW = G.SW + MARGIN * 2, CH = G.SH + MARGIN * 2;
    GL.cv.style.left = -MARGIN + 'px'; GL.cv.style.top = -MARGIN + 'px';
    GL.cv.style.width = CW + 'px'; GL.cv.style.height = CH + 'px';
    GL.r.setSize(CW, CH, false);
    GL.cam.aspect = CW / CH;
    var d = (CH / 2) / Math.tan(THREE.MathUtils.degToRad(GL.cam.fov / 2));
    GL.cam.position.set(0, 0, d);
    GL.cam.far = d * 4;
    GL.cam.updateProjectionMatrix();
    GL.dirty = true;
  }

  function initGL() {
    if (GL || !useGL) return;
    var cv = document.createElement('canvas');
    cv.className = 'flip-canvas';
    cv.setAttribute('aria-hidden', 'true');
    spreadEl.appendChild(cv);
    var r = new THREE.WebGLRenderer({
      canvas: cv, alpha: true, antialias: DPR < 1.5, powerPreference: 'high-performance'
    });
    r.setClearColor(0x000000, 0);
    r.outputEncoding = THREE.sRGBEncoding;
    r.setPixelRatio(DPR);
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(26, 1, 10, 10000);
    scene.add(new THREE.AmbientLight(0xffffff, 0.74));
    var dl = new THREE.DirectionalLight(0xffffff, 0.35);
    dl.position.set(-0.25, 0.5, 0.83);
    scene.add(dl);
    GL = { r: r, scene: scene, cam: cam, cv: cv, dirty: false };
    fitGL();
  }

  /* ---- hàng đợi chụp trang: nối tiếp, chỉ chạy khi rảnh ---- */
  var queue = Promise.resolve();
  function idle() {
    return new Promise(function (r) {
      if (window.requestIdleCallback) requestIdleCallback(function () { r(); }, { timeout: 500 });
      else setTimeout(r, 16);
    });
  }
  function waitIdle() {
    return (anyFlip() || performance.now() < quietUntil) ? delay(120).then(waitIdle) : idle();
  }
  function enqueue(job) {
    queue = queue
      .then(waitIdle)
      .then(job)
      .catch(function () {})
      .then(function () { return delay(40); });
    return queue;
  }

  /* ---- texture: chụp mặt trang ---- */
  function holeInfo(pageEl) {
    var cs = getComputedStyle(pageEl);
    var hy = [];
    for (var i = 1; i <= 6; i++) hy.push(parseFloat(cs.getPropertyValue('--hy' + i)) / 100);
    var probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:0;width:var(--hr)';
    pageEl.appendChild(probe);
    var r = probe.offsetWidth; pageEl.removeChild(probe);
    return { hx: parseFloat(cs.getPropertyValue('--hx')) / 100, hy: hy, r: r };
  }

  function punch(canvas, pageEl, isLeft) {
    var H = holeInfo(pageEl), ctx = canvas.getContext('2d'), k = canvas.width / G.PW;
    ctx.globalCompositeOperation = 'destination-out';
    H.hy.forEach(function (y) {
      ctx.beginPath();
      ctx.arc((isLeft ? 1 - H.hx : H.hx) * canvas.width, y * canvas.height, H.r * k, 0, 7);
      ctx.fill();
    });
    var t = new THREE.CanvasTexture(canvas);
    t.encoding = THREE.sRGBEncoding;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  // "rgba(0,0,0,.2) 0px 5px 10px 0px, ..." -> nhân tham số thứ 3 (blur) của từng shadow
  // html2canvas nhân offset theo scale nhưng KHÔNG nhân blur => bóng bị gắt khi DPR > 1
  function scaleShadow(val, sc) {
    var parts = [], depth = 0, cur = '', i, ch;
    for (i = 0; i < val.length; i++) {
      ch = val.charAt(i);
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    return parts.map(function (s) {
      var n = 0;
      return s.replace(/-?[\d.]+px/g, function (m) {
        n++;
        return n === 3 ? (parseFloat(m) * sc) + 'px' : m;
      });
    }).join(',');
  }

  function snap(pageEl, isLeft) {
    return new Promise(function (res, rej) {
      var cs = getComputedStyle(spreadEl);
      var st = document.createElement('div');
      st.setAttribute('data-cap', '');
      st.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;opacity:0;pointer-events:none;overflow:hidden;width:' + G.PW + 'px;height:' + G.SH + 'px';
      ['--u', '--fs-body', '--fs-small', '--fs-title', '--fs-title-sm'].forEach(function (k) {
        st.style.setProperty(k, cs.getPropertyValue(k));
      });
      var c = pageEl.cloneNode(true);
      c.classList.remove('face', 'front', 'back');
      c.removeAttribute('id');
      Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      c.style.cssText = 'position:absolute;left:0;top:0;right:auto;width:100%;height:100%;display:block;transform:none;-webkit-mask-image:none;mask-image:none';
      // copy nội dung <canvas> (TV)
      var oc = pageEl.querySelectorAll('canvas'), cc = c.querySelectorAll('canvas');
      for (var i = 0; i < cc.length; i++) { try { cc[i].getContext('2d').drawImage(oc[i], 0, 0); } catch (e) {} }
      st.appendChild(c); document.body.appendChild(st);

      var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
      ready.then(function () {
        return html2canvas(c, {
          backgroundColor: null, scale: DPR, logging: false, useCORS: true,
          onclone: function (doc) {
            var s = doc.querySelector('[data-cap]'); if (s) s.style.opacity = '1';
            var css = doc.createElement('style');
            css.textContent = '*{animation:none!important;transition:none!important}';
            doc.head.appendChild(css);

            // bù blur của shadow vì html2canvas không nhân blur theo scale
            if (s && DPR !== 1) {
              var win = doc.defaultView, all = s.querySelectorAll('*'), k, ccs, v;
              for (k = 0; k < all.length; k++) {
                ccs = win.getComputedStyle(all[k]);
                v = ccs.boxShadow;
                if (v && v !== 'none') all[k].style.setProperty('box-shadow', scaleShadow(v, DPR), 'important');
                v = ccs.textShadow;
                if (v && v !== 'none') all[k].style.setProperty('text-shadow', scaleShadow(v, DPR), 'important');
              }
            }
          }
        });
      }).then(function (canvas) {
        document.body.removeChild(st);
        res(punch(canvas, pageEl, isLeft));
      }).catch(function (e) {
        if (st.parentNode) document.body.removeChild(st);
        rej(e);
      });
    });
  }

  /* ---- tờ giấy 3D ---- */
  function shadowTexture() {
    if (shadowTex) return shadowTex;
    var c = document.createElement('canvas'); c.width = 256; c.height = 4;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(.35, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 4);
    shadowTex = new THREE.CanvasTexture(c);
    return shadowTex;
  }

  function makeFlipper() {
    var gF = new THREE.PlaneGeometry(1, 1, NX, NY), gB = new THREE.PlaneGeometry(1, 1, NX, NY);
    var uv = gB.attributes.uv;
    for (var i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));   // mặt sau: lật gương U
    uv.needsUpdate = true;
    gF.attributes.position.setUsage(THREE.DynamicDrawUsage);
    gB.setAttribute('position', gF.attributes.position);
    gB.setAttribute('normal', gF.attributes.normal);

    var mF = new THREE.Mesh(gF, new THREE.MeshLambertMaterial({ transparent: true, alphaTest: .02, side: THREE.FrontSide }));
    var mB = new THREE.Mesh(gB, new THREE.MeshLambertMaterial({ transparent: true, alphaTest: .02, side: THREE.BackSide }));
    mF.frustumCulled = mB.frustumCulled = false;
    mF.renderOrder = mB.renderOrder = 1;

    function sh() {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: shadowTexture(), color: 0x000000, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.renderOrder = -1; m.position.z = -1;
      return m;
    }
    var shR = sh(), shL = sh();
    var group = new THREE.Group();
    group.add(shR, shL, mF, mB);
    group.visible = false;
    GL.scene.add(group);
    return { gF: gF, pos: gF.attributes.position.array, mF: mF, mB: mB, shR: shR, shL: shL, group: group };
  }

  function glReady(leaf) {
    return !!(GL && leaf._fl && leaf._fl.mF.material.map && leaf._fl.mB.material.map);
  }

  function setTex(leaf, side, tex) {
    if (!leaf._fl) leaf._fl = makeFlipper();
    var m = (side === 'front' ? leaf._fl.mF : leaf._fl.mB);
    if (m.material.map) m.material.map.dispose();
    m.material.map = tex;
    m.material.needsUpdate = true;
    if (GL.r.initTexture) GL.r.initTexture(tex);   // đẩy lên GPU ngay, tránh giật khi lật
  }

  function capture(leaf, side) {
    if (!glActive() || isMobile()) return Promise.resolve();

    initGL();
    var fe = leaf.querySelector('.face.' + side);
    if (!fe) return Promise.resolve();
    leaf._dirty[side] = false;
    return snap(fe, side === 'back').then(function (tex) { setTex(leaf, side, tex); });
  }

  /* render thử 1 lần ở chỗ trống để biên dịch shader + upload texture */
  function warm(leaf) {
    if (!glReady(leaf)) return;
    var fl = leaf._fl;
    fl.group.visible = true;
    poseMesh(fl, .5, 1);
    GL.r.render(GL.scene, GL.cam);
    fl.group.visible = false;
    GL.r.render(GL.scene, GL.cam);   // xoá canvas ngay trong cùng 1 task
  }

  function prepareAll() {
    if (!glActive() || isMobile()) return;
    initGL();
    var order = [];
    // ưu tiên 2 mặt đang hiện, rồi tới các mặt còn lại
    visibleFaces().forEach(function (v) { order.push(v); });
    leaves.forEach(function (l) {
      ['front', 'back'].forEach(function (s) {
        if (!order.some(function (o) { return o.leaf === l && o.side === s; })) order.push({ leaf: l, side: s });
      });
    });
    order.forEach(function (o) { enqueue(function () { return capture(o.leaf, o.side); }); });
    enqueue(function () { leaves.forEach(warm); });
  }

  function visibleFaces() {
    var out = [];
    if (spread < leaves.length) out.push({ leaf: leaves[spread], side: 'front' });
    if (spread > 0) out.push({ leaf: leaves[spread - 1], side: 'back' });
    return out;
  }

  /* chỉ chụp lại mặt đang hiện nếu có tương tác */
  function refreshVisible() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      if (isMobile() || !glActive()) return;

      visibleFaces().forEach(function (v) {
        if (v.leaf._dirty[v.side]) enqueue(function () { return capture(v.leaf, v.side); });
      });
    }, 2000);
  }

  ['click', 'pointerup', 'input'].forEach(function (ev) {
    spreadEl.addEventListener(ev, function (e) {
      var f = e.target.closest && e.target.closest('.face');
      if (!f) return;
      var l = f.closest('.leaf');
      if (!l) return;
      l._dirty[f.classList.contains('back') ? 'back' : 'front'] = true;
      refreshVisible();
    });
  });

  /* uốn cong: tích phân góc dọc theo từng hàng giấy (đã gọn, không tạo closure mỗi hàng) */
  function ang(th, amp, A, C, s, L) {
    var u = s / L, u2 = u * u;
    return th + amp * (A * u2 + C * u2 * u2 * u2);
  }

  function poseMesh(fl, p, dir) {
    var arr = fl.pos;
    var th = Math.PI * p, S = Math.sin(th), amp = dir * S;
    var W = G.PW, H = G.SH, gap = G.gap, L = gap + W, dx = W / NX;
    var k = 0, iy, ix, v, A, C, y, x, z, a;
    for (iy = 0; iy <= NY; iy++) {
      v = iy / NY;
      A = CURL.top * (1 - v) + CURL.bot * v;     // mép ngoài dẫn (trên) / trễ (dưới)
      C = CURL.corner * v * v * v;               // cuộn thêm ở góc dưới
      y = (0.5 - v) * H;
      a = ang(th, amp, A, C, gap * 0.5, L);
      x = gap * Math.cos(a); z = gap * Math.sin(a);
      arr[k++] = x; arr[k++] = y; arr[k++] = z;
      for (ix = 1; ix <= NX; ix++) {
        a = ang(th, amp, A, C, gap + dx * (ix - 0.5), L);
        x += dx * Math.cos(a); z += dx * Math.sin(a);
        arr[k++] = x; arr[k++] = y; arr[k++] = z;
      }
    }
    fl.gF.attributes.position.needsUpdate = true;
    fl.gF.computeVertexNormals();
    fl.shR.scale.set(G.SW / 2, H, 1);  fl.shR.position.x = G.SW / 4;
    fl.shL.scale.set(-G.SW / 2, H, 1); fl.shL.position.x = -G.SW / 4;
    fl.shR.material.opacity = 0.5 * S * (1 - p);
    fl.shL.material.opacity = 0.5 * S * p;
  }

  gsap.ticker.add(function () {
    if (!GL) return;
    if (anyFlip() || GL.dirty) { GL.r.render(GL.scene, GL.cam); GL.dirty = false; }
  });

  /* ---- điều khiển lật ---- */
  function applyZ() {
    leaves.forEach(function (l, i) {
      l.style.zIndex = moving[i] ? 90 + i : (i < spread ? 10 + i : 10 + leaves.length - i);
    });
  }

  function renderDesktop() {
    leaves.forEach(function (l, i) {
      if (l._tw) { l._tw.kill(); l._tw = null; }
      l._on = false; l._token = (l._token || 0) + 1;
      l._p = i < spread ? 1 : 0;
      l.style.visibility = '';
      l.style.transform = i < spread ? 'rotateY(-180deg)' : '';
      if (l._fl) l._fl.group.visible = false;
    });
    moving = {};
    body.classList.remove('is-flipping');
    if (GL) GL.dirty = true;
    applyZ();
  }

  function finishFlip(leaf, idx, to) {
    leaf._p = to; leaf._on = false; leaf._tw = null;
    leaf.style.transform = to ? 'rotateY(-180deg)' : '';
    leaf.style.visibility = '';
    if (leaf._fl) leaf._fl.group.visible = false;
    if (GL) { GL.r.render(GL.scene, GL.cam); GL.dirty = false; }
    delete moving[idx];
    if (!Object.keys(moving).length) body.classList.remove('is-flipping');
    quietUntil = performance.now() + 900;
    applyZ();
  }

  function cssFlip(leaf, idx, dir, start) {
    var to = dir > 0 ? 1 : 0, q = { p: start };
    leaf._on = false;
    leaf._tw = gsap.to(q, {
      p: to, duration: 1.1, ease: 'power2.inOut',
      onUpdate: function () { leaf._p = q.p; leaf.style.transform = 'rotateY(' + (-180 * q.p).toFixed(2) + 'deg)'; },
      onComplete: function () { finishFlip(leaf, idx, to); }
    });
  }

  function runFlip(leaf, idx, dir) {
    var to = dir > 0 ? 1 : 0, from = dir > 0 ? 0 : 1;
    if (leaf._tw) { leaf._tw.kill(); leaf._tw = null; }
    var start = leaf._p != null ? leaf._p : from;
    leaf._token = (leaf._token || 0) + 1;

    // chưa sẵn sàng 3D: lật CSS luôn, không chờ
if (!glActive() || !glReady(leaf)) { cssFlip(leaf, idx, dir, start); return; }

    var fl = leaf._fl, o = { p: start };
    fl.group.visible = true;
    leaf.style.visibility = 'hidden';
    leaf._on = true;
    poseMesh(fl, o.p, dir);
    GL.dirty = true;
    leaf._tw = gsap.to(o, {
      p: to, duration: CURL.dur, ease: 'power2.inOut',
      onUpdate: function () { leaf._p = o.p; poseMesh(fl, o.p, dir); },
      onComplete: function () { finishFlip(leaf, idx, to); }
    });
  }

  function goSpread(target) {
    target = clamp(target, 0, TOTAL_SPREADS - 1);
    if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
    var dir = target > spread ? 1 : -1;

    function step() {
      if (spread === target) { flipTimer = null; return; }
      var idx = dir > 0 ? spread : spread - 1;
      moving[idx] = true;
      body.classList.add('is-flipping');
      quietUntil = performance.now() + 1800;
      spread += dir;
      applyZ();
      updateUI();
      runFlip(leaves[idx], idx, dir);
      if (spread !== target) flipTimer = setTimeout(step, 420);
    }
    if (spread !== target) step();
  }

  /* chụp sẵn khi tải, chụp lại khi đổi kích thước */
  (function () {
    var fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
    fontsReady.then(function () { setTimeout(prepareAll, 700); });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
 if (isMobile() || !glActive()) return;

  if (spreadEl.offsetWidth === G.SW && spreadEl.offsetHeight === G.SH) return;   // <-- thêm
  fitGL();
  leaves.forEach(function (l) { l._dirty.front = l._dirty.back = true; });
  prepareAll();
}, 400);
    });
  })();

 var mTween = null;
function mFinish(p) {
  pages.forEach(function (el, i) {
    el.classList.toggle('is-m-active', i === p);
    gsap.set(el, { clearProps: 'all' });
  });
}
function setMobilePage(p, dirHint, instant) {
  p = clamp(p, 0, TOTAL_PAGES - 1);
  if (mTween) mTween.progress(1);
  var old = mPage;
  var dir = dirHint || (p >= old ? 1 : -1);
  mPage = p;

  if (instant || p === old || !window.gsap) { mFinish(p); updateUI(); return; }

  var a = pages[old], b = pages[p];
  var mover = dir > 0 ? a : b;
  a.classList.add('is-m-active');
  b.classList.add('is-m-active');
  gsap.set(dir > 0 ? b : a, { zIndex: 10 });
  gsap.set(mover, { zIndex: 15, transformOrigin: '100% 50%', transformPerspective: 1200, rotationY: dir > 0 ? 0 : 180 });
  mTween = gsap.to(mover, {
    rotationY: dir > 0 ? 180 : 0, duration: .85, ease: 'power2.inOut',
    onComplete: function () { mTween = null; mFinish(p); }
  });
  updateUI();
}

  function pageNav(dir) {
    if (view !== 'book') return;
    if (isMobile()) setMobilePage(mPage + dir, dir);
    else goSpread(spread + dir);
  }

  function currentSection() {
    if (view === 'work') return 'work';
    var s = isMobile() ? Math.floor(mPage / 2) : spread;
    return s <= 1 ? 'about' : (s === 2 ? 'store' : 'contact');
  }

  function updateUI() {
    var sec = currentSection();
    navLinks.forEach(function (a) {
      var on = a.getAttribute('data-go') === sec;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var atStart = isMobile() ? mPage === 0 : spread === 0;
    var atEnd = isMobile() ? mPage === TOTAL_PAGES - 1 : spread === TOTAL_SPREADS - 1;
    nextBtn.classList.toggle('is-off', atEnd);
    prevBtn.classList.toggle('is-off', atStart);
    mNext.disabled = atEnd;
    mPrev.disabled = atStart;
    $$('i', mDots).forEach(function (d, i) { d.classList.toggle('is-on', i === mPage); });
    fitStage();
  }

  function go(name, silent) {
    if (name === 'work') {
      showView('work');
    } else {
      showView('book');
      var spreadMap = { about: 0, store: 2, contact: 3 };
      var pageMap = { about: 0, store: 4, contact: 6 };
      if (isMobile()) setMobilePage(pageMap[name], pageMap[name] >= mPage ? 1 : -1);
      else goSpread(spreadMap[name]);
    }
    updateUI();
    if (!silent) {
      try { history.replaceState(null, '', '#' + name); } catch (e) {}
    }
  }

  function showView(v) {
    if (view === v) return;
    view = v;
    body.classList.toggle('view-work', v === 'work');
    body.classList.toggle('view-book', v === 'book');
    workWrap.setAttribute('aria-hidden', v === 'work' ? 'false' : 'true');
    bookWrap.setAttribute('aria-hidden', v === 'work' ? 'true' : 'false');
    if (v === 'work') { cam.enter(); } else { cam.leave(); }
    window.scrollTo(0, 0);
    setTimeout(fitStage, 50);
  }

  /* stage height (cần cho mobile vì 2 view là absolute) */
 function fitStage() {
  if (!isNarrow() || view !== 'work') { stage.style.minHeight = ''; return; }

  var hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 96;
  var el = $('.wbook');
  stage.style.minHeight = Math.max(window.innerHeight, el.offsetHeight + el.offsetWidth * 0.2 + 70 + hdr) + 'px';
}

function fitRot() {
 
}
window.addEventListener('resize', fitRot);
window.addEventListener('orientationchange', fitRot);
window.addEventListener('load', fitRot);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(fitStage);
    ro.observe(bookWrap); ro.observe(workWrap);
  }

  navLinks.concat($$('.brand')).forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      go(a.getAttribute('data-go'));
    });
  });
  nextBtn.addEventListener('click', function () { pageNav(1); });
  prevBtn.addEventListener('click', function () { pageNav(-1); });
  mNext.addEventListener('click', function () { pageNav(1); });
  mPrev.addEventListener('click', function () { pageNav(-1); });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (view === 'book') {
      if (e.key === 'ArrowRight') pageNav(1);
      if (e.key === 'ArrowLeft') pageNav(-1);
    } else {
      cam.key(e);
    }
  });

  // mqMobile.addEventListener ? mqMobile.addEventListener('change', modeChanged) : mqMobile.addListener(modeChanged);
  // function modeChanged() {
  //   if (isMobile()) {
  //     leaves.forEach(function (l) { l.style.transform = ''; l.style.visibility = ''; });
  //     body.classList.remove('is-flipping');
  //     setMobilePage(mPage, 1);
  //   } else {
  //     spread = clamp(Math.floor(mPage / 2), 0, TOTAL_SPREADS - 1);
  //     renderDesktop();
  //     pages.forEach(function (p) { p.classList.remove('is-m-active', 'from-left'); });
  //     if (useGL) { fitGL(); leaves.forEach(function (l) { l._dirty.front = l._dirty.back = true; }); prepareAll(); }
  //   }
  //   updateUI();
  // }

  /* =====================================================
     VINYL / MUSIC
     ===================================================== */
  var vinyl = $('#vinylBtn');
  var audioEl = null, actx = null, master = null, ambTimer = null, musicOn = false;

  function startAmbient() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { toast('Trình duyệt không hỗ trợ âm thanh'); return false; }
    actx = actx || new AC();
    if (actx.state === 'suspended') actx.resume();
    master = actx.createGain();
    master.gain.value = 0;
    var lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100;
    master.connect(lp); lp.connect(actx.destination);
    master.gain.linearRampToValueAtTime(0.8, actx.currentTime + 0.6);
    var chords = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 392.0]];
    var n = 0;
    function play() {
      var t = actx.currentTime;
      chords[n % chords.length].forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.9);
        g.gain.linearRampToValueAtTime(0, t + 3.7);
        o.connect(g); g.connect(master);
        o.start(t + i * 0.07); o.stop(t + 3.9);
      });
      n++;
    }
    play();
    ambTimer = setInterval(play, 3200);
    return true;
  }
  function stopAmbient() {
    clearInterval(ambTimer); ambTimer = null;
    if (master && actx) { master.gain.cancelScheduledValues(actx.currentTime); master.gain.linearRampToValueAtTime(0, actx.currentTime + 0.4); }
  }

  vinyl.addEventListener('click', function () {
    if (!musicOn) {
      var ok = true;
      if (MUSIC_SRC) {
        audioEl = audioEl || new Audio(MUSIC_SRC);
        audioEl.loop = true;
        audioEl.play().catch(function () { toast('Không phát được nhạc'); });
      } else {
        ok = startAmbient();
      }
      if (!ok) return;
      musicOn = true;
    } else {
      if (MUSIC_SRC && audioEl) audioEl.pause(); else stopAmbient();
      musicOn = false;
    }
    vinyl.classList.toggle('is-playing', musicOn);
    vinyl.setAttribute('aria-pressed', String(musicOn));
    vinyl.setAttribute('aria-label', musicOn ? 'Pause music' : 'Play music');
  });

  /* =====================================================
     RETRO TV  (30fps, nghỉ khi đang lật trang)
     ===================================================== */
  var tv = $('#tv'), tvCanvas = $('#tvCanvas'), tvCtx = tvCanvas.getContext('2d');
  var tvVideo = $('#tvVideo'), tvScreen = $('#tvScreen'), tvOsd = $('#tvOsd');
  var tvDial = $('#tvDial'), tvPower = $('#tvPower');
  var tvBtns = $$('.tv__btns button');
  var tvCh = 0, tvOn = true, tvStatic = 0, osdTimer, dialAngle = 0, lastTv = 0;
  var TW = tvCanvas.width, TH = tvCanvas.height;
  var bHeights = [60, 110, 80, 130, 95, 150, 70, 120, 100, 140, 85, 115];

  function drawChannel(i, t) {
    var c = tvCtx, g, k;
    if (i === 0) { // sunset city
      g = c.createLinearGradient(0, 0, 0, TH);
      g.addColorStop(0, '#1b1f4b'); g.addColorStop(.55, '#ff7a59'); g.addColorStop(1, '#ffd27a');
      c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(TW * .5, TH * .6 + Math.sin(t * .6) * 8, 40, 0, 7); c.fill();
      for (k = 0; k < bHeights.length; k++) {
        var x = ((k * 44 - t * 24) % (TW + 80) + (TW + 80)) % (TW + 80) - 40;
        var h = bHeights[k];
        c.fillStyle = '#171327'; c.fillRect(x, TH - h, 38, h);
        c.fillStyle = 'rgba(255,214,120,.8)';
        for (var r = 0; r < h / 22 - 1; r++) { c.fillRect(x + 6, TH - h + 10 + r * 22, 7, 9); c.fillRect(x + 22, TH - h + 10 + r * 22, 7, 9); }
      }
    } else if (i === 1) { // bouncing shapes
      c.fillStyle = '#12303b'; c.fillRect(0, 0, TW, TH);
      for (k = 0; k < 7; k++) {
        var px = TW / 2 + Math.sin(t * (.6 + k * .2) + k) * TW * .38;
        var py = TH / 2 + Math.cos(t * (.8 + k * .15) + k * 2) * TH * .32;
        c.fillStyle = 'hsl(' + (k * 52 + t * 30) % 360 + ',85%,62%)';
        c.beginPath(); c.arc(px, py, 14 + k * 4, 0, 7); c.fill();
      }
    } else { // retro grid
      g = c.createLinearGradient(0, 0, 0, TH);
      g.addColorStop(0, '#2b1055'); g.addColorStop(.55, '#d4418e'); g.addColorStop(.56, '#1a0b3b'); g.addColorStop(1, '#1a0b3b');
      c.fillStyle = g; c.fillRect(0, 0, TW, TH);
      c.fillStyle = '#ffd36e'; c.beginPath(); c.arc(TW / 2, TH * .46, 44, Math.PI, 0); c.fill();
      c.strokeStyle = '#ff7bd5'; c.lineWidth = 1.5;
      var hz = TH * .56;
      for (k = 0; k < 9; k++) { var yy = hz + Math.pow(((k + (t * .8) % 1) / 9), 2.2) * (TH - hz); c.beginPath(); c.moveTo(0, yy); c.lineTo(TW, yy); c.stroke(); }
      for (k = -8; k <= 8; k++) { c.beginPath(); c.moveTo(TW / 2 + k * 6, hz); c.lineTo(TW / 2 + k * 46, TH); c.stroke(); }
    }
  }
  function drawNoise() {
    var img = tvCtx.createImageData(TW, TH), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var v = Math.random() * 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
    tvCtx.putImageData(img, 0, 0);
  }
  function tvActive() {
    if (view !== 'book' || !tvOn || document.hidden) return false;
    return isMobile() ? mPage === 1 : spread === 0;
  }
  var t0 = performance.now();
  function tvLoop(now) {
    requestAnimationFrame(tvLoop);
    if (now - lastTv < 32) return;       // ~30fps
    lastTv = now;
    if (anyFlip()) return;               // nghỉ khi đang lật trang
    if (tvActive() && !tvScreen.classList.contains('has-video')) {
      if (tvStatic > 0) { drawNoise(); tvStatic--; }
      else drawChannel(tvCh, (now - t0) / 1000);
    }
  }
  function showOsd(txt) {
    tvOsd.textContent = txt; tvOsd.classList.add('is-show');
    clearTimeout(osdTimer); osdTimer = setTimeout(function () { tvOsd.classList.remove('is-show'); }, 1600);
  }
  function setChannel(i) {
    tvCh = (i + TV_CHANNELS.length) % TV_CHANNELS.length;
    tvStatic = 8;
    tvBtns.forEach(function (b, n) { b.classList.toggle('is-on', n === tvCh); });
    dialAngle += 60; tvDial.style.transform = 'rotate(' + dialAngle + 'deg)';
    var ch = TV_CHANNELS[tvCh];
    if (ch.src) {
      if (tvVideo.getAttribute('src') !== ch.src) tvVideo.setAttribute('src', ch.src);
      tvScreen.classList.add('has-video');
      if (tvOn) tvVideo.play().catch(function () {});
    } else {
      tvVideo.pause(); tvScreen.classList.remove('has-video');
    }
    showOsd(ch.name || ('CH ' + (tvCh + 1)));
  }
  tvDial.addEventListener('click', function () { if (tvOn) setChannel(tvCh + 1); });
  tvBtns.forEach(function (b) { b.addEventListener('click', function () { if (tvOn) setChannel(+b.getAttribute('data-ch')); }); });
  tvPower.addEventListener('click', function () {
    tvOn = !tvOn;
    tv.classList.toggle('is-off', !tvOn);
    tvPower.style.transform = 'rotate(' + (tvOn ? 0 : 50) + 'deg)';
    if (!tvOn) tvVideo.pause(); else { tvStatic = 6; if (tvScreen.classList.contains('has-video')) tvVideo.play().catch(function () {}); showOsd('CH ' + (tvCh + 1)); }
  });
  requestAnimationFrame(tvLoop);
setChannel(0);   // nạp kênh đầu (video nếu có src)

/* =====================================================
   BRANDS: hộc tủ phiếu (thêm nhãn hàng = thêm 1 dòng)
   ===================================================== */
(function () {
  var BRANDS = [
    { name: 'Solar Soda',     year: '2025', work: 'Campaign photos & launch film', tags: ['Photo', 'Video'] },
    { name: 'Kodama Tea',     year: '2025', work: 'Packaging illustration & label set', tags: ['Design'] },
    { name: 'Wanderlust Air', year: '2024', work: 'Destination stills for a seasonal ad', tags: ['Photo'] },
    { name: 'Midnight Cinema',year: '2024', work: 'Poster series & title cards', tags: ['Design', 'Edit'] },
    { name: 'Bubble & Bean',  year: '2023', work: 'Brand identity & menu design', tags: ['Design'] },
    { name: 'Thread & Tide',  year: '2023', work: 'Lookbook shoot & colour grade', tags: ['Photo', 'Edit'] },
    { name: 'Paper Lantern',  year: '2022', work: 'Short brand film', tags: ['Video'] }
  ];

  var field = $('#brandsField');
  if (!field) return;
  var stack = document.createElement('div');
  stack.className = 'bstack';
  field.appendChild(stack);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mono(n) { return n.split(/\s+|&/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''); }

  var open = 0;
  var cards = BRANDS.map(function (b, i) {
    var el = document.createElement('div');
    el.className = 'bcard';
    el.style.setProperty('--i', i);
    el.style.setProperty('--j', ((i * 37) % 7 - 3) / 12);       // lệch ngang rất nhẹ cho tự nhiên
    el.style.setProperty('--ac', ['#6f7d6c', '#8d7560', '#66758a', '#8a8479', '#7d6a74', '#6d7b76'][i % 6]);
    el.innerHTML =
      '<button type="button" class="bcard__tab" aria-expanded="false">' +
        '<span class="bcard__mono">' + esc(mono(b.name)) + '</span>' +
        '<span class="bcard__name">' + esc(b.name) + '</span>' +
        '<span class="bcard__no">No.' + pad(i + 1) + '</span>' +
      '</button>' +
      '<div class="bcard__body">' +
        '<p class="bcard__work">' + esc(b.work) + '</p>' +
        '<p class="bcard__tags">' + b.tags.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') + '</p>' +
        '<span class="bcard__stamp">' + esc(b.year) + '</span>' +
      '</div>';
    el.querySelector('.bcard__tab').addEventListener('click', function () { setOpen(open === i ? -1 : i); });
    stack.appendChild(el);
    return el;
  });

  function setOpen(n) {
    open = n;
    cards.forEach(function (c, i) {
      c.classList.toggle('is-open', i === n);
      c.classList.toggle('is-after', n >= 0 && i > n);
      c.querySelector('.bcard__tab').setAttribute('aria-expanded', i === n);
    });
  }
var TV_CHANNELS
  function layout() {
    var W = field.clientWidth, H = field.clientHeight;
    if (!W || !H) return;                                        // trang đang display:none (mobile)
    var body = Math.round(W * .36);
    var tab = clamp(Math.floor((H - body - 6) / cards.length), 30, Math.round(W * .15));
    stack.style.setProperty('--tab', tab + 'px');
    stack.style.setProperty('--body', body + 'px');
    stack.style.height = (tab * cards.length + body + 6) + 'px'; // quá nhiều thẻ thì field tự cuộn
  }

  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(field);
  window.addEventListener('resize', layout);
  layout();
  setOpen(0);
})();

// đổi vector kéo trên màn hình -> hệ trục của sổ (đã xoay 90° + scale)
function toLocal(sx, sy) { return { x: sx, y: sy }; }

  /* =====================================================
     TESTIMONIALS: kéo thẻ
     ===================================================== */
  (function () {
    var wrap = $('#cards');
    var cards = $$('.note-card', wrap);
    var order = cards.slice();
    function layout() {
      order.forEach(function (c, i) {
        c.style.zIndex = order.length - i;
        c.style.opacity = i > 2 ? 0 : 1;
        c.style.transform = 'translate(' + (i * 8) + 'px,' + (i * 5) + 'px) rotate(' + (i === 0 ? -1 : (i % 2 ? 3 : -3.5)) + 'deg) scale(' + (1 - i * .035) + ')';
        c.style.pointerEvents = i === 0 ? 'auto' : 'none';
      });
    }
    layout();
    var drag = null;
    wrap.addEventListener('pointerdown', function (e) {
      var top = order[0];
      if (!top.contains(e.target)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0 };
      top.classList.add('is-drag');
      try { top.setPointerCapture(e.pointerId); } catch (er) {}
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var v = toLocal(e.clientX - drag.x, e.clientY - drag.y);
drag.dx = v.x;
var dy = v.y * .25;
      order[0].style.transform = 'translate(' + drag.dx + 'px,' + dy + 'px) rotate(' + (drag.dx / 14) + 'deg)';
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var top = order[0], dx = drag.dx;
      top.classList.remove('is-drag');
      drag = null;
      if (Math.abs(dx) > 70) {
        top.style.transform = 'translate(' + (dx > 0 ? 130 : -130) + '%,0) rotate(' + (dx > 0 ? 25 : -25) + 'deg)';
        top.style.opacity = 0;
        setTimeout(function () { order.push(order.shift()); layout(); }, 320);
      } else layout();
    }
    wrap.addEventListener('pointerup', end);
    wrap.addEventListener('pointercancel', end);
  })();

/* =====================================================
   STORE: kệ hàng + máy in hóa đơn
   ===================================================== */
(function () {
  var linesEl = $('#rcpLines');
  if (!linesEl) return;
  var rcp = $('#rcp'), totalEl = $('#rcpTotal'), countEl = $('#shopCount'), led = $('#shopLed');
  var emptyEl = $('#rcpEmpty'), badgeN = $('#shopBadgeN');
  var cart = {}, order = [], busy = false, orderNo = 42, sctx = null, ledTimer;

  var dt = new Date();
  $('#rcpDate').textContent = pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '/' + String(dt.getFullYear()).slice(2);

  /* ---- âm thanh máy in ---- */
  function ac() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      sctx = sctx || new AC(); if (sctx.state === 'suspended') sctx.resume();
      return sctx;
    } catch (e) { return null; }
  }
  function blip(t, f, d, type, v) {
    var o = sctx.createOscillator(), g = sctx.createGain();
    o.type = type || 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(v || .03, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(sctx.destination); o.start(t); o.stop(t + d + .02);
  }
  function printSound() { if (!ac()) return; var t = sctx.currentTime; for (var i = 0; i < 7; i++) blip(t + i * .055, 900 + Math.random() * 700, .04); }
  function dingSound() { if (!ac()) return; var t = sctx.currentTime; blip(t, 1318, .5, 'sine', .08); blip(t + .12, 1760, .7, 'sine', .07); }

  /* chụp lại trang chứa phần tử này khi lật 3D */
  function dirty(el) {
    var f = el.closest('.face'), l = f && f.closest('.leaf');
    if (l && l._dirty) { l._dirty[f.classList.contains('back') ? 'back' : 'front'] = true; refreshVisible(); }
  }

  function money(n) { return '$' + n.toFixed(2); }

  function totals() {
    var sum = 0, qty = 0;
    order.forEach(function (k) { sum += cart[k].price * cart[k].qty; qty += cart[k].qty; });
    totalEl.textContent = money(sum);
    countEl.textContent = pad(qty);
    badgeN.textContent = qty;
    emptyEl.hidden = order.length > 0;
    led.classList.add('is-on');
    clearTimeout(ledTimer); ledTimer = setTimeout(function () { led.classList.remove('is-on'); }, 500);
    dirty(rcp);
  }

  function makeRow(it) {
    var el = document.createElement('div');
    el.className = 'rline';
    el.innerHTML = '<span class="rline__q"></span><span class="rline__n"></span><span class="rline__p"></span>' +
      '<button type="button" class="rline__x" aria-label="Remove">&times;</button>';
    el.querySelector('.rline__n').textContent = it.name;
    el.querySelector('.rline__x').addEventListener('click', function () { removeOne(it.name); });
    it.el = el;
    linesEl.appendChild(el);
  }

  function paint(it) {
    it.el.querySelector('.rline__q').textContent = it.qty + 'x';
    it.el.querySelector('.rline__p').textContent = money(it.price * it.qty);
  }

  function addItem(name, price) {
    var it = cart[name];
    if (it) {
      it.qty++;
      it.el.classList.remove('is-bump'); void it.el.offsetWidth; it.el.classList.add('is-bump');
    } else {
      it = cart[name] = { name: name, price: price, qty: 1 };
      order.push(name);
      makeRow(it);
    }
    paint(it);
    linesEl.scrollTop = linesEl.scrollHeight;
    totals(); printSound();
  }

  function removeOne(name) {
    var it = cart[name]; if (!it) return;
    it.qty--;
    if (it.qty <= 0) {
      linesEl.removeChild(it.el);
      delete cart[name];
      order.splice(order.indexOf(name), 1);
    } else paint(it);
    totals();
  }

  /* ---- nút Add trên từng sản phẩm ---- */
  $$('.item').forEach(function (el) {
    var btn = $('.item__add', el), label = $('b', btn), tm, tp;
    btn.addEventListener('click', function () {
      if (busy) return;
      addItem(el.getAttribute('data-name'), parseFloat(el.getAttribute('data-price')));
      el.classList.add('is-play'); clearTimeout(tp); tp = setTimeout(function () { el.classList.remove('is-play'); }, 1400);
      btn.classList.add('is-done'); label.textContent = '\u2713 ADDED';
      clearTimeout(tm); tm = setTimeout(function () { btn.classList.remove('is-done'); label.textContent = '+ ADD'; }, 900);
    });
  });

  /* ---- FEED: cuộn giấy trắng ---- */
  $('#shopFeed').addEventListener('click', function () {
    printSound();
    rcp.classList.remove('is-feed'); void rcp.offsetWidth; rcp.classList.add('is-feed');
  });

  /* ---- CHECKOUT: đóng dấu PAID rồi xé hóa đơn ---- */
  $('#shopCheckout').addEventListener('click', function () {
    if (busy) return;
    if (!order.length) { toast('Your bag is empty. Press + ADD on something!'); return; }
    busy = true;
    dingSound();
    rcp.classList.add('is-paid'); dirty(rcp);
    setTimeout(function () { rcp.classList.add('is-tear'); }, 1300);
    setTimeout(function () {
      $$('.rline', linesEl).forEach(function (r) { if (r !== emptyEl) linesEl.removeChild(r); });
      cart = {}; order = [];
      rcp.classList.remove('is-paid', 'is-tear');
      orderNo++; $('#rcpNo').textContent = 'No.' + ('000' + orderNo).slice(-4);
      totals();
      toast('Demo: connect your own checkout here');
      busy = false;
    }, 2300);
  });

  /* mobile: nút BAG nhảy sang trang hóa đơn */
  $('#shopBadge').addEventListener('click', function () { if (isMobile()) pageNav(1); });
})();

  /* =====================================================
     ENQUIRY FORM (3 bước + máy đánh chữ)
     ===================================================== */
  (function () {
    var form = $('#enquiryForm'), err = $('#formError'), typed = $('#typed');
    var steps = $$('.step', form);
    var TO = 'hello@example.com';
    function show(n) { steps.forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-step') === n); }); err.textContent = ''; }
    function typeOut(text) {
      typed.textContent = ''; var i = 0;
      (function tick() {
        if (i > text.length) return;
        typed.textContent = text.slice(0, i++);
        setTimeout(tick, 34);
      })();
    }
    $('#formNext').addEventListener('click', function () {
      var n = form.name.value.trim(), em = form.email.value.trim();
      if (!n) { err.textContent = '*please type your name'; form.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = '*please type a valid email'; form.email.focus(); return; }
      show(2);
    });
    $('#formBack').addEventListener('click', function () { show(1); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.message.value.trim();
      if (!msg) { err.textContent = '*tell me a little about your idea'; form.message.focus(); return; }
      var n = form.name.value.trim(), em = form.email.value.trim();
      show(3);
      typeOut('Thanks ' + n + '!\nYour message is typed up and ready.\nI will reply to ' + em + ' super soon.');
      // Demo: mở ứng dụng mail. Khi triển khai thật hãy thay bằng fetch() tới backend/Formspree.
      var href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Enquiry from ' + n) + '&body=' + encodeURIComponent(msg + '\n\n' + n + ' (' + em + ')');
      setTimeout(function () { window.location.href = href; }, 2600);
    });
  })();

  /* =====================================================
     CAMERA (Work)
     ===================================================== */
  var cam = (function () {
    var lcd = $('#lcd'), media = $('#lcdMedia'), flash = $('#lcdFlash'), bar = $('#lcdBar i');
    var hudMode = $('#hudMode'), hudCount = $('#hudCount'), hudTitle = $('#hudTitle'), hudZoom = $('#hudZoom'), hudMsg = $('#hudMsg'), hudRecTime = $('#hudRecTime');
    var menu = $('#lcdMenu'), note = $('#camNote'), noteText = $('#noteText');
    var tabs = $$('.wtabs button'), menuBtns = $$('#lcdMenu button');
    var playBtn = $('.cam__btn--play'), cameraEl = $('#camera');
    var MODE = { photo: 'PHOTO', video: 'VIDEO', editing: 'EDIT', design: 'DESIGN' };
    var cat = 'photo', idx = 0, power = true, zoom = 1, playing = false, rec = false, recT = 0, showAfter = true;
    var slideTimer = null, vidTimer = null, recTimer = null, msgTimer = null, sid = 0, touched = false, ac = null;

    function scene(it) {
      var id = 'sg' + (++sid), s = '', i, r;
      if (it.kind === 'city') {
        var hs = [90, 140, 110, 170, 120, 150, 100, 160];
        for (i = 0; i < 8; i++) {
          s += '<rect x="' + (i * 50) + '" y="' + (300 - hs[i]) + '" width="48" height="' + hs[i] + '" fill="' + (i % 2 ? it.c1 : it.c2) + '"/>';
          for (r = 0; r < Math.floor(hs[i] / 28); r++) s += '<rect x="' + (i * 50 + 8) + '" y="' + (300 - hs[i] + 10 + r * 28) + '" width="8" height="10" fill="' + it.sun + '" opacity=".7"/><rect x="' + (i * 50 + 28) + '" y="' + (300 - hs[i] + 10 + r * 28) + '" width="8" height="10" fill="' + it.sun + '" opacity=".45"/>';
        }
      } else if (it.kind === 'abstract') {
        s += '<circle cx="130" cy="140" r="86" fill="' + it.sun + '"/><rect x="200" y="90" width="150" height="150" rx="14" fill="' + it.c2 + '" transform="rotate(14 275 165)"/><path d="M40 270 L140 180 L240 270Z" fill="' + it.c1 + '" opacity=".9"/><circle cx="318" cy="238" r="34" fill="' + it.c1 + '"/>';
      } else {
        s += '<path d="M0 220 Q80 150 160 200 T320 190 T400 210 V300 H0Z" fill="' + it.c1 + '"/><path d="M0 255 Q100 205 200 248 T400 242 V300 H0Z" fill="' + it.c2 + '"/>';
      }
      var sunEl = it.kind === 'abstract' ? '' : '<g class="sun"><circle cx="280" cy="96" r="34" fill="' + it.sun + '"/></g>';
      return '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + it.sky[0] + '"/><stop offset="1" stop-color="' + it.sky[1] + '"/></linearGradient></defs><rect width="400" height="300" fill="url(#' + id + ')"/>' + sunEl + s + '</svg>';
    }

    function items() { return WORK[cat]; }
    function say(txt) {
      hudMsg.textContent = txt; hudMsg.classList.add('is-show');
      clearTimeout(msgTimer); msgTimer = setTimeout(function () { hudMsg.classList.remove('is-show'); }, 1100);
    }
    function render(dir) {
      var it = items()[idx];
      if (it.src) {
        media.innerHTML = /\.(mp4|webm|mov)$/i.test(it.src)
          ? '<video src="' + it.src + '" muted loop playsinline' + (playing ? ' autoplay' : '') + '></video>'
          : '<img src="' + it.src + '" alt="">';
      } else media.innerHTML = scene(it);
      media.style.transform = 'scale(' + zoom + ')';
      media.classList.remove('slide-r', 'slide-l');
      if (dir) { void media.offsetWidth; media.classList.add(dir > 0 ? 'slide-r' : 'slide-l'); }
      applyEdit();
      hudMode.textContent = MODE[cat];
      hudCount.textContent = pad(idx + 1) + '/' + pad(items().length);
      hudTitle.textContent = it.title;
      hudZoom.textContent = 'x' + zoom.toFixed(1);
      lcd.classList.toggle('is-video', cat === 'video');
      if (cat !== 'video') { lcd.classList.remove('is-rec'); rec = false; clearInterval(recTimer); }
      tabs.forEach(function (b) { var on = b.getAttribute('data-cat') === cat; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
      menuBtns.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-cat') === cat); });
      syncVideo();
    }
    function applyEdit() {
      var it = items()[idx], svg = media.firstElementChild;
      if (!svg) return;
      svg.style.filter = it.edit && !showAfter ? 'grayscale(1) contrast(.8) brightness(.9)' : 'none';
    }
    var css = document.createElement('style');
    css.textContent = '.lcd.is-playing .sun{animation:sunmove 3s ease-in-out infinite alternate}@keyframes sunmove{from{transform:translate(-60px,24px)}to{transform:translate(20px,-8px)}}';
    document.head.appendChild(css);

    function syncVideo() {
      clearInterval(vidTimer);
      var p = 0; bar.style.width = '0%';
      var v = media.querySelector('video');
      lcd.classList.toggle('is-playing', playing && cat === 'video');
      if (v) { if (playing) v.play().catch(function () {}); else v.pause(); }
      if (cat === 'video' && playing) {
        vidTimer = setInterval(function () {
          if (v && v.duration) p = v.currentTime / v.duration * 100; else p += 100 / 80;
          if (p >= 100) p = 0;
          bar.style.width = p + '%';
        }, 100);
      }
    }
    function sound(kind) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        ac = ac || new AC(); if (ac.state === 'suspended') ac.resume();
        var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(kind === 'shutter' ? 1800 : 900, t); o.frequency.exponentialRampToValueAtTime(kind === 'shutter' ? 300 : 700, t + .08);
        g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + (kind === 'shutter' ? .14 : .05));
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .16);
      } catch (e) {}
    }
    function hint(txt) { noteText.textContent = txt; }

    function setCat(c) {
      cat = c; idx = 0; zoom = 1; stopSlide(); showAfter = true; menu.hidden = true;
      if (c !== 'video') playing = false;
      playBtn.classList.remove('is-on');
      if (!power) powerOn();
      render(1); sound('beep');
    }
    function step(d) {
      if (!power) return;
      idx = (idx + d + items().length) % items().length;
      showAfter = true; render(d); sound('beep');
    }
    function setZoom(z) {
      if (!power) return;
      zoom = clamp(Math.round(z * 100) / 100, 1, 2.5);
      media.style.transform = 'scale(' + zoom + ')'; hudZoom.textContent = 'x' + zoom.toFixed(1); sound('beep');
    }
    function stopSlide() { clearInterval(slideTimer); slideTimer = null; }
    function powerOn() {
      power = true; lcd.classList.remove('is-off'); lcd.classList.add('is-booting');
      setTimeout(function () { lcd.classList.remove('is-booting'); }, 650); render(); sound('beep');
    }
    function powerOff() {
      power = false; stopSlide(); playing = false; playBtn.classList.remove('is-on');
      lcd.classList.add('is-off'); menu.hidden = true; syncVideo(); sound('beep');
    }
    function startRec() {
      rec = true; recT = 0; lcd.classList.add('is-rec'); hudRecTime.textContent = 'REC 00:00';
      recTimer = setInterval(function () { recT++; hudRecTime.textContent = 'REC ' + pad(Math.floor(recT / 60)) + ':' + pad(recT % 60); }, 1000);
    }
    function stopRec() { rec = false; lcd.classList.remove('is-rec'); clearInterval(recTimer); }

    function act(a) {
      if (!touched) { touched = true; hint('Use ◀ ▶ to browse, ▲ ▼ to zoom'); }
      if (a === 'power') { power ? powerOff() : powerOn(); return; }
      if (!power) { say(''); return; }
      if (a === 'left') step(-1);
      else if (a === 'right') step(1);
      else if (a === 'up') setZoom(zoom + .3);
      else if (a === 'down') setZoom(zoom - .3);
      else if (a === 'zoom') setZoom(zoom >= 2.5 ? 1 : zoom + .5);
      else if (a === 'menu') { menu.hidden = !menu.hidden; sound('beep'); }
      else if (a === 'play') {
        playing = !playing; playBtn.classList.toggle('is-on', playing); sound('beep');
        if (cat === 'video') { syncVideo(); say(playing ? '▶ PLAY' : '❚❚ PAUSE'); }
        else {
          stopSlide();
          if (playing) { say('▶ SLIDESHOW'); slideTimer = setInterval(function () { step(1); }, 2200); }
          else say('❚❚ STOP');
        }
      }
      else if (a === 'set') {
        var it = items()[idx];
        if (cat === 'video') { rec ? (stopRec(), say('Saved clip')) : (startRec(), say('● REC')); sound('beep'); }
        else if (cat === 'editing') { showAfter = !showAfter; applyEdit(); say(showAfter ? 'AFTER' : 'BEFORE'); sound('beep'); }
        else { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); sound('shutter'); say('Saved: ' + it.title); }
        if (cat === 'photo') hint('Nice shot! Try the MENU button');
      }
    }

    cameraEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) act(b.getAttribute('data-act'));
    });
    tabs.forEach(function (b) { b.addEventListener('click', function () { setCat(b.getAttribute('data-cat')); }); });
    menuBtns.forEach(function (b) { b.addEventListener('click', function () { setCat(b.getAttribute('data-cat')); }); });
    $('#noteClose').addEventListener('click', function () { note.classList.add('is-gone'); });

    // vuốt trái/phải trên màn hình LCD
    (function () {
      var sx = null;
      lcd.addEventListener('pointerdown', function (e) { sx = e.clientX; });
      lcd.addEventListener('pointerup', function (e) {
        if (sx === null) return; var dx = e.clientX - sx; sx = null;
        if (Math.abs(dx) > 40) act(dx < 0 ? 'right' : 'left');
      });
    })();

    return {
      enter: function () { note.classList.remove('is-gone'); render(); },
      leave: function () { stopSlide(); playing = false; playBtn.classList.remove('is-on'); stopRec(); syncVideo(); menu.hidden = true; },
      key: function (e) {
        var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'set', ' ': 'play', m: 'menu', M: 'menu' };
        if (map[e.key]) { e.preventDefault(); act(map[e.key]); }
      }
    };
  })();

  /* =====================================================
     INIT
     ===================================================== */
  (function init() {
    var h = (location.hash || '').replace('#', '');
    measure();
    fitRot();
    renderDesktop();
    setMobilePage(0, 1, true);

    if (h === 'work' || h === 'store' || h === 'contact') {
      if (h === 'work') { view = 'book'; go('work', true); }
      else { spread = h === 'contact' ? 3 : 2; renderDesktop(); setMobilePage(h === 'contact' ? 6 : 4, 1, true);; updateUI(); }
    }
    updateUI();
    window.addEventListener('resize', fitStage);
    window.addEventListener('load', fitStage);
  })();
})();

