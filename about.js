/* =========================================================
   ABOUT · SPREAD 2  -  "What I use" + "My software"
   Chỉ BỔ SUNG: không đụng script.js. Cần GSAP (đã có sẵn).
   ========================================================= */
(function () {
  'use strict';

  var abook = document.querySelector('.abook');
  var sp1 = abook && abook.querySelector('.aspread');
  if (!abook || !sp1) return;

  /* =====================================================
     CONFIG  -  phần bạn sẽ sửa/ thay ảnh thật
     ===================================================== */
  // Khung máy tính thật (PNG, khoét trong suốt chỗ màn hình). Lỗi/không có = dùng khung demo CSS.
  var MONITOR_FRAME = 'assets/monitor.png';

  // Đồ nghề. src = ảnh PNG nền trong suốt (vd 'assets/gear/kodak.png'); để '' = dùng hình demo vẽ sẵn.
  // x,y,w = % so với khung trang; r = độ nghiêng. Tên/ghi chú tự sửa cho đúng đồ của bạn.
  var GEAR = [
    { type: 'compact', c: { body: '#9db59a', top: '#d9dcd3' }, name: 'Half-frame 35mm', note: 'my pocket film camera', src: '', x: 2,  y: 3,  w: 38, r: -5 },
    { type: 'retro',   c: { body: '#8a4b2a' },                 name: 'Instant camera',  note: 'leather classic',       src: '', x: 66, y: 1,  w: 31, r: 4 },
    { type: 'instant', c: { body: '#1b1b1d', stripe: 1 },      name: 'Polaroid Now',    note: 'instant film',          src: '', x: 0,  y: 22, w: 32, r: -3 },
    { type: 'compact', c: { body: '#c9ccd1', top: '#8d9299' }, name: 'Point & shoot',   note: 'flash on, always',      src: '', x: 37, y: 19, w: 31, r: 3 },
    { type: 'instant', c: { body: '#f4f2ee', stripe: 1 },      name: 'Mini instant',    note: 'tiny polaroids',        src: '', x: 72, y: 24, w: 25, r: 5 },
    { type: 'lens',    c: { vh: 130, bw: 64 },                 name: 'Prime lens',      note: 'the sharp one',         src: '', x: 40, y: 62, w: 20, r: 2 },
    { type: 'body',    c: {},                                  name: 'Mirrorless body', note: 'daily driver',          src: '', x: 2,  y: 64, w: 35, r: -2 },
    { type: 'lens',    c: { vh: 200, bw: 70 },                 name: 'Tele lens',       note: 'for the far away stuff', src: '', x: 66, y: 58, w: 27, r: 3 }
  ];

  // Ứng dụng trên máy tính. x,y = % vị trí icon trên màn hình. level 0-10 (0 = ẩn thanh skill).
  // src = icon thật (vd 'assets/apps/resolve.png'); '' = icon demo vẽ sẵn.
  var APPS = [
    { id: 'resolve', name: 'DaVinci Resolve',   short: 'Resolve',   file: 'grade.drp',   use: 'Colour grading & final cut: where the mood happens.', level: 9, tags: ['Colour', 'Edit', 'Fairlight'], accent: '#e0574a', src: '', x: 85, y: 4 },
    { id: 'lr',      name: 'Lightroom',         short: 'Lightroom', file: 'preset.xmp',  use: 'Photo edits and my signature presets.',               level: 9, tags: ['Photo', 'Presets'],            accent: '#31a8ff', src: '', x: 85, y: 18 },
    { id: 'notion',  name: 'Notion',            short: 'Notion',    file: 'plan.md',     use: 'Shot lists, moodboards, client plans.',               level: 8, tags: ['Planning', 'Docs'],            accent: '#222222', src: '', x: 85, y: 32 },
    { id: 'canva',   name: 'Canva',             short: 'Canva',     file: 'poster.png',  use: 'Quick posters, socials and decks.',                   level: 8, tags: ['Design', 'Social'],            accent: '#7d2ae8', src: '', x: 85, y: 46 },
    { id: 'slack',   name: 'Slack',             short: 'Slack',     file: 'chat.log',    use: 'Where the team and clients talk.',                    level: 7, tags: ['Team', 'Clients'],             accent: '#e01e5a', src: '', x: 85, y: 60 },
    { id: 'ps',      name: 'Photoshop',         short: 'Photoshop', file: 'retouch.psd', use: 'Retouching and compositing.',                         level: 8, tags: ['Retouch', 'Compose'],          accent: '#31a8ff', src: '', x: 85, y: 74 },
    { id: 'lrc',     name: 'Lightroom Classic', short: 'LrC',       file: 'catalog.lrcat', use: 'The big catalog: every shoot lives here.',          level: 9, tags: ['Catalog', 'Export'],           accent: '#31a8ff', src: '', x: 4,  y: 60 },
    { id: 'capcut',  name: 'CapCut',            short: 'CapCut',    file: 'reel.cc',     use: 'Fast edits for reels and shorts.',                    level: 8, tags: ['Reels', 'Captions'],           accent: '#111111', src: '', x: 4,  y: 74 },
    { id: 'bin',     name: 'Recycle Bin',       short: 'Bin',       file: 'bad-takes',   use: 'Nothing here but bad takes. Kidding. Mostly.',        level: 0, tags: ['bad takes', 'drafts'],         accent: '#777777', src: '', x: 4,  y: 4 }
  ];

  /* ===================================================== */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var body = document.body;
  var hasGsap = !!window.gsap;
  var portrait = window.matchMedia('(max-width: 820px) and (orientation: portrait)').matches;
  var SOUND = true;
  var APP_BY = {};
  APPS.forEach(function (a) { APP_BY[a.id] = a; });

  /* ---------- âm thanh nhỏ (chỉ phát sau khi người dùng bấm) ---------- */
  var actx = null;
  function beep(f, d, type, v, when) {
    if (!SOUND) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = actx || new AC(); if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime + (when || 0), o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(v || .03, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) {}
  }
  function chime(up) {
    (up ? [523, 659, 784, 1047] : [784, 659, 523, 392]).forEach(function (f, i) { beep(f, .22, 'triangle', .05, i * .09); });
  }
  function shutter() { beep(1800, .05, 'square', .05); beep(500, .09, 'square', .04, .04); }

  /* =====================================================
     HÌNH DEMO (SVG) - sẽ tự nhường chỗ khi có ảnh thật
     ===================================================== */
  function lensFace(cx, cy, r, rim) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + rim + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .82) + '" fill="#15181c"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .58) + '" fill="#27384d"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .28) + '" fill="#0a0d12"/>' +
      '<circle cx="' + (cx - r * .22) + '" cy="' + (cy - r * .22) + '" r="' + (r * .1) + '" fill="#fff" opacity=".7"/>';
  }
  function gearSVG(g) {
    var o = g.c || {}, s;
    switch (g.type) {
      case 'compact':
        s = '<svg viewBox="0 0 200 120" aria-hidden="true">' +
          '<rect x="4" y="30" width="192" height="84" rx="12" fill="' + o.body + '"/>' +
          '<rect x="14" y="14" width="64" height="22" rx="4" fill="' + o.top + '"/>' +
          '<rect x="22" y="18" width="20" height="12" rx="2" fill="#1b1f24"/>' +
          '<rect x="150" y="42" width="32" height="14" rx="3" fill="#f3efe2"/>' +
          '<rect x="16" y="52" width="28" height="6" rx="3" fill="rgba(0,0,0,.25)"/>' +
          '<circle cx="168" cy="22" r="7" fill="' + o.top + '"/>' +
          lensFace(104, 72, 38, o.top) + '</svg>';
        break;
      case 'retro':
        s = '<svg viewBox="0 0 200 150" aria-hidden="true">' +
          '<rect x="4" y="34" width="192" height="106" rx="9" fill="' + o.body + '"/>' +
          '<rect x="4" y="34" width="192" height="30" rx="9" fill="#c8cbd0"/>' +
          '<rect x="20" y="42" width="26" height="14" rx="3" fill="#1b1b1d"/>' +
          '<rect x="150" y="40" width="30" height="16" rx="3" fill="#1b1b1d"/>' +
          '<rect x="150" y="84" width="34" height="40" rx="5" fill="rgba(0,0,0,.28)"/>' +
          '<circle cx="167" cy="104" r="7" fill="#c8cbd0"/>' +
          lensFace(86, 96, 46, '#b9bcc2') + '</svg>';
        break;
      case 'instant':
        s = '<svg viewBox="0 0 160 150" aria-hidden="true">' +
          '<rect x="30" y="4" width="100" height="30" rx="10" fill="' + o.body + '" stroke="rgba(0,0,0,.18)" stroke-width="2"/>' +
          '<rect x="6" y="20" width="148" height="126" rx="14" fill="' + o.body + '" stroke="rgba(0,0,0,.18)" stroke-width="2"/>' +
          '<rect x="104" y="30" width="30" height="12" rx="3" fill="#1b1b1d"/>' +
          lensFace(80, 88, 42, '#222') +
          (o.stripe ? '<g transform="translate(118 112)"><rect width="5" height="22" fill="#e53935"/><rect x="5" width="5" height="22" fill="#fb8c00"/><rect x="10" width="5" height="22" fill="#fdd835"/><rect x="15" width="5" height="22" fill="#43a047"/><rect x="20" width="5" height="22" fill="#1e88e5"/></g>' : '') +
          '</svg>';
        break;
      case 'body':
        s = '<svg viewBox="0 0 200 190" aria-hidden="true">' +
          '<rect x="70" y="52" width="60" height="26" rx="6" fill="#18181a"/>' +
          '<rect x="14" y="72" width="172" height="100" rx="12" fill="#1d1d20"/>' +
          '<rect x="146" y="72" width="40" height="100" rx="12" fill="#2a2a2e"/>' +
          '<circle cx="40" cy="64" r="9" fill="#2a2a2e"/><circle cx="160" cy="64" r="9" fill="#2a2a2e"/><circle cx="160" cy="64" r="3.5" fill="#c4202a"/>' +
          '<circle cx="94" cy="128" r="58" fill="#121212"/><circle cx="94" cy="128" r="50" fill="#1c1c20"/>' +
          '<circle cx="94" cy="128" r="44" fill="none" stroke="#c4202a" stroke-width="2"/>' +
          '<circle cx="94" cy="128" r="36" fill="#0c0c0e"/><circle cx="94" cy="128" r="26" fill="#1e2a3d"/><circle cx="94" cy="128" r="12" fill="#080a0f"/>' +
          '<circle cx="86" cy="119" r="5" fill="#fff" opacity=".6"/></svg>';
        break;
      default: // lens
        var H = o.vh, bw = o.bw, i, ribs = '';
        for (i = 0; i < 4; i++) ribs += '<rect x="' + (50 - bw / 2) + '" y="' + (46 + i * ((H - 70) / 4)) + '" width="' + bw + '" height="' + ((H - 70) / 8) + '" fill="#2a2a30"/>';
        s = '<svg viewBox="0 0 100 ' + H + '" aria-hidden="true">' +
          '<rect x="' + (50 - bw / 2) + '" y="26" width="' + bw + '" height="' + (H - 32) + '" rx="7" fill="#17171a"/>' + ribs +
          '<rect x="' + (50 - bw / 2) + '" y="' + (H - 18) + '" width="' + bw + '" height="5" fill="#c4202a"/>' +
          '<ellipse cx="50" cy="26" rx="' + (bw / 2) + '" ry="14" fill="#0a0a0b"/>' +
          '<ellipse cx="50" cy="26" rx="' + (bw / 2 - 7) + '" ry="9" fill="#26354d"/>' +
          '<ellipse cx="44" cy="24" rx="9" ry="3.5" fill="#fff" opacity=".2"/></svg>';
    }
    return s;
  }

  function adobe(txt, fs) {
    return '<rect width="64" height="64" rx="12" fill="#001e36"/><rect x="3" y="3" width="58" height="58" rx="10" fill="none" stroke="#31a8ff" stroke-width="2.5"/>' +
      '<text x="32" y="' + (fs > 26 ? 43 : 40) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="' + fs + '" fill="#31a8ff">' + txt + '</text>';
  }
  function appSVG(a) {
    var s;
    switch (a.id) {
      case 'resolve': s = '<rect width="64" height="64" rx="14" fill="#1f2226"/><circle cx="32" cy="22" r="11" fill="#58c7f5"/><circle cx="22" cy="40" r="11" fill="#f2c23c" opacity=".92"/><circle cx="42" cy="40" r="11" fill="#ef4d5a" opacity=".92"/>'; break;
      case 'lr': s = adobe('Lr', 30); break;
      case 'ps': s = adobe('Ps', 30); break;
      case 'lrc': s = adobe('LrC', 21); break;
      case 'notion': s = '<rect width="64" height="64" rx="12" fill="#fff"/><rect x="2" y="2" width="60" height="60" rx="11" fill="none" stroke="#222" stroke-width="3"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="38" fill="#111">N</text>'; break;
      case 'canva': s = '<rect width="64" height="64" rx="14" fill="#7d2ae8"/><text x="32" y="38" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="16" fill="#fff">Canva</text>'; break;
      case 'slack': s = '<rect width="64" height="64" rx="12" fill="#fff"/><rect x="22" y="9" width="8" height="22" rx="4" fill="#36c5f0"/><rect x="33" y="22" width="22" height="8" rx="4" fill="#2eb67d"/><rect x="34" y="33" width="8" height="22" rx="4" fill="#ecb22e"/><rect x="9" y="34" width="22" height="8" rx="4" fill="#e01e5a"/>'; break;
      case 'capcut': s = '<rect width="64" height="64" rx="12" fill="#fff"/><rect x="1.5" y="1.5" width="61" height="61" rx="11" fill="none" stroke="#ddd" stroke-width="3"/><path d="M18 18 L46 46 M46 18 L33 31 M31 33 L18 46" stroke="#111" stroke-width="8" stroke-linecap="round"/>'; break;
      default: s = '<rect x="18" y="22" width="28" height="34" rx="4" fill="#d7dbe3" stroke="#6b7280" stroke-width="2"/><rect x="13" y="15" width="38" height="7" rx="2" fill="#aeb4c0" stroke="#6b7280" stroke-width="2"/><rect x="27" y="10" width="10" height="5" rx="2" fill="#aeb4c0"/><path d="M26 28v22M32 28v22M38 28v22" stroke="#9aa1ad" stroke-width="2"/>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + s + '</svg>';
  }
  /* đặt icon: demo trước, có src thì thay bằng ảnh thật khi tải xong */
  function setIcon(el, a) {
    el.innerHTML = appSVG(a);
    if (a.src) {
      var im = new Image(); im.alt = ''; im.draggable = false;
      im.onload = function () { el.innerHTML = ''; el.appendChild(im); };
      im.src = a.src;
    }
  }

  /* =====================================================
     DỰNG 2 TRANG MỚI
     ===================================================== */
  function gearHTML() {
    var items = GEAR.map(function (g, i) {
      return '<figure class="gear" data-i="' + i + '" data-x="' + g.x + '" data-y="' + g.y + '" style="--x:' + g.x + '%;--y:' + g.y + '%;--w:' + g.w + '%;--r:' + g.r + 'deg">' +
        '<div class="gear__art">' + gearSVG(g) + '</div><i class="gear__flash"></i>' +
        '<figcaption class="gear__tag"><b>' + esc(g.name) + '</b><small>' + esc(g.note) + '</small></figcaption></figure>';
    }).join('');
    return '<div class="apage__inner gear-page"><div class="gear__field">' +
      '<div class="gear__head"><h2 class="title gear__title">What I use</h2>' +
      '<svg class="g-line" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true"><path pathLength="300" vector-effect="non-scaling-stroke" d="M4 8 C40 2 70 13 105 7 S170 3 196 8"/></svg></div>' +
      items + '<p class="gear__hint">tap a camera &middot; drag to rearrange</p></div></div>';
  }

  function swHTML() {
    var icons = APPS.map(function (a) {
      return '<button type="button" class="dico" data-id="' + a.id + '" data-label="' + esc(a.name) + '" data-side="' + (a.x > 50 ? 'l' : 'r') + '" style="--x:' + a.x + '%;--y:' + a.y + '%"><span class="dico__img"></span></button>';
    }).join('');
    var menu = '<div class="os__menu"><header>My software</header>' +
      APPS.filter(function (a) { return a.id !== 'bin'; }).map(function (a) {
        return '<button type="button" data-id="' + a.id + '"><span class="mi"></span>' + esc(a.name) + '</button>';
      }).join('') +
      '<hr><button type="button" data-power="off"><span class="mi mi--off">&#9211;</span>Shut Down&hellip;</button></div>';
    var task = '<div class="os__task"><button type="button" class="os__start">start</button><div class="os__tasks"></div><div class="os__tray"><span class="os__clock"></span></div></div>';
    return '<div class="apage__inner sw-page"><h2 class="title sw-title">My software</h2>' +
      '<div class="pc">' +
        '<div class="pc__body"><i class="pc__head"></i><i class="pc__recess"></i><i class="pc__drive"><b class="pc__slot"></b></i><i class="pc__vents"></i><i class="pc__foot"></i></div>' +
        '<div class="pc__screen"><div class="os">' +
          '<div class="os__wall"><i class="os__cloud c1"></i><i class="os__cloud c2"></i><i class="os__cloud c3"></i><i class="os__hill h1"></i><i class="os__hill h2"></i></div>' +
          icons + '<div class="os__wins"></div>' + menu + task +
        '</div><i class="pc__off"><b class="pc__dot"></b></i><i class="pc__crt"></i></div>' +
        '<img class="pc__img" src="' + MONITOR_FRAME + '" alt="" draggable="false">' +
        '<button type="button" class="pc__knob pc__knob--pwr" aria-label="Power"></button>' +
        '<button type="button" class="pc__knob pc__knob--vol" aria-label="Sound on/off"></button><i class="pc__led"></i>' +
      '</div><p class="sw-note">click an icon &middot; it opens a little app</p></div>';
  }

  var pageL = document.createElement('div'); pageL.className = 'apage apage--l apage--gear'; pageL.innerHTML = gearHTML();
  var pageR = document.createElement('div'); pageR.className = 'apage apage--r apage--sw';   pageR.innerHTML = swHTML();
  var sp2 = null;

  if (portrait) {
    sp1.appendChild(pageL); sp1.appendChild(pageR);          // SP dọc: xếp tiếp phía dưới, cuộn xuống
  } else {
    sp2 = document.createElement('div');
    sp2.className = 'aspread aspread--2';
    sp2.appendChild(pageL); sp2.appendChild(pageR);
    $$('.rings,[class^="ring-"]', sp1).forEach(function (r) { sp2.appendChild(r.cloneNode(true)); });
    abook.appendChild(sp2);
  }

  /* =====================================================
     TRANG TRÁI: đồ nghề (hover / bấm / kéo)
     ===================================================== */
  (function initGear() {
    var field = $('.gear__field', pageL), z = 30, openTag = null;
    $$('.gear', field).forEach(function (el) {
      var g = GEAR[+el.getAttribute('data-i')], art = $('.gear__art', el), flash = $('.gear__flash', el), st = null;

      if (g.src) {                                           // ảnh thật thay hình demo
        var im = new Image(); im.alt = ''; im.draggable = false;
        im.onload = function () { art.innerHTML = ''; art.appendChild(im); };
        im.src = g.src;
      }

      function poke() {
        if (openTag && openTag !== el) openTag.classList.remove('is-tag');
        var on = !el.classList.contains('is-tag');
        el.classList.toggle('is-tag', on); openTag = on ? el : null;
        el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop');
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
        shutter();
      }

      el.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        st = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: parseFloat(el.dataset.x), oy: parseFloat(el.dataset.y), moved: false, drag: e.pointerType !== 'touch' };
        if (st.drag) { try { el.setPointerCapture(e.pointerId); } catch (er) {} }
      });
      el.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id || !st.drag) return;
        var dx = e.clientX - st.sx, dy = e.clientY - st.sy;
        if (!st.moved) { if (Math.hypot(dx, dy) < 5) return; st.moved = true; el.classList.add('is-drag'); el.style.zIndex = ++z; }
        var r = field.getBoundingClientRect(), w = parseFloat(g.w);
        var nx = clamp(st.ox + dx / r.width * 100, -3, 103 - w), ny = clamp(st.oy + dy / r.height * 100, -3, 96);
        el.dataset.x = nx; el.dataset.y = ny;
        el.style.setProperty('--x', nx + '%'); el.style.setProperty('--y', ny + '%');
      });
      function up(e) {
        if (!st || e.pointerId !== st.id) return;
        var moved = st.moved; st = null; el.classList.remove('is-drag');
        if (!moved && e.type === 'pointerup') poke();
      }
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  })();

  /* =====================================================
     TRANG PHẢI: MÁY TÍNH CỔ
     ===================================================== */
  (function initPC() {
    var pc = $('.pc', pageR), screen = $('.pc__screen', pc), os = $('.os', pc);
    var layer = $('.os__wins', pc), tasks = $('.os__tasks', pc), menu = $('.os__menu', pc);
    var startBtn = $('.os__start', pc), clockEl = $('.os__clock', pc), dot = $('.pc__dot', pc);
    var pwrBtn = $('.pc__knob--pwr', pc), volBtn = $('.pc__knob--vol', pc), img = $('.pc__img', pc);
    var wins = {}, zTop = 20, activeId = null, menuOpen = false, on = true;

    /* khung ảnh thật: có thì ẩn khung demo, không có thì bỏ */
    function frameOK() { pc.classList.add('has-img'); }
    if (img.complete && img.naturalWidth) frameOK();
    img.addEventListener('load', frameOK);
    img.addEventListener('error', function () { img.remove(); });

    /* icon */
    $$('.dico', pc).forEach(function (b) { setIcon($('.dico__img', b), APP_BY[b.getAttribute('data-id')]); });
    $$('.os__menu button[data-id]', pc).forEach(function (b) { setIcon($('.mi', b), APP_BY[b.getAttribute('data-id')]); });

    /* đồng hồ */
    function tick() {
      var d = new Date(), h = d.getHours(), m = d.getMinutes();
      clockEl.textContent = ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
    }
    tick(); setInterval(tick, 15000);

    function layerSize() { return { w: layer.clientWidth, h: layer.clientHeight }; }
    function centerOf(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    /* ---------- quản lý focus ---------- */
    function focusWin(w) {
      activeId = w.id; w.el.style.zIndex = ++zTop;
      Object.keys(wins).forEach(function (k) {
        var on2 = k === w.id;
        wins[k].el.classList.toggle('is-inactive', !on2);
        if (wins[k].task) wins[k].task.classList.toggle('is-active', on2 && !wins[k].min);
      });
    }
    function pickNext() {
      var best = null;
      Object.keys(wins).forEach(function (k) { if (!wins[k].min && (!best || +wins[k].el.style.zIndex > +best.el.style.zIndex)) best = wins[k]; });
      if (best) focusWin(best); else activeId = null;
    }

    /* ---------- mở app: cửa sổ bay ra từ icon ---------- */
    function sparks(el, art) {
      var er = el.getBoundingClientRect(), ar = art.getBoundingClientRect(), i, s, a, d;
      var cx = ar.left - er.left + ar.width / 2, cy = ar.top - er.top + ar.height / 2;
      for (i = 0; i < 12; i++) {
        s = document.createElement('i'); s.className = 'spark'; s.style.left = cx + 'px'; s.style.top = cy + 'px'; el.appendChild(s);
        a = Math.random() * 6.283; d = art.offsetWidth * (.7 + Math.random() * .9);
        gsap.fromTo(s, { x: 0, y: 0, scale: 1, rotation: 0, autoAlpha: 1 }, {
          x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, rotation: Math.random() * 360, autoAlpha: 0,
          duration: .7 + Math.random() * .4, ease: 'power2.out',
          onComplete: (function (n) { return function () { n.remove(); }; })(s)
        });
      }
    }

    function openApp(id, src) {
      var a = APP_BY[id]; if (!a) return;
      var w = wins[id];
      if (w) { if (w.min) restoreWin(w); else focusWin(w); beep(660, .06); return; }

      w = wins[id] = { id: id, app: a, min: false, max: false };
      var el = w.el = document.createElement('div');
      el.className = 'win'; el.style.setProperty('--wa', a.accent);
      var seg = '', i, tools = '';
      for (i = 0; i < 10; i++) seg += '<i></i>';
      for (i = 0; i < 12; i++) tools += '<i></i>';
      el.innerHTML =
        '<div class="win__bar"><span class="win__ico"></span><b class="win__t">' + esc(a.file + ' - ' + a.short) + '</b>' +
        '<span class="win__btns"><button type="button" data-w="min" aria-label="Minimise">_</button><button type="button" data-w="max" aria-label="Maximise">&#9633;</button><button type="button" data-w="x" aria-label="Close">&times;</button></span></div>' +
        '<div class="win__menu">File &nbsp;Edit &nbsp;View &nbsp;Image &nbsp;Options &nbsp;Help</div>' +
        '<div class="win__main"><div class="win__tools">' + tools + '</div><div class="win__canvas">' +
          '<div class="win__art"><span class="win__img"></span><i class="win__dots"></i></div>' +
          '<b class="win__name">' + esc(a.name) + '</b>' +
          (a.level ? '<div class="win__meter">SKILL<span>' + seg + '</span></div>' : '') +
          '<p class="win__tags">' + a.tags.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') + '</p>' +
        '</div></div><div class="win__status">' + esc(a.use) + '</div>';
      layer.appendChild(el);
      setIcon($('.win__img', el), a);
      setIcon($('.win__ico', el), a);

      /* vị trí: giữa màn hình, mỗi cửa sổ lệch nhẹ */
      var L = layerSize(), n = Object.keys(wins).length - 1;
      var left = clamp((L.w - el.offsetWidth) / 2 + ((n % 3) - 1) * L.w * .05, 0, Math.max(0, L.w - el.offsetWidth));
      var top = clamp((L.h - el.offsetHeight) / 2 + ((n % 3) - 1) * L.h * .04, 0, Math.max(0, L.h - el.offsetHeight));
      el.style.left = left + 'px'; el.style.top = top + 'px';

      /* nút trên taskbar */
      var tb = w.task = document.createElement('button');
      tb.type = 'button'; tb.className = 'task';
      tb.innerHTML = '<i></i>' + esc(a.short);
      setIcon($('i', tb), a);
      tb.addEventListener('click', function () {
        if (w.min) restoreWin(w);
        else if (activeId === w.id) minWin(w);
        else focusWin(w);
      });
      tasks.appendChild(tb);

      focusWin(w);
      beep(520, .07); beep(780, .09, 'square', .03, .07);

      /* sự kiện cửa sổ */
      el.addEventListener('pointerdown', function () { focusWin(w); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-w]'); if (!b) return;
        var k = b.getAttribute('data-w');
        if (k === 'x') closeWin(w); else if (k === 'min') minWin(w); else maxWin(w);
      });
      var bar = $('.win__bar', el);
      bar.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button') || w.max) return;
        var sx = e.clientX, sy = e.clientY, ol = el.offsetLeft, ot = el.offsetTop;
        try { bar.setPointerCapture(e.pointerId); } catch (er) {}
        function mv(ev) {
          var Ls = layerSize();
          el.style.left = clamp(ol + ev.clientX - sx, 40 - el.offsetWidth, Ls.w - 40) + 'px';
          el.style.top = clamp(ot + ev.clientY - sy, 0, Ls.h - 20) + 'px';
        }
        function up() { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); }
        bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
      });

      /* FLIP: bay ra từ icon + icon to bung ra */
      if (!hasGsap) return;
      var art = $('.win__art', el), dots = $('.win__dots', el), segs = $$('.win__meter i', el);
      var wr = el.getBoundingClientRect();
      var from = src ? centerOf(src.getBoundingClientRect()) : centerOf(wr);
      var sc = src ? Math.max(.06, src.getBoundingClientRect().width / wr.width) : .5;
      var cw = centerOf(wr);
      gsap.fromTo(el, { x: from.x - cw.x, y: from.y - cw.y, scale: sc, autoAlpha: 0, transformOrigin: '50% 50%' },
        { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: .6, ease: 'back.out(1.2)', clearProps: 'transform,opacity,visibility' });
      gsap.fromTo(art, { scale: .15, rotation: -22 }, { scale: 1, rotation: 0, duration: .75, delay: .3, ease: 'back.out(2)', clearProps: 'transform' });
      gsap.fromTo(art, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .6, delay: .3, ease: 'steps(8)', clearProps: 'clipPath' });
      gsap.fromTo(dots, { opacity: .95 }, { opacity: 0, duration: .9, delay: .5, ease: 'steps(6)' });
      gsap.delayedCall(.55, function () { if (el.parentNode) sparks(el, art); });
      segs.forEach(function (sg, k) {
        gsap.delayedCall(.75 + k * .05, function () { if (k < a.level) sg.classList.add('on'); });
      });
    }

    function iconEl(id) { return $('.dico[data-id="' + id + '"] .dico__img', pc); }

    function closeWin(w) {
      beep(320, .09);
      delete wins[w.id];
      if (w.task) w.task.remove();
      var el = w.el;
      if (!hasGsap) { el.remove(); pickNext(); return; }
      var ic = iconEl(w.id), wr = el.getBoundingClientRect(), cw = centerOf(wr);
      var to = ic && !w.min ? centerOf(ic.getBoundingClientRect()) : cw;
      gsap.to(el, {
        x: to.x - cw.x, y: to.y - cw.y, scale: ic ? Math.max(.06, ic.getBoundingClientRect().width / wr.width) : .6, autoAlpha: 0,
        duration: .38, ease: 'power3.in', onComplete: function () { el.remove(); }
      });
      pickNext();
    }

    function minWin(w) {
      w.min = true; w.task.classList.remove('is-active'); beep(420, .06);
      if (hasGsap) {
        var tr = centerOf(w.task.getBoundingClientRect()), wr = w.el.getBoundingClientRect(), cw = centerOf(wr);
        gsap.to(w.el, { x: tr.x - cw.x, y: tr.y - cw.y, scale: .08, autoAlpha: 0, transformOrigin: '50% 50%', duration: .35, ease: 'power3.in' });
      } else w.el.style.visibility = 'hidden';
      pickNext();
    }
    function restoreWin(w) {
      w.min = false; beep(600, .06);
      if (hasGsap) gsap.to(w.el, { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: .38, ease: 'back.out(1.3)', clearProps: 'transform' });
      else w.el.style.visibility = '';
      focusWin(w);
    }
    function maxWin(w) {
      var el = w.el, L = layerSize(); beep(500, .05);
      if (!w.max) {
        w.prev = { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        w.max = true; el.classList.add('is-max');
        if (hasGsap) gsap.to(el, { left: 0, top: 0, width: L.w, height: L.h, duration: .35, ease: 'power3.inOut' });
        else { el.style.left = el.style.top = '0px'; el.style.width = L.w + 'px'; el.style.height = L.h + 'px'; }
      } else {
        w.max = false; el.classList.remove('is-max');
        var done = function () { el.style.height = ''; };
        if (hasGsap) gsap.to(el, { left: w.prev.l, top: w.prev.t, width: w.prev.w, height: w.prev.h, duration: .35, ease: 'power3.inOut', onComplete: done });
        else { el.style.left = w.prev.l + 'px'; el.style.top = w.prev.t + 'px'; el.style.width = w.prev.w + 'px'; done(); }
      }
      focusWin(w);
    }

    /* ---------- icon trên desktop ---------- */
    $$('.dico', pc).forEach(function (b) {
      b.addEventListener('click', function () { closeMenu(); openApp(b.getAttribute('data-id'), $('.dico__img', b)); });
    });

    /* ---------- Start menu ---------- */
    function openMenu() { menuOpen = true; menu.classList.add('is-open'); startBtn.classList.add('is-open'); beep(500, .05); }
    function closeMenu() { menuOpen = false; menu.classList.remove('is-open'); startBtn.classList.remove('is-open'); }
    startBtn.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      closeMenu();
      if (b.getAttribute('data-power') === 'off') { power(false); return; }
      openApp(b.getAttribute('data-id'), $('.mi', b));
    });
    document.addEventListener('pointerdown', function (e) {
      if (menuOpen && !e.target.closest('.os__menu') && !e.target.closest('.os__start')) closeMenu();
    });

    /* ---------- bật / tắt máy (CRT) ---------- */
    function power(next) {
      if (next === on) return;
      on = next; closeMenu(); pc.classList.toggle('is-off', !on);
      if (!hasGsap) { os.style.visibility = on ? '' : 'hidden'; return; }
      gsap.killTweensOf([os, dot]);
      if (!on) {
        chime(false);
        gsap.timeline()
          .to(os, { scaleY: .015, duration: .22, ease: 'power3.in' })
          .to(os, { scaleX: 0, duration: .18, ease: 'power2.in' })
          .set(os, { visibility: 'hidden' })
          .fromTo(dot, { opacity: 1, scale: 1 }, { opacity: 0, scale: .1, duration: .8, ease: 'power2.out' }, '-=.12');
      } else {
        chime(true);
        gsap.set(os, { visibility: 'inherit', scaleX: 0, scaleY: .015 });
        gsap.timeline()
          .to(os, { scaleX: 1, duration: .2, ease: 'power2.out' })
          .to(os, { scaleY: 1, duration: .35, ease: 'power3.out' })
          .fromTo(os, { filter: 'brightness(2.6)' }, { filter: 'brightness(1)', duration: .6, clearProps: 'filter,transform,visibility' }, '<');
      }
    }
    pwrBtn.addEventListener('click', function () { power(!on); });
    volBtn.addEventListener('click', function () { SOUND = !SOUND; volBtn.classList.toggle('is-mute', !SOUND); if (SOUND) beep(700, .06); });

    /* Esc đóng cửa sổ trên cùng (chỉ khi đang ở About) */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !body.classList.contains('view-about')) return;
      if (menuOpen) { closeMenu(); return; }
      if (activeId && wins[activeId]) closeWin(wins[activeId]);
    });
  })();

  /* =====================================================
     ANIMATION VÀO CHO 2 TRANG
     ===================================================== */
  function introGear() {
    if (!hasGsap) return;
    var items = $$('.gear', pageL), path = $('.g-line path', pageL), title = $('.gear__title', pageL);
    gsap.fromTo(items, { y: -50, autoAlpha: 0, scale: .6 }, { y: 0, autoAlpha: 1, scale: 1, duration: .65, ease: 'back.out(1.8)', stagger: .07, clearProps: 'transform,opacity,visibility' });
    gsap.fromTo(title, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, delay: .35, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
    gsap.fromTo(path, { strokeDashoffset: 300 }, { strokeDashoffset: 0, duration: .9, delay: .7, ease: 'power2.out' });
  }
  function introSW() {
    if (!hasGsap) return;
    gsap.fromTo($('.sw-title', pageR), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, delay: .15, ease: 'power2.out', clearProps: 'transform,opacity,visibility' });
    gsap.fromTo($('.pc', pageR), { y: 36, autoAlpha: 0, scale: .94 }, { y: 0, autoAlpha: 1, scale: 1, duration: .8, delay: .2, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    gsap.fromTo($$('.dico', pageR), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .45, delay: .6, ease: 'back.out(2.6)', stagger: .07, clearProps: 'transform,opacity,visibility' });
  }
  function intro() { introGear(); introSW(); }

  /* =====================================================
     LẬT GIỮA SPREAD 1 <-> 2 (PC / SP ngang)
     ===================================================== */
  if (!portrait && sp2) {
    var cur = 1, busy = false;
    function mkArrow(cls, label, d) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'arrow ' + cls + ' a-arrow'; b.setAttribute('aria-label', label);
      b.innerHTML = '<svg viewBox="0 0 120 60" aria-hidden="true"><path d="' + d + '"/></svg>';
      abook.appendChild(b); return b;
    }
    var next = mkArrow('arrow--next a-arrow--next', 'Next: what I use', 'M6 32 C34 26 62 28 100 30 M80 10 C92 18 104 24 114 30 C102 38 90 46 78 54');
    var prev = mkArrow('arrow--prev a-arrow--prev', 'Back to about', 'M114 32 C86 26 58 28 20 30 M40 10 C28 18 16 24 6 30 C18 38 30 46 42 54');

    function setArrows() { next.classList.toggle('is-off', cur === 2); prev.classList.toggle('is-off', cur === 1); }
    function show(el) { if (el === sp1) el.classList.remove('is-off'); else el.classList.add('is-on'); }
    function hide(el) { if (el === sp1) el.classList.add('is-off'); else el.classList.remove('is-on'); }
    function showSpread(n) { cur = n; if (n === 1) { show(sp1); hide(sp2); } else { hide(sp1); show(sp2); } setArrows(); }
    setArrows();

    function flip(n) {
      if (busy || n === cur) return;
      if (!hasGsap) { showSpread(n); if (n === 2) intro(); return; }
      busy = true;
      var dir = n > cur ? 1 : -1, from = cur === 1 ? sp1 : sp2, to = n === 1 ? sp1 : sp2;
      var mv = $(dir > 0 ? '.apage--r' : '.apage--l', from);     // trang đang lật
      var land = $(dir > 0 ? '.apage--l' : '.apage--r', to);      // trang hạ cánh
      beep(380, .12, 'triangle', .04);

      from.style.zIndex = 3; to.style.zIndex = 2;
      land.style.visibility = 'hidden';
      show(to);

      gsap.set(mv, { transformOrigin: dir > 0 ? '0% 50%' : '100% 50%' });
      gsap.to(mv, {
        rotationY: dir > 0 ? -90 : 90, filter: 'brightness(.8)', duration: .45, ease: 'power2.in',
        onComplete: function () {
          mv.style.visibility = 'hidden';
          to.style.zIndex = 3; from.style.zIndex = 2;
          land.style.visibility = '';
          gsap.fromTo(land, { rotationY: dir > 0 ? 90 : -90, transformOrigin: dir > 0 ? '100% 50%' : '0% 50%', filter: 'brightness(.8)' },
            { rotationY: 0, filter: 'brightness(1)', duration: .45, ease: 'power2.out',
              onComplete: function () {
                hide(from);
                gsap.set([mv, land], { clearProps: 'transform,filter,visibility' });
                from.style.zIndex = ''; to.style.zIndex = '';
                cur = n; busy = false; setArrows();
                if (n === 2) intro();
              } });
        }
      });
    }
    next.addEventListener('click', function () { flip(2); });
    prev.addEventListener('click', function () { flip(1); });
    document.addEventListener('keydown', function (e) {
      if (!body.classList.contains('view-about')) return;
      if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === 'ArrowRight') flip(2);
      if (e.key === 'ArrowLeft') flip(1);
    });

    /* mỗi lần vào lại About thì quay về spread 1 */
    var was = body.classList.contains('view-about');
    new MutationObserver(function () {
      var now = body.classList.contains('view-about');
      if (now && !was && cur !== 1 && !busy) showSpread(1);
      was = now;
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  /* SP dọc: animation chạy khi cuộn tới từng trang */
  if (portrait && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        if (e.target === pageL) introGear(); else introSW();
      });
    }, { threshold: .25 });
    io.observe(pageL); io.observe(pageR);
  }
})();