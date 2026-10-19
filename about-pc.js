/* =========================================================
   ABOUT-PC ADD-ON  (about-pc.js)
   Nâng cấp máy tính cổ ở trang "My software".
   - CHỈ BỔ SUNG: không sửa about.js / script.js / logic core.
   - Nạp SAU about.js:  <script src="about-pc.js"></script>
   - Cách hoạt động: tìm .pc đã được about.js dựng, rồi gắn thêm tính năng
     bằng DOM + MutationObserver (không đụng closure của about.js).
   - Các khối được đánh số 1..14, có thể tách thành file riêng.
   Tính năng:
     boot BIOS · menu chuột phải · đổi hình nền (day/night/sunset/synth/matrix)
     · kéo icon + khung chọn + ripple · lịch · trợ lý kẹp giấy · screensaver
     · Notepad · Paint · nút "TRY IT" mini-app trong từng cửa sổ app
   ========================================================= */
(function () {
  'use strict';

  /* =====================================================
     1. TÌM PHẦN TỬ + HÀM TIỆN ÍCH
     ===================================================== */
  var pc = document.querySelector('.apage--sw .pc');
  if (!pc) return;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var hasGsap = !!window.gsap;

  var screen = $('.pc__screen', pc), os = $('.os', pc);
  if (!screen || !os) return;
  var layer = $('.os__wins', os), tasks = $('.os__tasks', os), menu = $('.os__menu', os);
  var tray = $('.os__tray', os), clock = $('.os__clock', os), wall = $('.os__wall', os) || os;
  var volBtn = $('.pc__knob--vol', pc);

  /** Tạo phần tử nhanh: el('div', 'cls', '<b>html</b>') */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  /** Escape HTML để chèn text an toàn */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  /** Đọc/ghi localStorage an toàn (không lỗi khi bị chặn). store(k) = đọc, store(k, v) = ghi */
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem('xwpc:' + k);
      localStorage.setItem('xwpc:' + k, v);
    } catch (e) {}
    return null;
  }
  /** Máy đang tắt (nút Power)? */
  function isOff() { return pc.classList.contains('is-off'); }
  /** Máy tính có đang hiện trên màn hình người dùng không? */
  function isShown() {
    if (!document.body.classList.contains('view-about') || document.hidden) return false;
    if (!pc.getClientRects().length || getComputedStyle(pc).visibility === 'hidden') return false;
    var s2 = pc.closest('.aspread--2');
    return !s2 || s2.classList.contains('is-on');
  }
  /** z-index lớn nhất trong lớp cửa sổ (để đưa cửa sổ lên trên cùng) */
  function maxZ() {
    var m = 20;
    $$('.win', layer).forEach(function (n) { m = Math.max(m, parseInt(n.style.zIndex, 10) || 0); });
    return m;
  }

  /* =====================================================
     2. ÂM THANH (tôn trọng nút Sound của máy)
     ===================================================== */
  var actx = null;
  /** Bíp nhỏ: beep(tần số, độ dài, kiểu sóng, âm lượng, trễ) */
  function beep(f, d, type, v, when) {
    if (volBtn && volBtn.classList.contains('is-mute')) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      actx = actx || new AC(); if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime + (when || 0), o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(v || .03, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02);
    } catch (e) {}
  }
  /** Chuông ngắn (thành công) */
  function chime() { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, .2, 'triangle', .05, i * .08); }); }

  /* =====================================================
     3. THÔNG BÁO NHỎ TRÊN MÀN HÌNH
     ===================================================== */
  var sayEl = el('div', 'xw-say'); os.appendChild(sayEl);
  var sayT = null;
  /** Hiện thông báo ngắn ở đáy màn hình máy tính */
  function say(msg) {
    sayEl.textContent = msg; sayEl.classList.add('is-on');
    clearTimeout(sayT); sayT = setTimeout(function () { sayEl.classList.remove('is-on'); }, 1900);
  }

  /* =====================================================
     4. HÌNH NỀN ĐỔI ĐƯỢC (+ mưa Matrix)
     ===================================================== */
  var THEMES = ['day', 'night', 'sunset', 'synth', 'matrix'];
  var THEME_NAME = { day: 'Sunny day', night: 'Night sky', sunset: 'Sunset', synth: 'Synthwave', matrix: 'Matrix rain' };
  var theme = 'day', rain = null;
  var deco = el('div', 'xw-deco'); wall.appendChild(deco);

  /** Bật mưa chữ Matrix bằng canvas (pixel to cho hợp phong cách cổ) */
  function startRain() {
    if (rain) return;
    var c = el('canvas', 'xw-rain'); deco.appendChild(c);
    var w = c.width = Math.max(60, Math.round((wall.clientWidth || 300) / 2));
    var h = c.height = Math.max(60, Math.round((wall.clientHeight || 200) / 2));
    var g = c.getContext('2d'), cols = Math.floor(w / 8), drops = [], i, raf = 0, last = 0;
    var CH = '01アイウエオカキクケコサシスセソ';
    for (i = 0; i < cols; i++) drops[i] = Math.random() * -20;
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (t - last < 60 || !isShown()) return;
      last = t;
      g.fillStyle = 'rgba(0,12,0,.2)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#4dff7a'; g.font = '8px monospace';
      for (i = 0; i < cols; i++) {
        g.fillText(CH.charAt(Math.floor(Math.random() * CH.length)), i * 8, drops[i] * 8);
        if (drops[i] * 8 > h && Math.random() > .96) drops[i] = 0;
        drops[i]++;
      }
    }
    rain = { stop: function () { cancelAnimationFrame(raf); c.remove(); rain = null; } };
    raf = requestAnimationFrame(loop);
  }

  /** Đổi hình nền. silent = true thì không báo/không kêu (dùng lúc khôi phục) */
  function setTheme(t, silent) {
    if (THEMES.indexOf(t) < 0) t = 'day';
    THEMES.forEach(function (x) { os.classList.remove('xw-th-' + x); });
    if (t !== 'day') os.classList.add('xw-th-' + t);
    theme = t; store('theme', t);
    if (rain) rain.stop();
    if (t === 'matrix') startRain();
    if (!silent) { say('Wallpaper: ' + THEME_NAME[t]); beep(660, .05); beep(880, .07, 'square', .03, .06); }
  }
  /** Chuyển sang hình nền kế tiếp (nút ở khay hệ thống) */
  function nextTheme() { setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]); }

  /* =====================================================
     5. ICON: KÉO THẢ + LƯU VỊ TRÍ + SẮP XẾP LẠI
     ===================================================== */
  var iconDefaults = {}, dragGuard = false;

  /** Đọc vị trí % của icon (--x, --y do about.js đặt) */
  function iconPos(b) { return [parseFloat(b.style.getPropertyValue('--x')) || 0, parseFloat(b.style.getPropertyValue('--y')) || 0]; }
  /** Ghi vị trí % của icon */
  function setIconPos(b, x, y) { b.style.setProperty('--x', x + '%'); b.style.setProperty('--y', y + '%'); }
  /** Lưu vị trí tất cả icon vào localStorage */
  function savePos() {
    var o = {};
    $$('.dico', os).forEach(function (b) { o[b.getAttribute('data-id')] = iconPos(b); });
    store('icons', JSON.stringify(o));
  }
  /** Khôi phục vị trí đã lưu */
  function loadPos() {
    var o = null; try { o = JSON.parse(store('icons') || 'null'); } catch (e) {}
    if (!o) return;
    $$('.dico', os).forEach(function (b) { var p = o[b.getAttribute('data-id')]; if (p) setIconPos(b, p[0], p[1]); });
  }
  /** Đưa icon về vị trí mặc định (có animation nếu có GSAP) */
  function arrange() {
    $$('.dico', os).forEach(function (b) {
      var d = iconDefaults[b.getAttribute('data-id')]; if (!d) return;
      var p = iconPos(b);
      if (hasGsap) {
        var o = { x: p[0], y: p[1] };
        gsap.to(o, { x: d[0], y: d[1], duration: .6, ease: 'back.out(1.4)', onUpdate: function () { setIconPos(b, o.x, o.y); } });
      } else setIconPos(b, d[0], d[1]);
    });
    store('icons', ''); say('Icons arranged'); beep(500, .06);
  }
  /** Cho 1 icon khả năng kéo (chuột/bút; cảm ứng giữ nguyên để cuộn trang) */
  function wireIcon(b) {
    var st = null;
    b.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || e.pointerType === 'touch') return;
      var p = iconPos(b);
      st = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p[0], oy: p[1], moved: false };
    });
    b.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.sx, dy = e.clientY - st.sy;
      if (!st.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        st.moved = true; b.classList.add('xw-dragging');
        try { b.setPointerCapture(e.pointerId); } catch (er) {}
      }
      var r = os.getBoundingClientRect();
      setIconPos(b, clamp(st.ox + dx / r.width * 100, 0, 90), clamp(st.oy + dy / r.height * 100, 0, 78));
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var moved = st.moved; st = null; b.classList.remove('xw-dragging');
      if (moved) { dragGuard = true; setTimeout(function () { dragGuard = false; }, 0); savePos(); beep(300, .05); }
    }
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
  }
  /* chặn "click mở app" ngay sau khi vừa kéo icon (bắt ở capture nên chạy trước handler cũ) */
  os.addEventListener('click', function (e) { if (dragGuard) { e.stopPropagation(); e.preventDefault(); } }, true);

  /** Tạo thêm icon desktop mới (Notepad, Paint...) */
  function addIcon(id, label, x, y, svg, action) {
    var b = el('button', 'dico', '<span class="dico__img">' + svg + '</span>');
    b.type = 'button';
    b.setAttribute('data-id', id); b.setAttribute('data-label', label); b.setAttribute('data-side', 'r');
    b.style.cssText = '--x:' + x + '%;--y:' + y + '%';
    b.addEventListener('click', action);
    os.insertBefore(b, layer && layer.parentNode === os ? layer : null);
    return b;
  }

  /* =====================================================
     6. RIPPLE + KHUNG CHỌN TRÊN DESKTOP
     ===================================================== */
  var BLOCK = '.win,.dico,.os__task,.os__menu,.os__start,.os__tray,.xw-ctx,.xw-cal,.xw-clip,.xw-boot,.xw-saver';
  var selBox = el('i', 'xw-sel'); selBox.hidden = true; os.appendChild(selBox);

  /** Vòng sóng nhỏ tại điểm bấm */
  function ripple(e) {
    var r = os.getBoundingClientRect(), n = el('i', 'xw-rip');
    n.style.left = (e.clientX - r.left) + 'px'; n.style.top = (e.clientY - r.top) + 'px';
    os.appendChild(n); setTimeout(function () { n.remove(); }, 700);
  }
  /** Bỏ chọn tất cả icon */
  function clearSel() { $$('.dico.xw-sel-on', os).forEach(function (b) { b.classList.remove('xw-sel-on'); }); }

  os.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || e.target.closest(BLOCK)) return;
    ripple(e); clearSel();
    if (e.pointerType === 'touch') return;
    var r = os.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, started = false;
    function mv(ev) {
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (!started && Math.hypot(x - sx, y - sy) < 5) return;
      started = true; selBox.hidden = false;
      var l = Math.min(x, sx), t = Math.min(y, sy), w = Math.abs(x - sx), h = Math.abs(y - sy);
      selBox.style.cssText = 'left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + h + 'px';
      $$('.dico', os).forEach(function (b) {
        var br = b.getBoundingClientRect();
        b.classList.toggle('xw-sel-on', br.right - r.left > l && br.left - r.left < l + w && br.bottom - r.top > t && br.top - r.top < t + h);
      });
    }
    function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); selBox.hidden = true; }
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  });

  /* =====================================================
     7. MENU CHUỘT PHẢI (giữ lâu trên cảm ứng)
     ===================================================== */
  var CTX_ITEMS = [
    ['refresh', '\u21BB', 'Refresh'], '-', ['h', '', 'WALLPAPER'],
    ['th:day', '\u2600', 'Sunny day'], ['th:night', '\u263E', 'Night sky'], ['th:sunset', '\u25D0', 'Sunset'],
    ['th:synth', '\u25A6', 'Synthwave'], ['th:matrix', '\u2592', 'Matrix rain'], '-',
    ['arrange', '\u25A4', 'Arrange icons'], ['note', '\u270E', 'New note'], ['paint', '\u2710', 'New drawing'], ['saver', '\u2605', 'Screensaver']
  ];
  var ctx = el('div', 'xw-ctx'); ctx.hidden = true; os.appendChild(ctx);
  ctx.innerHTML = CTX_ITEMS.map(function (it) {
    if (it === '-') return '<hr>';
    if (it[0] === 'h') return '<p>' + it[2] + '</p>';
    return '<button type="button" data-a="' + it[0] + '"><i>' + it[1] + '</i>' + it[2] + '</button>';
  }).join('');

  /** Mở menu tại toạ độ màn hình (clientX/Y) */
  function openCtx(cx, cy) {
    closeCal();
    $$('button[data-a^="th:"]', ctx).forEach(function (b) { b.classList.toggle('is-cur', b.getAttribute('data-a') === 'th:' + theme); });
    ctx.hidden = false;
    var r = os.getBoundingClientRect();
    ctx.style.left = clamp(cx - r.left, 0, Math.max(0, r.width - ctx.offsetWidth - 2)) + 'px';
    ctx.style.top = clamp(cy - r.top, 0, Math.max(0, r.height - ctx.offsetHeight - 2)) + 'px';
    beep(560, .04);
  }
  /** Đóng menu chuột phải */
  function closeCtx() { ctx.hidden = true; }
  /** Chạy 1 hành động theo tên (dùng chung cho menu chuột phải, Start menu, icon) */
  function runAct(a) {
    if (a === 'refresh') refresh();
    else if (a.indexOf('th:') === 0) setTheme(a.slice(3));
    else if (a === 'arrange') arrange();
    else if (a === 'note') openNotepad();
    else if (a === 'paint') openPaint();
    else if (a === 'saver') startSaver(true);
  }
  /** Refresh: nháy trắng + icon nảy lên */
  function refresh() {
    var f = el('i', 'xw-flash'); os.appendChild(f); setTimeout(function () { f.remove(); }, 600);
    if (hasGsap) gsap.fromTo($$('.dico', os), { y: -6 }, { y: 0, duration: .5, ease: 'bounce.out', stagger: .03, clearProps: 'transform' });
    say('Refreshed. Still pretty.'); beep(700, .05); beep(900, .06, 'square', .03, .06);
  }

  ctx.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    closeCtx(); runAct(b.getAttribute('data-a'));
  });
  os.addEventListener('contextmenu', function (e) {
    if (e.target.closest('.win,.os__task,.os__menu,.xw-ctx,.xw-cal')) return;
    e.preventDefault(); openCtx(e.clientX, e.clientY);
  });
  /* giữ ngón tay 0.55s trên nền = menu chuột phải */
  var lpT = null;
  os.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || e.target.closest(BLOCK)) return;
    var sx = e.clientX, sy = e.clientY;
    clearTimeout(lpT);
    lpT = setTimeout(function () { openCtx(sx, sy); }, 550);
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { os.addEventListener(ev, function () { clearTimeout(lpT); }); });
  os.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') clearTimeout(lpT); });

  /* =====================================================
     8. LỊCH (bấm đồng hồ) + NÚT ĐỔI NỀN Ở KHAY HỆ THỐNG
     ===================================================== */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var cal = null, calD = new Date();

  /** Vẽ lại lịch theo tháng đang xem */
  function drawCal() {
    var y = calD.getFullYear(), m = calD.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), now = new Date(), i;
    var h = '<header><button type="button" data-d="-1">\u2039</button><b>' + MONTHS[m] + ' ' + y + '</b><button type="button" data-d="1">\u203A</button></header><div class="xw-cal__g">';
    h += ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d) { return '<i class="dow">' + d + '</i>'; }).join('');
    for (i = 0; i < first; i++) h += '<i></i>';
    for (i = 1; i <= days; i++) h += '<i class="' + (i === now.getDate() && m === now.getMonth() && y === now.getFullYear() ? 'now' : '') + '">' + i + '</i>';
    cal.innerHTML = h + '</div>';
  }
  /** Mở/đóng lịch */
  function toggleCal() {
    if (cal) { closeCal(); return; }
    closeCtx(); calD = new Date();
    cal = el('div', 'xw-cal'); os.appendChild(cal); drawCal(); beep(520, .05);
    cal.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      calD.setMonth(calD.getMonth() + (+b.getAttribute('data-d'))); drawCal(); beep(440, .03);
    });
  }
  /** Đóng lịch */
  function closeCal() { if (cal) { cal.remove(); cal = null; } }

  if (clock) clock.addEventListener('click', function (e) { e.stopPropagation(); toggleCal(); });
  if (tray) {
    var tb = el('button', 'xw-tray', '\u25D0'); tb.type = 'button'; tb.title = 'Change wallpaper'; tb.setAttribute('aria-label', 'Change wallpaper');
    tb.addEventListener('click', nextTheme);
    tray.insertBefore(tb, clock && clock.parentNode === tray ? clock : null);
  }

  /* đóng menu/lịch khi bấm ra ngoài hoặc nhấn Esc */
  document.addEventListener('pointerdown', function (e) {
    if (!ctx.hidden && !e.target.closest('.xw-ctx')) closeCtx();
    if (cal && !e.target.closest('.xw-cal,.os__clock')) closeCal();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeCtx(); closeCal(); } });

  /* =====================================================
     9. CỬA SỔ DO ADD-ON TẠO (dùng chung cho Notepad / Paint)
     ===================================================== */
  var xwins = {};

  /** Đưa cửa sổ add-on lên trên cùng + đánh dấu nút taskbar */
  function focusX(w) {
    w.el.style.zIndex = maxZ() + 1;
    Object.keys(xwins).forEach(function (k) { if (xwins[k].task) xwins[k].task.classList.toggle('is-active', k === w.id && !xwins[k].min); });
  }
  /** Thu nhỏ / khôi phục cửa sổ add-on */
  function setMin(w, on) {
    w.min = on; w.el.classList.toggle('xw-min', on);
    if (w.task) w.task.classList.toggle('is-active', !on);
    if (!on) focusX(w);
  }
  /** Đóng cửa sổ add-on */
  function closeX(w) {
    delete xwins[w.id]; if (w.task) w.task.remove(); beep(320, .08);
    if (hasGsap) gsap.to(w.el, { scale: .85, autoAlpha: 0, duration: .2, onComplete: function () { w.el.remove(); } });
    else w.el.remove();
  }
  /**
   * Mở cửa sổ add-on.
   * o = {title, glyph, color, w, h} (w,h = tỉ lệ so với màn hình), build(body, win) dựng nội dung.
   */
  function openX(id, o, build) {
    var w = xwins[id];
    if (w) { if (w.min) setMin(w, false); focusX(w); return; }
    var L = { w: layer.clientWidth || 420, h: layer.clientHeight || 300 };
    var ww = Math.round(L.w * o.w), hh = Math.round(L.h * o.h), n = Object.keys(xwins).length;
    var node = el('div', 'win xw-win',
      '<div class="win__bar"><span class="win__ico">' + o.glyph + '</span><b class="win__t">' + esc(o.title) + '</b>' +
      '<span class="win__btns"><button type="button" data-x="min" aria-label="Minimise">_</button><button type="button" data-x="x" aria-label="Close">&times;</button></span></div>' +
      '<div class="xw-body"></div>');
    node.style.setProperty('--wa', o.color);
    node.style.width = ww + 'px'; node.style.height = hh + 'px';
    node.style.left = clamp((L.w - ww) / 2 + (n % 4 - 1.5) * L.w * .04, 0, Math.max(0, L.w - ww)) + 'px';
    node.style.top = clamp((L.h - hh) / 2 + (n % 4 - 1.5) * L.h * .04, 0, Math.max(0, L.h - hh)) + 'px';
    layer.appendChild(node);
    w = xwins[id] = { id: id, el: node, min: false, task: null };

    /* nút trên taskbar */
    if (tasks) {
      var t = el('button', 'task', '<i>' + o.glyph + '</i>' + esc(o.title.split(' ')[0])); t.type = 'button';
      t.addEventListener('click', function () { if (w.min) setMin(w, false); else if (t.classList.contains('is-active')) setMin(w, true); else focusX(w); });
      tasks.appendChild(t); w.task = t;
    }
    /* nút min / đóng + kéo thanh tiêu đề */
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.getAttribute('data-x') === 'x') closeX(w); else setMin(w, true);
    });
    node.addEventListener('pointerdown', function () { focusX(w); });
    var bar = $('.win__bar', node);
    bar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      var sx = e.clientX, sy = e.clientY, ol = node.offsetLeft, ot = node.offsetTop;
      try { bar.setPointerCapture(e.pointerId); } catch (er) {}
      function mv(ev) {
        node.style.left = clamp(ol + ev.clientX - sx, 40 - node.offsetWidth, layer.clientWidth - 40) + 'px';
        node.style.top = clamp(ot + ev.clientY - sy, 0, layer.clientHeight - 20) + 'px';
      }
      function up() { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); }
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });

    build($('.xw-body', node), w);
    focusX(w); beep(520, .07); beep(780, .09, 'square', .03, .07);
    if (hasGsap) gsap.fromTo(node, { scale: .8, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .3, ease: 'back.out(1.6)', clearProps: 'transform,opacity,visibility' });
  }

  /** Notepad: gõ là tự lưu */
  function openNotepad() {
    openX('notepad', { title: 'note.txt - Notepad', glyph: '\u270E', color: '#e8892f', w: .62, h: .7 }, function (body) {
      body.innerHTML = '<textarea class="xw-note" spellcheck="false" placeholder="Dear diary,&#10;&#10;(type here, it saves itself)"></textarea><div class="xw-stat"></div>';
      var ta = $('.xw-note', body), st = $('.xw-stat', body);
      ta.value = store('note') || '';
      /** Cập nhật số ký tự + lưu */
      function sync() { st.textContent = ta.value.length + ' chars \u00B7 autosaved'; store('note', ta.value); }
      ta.addEventListener('input', sync); sync();
    });
  }

  /** Paint: vẽ tay, bút cầu vồng, cục tẩy, lưu PNG */
  function openPaint() {
    openX('paint', { title: 'untitled - Paint', glyph: '\u2710', color: '#d14f8b', w: .72, h: .8 }, function (body) {
      var COLORS = ['#111111', '#e0574a', '#e8892f', '#f2c23c', '#43a047', '#31a8ff', '#7d2ae8', '#ffffff'];
      body.innerHTML = '<div class="xw-tools">' +
        COLORS.map(function (c, i) { return '<button type="button" class="xw-sw' + (i ? '' : ' is-on') + '" data-c="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>'; }).join('') +
        '<input type="range" class="xw-size" min="1" max="26" value="5" aria-label="Brush size">' +
        '<button type="button" class="xw-b" data-t="rainbow">RAINBOW</button><button type="button" class="xw-b" data-t="eraser">ERASER</button>' +
        '<button type="button" class="xw-b" data-t="clear">CLEAR</button><button type="button" class="xw-b" data-t="save">SAVE</button></div>' +
        '<div class="xw-cvwrap"><canvas class="xw-cv"></canvas></div>';
      var wrap = $('.xw-cvwrap', body), cv = $('.xw-cv', body), g = cv.getContext('2d');
      var color = COLORS[0], rainbow = false, eraser = false, hue = 0, last = null, size = $('.xw-size', body);

      /** Đặt kích thước canvas theo khung rồi tô nền trắng */
      function fit() {
        cv.width = Math.max(50, wrap.clientWidth); cv.height = Math.max(50, wrap.clientHeight);
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      }
      requestAnimationFrame(fit);
      /** Đổi toạ độ con trỏ -> toạ độ canvas */
      function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
      /** Vẽ 1 đoạn từ điểm a tới b */
      function seg(a, b) {
        if (rainbow && !eraser) { hue = (hue + 5) % 360; g.strokeStyle = 'hsl(' + hue + ',90%,55%)'; }
        else g.strokeStyle = eraser ? '#fff' : color;
        g.lineWidth = +size.value * (eraser ? 2 : 1); g.lineCap = g.lineJoin = 'round';
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      cv.addEventListener('pointerdown', function (e) { last = pt(e); seg(last, [last[0] + .1, last[1]]); try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
      cv.addEventListener('pointermove', function (e) { if (!last) return; var p = pt(e); seg(last, p); last = p; });
      ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { last = null; }); });

      body.addEventListener('click', function (e) {
        var sw = e.target.closest('.xw-sw'), tb2 = e.target.closest('[data-t]');
        if (sw) {
          color = sw.getAttribute('data-c'); eraser = false; rainbow = false;
          $$('.xw-sw', body).forEach(function (s) { s.classList.toggle('is-on', s === sw); });
          $$('[data-t]', body).forEach(function (b) { b.classList.remove('is-on'); }); beep(600, .03);
        } else if (tb2) {
          var t = tb2.getAttribute('data-t');
          if (t === 'rainbow') { rainbow = !rainbow; eraser = false; tb2.classList.toggle('is-on', rainbow); }
          else if (t === 'eraser') { eraser = !eraser; tb2.classList.toggle('is-on', eraser); }
          else if (t === 'clear') { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); say('Canvas cleared'); }
          else if (t === 'save') {
            cv.toBlob(function (bl) {
              if (!bl) return;
              var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = 'my-drawing.png'; a.click();
              setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
            });
            say('Saved my-drawing.png'); chime();
          }
          beep(520, .04);
        }
      });
    });
  }

  /* =====================================================
     10. START MENU + ICON DESKTOP MỚI (Notepad, Paint)
     ===================================================== */
  var SVG_NOTE = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="8" width="40" height="50" rx="3" fill="#fff" stroke="#6b7280" stroke-width="2"/><rect x="12" y="8" width="40" height="10" rx="3" fill="#2b6ac0"/><path d="M20 28h24M20 36h24M20 44h16" stroke="#9aa1ad" stroke-width="2.5" stroke-linecap="round"/></svg>';
  var SVG_PAINT = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8C16 8 6 20 6 32c0 12 10 22 20 22 6 0 6-6 10-8s14 0 20-8C60 22 48 8 32 8z" fill="#f6efe0" stroke="#6b7280" stroke-width="2"/><circle cx="20" cy="26" r="5" fill="#e0574a"/><circle cx="32" cy="20" r="5" fill="#f2c23c"/><circle cx="44" cy="26" r="5" fill="#43a047"/><circle cx="22" cy="40" r="5" fill="#31a8ff"/></svg>';

  /** Thêm mục vào Start menu (cuốn lên trước nút Shut Down) */
  function wireStartMenu() {
    if (!menu) return;
    var hr = $('hr', menu); if (!hr) return;
    menu.insertBefore(document.createElement('hr'), hr);
    [['note', 'Notepad', '\u270E'], ['paint', 'Paint', '\u2710'], ['saver', 'Screensaver', '\u2605']].forEach(function (m) {
      var b = el('button', null, '<span class="mi">' + m[2] + '</span>' + m[1]); b.type = 'button';
      b.addEventListener('click', function () { runAct(m[0]); });
      menu.insertBefore(b, hr);
    });
  }

  /* =====================================================
     11. MÀN HÌNH CHỜ (screensaver): sao bay + logo nảy
     ===================================================== */
  var saver = null, lastAct = Date.now(), IDLE = 30000;

  /** Bật screensaver. force = true: bật ngay dù chưa đủ thời gian nhàn rỗi */
  function startSaver(force) {
    if (saver || isOff() || (!force && !isShown())) return;
    closeCtx(); closeCal();
    saver = el('div', 'xw-saver', '<canvas></canvas><div class="xw-saver__logo">YOURNAME</div><p>move the mouse to wake up</p>');
    screen.appendChild(saver);
    var cv = $('canvas', saver), logo = $('.xw-saver__logo', saver), g = cv.getContext('2d');
    var w = cv.width = Math.max(80, Math.round(screen.clientWidth / 2)), h = cv.height = Math.max(60, Math.round(screen.clientHeight / 2));
    var W = screen.clientWidth, H = screen.clientHeight, stars = [], i, lx = 20, ly = 20, vx = 1.3, vy = 1, hue = 200, raf = 0, armed = Date.now() + 600;
    for (i = 0; i < 80; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * .95 + .05 });

    /** Mỗi khung hình: vẽ sao + di chuyển logo, nảy khi chạm mép */
    function loop() {
      raf = requestAnimationFrame(loop);
      g.fillStyle = 'rgba(0,0,12,.4)'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff';
      stars.forEach(function (s) {
        s.z -= .008;
        var k = 1 / s.z, sx = w / 2 + s.x * k * w * .12, sy = h / 2 + s.y * k * h * .12;
        if (s.z <= .03 || sx < 0 || sx > w || sy < 0 || sy > h) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; return; }
        var r = 1 + (1 - s.z) * 1.6; g.fillRect(sx, sy, r, r);
      });
      var lw = logo.offsetWidth, lh = logo.offsetHeight;
      lx += vx; ly += vy;
      if (lx < 0 || lx + lw > W) { vx = -vx; lx = clamp(lx, 0, W - lw); hue = (hue + 60) % 360; logo.style.color = 'hsl(' + hue + ',90%,62%)'; beep(900, .03, 'square', .015); }
      if (ly < 0 || ly + lh > H) { vy = -vy; ly = clamp(ly, 0, H - lh); hue = (hue + 60) % 360; logo.style.color = 'hsl(' + hue + ',90%,62%)'; beep(700, .03, 'square', .015); }
      logo.style.transform = 'translate(' + lx + 'px,' + ly + 'px)';
    }
    loop();
    /** Thức dậy khi người dùng tương tác */
    function wake() {
      if (Date.now() < armed) return;
      cancelAnimationFrame(raf); saver.remove(); saver = null; lastAct = Date.now();
      ['pointermove', 'pointerdown', 'touchstart'].forEach(function (ev) { document.removeEventListener(ev, wakeIfOver, true); });
      document.removeEventListener('keydown', wake, true);
    }
    /** Chỉ thức dậy khi chuột nằm trên máy tính */
    function wakeIfOver(e) { if (e.target.closest && e.target.closest('.pc')) wake(); }
    ['pointermove', 'pointerdown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, wakeIfOver, true); });
    document.addEventListener('keydown', wake, true);
    saver._stop = function () { cancelAnimationFrame(raf); };
  }
  /** Tắt screensaver ngay (khi tắt máy) */
  function stopSaver() { if (saver) { if (saver._stop) saver._stop(); saver.remove(); saver = null; lastAct = Date.now(); } }

  /* ghi nhận hoạt động trong máy tính để tính thời gian nhàn rỗi */
  ['pointermove', 'pointerdown', 'keydown'].forEach(function (ev) { pc.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  /* kiểm tra mỗi giây: nhàn rỗi quá IDLE ms thì bật screensaver */
  setInterval(function () {
    if (!saver && booted && !booting && isShown() && !isOff() && ctx.hidden && Date.now() - lastAct > IDLE) startSaver();
  }, 1000);

  /* =====================================================
     12. TRỢ LÝ KẸP GIẤY (Clippy)
     ===================================================== */
  var TIPS = [
    'Psst... right-click the desktop for secret stuff.',
    'You can drag the icons anywhere. Try it!',
    'Open an app, then hit TRY IT. They\u2019re real toys.',
    'Draw something in Paint. I won\u2019t judge.',
    'Click the clock. It\u2019s a calendar!',
    'Leave me alone for 30 seconds... something happens.'
  ];
  var clip = null, clipOff = false, tipN = 0, tipT = null, bubT = null, firstWin = true;

  /** Cho kẹp giấy nói 1 câu (tự ẩn sau 6s) */
  function clipSay(txt) {
    if (!clip) return;
    var bub = $('.xw-clip__bub', clip); $('span', bub).textContent = txt; bub.hidden = false;
    clearTimeout(bubT); bubT = setTimeout(function () { bub.hidden = true; }, 6000);
  }
  /** Câu mẹo kế tiếp */
  function nextTip() { clipSay(TIPS[tipN++ % TIPS.length]); beep(900, .03, 'triangle', .03); }

  /** Dựng kẹp giấy: mắt dõi theo chuột, chớp mắt, bấm để nghe mẹo */
  function startClip() {
    if (clip || clipOff) return;
    clip = el('div', 'xw-clip',
      '<div class="xw-clip__bub" hidden><span></span><button type="button" aria-label="Close tips">&times;</button></div>' +
      '<svg class="xw-clip__svg" viewBox="0 0 60 96" aria-hidden="true"><path class="xw-clip__wire" d="M20 62V28C20 6 44 6 44 28V70C44 94 14 94 14 70V34"/>' +
      '<g class="xw-clip__eyes"><circle cx="22" cy="40" r="6.5" fill="#fff"/><circle cx="40" cy="40" r="6.5" fill="#fff"/>' +
      '<circle class="pp" cx="22" cy="40" r="2.6" fill="#222"/><circle class="pp" cx="40" cy="40" r="2.6" fill="#222"/></g></svg>');
    os.appendChild(clip);
    clip.addEventListener('click', function (e) {
      if (e.target.closest('.xw-clip__bub button')) { clipOff = true; clearInterval(tipT); clip.remove(); clip = null; return; }
      nextTip();
    });
    setTimeout(function () { clipSay('Hi! I\u2019m Clippy\u2019s cousin. Right-click anywhere!'); }, 700);
    tipT = setInterval(function () { if (clip && isShown() && !saver) nextTip(); }, 18000);
  }
  /* mắt dõi theo con trỏ */
  os.addEventListener('pointermove', function (e) {
    if (!clip) return;
    var svg = $('.xw-clip__svg', clip), r = svg.getBoundingClientRect();
    var cx = r.left + r.width * .5, cy = r.top + r.height * .42, a = Math.atan2(e.clientY - cy, e.clientX - cx), d = Math.min(2.4, Math.hypot(e.clientX - cx, e.clientY - cy) / 40);
    $$('.pp', clip).forEach(function (p) { p.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px)'; });
  });

  /* =====================================================
     13. KHỞI ĐỘNG MÁY (boot BIOS) - lần đầu hiện ra + mỗi lần bật nguồn
     ===================================================== */
  var booting = false, booted = false, bootEl = null;

  /** Chạy chuỗi boot. short = true: bản ngắn (khi bấm nút nguồn bật lại) */
  function bootSeq(short) {
    if (booting) return;
    booting = true;
    var b = bootEl = el('div', 'xw-boot', '<pre class="xw-boot__log"></pre><div class="xw-boot__logo"><b>YOURNAME</b><span>OS 98</span></div><div class="xw-boot__bar"><i></i></div>');
    screen.appendChild(b);
    var log = $('.xw-boot__log', b), bar = $('.xw-boot__bar i', b);
    var lines = short ? ['Resuming...'] : ['YOURNAME BIOS v1.0', 'CPU: Creative-486 @ 66MHz', 'Memory test: 640K OK', 'Detecting ideas...... FOUND', 'Mounting portfolio.drv', 'Starting desktop...'];
    lines.forEach(function (t, i) {
      setTimeout(function () { if (!b.isConnected) return; log.textContent += t + '\n'; beep(900 + i * 70, .03, 'square', .02); }, i * 220);
    });
    var t0 = lines.length * 220 + 100;
    setTimeout(function () { if (!b.isConnected) return; b.classList.add('is-logo'); bar.style.width = '100%'; beep(440, .1, 'triangle', .04); }, t0);
    setTimeout(function () { if (!b.isConnected) return; chime(); b.classList.add('is-out'); }, t0 + 1100);
    setTimeout(function () {
      if (b.isConnected) b.remove();
      if (bootEl === b) { bootEl = null; booting = false; booted = true; lastAct = Date.now(); startClip(); }
    }, t0 + 1500);
  }
  /* lần boot đầu tiên: chờ máy thực sự hiện ra trước mắt người dùng */
  var watch = setInterval(function () {
    if (booted || booting) { clearInterval(watch); return; }
    if (isShown() && !isOff() && parseFloat(getComputedStyle(pc).opacity) > .05) bootSeq(false);
  }, 400);
  /* bật/tắt nguồn bằng nút Power của about.js: theo dõi class is-off */
  var wasOff = isOff();
  new MutationObserver(function () {
    var off = isOff();
    if (off) { stopSaver(); closeCtx(); closeCal(); if (bootEl) { bootEl.remove(); bootEl = null; booting = false; } }
    if (wasOff && !off) bootSeq(true);
    wasOff = off;
  }).observe(pc, { attributes: true, attributeFilter: ['class'] });

  /* =====================================================
     14. MINI-APP "TRY IT" TRONG TỪNG CỬA SỔ APP CŨ
     ===================================================== */
  var uid = 0;

  /** SVG phong cảnh hoàng hôn dùng làm ảnh mẫu để chỉnh màu */
  function sceneSVG() {
    var id = 'xwg' + (++uid);
    return '<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb88c"/><stop offset="1" stop-color="#de6262"/></linearGradient></defs>' +
      '<rect width="200" height="120" fill="url(#' + id + ')"/><circle cx="140" cy="46" r="16" fill="#fff1b8"/>' +
      '<path d="M0 80Q50 55 100 75T200 70V120H0Z" fill="#8c4a4a"/><path d="M0 100Q60 80 120 98T200 92V120H0Z" fill="#4d2a3a"/></svg>';
  }
  /** Chuyển HSL -> mã hex (#rrggbb) */
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) { var k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return ('0' + Math.round(255 * c).toString(16)).slice(-2); }
    return '#' + f(0) + f(8) + f(4);
  }

  /** Resolve / Lightroom: chỉnh màu trực tiếp + biểu đồ + preset + giữ để xem "before" */
  function tryGrade(pane, label) {
    var S = ['Exposure', 'Contrast', 'Saturation', 'Warmth'];
    var P = { 'Teal/Orange': [0, 30, 25, 20], 'Film': [-5, 15, -20, 35], 'B&W': [0, 25, -100, 0], 'Moody': [-20, 35, -10, -30], 'Reset': [0, 0, 0, 0] };
    pane.innerHTML = '<p class="xw-cap">' + label + '</p><div class="xw-prev">' + sceneSVG() + '<i class="xw-tint"></i></div><div class="xw-scope"></div>' +
      S.map(function (s, i) { return '<label class="xw-sl"><span>' + s + '</span><input type="range" min="-100" max="100" value="0" data-i="' + i + '"><output>0</output></label>'; }).join('') +
      '<div class="xw-row">' + Object.keys(P).map(function (k) { return '<button type="button" data-p="' + k + '">' + k + '</button>'; }).join('') + '<button type="button" class="xw-hold">HOLD: BEFORE</button></div>';
    var prev = $('.xw-prev', pane), tint = $('.xw-tint', pane), svg = $('svg', prev), scope = $('.xw-scope', pane);
    var ins = $$('input[type=range]', pane), outs = $$('output', pane), v = [0, 0, 0, 0], bars = [], base = [], i;
    for (i = 0; i < 28; i++) { var bi = el('i'); scope.appendChild(bi); bars.push(bi); base.push(Math.exp(-Math.pow((i - 12) / 6, 2)) * .8 + Math.random() * .12); }
    /** Áp giá trị slider lên ảnh + biểu đồ */
    function apply() {
      svg.style.filter = 'brightness(' + (1 + v[0] / 120) + ') contrast(' + (1 + v[1] / 100) + ') saturate(' + (1 + v[2] / 100) + ')';
      tint.style.background = v[3] >= 0 ? '#ff9a2e' : '#2e8bff'; tint.style.opacity = Math.abs(v[3]) / 100 * .6;
      var shift = Math.round(v[0] / 100 * 8), spread = 1 + v[1] / 200;
      bars.forEach(function (b, k) { var j = clamp(Math.round((k - 14) / spread + 14 - shift), 0, 27); b.style.height = Math.round(base[j] * 100) + '%'; });
    }
    ins.forEach(function (inp) {
      inp.addEventListener('input', function () { var k = +inp.getAttribute('data-i'); v[k] = +inp.value; outs[k].textContent = inp.value; apply(); });
    });
    $$('[data-p]', pane).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = P[b.getAttribute('data-p')];
        p.forEach(function (val, k) { v[k] = val; ins[k].value = val; outs[k].textContent = val; });
        apply(); beep(600, .04);
      });
    });
    var hold = $('.xw-hold', pane);
    hold.addEventListener('pointerdown', function () { prev.classList.add('is-before'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { hold.addEventListener(ev, function () { prev.classList.remove('is-before'); }); });
    apply();
  }

  /** Photoshop: kéo thanh so sánh + bấm "chữa" các vết bẩn */
  function tryPS(pane) {
    var SP = [[18, 30], [34, 64], [52, 22], [70, 58], [82, 30], [60, 78]];
    pane.innerHTML = '<p class="xw-cap">Drag to compare. Click the dust spots to heal them.</p>' +
      '<div class="xw-prev"><div class="xw-wipe__a">' + sceneSVG() + '</div><div class="xw-wipe__b">' + sceneSVG() + '</div><i class="xw-wipe__bar"></i>' +
      SP.map(function (p) { return '<button type="button" class="xw-spot" style="left:' + p[0] + '%;top:' + p[1] + '%" aria-label="Dust spot"></button>'; }).join('') + '</div>' +
      '<input type="range" class="xw-full" min="0" max="100" value="50" aria-label="Before / after"><div class="xw-row"><span class="xw-stat2">Healed 0/' + SP.length + '</span><button type="button" class="xw-reset">RESET</button></div>';
    var top = $('.xw-wipe__b', pane), bar = $('.xw-wipe__bar', pane), rng = $('.xw-full', pane), st = $('.xw-stat2', pane), n = 0;
    rng.addEventListener('input', function () { top.style.clipPath = 'inset(0 ' + (100 - rng.value) + '% 0 0)'; bar.style.left = rng.value + '%'; });
    $$('.xw-spot', pane).forEach(function (s) {
      s.addEventListener('click', function () {
        if (s.classList.contains('is-gone')) return;
        s.classList.add('is-gone'); n++; st.textContent = 'Healed ' + n + '/' + SP.length; beep(800 + n * 90, .05, 'triangle', .04);
        if (n === SP.length) { say('Flawless. Nobody will ever know.'); chime(); }
      });
    });
    $('.xw-reset', pane).addEventListener('click', function () { n = 0; st.textContent = 'Healed 0/' + SP.length; $$('.xw-spot', pane).forEach(function (s) { s.classList.remove('is-gone'); }); beep(400, .05); });
  }

  /** Lightroom Classic: catalog ảnh, chấm sao, gắn cờ, xuất ảnh có thanh tiến độ */
  function tryCatalog(pane) {
    var G = ['#ffb88c,#de6262', '#a8c0ff,#3f2b96', '#c1f0d0,#2f8f6b', '#355c7d,#c06c84', '#f9f1c6,#e6c75a', '#84fab0,#8fd3f4'];
    var st = G.map(function () { return { r: 0, f: false }; }), sel = 0, busy = false;
    pane.innerHTML = '<p class="xw-cap">Rate (1-5) or flag photos, then Export.</p><div class="xw-grid"></div>' +
      '<div class="xw-row">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-r="' + n + '">' + n + '\u2605</button>'; }).join('') + '<button type="button" data-f="1">\u2691 FLAG</button><button type="button" class="xw-exp">EXPORT</button></div><div class="xw-bar"><i></i></div>';
    var grid = $('.xw-grid', pane), bar = $('.xw-bar i', pane);
    /** Vẽ lại lưới thumbnail */
    function render() {
      grid.innerHTML = G.map(function (c, i) {
        return '<div class="xw-th' + (i === sel ? ' is-on' : '') + '" data-i="' + i + '" style="background:linear-gradient(160deg,' + c + ')"><b>' + new Array(st[i].r + 1).join('\u2605') + '</b>' + (st[i].f ? '<em>\u2691</em>' : '') + '</div>';
      }).join('');
    }
    render();
    grid.addEventListener('click', function (e) { var t = e.target.closest('.xw-th'); if (!t) return; sel = +t.getAttribute('data-i'); render(); beep(520, .03); });
    pane.addEventListener('click', function (e) {
      var r = e.target.closest('[data-r]'), f = e.target.closest('[data-f]');
      if (r) { st[sel].r = +r.getAttribute('data-r'); render(); beep(500 + st[sel].r * 90, .04, 'triangle', .04); }
      if (f) { st[sel].f = !st[sel].f; render(); beep(420, .04); }
    });
    $('.xw-exp', pane).addEventListener('click', function () {
      if (busy) return;
      var picks = st.filter(function (s) { return s.r >= 3 || s.f; }).length;
      if (!picks) { say('Pick something first (3+ stars or a flag)'); return; }
      busy = true; var p = 0;
      var iv = setInterval(function () {
        p += 6 + Math.random() * 8; bar.style.width = Math.min(100, p) + '%'; beep(300 + p * 4, .02, 'square', .012);
        if (p >= 100) { clearInterval(iv); busy = false; say('Exported ' + picks + ' photo' + (picks > 1 ? 's' : '')); chime(); setTimeout(function () { bar.style.width = '0'; }, 900); }
      }, 90);
    });
  }

  /** Notion: danh sách việc có thanh tiến độ, thêm / xoá việc */
  function tryNotion(pane) {
    var items = [['Moodboard', 1], ['Shot list', 1], ['Book location', 0], ['Charge batteries', 0], ['Send invoice', 0]];
    pane.innerHTML = '<p class="xw-cap">Shoot day checklist</p><div class="xw-bar"><i></i></div><div class="xw-todo"></div><div class="xw-row"><input class="xw-txt" maxlength="40" placeholder="Add a task..."><button type="button" class="xw-add">ADD</button></div>';
    var list = $('.xw-todo', pane), bar = $('.xw-bar i', pane), inp = $('.xw-txt', pane);
    /** Vẽ lại danh sách + cập nhật tiến độ */
    function render() {
      list.innerHTML = items.map(function (it, i) {
        return '<label class="' + (it[1] ? 'is-done' : '') + '"><input type="checkbox" data-i="' + i + '"' + (it[1] ? ' checked' : '') + '><span>' + esc(it[0]) + '</span><button type="button" data-x="' + i + '" aria-label="Delete">&times;</button></label>';
      }).join('');
      var d = items.filter(function (it) { return it[1]; }).length;
      bar.style.width = items.length ? (d / items.length * 100) + '%' : '0';
      return items.length > 0 && d === items.length;
    }
    render();
    list.addEventListener('change', function (e) {
      var c = e.target.closest('input[data-i]'); if (!c) return;
      items[+c.getAttribute('data-i')][1] = c.checked ? 1 : 0; beep(c.checked ? 760 : 420, .04, 'triangle', .04);
      if (render()) { say('All done. Go get coffee.'); chime(); }
    });
    list.addEventListener('click', function (e) { var x = e.target.closest('[data-x]'); if (!x) return; e.preventDefault(); items.splice(+x.getAttribute('data-x'), 1); render(); beep(300, .04); });
    /** Thêm việc mới từ ô nhập */
    function add() { var t = inp.value.trim(); if (!t) return; items.push([t, 0]); inp.value = ''; render(); beep(600, .04); }
    $('.xw-add', pane).addEventListener('click', add);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
  }

  /** Canva: poster mini + bảng màu ngẫu nhiên, bấm màu để copy mã hex */
  function tryCanva(pane) {
    pane.innerHTML = '<p class="xw-cap">Shuffle a palette. Click a swatch to copy it.</p><div class="xw-poster"><i class="xw-poster__c"></i><i class="xw-poster__r"></i><b>YOUR NAME</b><small>creative lead</small></div><div class="xw-swatches"></div><div class="xw-row"><input class="xw-txt" maxlength="16" value="YOUR NAME" aria-label="Headline"><button type="button" class="xw-shuf">SHUFFLE</button></div>';
    var poster = $('.xw-poster', pane), sw = $('.xw-swatches', pane), txt = $('.xw-txt', pane), cols = [];
    /** Tạo 5 màu hài hoà (analogous + complementary) rồi áp lên poster */
    function gen() {
      var h = Math.random() * 360;
      cols = [hsl2hex(h, 62, 55), hsl2hex((h + 30) % 360, 72, 60), hsl2hex((h + 180) % 360, 62, 48), hsl2hex(h, 35, 93), hsl2hex((h + 200) % 360, 40, 16)];
      sw.innerHTML = cols.map(function (c) { return '<button type="button" data-c="' + c + '" style="background:' + c + '">' + c.slice(1) + '</button>'; }).join('');
      poster.style.background = cols[3];
      $('.xw-poster__c', poster).style.background = cols[0]; $('.xw-poster__r', poster).style.background = cols[2];
      $('b', poster).style.color = cols[4]; $('small', poster).style.color = cols[1];
    }
    gen();
    $('.xw-shuf', pane).addEventListener('click', function () { gen(); beep(500 + Math.random() * 400, .05, 'triangle', .04); });
    txt.addEventListener('input', function () { $('b', poster).textContent = txt.value || ' '; });
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      var c = b.getAttribute('data-c');
      try { if (navigator.clipboard) navigator.clipboard.writeText(c); } catch (er) {}
      say('Copied ' + c); beep(700, .04);
    });
  }

  /** Slack: chat với "khách hàng" tự trả lời */
  function trySlack(pane) {
    var R = ['Love it. Can you send the invoice?', 'Could the logo be a bit bigger?', 'Perfect, that is exactly the vibe.', 'Amazing. Ship it!', 'Quick one: can we have it by tomorrow?'];
    pane.innerHTML = '<p class="xw-cap"># clients</p><div class="xw-chat"></div><div class="xw-row"><input class="xw-txt" maxlength="80" placeholder="Message #clients"><button type="button" class="xw-send">SEND</button></div>';
    var chat = $('.xw-chat', pane), inp = $('.xw-txt', pane), k = 0;
    /** Thêm 1 tin nhắn vào khung chat */
    function add(who, t, me, cls) {
      var m = el('div', 'xw-msg' + (me ? ' me' : '') + (cls ? ' ' + cls : ''), '<b>' + esc(who) + '</b>' + esc(t));
      chat.appendChild(m); chat.scrollTop = chat.scrollHeight; return m;
    }
    add('Client', 'Hey! Can we move the shoot to Friday?');
    add('You', 'Sure, golden hour works.', 1);
    /** Gửi tin nhắn của mình rồi để khách trả lời sau ~1s */
    function send() {
      var t = inp.value.trim(); if (!t) return;
      inp.value = ''; add('You', t, 1); beep(700, .03);
      var ty = add('Client', 'typing...', 0, 'typing');
      setTimeout(function () { ty.remove(); add('Client', R[k++ % R.length]); beep(900, .05, 'triangle', .04); }, 900 + Math.random() * 700);
    }
    $('.xw-send', pane).addEventListener('click', send);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  }

  /** CapCut: timeline kéo playhead, phát, cắt (split) và xoá clip */
  function tryCut(pane) {
    var COL = ['#e0574a', '#31a8ff', '#7d2ae8'];
    var clips = [{ w: 30, c: COL[0] }, { w: 45, c: COL[1] }, { w: 25, c: COL[2] }], head = 12, sel = -1, playing = false, raf = 0, last = 0;
    pane.innerHTML = '<p class="xw-cap">Drag the timeline. Split, delete, play.</p><div class="xw-mon"><b></b><small></small></div><div class="xw-tl"><div class="xw-clips"></div><i class="xw-head"></i></div>' +
      '<div class="xw-row"><button type="button" data-a="play">\u25B6 PLAY</button><button type="button" data-a="split">\u2702 SPLIT</button><button type="button" data-a="del">DELETE</button><button type="button" data-a="reset">RESET</button></div>';
    var mon = $('.xw-mon', pane), tl = $('.xw-tl', pane), box = $('.xw-clips', pane), hd = $('.xw-head', pane), playBtn = $('[data-a=play]', pane);
    /** Tìm clip nằm dưới playhead -> {i, start} hoặc null */
    function under() {
      var s = 0;
      for (var i = 0; i < clips.length; i++) { if (head >= s && head < s + clips[i].w) return { i: i, start: s }; s += clips[i].w; }
      return null;
    }
    /** Vẽ lại timeline + màn hình xem trước */
    function render() {
      box.innerHTML = clips.map(function (c, i) { return '<i class="xw-clip2' + (i === sel ? ' is-on' : '') + '" data-i="' + i + '" style="width:' + c.w + '%;background:' + c.c + '">' + (i + 1) + '</i>'; }).join('');
      hd.style.left = head + '%';
      var u = under();
      mon.style.background = u ? clips[u.i].c : '#000';
      $('b', mon).textContent = u ? 'CLIP ' + (u.i + 1) : 'NO MEDIA';
      $('small', mon).textContent = '00:0' + Math.floor(head / 100 * 8) + ' / 00:08';
    }
    render();
    /** Đặt playhead theo vị trí con trỏ trên timeline */
    function scrub(e) { var r = tl.getBoundingClientRect(); head = clamp((e.clientX - r.left) / r.width * 100, 0, 99.5); render(); }
    tl.addEventListener('pointerdown', function (e) {
      var c = e.target.closest('.xw-clip2'); sel = c ? +c.getAttribute('data-i') : -1;
      scrub(e); try { tl.setPointerCapture(e.pointerId); } catch (er) {}
      function mv(ev) { scrub(ev); }
      function up() { tl.removeEventListener('pointermove', mv); tl.removeEventListener('pointerup', up); }
      tl.addEventListener('pointermove', mv); tl.addEventListener('pointerup', up);
    });
    /** Vòng lặp phát: playhead chạy hết 8 giây */
    function loop(t) {
      if (!playing || !pane.isConnected) { playing = false; return; }
      raf = requestAnimationFrame(loop);
      head += (t - last) / 80; last = t; if (head >= 100) head = 0; render();
    }
    pane.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'play') {
        playing = !playing; playBtn.textContent = playing ? '\u275A\u275A PAUSE' : '\u25B6 PLAY';
        if (playing) { last = performance.now(); raf = requestAnimationFrame(loop); } else cancelAnimationFrame(raf);
      } else if (a === 'split') {
        var u = under();
        if (!u || head - u.start < 3 || u.start + clips[u.i].w - head < 3) { say('Put the playhead inside a clip first'); return; }
        var c = clips[u.i], first = head - u.start;
        clips.splice(u.i, 1, { w: first, c: c.c }, { w: c.w - first, c: c.c }); sel = -1; render(); beep(1200, .03); beep(600, .05, 'square', .03, .03);
      } else if (a === 'del') {
        if (sel < 0) { say('Click a clip to select it'); return; }
        clips.splice(sel, 1); sel = -1; render(); beep(260, .08);
      } else if (a === 'reset') {
        clips = [{ w: 30, c: COL[0] }, { w: 45, c: COL[1] }, { w: 25, c: COL[2] }]; sel = -1; render(); beep(500, .05);
      }
    });
  }

  /** Recycle Bin: phục hồi file (thất bại), dọn thùng rác (rồi nó đầy lại) */
  function tryBin(pane) {
    var BAD = ['blurry_final.jpg', 'eyes_closed_03.jpg', 'thumb_in_frame.mov', 'why_so_dark.cr3', 'oops.mp4'], items = BAD.slice(), n = 2;
    pane.innerHTML = '<p class="xw-cap">Recycle Bin</p><div class="xw-bin"></div><div class="xw-row"><span class="xw-stat2"></span><button type="button" class="xw-empty-btn">EMPTY BIN</button></div>';
    var list = $('.xw-bin', pane), stat = $('.xw-stat2', pane);
    /** Vẽ lại danh sách file */
    function render() {
      list.innerHTML = items.length ? items.map(function (t, i) { return '<div class="xw-bin__it"><span>\uD83D\uDCC4 ' + esc(t) + '</span><button type="button" data-i="' + i + '">Restore</button></div>'; }).join('') : '<p class="xw-empty">The bin is empty. For now.</p>';
      stat.textContent = items.length + ' object(s)';
    }
    render();
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]'); if (!b) return;
      var row = b.closest('.xw-bin__it'); row.classList.remove('is-shake'); void row.offsetWidth; row.classList.add('is-shake');
      say('Restore failed: file is too bad'); beep(200, .15, 'sawtooth', .03);
    });
    $('.xw-empty-btn', pane).addEventListener('click', function () {
      if (!items.length) { say('Nothing to empty'); return; }
      $$('.xw-bin__it', list).forEach(function (r, i) { setTimeout(function () { r.classList.add('is-out'); beep(500 - i * 60, .05); }, i * 90); });
      setTimeout(function () { items = []; render(); chime(); }, items.length * 90 + 350);
      setTimeout(function () { if (!pane.isConnected) return; items = ['blurry_final_v' + (n++) + '.jpg', 'another_blurry.jpg']; render(); say('The bin refilled itself...'); }, 3200);
    });
  }

  /* bảng map: id app (APPS trong about.js) -> hàm dựng mini-app */
  var TRY = {
    resolve: function (p) { tryGrade(p, 'Colour page: grade the shot'); },
    lr: function (p) { tryGrade(p, 'Develop: tweak or pick a preset'); },
    lrc: tryCatalog, ps: tryPS, notion: tryNotion, canva: tryCanva, slack: trySlack, capcut: tryCut, bin: tryBin
  };

  /** Gắn nút "TRY IT" + khung mini-app vào 1 cửa sổ app của about.js */
  function enhanceWin(w) {
    var id = w.getAttribute('data-app'), canvas = $('.win__canvas', w), build = TRY[id];
    if (!canvas || !build || w._xw) return;
    w._xw = 1;
    if (getComputedStyle(canvas).position === 'static') canvas.style.position = 'relative';
    var btn = el('button', 'xw-try', '\u25B6 TRY IT'), pane = el('div', 'xw-pane'), built = false;
    btn.type = 'button'; pane.hidden = true;
    canvas.appendChild(pane); canvas.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = pane.hidden; pane.hidden = !open; btn.textContent = open ? '\u25C0 INFO' : '\u25B6 TRY IT';
      if (open && !built) { built = true; build(pane); }
      beep(open ? 700 : 500, .05);
    });
    if (firstWin) { firstWin = false; setTimeout(function () { clipSay('Hit TRY IT in the window. It\u2019s interactive!'); }, 900); }
  }
  /* mỗi khi about.js mở cửa sổ app mới -> nâng cấp nó */
  if (layer) {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType === 1 && n.classList.contains('win') && !n.classList.contains('xw-win')) enhanceWin(n);
        });
      });
    }).observe(layer, { childList: true });
    /* bấm vào cửa sổ nào cũng đưa lên trên cùng (kể cả khi lẫn với cửa sổ add-on) */
    layer.addEventListener('pointerdown', function (e) {
      var win = e.target.closest('.win'); if (win) win.style.zIndex = maxZ() + 1;
    });
  }

  /* =====================================================
     15. KHỞI TẠO
     ===================================================== */
  $$('.dico', os).forEach(function (b) { iconDefaults[b.getAttribute('data-id')] = iconPos(b); });
  addIcon('notepad', 'Notepad', 4, 18, SVG_NOTE, openNotepad);
  addIcon('paint', 'Paint', 4, 32, SVG_PAINT, openPaint);
  $$('.dico', os).forEach(function (b) { if (!iconDefaults[b.getAttribute('data-id')]) iconDefaults[b.getAttribute('data-id')] = iconPos(b); wireIcon(b); });
  loadPos();
  wireStartMenu();
  var savedTheme = store('theme'); if (savedTheme && savedTheme !== 'day') setTheme(savedTheme, true);
})();