/* Mockup runtime: injects shells (admin / customer), demo bar with prev/next, and light interactions.
   Page contract:
     <body data-shell="admin|customer|bare" data-nav="<module slug>" data-crumb="..." data-cust-nav="<key>">
       <main id="screen"> ...page content only... </main>
       <section class="ux-notes"> ...numbered notes + rules... </section>   (optional, stays outside the shell)
   Interactions:  data-tabs / [data-tab] / [data-panel] · [data-open="#modal"] / [data-close] ·
                  [data-reveal="name=value"] (shows when radio/select `name` has value) · .flip (click to flip) · .seg buttons */
(function () {
  var REG = window.MOCKUP || { modules: [] };
  var parts = location.pathname.replace(/\\/g, '/').split('/');
  var file = parts[parts.length - 1] || '';
  var slug = parts[parts.length - 2] || '';
  var mod = REG.modules.filter(function (m) { return m.slug === slug; })[0];
  var inModule = !!mod;
  var base = inModule ? '../' : './';           // path from this page to /mockup/

  function firstScreen(m, role) {
    var s = m.screens.filter(function (x) { return x.role === role; })[0];
    return s ? s.file : m.screens[0].file;
  }
  function hrefAdmin(m) { return base + m.slug + '/' + firstScreen(m, 'admin'); }
  function hrefCust(m) { return base + m.slug + '/' + firstScreen(m, 'customer'); }
  function bySlug(s) { return REG.modules.filter(function (m) { return m.slug === s; })[0]; }

  /* ---------- demo bar ---------- */
  function demoBar() {
    if (!inModule) return '';
    var idx = -1, i;
    for (i = 0; i < mod.screens.length; i++) if (mod.screens[i].file === file) idx = i;
    var cur = mod.screens[idx] || { title: document.title, role: 'both' };
    var prev = mod.screens[idx - 1], next = mod.screens[idx + 1];
    var roleLabel = { admin: 'แอดมิน', customer: 'ลูกค้า', both: 'ภาพรวม' }[cur.role];
    return '<div class="demo-bar">' +
      '<a href="' + base + 'index.html">◀ Mockup hub</a>' +
      '<span class="db-mod">' + mod.no + ' · ' + mod.title + '</span>' +
      '<span class="db-step">หน้า ' + (idx + 1) + '/' + mod.screens.length + '</span>' +
      '<span class="db-role ' + cur.role + '">' + roleLabel + '</span>' +
      '<span>' + cur.title + '</span>' +
      '<span class="db-nav">' +
      '<a href="00-flow.html">Flow</a>' +
      (prev ? '<a href="' + prev.file + '">← ' + prev.title + '</a>' : '<span class="off">← ก่อนหน้า</span>') +
      (next ? '<a href="' + next.file + '">' + next.title + ' →</a>' : '<span class="off">ถัดไป →</span>') +
      '</span></div>';
  }

  /* ---------- admin shell ---------- */
  function adminDrawer(active) {
    function item(slugKey, label, isNew, hrefOverride) {
      var m = bySlug(slugKey);
      var href = hrefOverride || (m ? hrefAdmin(m) : '#');
      return '<a class="nav-item' + (active === slugKey ? ' active' : '') + '" href="' + href + '">' + label +
        (isNew ? '<span class="new">' + isNew + '</span>' : '') + '</a>';
    }
    function plain(label) { return '<a class="nav-item" href="#" onclick="return false">' + label + '</a>'; }
    function group(title, items, open) {
      return '<div class="nav-group' + (open ? ' open' : '') + '"><div class="ng-title"><span class="ico"></span>' + title + '</div>' + items + '</div>';
    }
    return '<aside class="admin-drawer">' +
      '<div class="brand"><i></i>Pharmaplex Admin</div>' +
      group('แดชบอร์ดผู้ดูแล', '', false) +
      group('การจัดการสินค้า', plain('บริการอื่นๆ') + plain('สินค้า') + plain('กลุ่มสินค้า') + plain('แบรนด์สินค้า') + plain('กลุ่มชื่อสามัญ'), false) +
      group('โปรโมชั่นและสิทธิพิเศษ',
        item('foundation', 'กลุ่มและชุดที่ใช้ซ้ำ', 'ใหม่') +
        item('promotion', 'โปรโมชั่น', 'ต่อยอดเซตของแถม') +
        item('coupon', 'คูปอง', 'ใหม่') +
        item('points', 'พอยท์', 'ใหม่') +
        item('campaign', 'แคมเปญ', 'ใหม่') +
        item('raffle', 'สุ่มรางวัล', 'ใหม่') +
        item('starterkit', 'เซตร้านยาเปิดใหม่', 'ใหม่'), true) +
      group('คำสั่งซื้อและการขาย', plain('คำสั่งซื้อ') + plain('คำสั่งซื้อบริการสั่งทำ') + plain('การเคลมสินค้า'), false) +
      group('ลูกค้าและการสนับสนุน', plain('ลูกค้า') + plain('เครดิตโน้ต') + plain('รีวิว'), false) +
      group('การจัดส่งและโลจิสติกส์', plain('ค่าจัดส่ง') + plain('รอบการจัดส่ง'), false) +
      group('การตลาดและเนื้อหา', plain('ข่าวสาร') + plain('แบนเนอร์'), false) +
      group('ระบบและรายงาน', plain('รายงาน') + plain('การตั้งค่า'), false) +
      '</aside>';
  }
  function adminShell(body, crumb, active) {
    return '<div class="admin-shell">' + adminDrawer(active) +
      '<div class="admin-main"><div class="admin-topbar"><span>' + (crumb || 'โปรโมชั่นและสิทธิพิเศษ') + '</span>' +
      '<span class="who"><span class="avatar">ส</span><span>staff1 · ฝ่ายการตลาด</span></span></div>' +
      '<div class="admin-content">' + body + '</div></div></div>';
  }

  /* ---------- customer shell ---------- */
  function custShell(body, activeKey) {
    function a(key, label, href) {
      return '<a class="' + (activeKey === key ? 'active' : '') + '" href="' + href + '">' + label + '</a>';
    }
    function c(s) { var m = bySlug(s); return m ? hrefCust(m) : '#'; }
    return '<div class="cust-shell"><div class="cust-top"><div class="bar">' +
      '<span class="logo">Pharmaplex</span><span class="search">ค้นหาสินค้า ชื่อยา แบรนด์…</span>' +
      '<span class="icons"><span class="cart">ตะกร้า<b>3</b></span><span class="avatar">ร</span><span class="small">ร้านยา ทดสอบ จำกัด</span></span>' +
      '</div></div><div class="cust-nav"><div class="bar">' +
      a('home', 'หน้าแรก', c('home')) + a('products', 'สินค้า', '#') +
      a('promotion', 'โปรโมชั่น', c('promotion')) + a('coupon', 'คูปอง', c('coupon')) +
      a('points', 'พอยท์', c('points')) + a('campaign', 'แคมเปญ', c('campaign')) +
      a('raffle', 'ลุ้นรางวัล', c('raffle')) + a('starterkit', 'เซตร้านยาเปิดใหม่', c('starterkit')) +
      a('services', 'บริการอื่นๆ', '#') +
      '</div></div><div class="cust-main">' + body + '</div></div>';
  }

  /* ---------- boot ---------- */
  function boot() {
    var screen = document.getElementById('screen');
    var shell = document.body.getAttribute('data-shell');
    if (screen && shell) {
      var html = screen.innerHTML;
      var wrapped = html;
      if (shell === 'admin') {
        wrapped = adminShell(html, document.body.getAttribute('data-crumb'), document.body.getAttribute('data-nav') || slug);
      } else if (shell === 'customer') {
        wrapped = custShell(html, document.body.getAttribute('data-cust-nav') || document.body.getAttribute('data-nav') || slug);
      }
      screen.innerHTML = wrapped;
      screen.className = (screen.className + ' screen-wrap').trim();
    }
    var bar = demoBar();
    if (bar) document.body.insertAdjacentHTML('afterbegin', bar);
    wireInteractions();
    updateReveal();
  }

  /* ---------- interactions ---------- */
  function updateReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    Array.prototype.forEach.call(els, function (el) {
      var spec = el.getAttribute('data-reveal');
      var show = false;
      var m = spec.match(/^([\w-]+)=(.+)$/);
      var c = spec.match(/^([\w-]+):on$/);
      if (m) {
        var inputs = document.querySelectorAll('[name="' + m[1] + '"]');
        Array.prototype.forEach.call(inputs, function (inp) {
          if (inp.tagName === 'SELECT' && inp.value === m[2]) show = true;
          if ((inp.type === 'radio' || inp.type === 'checkbox') && inp.checked && inp.value === m[2]) show = true;
        });
      } else if (c) {
        var cb = document.querySelector('[name="' + c[1] + '"]');
        show = !!(cb && cb.checked);
      }
      el.classList.toggle('hidden', !show);
    });
  }
  function wireInteractions() {
    document.addEventListener('change', updateReveal);
    document.addEventListener('click', function (e) {
      var t = e.target;
      var tab = t.closest && t.closest('[data-tab]');
      if (tab) {
        var wrap = tab.closest('[data-tabs]');
        if (wrap) {
          var key = tab.getAttribute('data-tab');
          Array.prototype.forEach.call(wrap.querySelectorAll('[data-tab]'), function (b) { b.classList.toggle('on', b === tab); });
          var scope = wrap.parentElement;
          Array.prototype.forEach.call(scope.querySelectorAll('[data-panel]'), function (p) {
            if (p.closest('[data-tabs]') === wrap) return;
            p.classList.toggle('on', p.getAttribute('data-panel') === key);
          });
        }
      }
      var op = t.closest && t.closest('[data-open]');
      if (op) {
        var m = document.querySelector(op.getAttribute('data-open'));
        if (m) { m.classList.add('on'); e.preventDefault(); }
      }
      var cl = t.closest && t.closest('[data-close]');
      if (cl) {
        var mm = cl.closest('.modal');
        if (mm) mm.classList.remove('on');
        e.preventDefault();
      }
      if (t.classList && t.classList.contains('modal')) t.classList.remove('on');
      var seg = t.closest && t.closest('.seg button');
      if (seg) {
        Array.prototype.forEach.call(seg.parentElement.children, function (b) { b.classList.toggle('on', b === seg); });
      }
      var fl = t.closest && t.closest('.flip');
      if (fl) fl.classList.toggle('flipped');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
