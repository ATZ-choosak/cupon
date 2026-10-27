/* Live hydrators — make the REAL mockup pages work (same markup/CSS as the static mockup), driven by the simulator data (pmp-core.js).
   Loaded by mockup.js on every module page. Each hydrator re-renders list/number regions of its own page using the page's existing classes. */
(function () {
  var PMP = window.PMP, U = PMP.util, B = U.baht;
  var parts = location.pathname.replace(/\\/g, '/').split('/'), KEY = parts[parts.length - 2] + '/' + parts[parts.length - 1];
  var H = {}, ST = {};
  function E(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  var MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function dm(iso) { if (!iso) return '-'; var p = iso.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + (+p[0] + 543); }
  function dmy(iso) { if (!iso) return '-'; var p = iso.split('-'); return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + String(+p[0] + 543).slice(2); }
  function custId() { return U.rd('pmpc.sim.cust', 'c-b2b'); }
  function cust() { return PMP.customers.filter(function (c) { return c.id === custId(); })[0]; }
  function cs() { return PMP.state().customers[custId()]; }
  function toast(msg, err) {
    var t = $('#liveToast'); if (!t) { t = document.createElement('div'); t.id = 'liveToast'; t.className = 'sim-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'sim-toast on' + (err ? ' err' : ''); clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'sim-toast'; }, 3200);
  }
  function rerender() { var f = H[KEY]; if (f) { f(); } }
  function setText(sel, txt) { $$(sel).forEach(function (e) { e.textContent = txt; }); }
  function relabelCustomer() {
    $$('.muted,.small,.cust-top .small').forEach(function (e) { if (e.childElementCount === 0 && e.textContent.indexOf('ร้านยา ทดสอบ จำกัด') > -1) e.textContent = e.textContent.replace('ร้านยา ทดสอบ จำกัด', cust().name); });
    var sm = $('.cust-top .small'); if (sm) sm.textContent = cust().name;
  }
  /* floating control: simulated customer + date (shared across pages) */
  function ctl() {
    if ($('#liveCtl')) return;
    var cfg = PMP.cfg(), d = document.createElement('div'); d.id = 'liveCtl'; d.className = 'live-ctl';
    d.innerHTML = '<b>จำลอง</b><select class="select" id="lcCust">' + PMP.customers.map(function (c) { return '<option value="' + c.id + '"' + (c.id === custId() ? ' selected' : '') + '>' + c.name + ' (' + c.type + ')</option>'; }).join('') + '</select><input class="input" id="lcNow" type="date" value="' + cfg.now + '"><button class="btn text sm grey" id="lcReset" type="button" title="รีเซ็ตข้อมูลจำลองทั้งหมด">รีเซ็ต</button>';
    document.body.appendChild(d);
    $('#lcCust').onchange = function () { U.wr('pmpc.sim.cust', this.value); location.reload(); };
    $('#lcNow').onchange = function () { var c = PMP.cfg(); c.now = this.value || c.now; PMP.saveCfg(c); location.reload(); };
    $('#lcReset').onclick = function () { if (confirm('รีเซ็ตข้อมูลจำลองทั้งหมดกลับค่าเริ่มต้น?')) { PMP.resetAll(); try { localStorage.removeItem('pmpc.sim.cart'); localStorage.removeItem('pmpc.sim.sel'); } catch (e) {} location.reload(); } };
  }
  function kindVal(k) { return k.dtype === 'ship' ? 'ส่งฟรี' : k.dtype === 'pct' ? k.value + '%' : B(k.value); }
  function kindDesc(k) { return k.dtype === 'ship' ? 'ส่งฟรี' : k.dtype === 'pct' ? 'ลด ' + k.value + '%' + (k.cap ? ' สูงสุด ' + B(k.cap) : '') : 'ลด ' + B(k.value); }
  function tk(cls, title, sub, extra, val, btn) { return '<div><div class="ticket ' + cls + '"><div class="t-main"><b>' + E(title) + '</b><div class="tk-sub">' + sub + '</div>' + (extra || '') + '</div><div class="t-stub"><span class="t-val">' + val + '</span>' + btn + '</div></div></div>'; }
  function prog(left, tot) { return '<div class="progress mt8" style="margin-top:8px"><i style="width:' + (tot ? Math.max(0, Math.min(100, left / tot * 100)) : 100) + '%"></i></div><div class="small" style="margin-top:4px"><b>' + (tot ? 'เหลือ ' + left + ' / ' + tot + ' สิทธิ์' : 'ไม่จำกัดสิทธิ์') + '</b></div>'; }
  function setChip(btnSel, n) { var c = $(btnSel + ' .chip'); if (c) c.textContent = n; }
  function empty(msg, sub) { return '<div class="card flat dim" style="border:1px dashed var(--g400);grid-column:1/-1"><div class="empty"><b>' + msg + '</b>' + (sub ? '<div class="small">' + sub + '</div>' : '') + '</div></div>'; }

  /* ===== coupon/08 ศูนย์คูปอง + กระเป๋า ===== */
  H['coupon/08-customer-center.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), now = cfg.now;
    var collect = cfg.coupons.filter(function (k) { return k.kind === 'collect'; }), monthly = cfg.coupons.filter(function (k) { return k.kind === 'monthly'; });
    var center = $('[data-panel="center"] .grid.g2'), n = 0, html = '';
    collect.forEach(function (k) {
      var s = PMP.status(k, now), have = c.wallet.some(function (w) { return w.couponId === k.id; }), ship = k.dtype === 'ship' ? 'ship' : '', left = k.quotaTotal - k.used;
      var sub = 'เก็บได้ถึง ' + dm(k.end) + (k.min ? ' · ซื้อครบ ' + B(k.min) : '') + ((k.except || []).length ? ' · มีสินค้ายกเว้น' : '');
      if (s === 'expired' || s === 'inactive') return;
      if (s === 'upcoming') { html += tk('wait ' + ship, k.name, 'เริ่มเก็บ ' + dm(k.start), '', 'เร็วๆ นี้', '<button class="btn outlined sm" disabled>ยังไม่เปิด</button>'); return; }
      if (s === 'exhausted') { html += tk('used ' + ship, k.name, 'สิทธิ์ครบแล้ว', prog(0, k.quotaTotal), kindVal(k), '<button class="btn outlined sm" disabled>สิทธิ์หมดแล้ว</button>'); return; }
      n++;
      if (have) html += tk(ship, k.name, sub, '<div class="small mt8" style="margin-top:8px;color:var(--success-darker)">✔ อยู่ในกระเป๋าของคุณแล้ว</div>', kindVal(k), '<button class="btn outlined sm" disabled>เก็บแล้ว</button>');
      else html += tk(ship, k.name, sub, prog(left, k.quotaTotal), kindVal(k), '<button class="btn contained sm" data-lcollect="' + k.id + '">เก็บ</button>');
    });
    center.innerHTML = html || empty('สถานะว่าง: ตอนนี้ยังไม่มีคูปองให้เก็บเพิ่ม', 'ลองกลับมาดูใหม่ หรือดูคูปองในกระเป๋าของคุณ');
    var empt = $('[data-panel="center"] > .card.flat.dim'); if (empt) empt.style.display = html ? 'none' : 'none';
    // wallet
    function wsec(id, items, emptyMsg) { var g = $('#' + id).nextElementSibling; g.innerHTML = items.join('') || empty(emptyMsg); }
    var ready = [], used = [], exp = [];
    c.wallet.forEach(function (w) {
      var k = cfg.coupons.filter(function (x) { return x.id === w.couponId; })[0], ship = k.dtype === 'ship' ? 'ship' : '', s = PMP.status(k, now);
      if (w.used) used.push(tk('used ' + ship, k.name, 'ใช้แล้ว · ' + E(w.src), '', kindVal(k), '<span class="chip">ใช้แล้ว</span>'));
      else if (s === 'expired') exp.push(tk('used ' + ship, k.name, 'หมดอายุ ' + dmy(k.end) + ' · ไม่ได้ใช้', '', kindVal(k), '<span class="chip error">หมดอายุ</span>'));
      else ready.push(tk(ship, k.name, E(w.src) + ' · ใช้ได้ถึง ' + dmy(k.end) + (k.stackPromo ? ' · ใช้ร่วมโปรได้' : ' · ใช้ร่วมโปรไม่ได้'), '', kindVal(k), '<a class="btn contained sm" href="09-customer-cart-coupon.html">ใช้</a>'));
    });
    monthly.forEach(function (k) { if (PMP.status(k, now) === 'running' && !c.wallet.some(function (w) { return w.couponId === k.id; })) ready.push(tk('wait ' + (k.dtype === 'ship' ? 'ship' : ''), k.name, 'แจกอัตโนมัติรายเดือน · ยังไม่ออกในเดือนนี้', '', 'รอวันที่ 1', '<button class="btn outlined sm" data-lmonthly="1">จำลองแจก</button>')); });
    wsec('w-ready', ready, 'ยังไม่มีคูปองในกระเป๋า — ไปที่ "ศูนย์คูปอง" เพื่อเก็บคูปอง');
    wsec('w-used', used, 'ยังไม่มีคูปองที่ใช้แล้ว'); wsec('w-exp', exp, 'ไม่มีคูปองหมดอายุ');
    var pr = $$('.pill-row .chip'); if (pr.length > 2) { pr[0].textContent = 'พร้อมใช้ ' + c.wallet.filter(function (w) { return !w.used && PMP.status(cfg.coupons.filter(function (x) { return x.id === w.couponId; })[0], now) !== 'expired'; }).length; pr[1].textContent = 'ใช้แล้ว ' + used.length; pr[2].textContent = 'หมดอายุ ' + exp.length; }
    setChip('[data-tab="center"]', n); setChip('[data-tab="wallet"]', c.wallet.length);
    // paper tab: check code
    var inp = $('[data-panel="paper"] input.mono'); if (inp && !inp._b) { inp._b = 1; var a = inp.nextElementSibling; a.addEventListener('click', function (e) { var v = inp.value.trim().toUpperCase(), p = PMP.cfg().paper.filter(function (x) { return x.code === v; })[0]; if (v && !p) { e.preventDefault(); toast('ไม่พบรหัสคูปองกระดาษ “' + v + '”', true); } else if (p) { U.wr('pmpc.live.paper', p.id); } }); }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lcollect]');
    if (a) { var r = PMP.collect(custId(), a.getAttribute('data-lcollect')); toast(r.error || 'เก็บคูปองเข้ากระเป๋าแล้ว', !!r.error); rerender(); return; }
    if (e.target.closest && e.target.closest('[data-lmonthly]')) { var n = PMP.issueMonthly(); toast('ระบบแจกคูปองรายเดือนให้ลูกค้า ' + n + ' ราย'); rerender(); }
  });

  /* ===== points/04 พอยท์ของฉัน ===== */
  function lots(c, cfg) {
    var sum = 0, L = (c.lots || []).map(function (l) { sum += l.pts; return { pts: l.pts, exp: l.exp }; });
    if (c.points - sum > 0) L.push({ pts: c.points - sum, exp: PMP.addDays(cfg.now, cfg.points.expiryDays) });
    L.sort(function (a, b) { return a.exp < b.exp ? -1 : 1; });
    // consume from earliest so lots total = balance
    var tot = L.reduce(function (a, l) { return a + l.pts; }, 0), over = tot - c.points;
    for (var i = 0; i < L.length && over > 0; i++) { var d = Math.min(L[i].pts, over); L[i].pts -= d; over -= d; }
    return L.filter(function (l) { return l.pts > 0; });
  }
  function ladderSum(c, cfg) { var L = cfg.ladders[0], lv = L && c.ladder[L.id] || { spent: 0 }, next = L ? L.tiers.filter(function (t) { return t.at > lv.spent; })[0] : null; return { spent: lv.spent, next: next, top: L ? L.tiers[L.tiers.length - 1].at : 1 }; }
  H['points/04-customer-dashboard.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), L = lots(c, cfg), now = cfg.now;
    $('.pt-card .val').innerHTML = c.points.toLocaleString() + '<small>พอยท์</small>';
    $('.pt-card .lots').innerHTML = L.map(function (l) { return '<div class="row between"><span>' + l.pts.toLocaleString() + ' พอยท์</span><b>หมดอายุ ' + dm(l.exp) + '</b></div>'; }).join('') || '<div class="row between"><span>ยังไม่มีพอยท์</span></div>';
    var soon = L.filter(function (l) { return (new Date(l.exp) - new Date(now)) / 864e5 <= 30; })[0], al = $('.alert.warning');
    if (al) { if (soon) { al.style.display = ''; $('.a-title', al).textContent = 'พอยท์ ' + soon.pts + ' พอยท์ จะหมดอายุวันที่ ' + dm(soon.exp) + ' (อีก ' + Math.round((new Date(soon.exp) - new Date(now)) / 864e5) + ' วัน)'; } else al.style.display = 'none'; }
    var ls = ladderSum(c, cfg), acc = $('.acc-card');
    $('.val', acc).textContent = B(ls.spent); $('.progress i', acc).style.width = Math.min(100, ls.spent / ls.top * 100) + '%';
    $('.small.mt8', acc).innerHTML = ls.next ? 'อีก <b>' + B(ls.next.at - ls.spent) + '</b> ถึงรางวัลขั้นถัดไป (' + B(ls.next.at) + ')' : 'ถึงขั้นสูงสุดแล้ว';
    function hist(e) {
      var plus = e.t.charAt(0) === '+', cls = /หมดอายุ/.test(e.why) ? 'exp' : /ปรับ|ชดเชย/.test(e.why) ? 'adj' : plus ? 'in' : 'out';
      return '<div class="hist"><span class="ic ' + cls + '">' + (plus ? '＋' : '🎁') + '</span><div><b>' + E(e.why) + '</b><div class="sub">' + dm(e.d) + '</div></div><div class="amt ' + (plus ? 'p' : 'm') + '">' + e.t.replace('-', '−') + '</div></div>';
    }
    var led = c.ledger || [], none = '<div class="muted small" style="padding:14px 0">ยังไม่มีรายการ — ซื้อสินค้าหรือแลกพอยท์ที่ตะกร้า/หน้าแลก</div>';
    $('[data-panel="all"]').innerHTML = led.map(hist).join('') || none;
    $('[data-panel="in"]').innerHTML = led.filter(function (e) { return e.t.charAt(0) === '+'; }).map(hist).join('') || none;
    $('[data-panel="out"]').innerHTML = led.filter(function (e) { return e.t.charAt(0) !== '+'; }).map(hist).join('') || none;
    // earn rates from products
    var rows = $$('.earn-row'); if (rows.length) {
      var h = PMP.products.filter(function (p) { return p.pts > 0; }).map(function (p) { return '<div class="earn-row"><span>' + E(p.name) + '</span><b>' + p.pts + ' พอยท์/' + p.unit + '</b></div>'; }).join('') + '<div class="earn-row"><span>' + E(PMP.products.filter(function (p) { return !p.pts; }).map(function (p) { return p.name; }).join(' · ')) + '</span><span class="chip">ไม่ได้พอยท์</span></div>';
      rows[0].insertAdjacentHTML('beforebegin', '<div id="earnLive">' + h + '</div>'); rows.forEach(function (r) { r.parentNode.removeChild(r); });
    }
    var el = $('#earnLive'); if (el && !$('#earnLive').dataset.done) { $('#earnLive').dataset.done = 1; }
    relabelCustomer();
  };

  /* ===== points/05 แลกของรางวัล ===== */
  var KICON = { coupon: ['c', 'คูปอง'], ship: ['s', 'ส่งฟรี'], gift: ['g', 'ของ'], offpos: ['g', 'ของ'], credit: ['m', 'เครดิต'], entitle: ['t', 'ลุ้น'], points: ['m', 'พอยท์'] };
  var rFilter = 'all', rOnly = false, rPend = null;
  H['points/05-customer-redeem.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), L = lots(c, cfg), ls = ladderSum(c, cfg);
    $('.bal-pts .v').innerHTML = c.points.toLocaleString() + '<small>พอยท์</small>';
    var soon = L[0]; $('.bal-pts .small[style*="right"]').innerHTML = (soon ? soon.pts + ' พอยท์ หมดอายุ ' + dm(soon.exp) : 'ยังไม่มีพอยท์') + '<br><a href="04-customer-dashboard.html" style="color:#fff;text-decoration:underline">ดูประวัติ</a>';
    $('.bal-camp .v').textContent = B(ls.spent);
    var html = '';
    cfg.catalog.forEach(function (it) {
      if (!it.active) return;
      var items = PMP.rewardsOf('points', it.id), k0 = items[0] || { k: 'points' };
      var kk = k0.k === 'coupon' && (cfg.coupons.filter(function (x) { return x.id === k0.couponId; })[0] || {}).dtype === 'ship' ? 'ship' : k0.k, ic = KICON[kk] || ['g', 'ของ'];
      var cat = { coupon: 'coupon', ship: 'ship', gift: 'gift', offpos: 'gift', credit: 'credit', entitle: 'ticket', points: 'credit' }[kk];
      if (rFilter !== 'all' && cat !== rFilter) return;
      var ok = c.points >= it.pts && it.stock > 0; if (rOnly && !ok) return;
      var sum = items.map(function (i) { return PMP.describe(i, cfg); }).join(' + ') || 'ยังไม่ตั้งผลตอบแทน';
      if (it.stock < 1) html += '<div class="rw off"><div class="top"><span class="ico ' + ic[0] + '" style="opacity:.5">' + ic[1] + '</span><div><b>' + E(it.name) + '</b><div class="meta">' + E(sum) + '</div></div></div><div class="cost">' + it.pts.toLocaleString() + '<small>พอยท์</small></div><div class="meta"><span class="chip error">หมดแล้ว</span></div><button class="btn outlined block" disabled>หมดแล้ว</button></div>';
      else if (c.points < it.pts) html += '<div class="rw off"><div class="top"><span class="ico ' + ic[0] + '">' + ic[1] + '</span><div><b>' + E(it.name) + '</b><div class="meta">' + E(sum) + '</div></div></div><div class="cost">' + it.pts.toLocaleString() + '<small>พอยท์</small></div><div class="progress"><i style="width:' + Math.min(100, c.points / it.pts * 100).toFixed(1) + '%"></i></div><div class="need">พอยท์ไม่พอ ขาดอีก ' + (it.pts - c.points).toLocaleString() + ' พอยท์</div><button class="btn outlined block" disabled>พอยท์ไม่พอ</button></div>';
      else html += '<div class="rw"><div class="top"><span class="ico ' + ic[0] + '">' + ic[1] + '</span><div><b>' + E(it.name) + '</b><div class="meta">' + E(sum) + '</div></div></div><div class="cost">' + it.pts.toLocaleString() + '<small>พอยท์</small></div><div class="meta">' + (it.stock < 20 ? '<span class="chip soft-warning">เหลือ ' + it.stock + ' สิทธิ์</span>' : 'เหลือ ' + it.stock + ' สิทธิ์') + '</div><button class="btn contained block" data-lredeem="' + it.id + '">แลกเลย</button></div>';
    });
    $('.rw-grid').innerHTML = html || '<div class="muted small">ไม่มีรายการที่ตรงตัวกรอง</div>';
    // dialog preview + ok-card
    var it = rPend && cfg.catalog.filter(function (x) { return x.id === rPend; })[0] || cfg.catalog[0];
    if (it) {
      var d = $('.dialog.sm'), items2 = PMP.rewardsOf('points', it.id);
      $$('.dialog-b .small.muted', d)[0].textContent = 'ใช้ ' + it.pts.toLocaleString() + ' พอยท์ แลก'; $('.dialog-b div[style*="font-size:20px"]', d).textContent = it.name;
      var sr = $$('.sum-row', d); sr[0].lastElementChild.textContent = c.points.toLocaleString(); sr[1].lastElementChild.textContent = '−' + it.pts.toLocaleString(); sr[2].lastElementChild.textContent = (c.points - it.pts).toLocaleString();
      $$('.dialog-b .small.muted', d)[1].textContent = items2.map(function (i) { return PMP.describe(i, cfg); }).join(' + ') + ' — เข้าบัญชี/กระเป๋าทันที';
      var cf = $('.dialog-f .btn.contained', d); cf.textContent = 'ยืนยันแลก ' + it.pts.toLocaleString() + ' พอยท์'; cf.setAttribute('data-lredeemok', it.id);
    }
    relabelCustomer();
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lredeem]');
    if (a) { rPend = a.getAttribute('data-lredeem'); rerender(); var d = $('.dialog.sm'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('ตรวจสอบหน้าต่างยืนยัน แล้วกด “ยืนยันแลก”'); return; }
    var ok = e.target.closest && e.target.closest('[data-lredeemok]');
    if (ok) { var r = PMP.redeem(custId(), ok.getAttribute('data-lredeemok')); if (r.error) { toast(r.error, true); return; } toast('แลกสำเร็จ: ' + r.out.join(' · ')); var oc = $('.ok-card'); if (oc) { $('.semi', oc).textContent = 'แลก' + PMP.cfg().catalog.filter(function (x) { return x.id === ok.getAttribute('data-lredeemok'); })[0].name + ' สำเร็จ'; var sm = $$('.small.muted', oc)[0]; if (sm) sm.innerHTML = 'คงเหลือ <b>' + cs().points.toLocaleString() + '</b> พอยท์ · ได้รับ: ' + E(r.out.join(' · ')); } rerender(); return; }
    var sg = e.target.closest && e.target.closest('.seg button');
    if (sg && KEY === 'points/05-customer-redeem.html') { var m = ['all', 'coupon', 'ship', 'gift', 'credit', 'ticket']; rFilter = m[[].indexOf.call(sg.parentNode.children, sg)] || 'all'; rerender(); }
  });
  document.addEventListener('change', function (e) { if (KEY === 'points/05-customer-redeem.html' && e.target.closest && e.target.closest('label.check') && e.target.type === 'checkbox') { rOnly = e.target.checked; rerender(); } });

  /* ===== campaign/06 ขั้นบันไดรางวัลของฉัน ===== */
  function ladderState(c, cfg) {
    var L = cfg.ladders[0], lv = (L && c.ladder[L.id]) || { spent: 0, unlocked: [], claimed: [] }, st = PMP.state(), reqs = (st.claims || []).filter(function (x) { return x.cid === custId() && L && x.lid === L.id; });
    return { L: L, lv: lv, reqs: reqs };
  }
  H['campaign/06-customer-ladder.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), S = ladderState(c, cfg), L = S.L, lv = S.lv, now = cfg.now;
    if (!L) return;
    var top = L.tiers[L.tiers.length - 1].at, nxt = L.tiers.filter(function (t) { return t.at > lv.spent; })[0];
    var big = $('.sum .big'); big.textContent = B(lv.spent);
    var cols = $$('.sum > div'); cols[1].innerHTML = '<div class="muted small">ปลดล็อกแล้ว</div><div style="font-size:26px;font-weight:800">' + lv.unlocked.length + ' <span class="muted" style="font-size:15px;font-weight:500">จาก ' + L.tiers.length + ' ขั้น</span></div><div class="small mt8">' + (nxt ? 'อีก <b style="color:var(--primary)">' + B(nxt.at - lv.spent) + '</b> ถึง' + E(nxt.name) : 'ถึงขั้นสูงสุดแล้ว') + '</div>';
    var days = Math.max(0, Math.round((new Date(L.end) - new Date(now)) / 864e5));
    cols[2].innerHTML = '<div class="muted small">สัญญาสิ้นสุด</div><div style="font-size:22px;font-weight:800">' + dm(L.end) + '</div><div class="mt8"><span class="chip soft-warning">อีก ' + days + ' วัน</span></div><div class="small muted mt8">ขอรับสิทธิ์ที่ปลดล็อกได้ถึงวันสิ้นสุดแคมเปญ</div>';
    $('.track .fill').style.width = Math.min(100, lv.spent / top * 100) + '%';
    var tr = $('.track'); tr.innerHTML = '<div class="fill" style="width:' + Math.min(100, lv.spent / top * 100) + '%"></div><span class="you" style="left:' + Math.min(100, lv.spent / top * 100) + '%">คุณอยู่ที่นี่ ' + B(lv.spent) + '</span>' + L.tiers.map(function (t, i) {
      var un = lv.unlocked.indexOf(t.id) > -1, left = Math.min(100, t.at / top * 100), cl = un && lv.claimed.indexOf(t.id) < 0;
      return '<span class="mk ' + (un ? (cl ? 'now' : 'done') : '') + '" style="left:' + left + '%">' + (un ? (cl ? '!' : '✓') : i + 1) + '</span><span class="lbl' + (i === L.tiers.length - 1 ? ' end' : '') + '" style="left:' + left + '%"><b>' + B(t.at) + '</b><br>ขั้น ' + (i + 1) + '</span>';
    }).join('');
    var mine = S.reqs.length, a = $$('.btn.outlined.primary')[0]; if (a) a.textContent = 'คำขอของฉัน (' + mine + ')';
    var ptxt = $('.row.between.top p.muted'); if (ptxt) ptxt.textContent = 'แคมเปญ' + L.name + ' · ' + cust().name;
    var ok = cust().type === L.aud || L.aud === 'all';
    var html = L.tiers.map(function (t, i) {
      var un = lv.unlocked.indexOf(t.id) > -1, cl = lv.claimed.indexOf(t.id) > -1, req = S.reqs.filter(function (r) { return r.tid === t.id && r.status !== 'ปฏิเสธ'; })[0], items = PMP.rewardsOf('campaign', L.id + '-' + t.id);
      var sum = items.map(function (it) { return PMP.describe(it, cfg); }).join(' + ') || '-', kind = items[0] ? PMP.kindLabel[items[0].k] : '-', left = t.cap ? t.cap - (t.used || 0) : null;
      var meta = '<div class="meta"><span>เกณฑ์ ' + B(t.at) + '</span><span class="q">' + (t.cap ? 'เหลือ ' + left + '/' + t.cap + ' สิทธิ์' : 'ไม่จำกัดสิทธิ์') + '</span></div>';
      if (cl) { var done = req && req.status !== 'รอตรวจ'; return '<div class="rw ' + (done ? 'done' : 'sent') + '"><div class="ico"><span class="stp">ขั้น ' + (i + 1) + '</span>รางวัล</div><div><span class="chip ' + (done ? 'success' : 'info') + '">' + (done ? 'ได้รับแล้ว' : 'ขอแล้ว · รอทีมงานตรวจ') + '</span> <span class="chip outline">' + kind + '</span></div><div><b>' + E(t.name) + '</b><div class="small muted">' + E(sum) + '</div></div>' + meta + '<div class="foot"><a class="btn outlined sm" href="07-customer-claim-form.html">ดูสถานะคำขอ</a></div></div>'; }
      if (un) return '<div class="rw open"><div class="ico"><span class="stp" style="background:var(--primary)">ขั้น ' + (i + 1) + '</span>รางวัล</div><div><span class="chip primary">ปลดล็อกแล้ว · กดขอรับได้</span> <span class="chip outline">' + kind + '</span></div><div><b>' + E(t.name) + '</b><div class="small muted">' + E(sum) + '</div></div>' + meta + (t.cap ? '<div class="qbar"><i style="width:' + Math.max(0, left / t.cap * 100) + '%"></i></div>' : '') + '<div class="foot"><a class="btn contained block" href="07-customer-claim-form.html" data-lclaimgo="' + L.id + '|' + t.id + '">ขอรับสิทธิ์</a><div class="small muted center">' + (t.cap ? 'สิทธิ์มีจำกัด ใครกดก่อนได้ก่อน' : 'ไม่จำกัดสิทธิ์ — ทีมงานคัดเลือก') + '</div></div></div>';
      return '<div class="rw locked"><div class="ico"><span class="stp">ขั้น ' + (i + 1) + '</span>รางวัล</div><div><span class="chip">ล็อก</span> <span class="chip outline">' + kind + '</span></div><div><b>' + E(t.name) + '</b><div class="small muted">' + E(sum) + '</div></div>' + meta + '<div class="foot"><button class="btn outlined sm" disabled>อีก ' + B(t.at - lv.spent) + ' ถึงจะปลดล็อก</button></div></div>';
    }).join('');
    $('.rw-grid').innerHTML = ok ? html : '<div class="rw full" style="grid-column:1/-1"><div class="empty" style="padding:8px 0"><b>บัญชีนี้ไม่ได้อยู่ในกลุ่มของแคมเปญสะสมยอด</b><div class="small mt8">แคมเปญนี้สำหรับลูกค้า ' + L.aud + ' ที่ทำสัญญาไว้</div></div></div>';
    $$('.rw-grid + h6 + .mini-state, h6.mb8 + .mini-state').forEach(function () { });
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lclaimgo]'); if (a) U.wr('pmpc.live.claim', a.getAttribute('data-lclaimgo')); });

  /* ===== campaign/07 ขอรับสิทธิ์ (ฟอร์ม) ===== */
  H['campaign/07-customer-claim-form.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), S = ladderState(c, cfg), L = S.L; if (!L) return;
    var pick = (U.rd('pmpc.live.claim', '') || '').split('|'), tier = L.tiers.filter(function (t) { return t.id === pick[1] && S.lv.unlocked.indexOf(t.id) > -1 && S.lv.claimed.indexOf(t.id) < 0; })[0] || L.tiers.filter(function (t) { return S.lv.unlocked.indexOf(t.id) > -1 && S.lv.claimed.indexOf(t.id) < 0; })[0];
    var host = $('.dialog.md'), no = $('.crumbs'), fields = tier ? PMP.formFields(tier) : [];
    if (!tier) {
      $('.dialog-h', host).firstChild.textContent = 'ยังไม่มีขั้นที่ขอรับได้';
      $('.dialog-b', host).innerHTML = '<div class="alert info"><div>ยังไม่มีขั้นที่ปลดล็อกและยังไม่ได้ขอรับ — ไปซื้อสินค้าที่ตะกร้าเพื่อสะสมยอด หรือดูสถานะคำขอด้านล่าง</div></div>' + reqList(S);
      $('.dialog-f .btn.contained', host).style.display = 'none'; return;
    }
    var idx = L.tiers.indexOf(tier) + 1, left = tier.cap ? tier.cap - (tier.used || 0) : null;
    no.innerHTML = '<a href="06-customer-ladder.html">ขั้นบันไดรางวัลของฉัน</a> / ขอรับสิทธิ์ขั้น ' + idx;
    $('.dialog-h', host).firstChild.textContent = 'ขอรับสิทธิ์ · ขั้น ' + idx + ' ' + tier.name;
    var sb = $('.sum-box', host); sb.innerHTML = '<div><span class="small muted">ยอดเกณฑ์ขั้น ' + idx + '</span><b>' + B(tier.at) + ' <span style="color:var(--success-dark)">✓</span></b></div><div><span class="small muted">ยอดสะสมของคุณ</span><b>' + B(S.lv.spent) + '</b></div><div><span class="small muted">สิทธิ์คงเหลือ</span><b style="color:var(--warning-dark)">' + (tier.cap ? left + ' / ' + tier.cap : 'ไม่จำกัด') + '</b></div>';
    var er = $('.dialog-b .alert.error', host); if (er) er.style.display = 'none';
    var wrap = $('.dialog-b > .relative', host);
    wrap.innerHTML = fields.map(function (f, i) { return '<div class="field"><label>' + E(f.label) + (f.req ? ' <span style="color:var(--error-dark)">*</span>' : '') + '</label><input class="input" data-lans="' + i + '"></div>'; }).join('') || '<div class="muted small">ขั้นนี้ไม่มีฟอร์มขอข้อมูล</div>';
    var cb = $('.dialog-b label.check input', host), btn = $('.dialog-f .btn.contained', host); btn.disabled = true; btn.setAttribute('data-lclaim', L.id + '|' + tier.id);
    cb.onchange = function () { btn.disabled = !cb.checked; };
    var ex = $('#claimReqs'); if (ex) ex.parentNode.removeChild(ex);
    host.parentNode.insertAdjacentHTML('afterend', '<div id="claimReqs">' + reqList(S) + '</div>');
  };
  function reqList(S) {
    if (!S.reqs.length) return '';
    return '<h5 class="mb8">คำขอของฉัน</h5><div class="card"><div class="card-b">' + S.reqs.map(function (r) { return '<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--g200)"><div><b>' + E(r.name) + '</b><div class="small muted">' + dm(r.d) + ' · ' + r.labels.map(function (l, i) { return E(l) + ': ' + E(r.answers[i] || '-'); }).join(' · ') + (r.reason ? ' · เหตุผลที่ปฏิเสธ: ' + E(r.reason) : '') + '</div></div><span class="chip ' + (r.status === 'ปฏิเสธ' ? 'error' : r.status === 'รอตรวจ' ? 'info' : 'success') + '">' + r.status + '</span></div>'; }).join('') + '</div></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lclaim]');
    if (b && !b.disabled) { var p = b.getAttribute('data-lclaim').split('|'), ans = $$('[data-lans]').map(function (x) { return x.value; }), r = PMP.claimTier(custId(), p[0], p[1], ans); if (r.error) { toast(r.error, true); return; } toast(r.out[0]); rerender(); }
  });

  /* ===== raffle/06 สิทธิ์ลุ้นของฉัน ===== */
  H['raffle/06-customer-tickets.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), st = PMP.state(), now = cfg.now, cid = custId();
    var tot = 0, inPool = 0, cards = '', rows = '';
    cfg.raffles.forEach(function (f) {
      var n = c.tickets[f.id] || 0, mine = (st.shared.rafflePool[f.id] || {})[cid] || 0, s = PMP.status(f, now); tot += n; inPool += mine;
      cards += '<div class="card"><div class="card-b ev-card"><div><div class="tk-big">' + n + '</div><div class="small muted">ใบพร้อมใช้</div></div><div><div class="row wrap"><b style="font-size:16px">' + E(f.name) + '</b><span class="mode a">A ลุ้นทันที</span><span class="mode b">B จับตามรอบ</span>' + (s !== 'running' ? '<span class="chip">' + PMP.statusLabel[s] + '</span>' : '') + '</div><div class="small muted mt8">' + dm(f.start) + ' – ' + dm(f.end) + ' · ได้ 1 สิทธิ์ทุกยอดซื้อ ' + B(f.perBaht) + '</div><div class="src-chips mt8"><span>เข้ากองรอจับ (B) <b>' + mine + '</b></span><span>ของฉัน <b>' + n + '</b></span></div><div class="small muted mt8">กองโหมด B ทั้งหมด ' + (Object.keys(st.shared.rafflePool[f.id] || {}).reduce(function (a, k) { return a + st.shared.rafflePool[f.id][k]; }, 0) + f.poolOthers) + ' สิทธิ์ · รหัสยืนยัน ' + PMP.fnv('pool:' + f.id) + '</div></div><div class="stack s8" style="min-width:170px"><a class="btn contained' + (n < 1 ? ' disabled' : '') + '" href="07-customer-instant-draw.html">ลุ้นเลย (โหมด A)</a><button class="btn outlined primary" data-lpool="' + f.id + '"' + (n < 1 ? ' disabled' : '') + '>ลงกองรางวัลใหญ่ (B)</button></div></div></div>';
      if (n) rows += '<tr><td class="mono">TK-' + f.id.toUpperCase() + '-×' + n + '</td><td>' + E(f.name) + '</td><td>ยอดซื้อ/โปร/แลกพอยท์ (รวม)</td><td>—</td><td>—</td><td><span class="chip soft-success">พร้อมใช้ ×' + n + '</span></td></tr>';
      if (mine) rows += '<tr><td class="mono">TK-' + f.id.toUpperCase() + '-B×' + mine + '</td><td>' + E(f.name) + '</td><td>ลงกองโหมด B</td><td>—</td><td>—</td><td><span class="chip soft-info">เข้ากองรอจับ ×' + mine + '</span></td></tr>';
    });
    var stats = $$('.grid.g3 .stat'); stats[0].innerHTML = '<div class="l">สิทธิ์พร้อมใช้</div><div class="v num">' + tot + ' ใบ</div><div class="small muted">' + cfg.raffles.map(function (f) { return E(f.name) + ' ' + (c.tickets[f.id] || 0) + ' ใบ'; }).join(' · ') + '</div>';
    stats[1].innerHTML = '<div class="l">เข้ากองรอจับ (โหมด B)</div><div class="v num">' + inPool + ' ใบ</div><div class="small muted">แอดมินกดจับที่หน้าจับรางวัล</div>'; stats[2].querySelector('.v').textContent = '0 ใบ'; stats[2].querySelector('.small').textContent = 'สิทธิ์ที่ได้ตอนนี้ไม่มีวันหมดอายุ';
    $('[data-panel="byevent"]').innerHTML = cards || '<div class="muted small">ยังไม่มีกิจกรรม</div>';
    $('[data-panel="all"] tbody').innerHTML = rows || '<tr><td colspan="6" class="center muted" style="padding:20px">ยังไม่มีสิทธิ์ลุ้น — ซื้อสินค้า/แลกพอยท์เพื่อรับสิทธิ์</td></tr>';
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-lpool]'); if (b) { var r = PMP.enterPool(custId(), b.getAttribute('data-lpool'), 1); toast(r.error || 'ใส่ 1 สิทธิ์ลงกองโหมด B แล้ว (ถอนคืนไม่ได้)', !!r.error); rerender(); } });

  /* ===== raffle/07 ลุ้นทันที (โหมด A) ===== */
  var spinning = false;
  H['raffle/07-customer-instant-draw.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), f = cfg.raffles[0], st = PMP.state(); if (!f) return;
    var n = c.tickets[f.id] || 0;
    $('.tk-chip').lastChild.textContent = 'สิทธิ์ของฉัน ' + n + ' ใบ';
    var wheel = $('.wheel'); if (!wheel.getAttribute('data-built')) { wheel.setAttribute('data-built', 1); $$('.lb', wheel).forEach(function (lb, i) { $('span', lb).textContent = f.prizes[i % f.prizes.length].name.replace('คูปองลด ', '฿').slice(0, 12); }); }
    var go = $('.stage > .btn.contained.lg'); go.setAttribute('data-ldraw', f.id); go.disabled = n < 1 || spinning; go.textContent = n < 1 ? 'ไม่มีสิทธิ์ลุ้น — ซื้อสินค้าเพื่อรับสิทธิ์' : 'ใช้ 1 สิทธิ์ ลุ้นเลย';
    $('.stage > .small.muted').textContent = n ? 'เหลือ ' + n + ' ใบ → หลังกด เหลือ ' + (n - 1) + ' ใบ' : 'สิทธิ์หมด';
    var tw = f.prizes.reduce(function (a, z) { return a + z.weight; }, 0);
    var card = $$('.odds-row').filter(function (r) { return !r.classList.contains('small'); }); card.forEach(function (r) { r.parentNode.removeChild(r); });
    var hd = $('.odds-row.small'); hd.insertAdjacentHTML('afterend', f.prizes.map(function (z) { var left = z.stock - (st.shared.prizeUsed[z.id] || 0); return '<div class="odds-row"><span><b>' + E(z.name) + '</b></span><span class="o">' + (z.weight / tw * 100).toFixed(1) + '%</span><span class="muted" style="text-align:right">' + left + '</span></div>'; }).join(''));
    var bd = $('.backdrop.relative'); if (bd && !bd._shown) bd.style.display = 'none';
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ldraw]'); if (!b || spinning) return;
    var r = PMP.drawA(custId(), b.getAttribute('data-ldraw')); if (r.error) { toast(r.error, true); return; }
    spinning = true; var wheel = $('.wheel'), f = PMP.cfg().raffles[0], idx = 0; for (var i = 0; i < 8; i++) { if (f.prizes[i % f.prizes.length].id === r.prize.id) { idx = i; break; } }
    wheel.style.transition = 'transform 3.2s cubic-bezier(.17,.67,.2,1)'; wheel.style.transform = 'rotate(' + (1440 - (22.5 + 45 * idx)) + 'deg)';
    setTimeout(function () {
      spinning = false; wheel.style.transition = 'none'; wheel.style.transform = 'rotate(' + (-(22.5 + 45 * idx)) + 'deg)';
      var bd = $('.backdrop.relative'); bd._shown = 1; bd.style.display = '';
      $('.dialog-h', bd).firstChild.textContent = r.prize.name === f.prizes[0].name ? 'ขอบคุณที่ร่วมลุ้น' : 'ยินดีด้วย!';
      $('.res-win', bd).innerHTML = '<div class="center" style="padding:6px 0 14px"><div class="small muted">ผลการลุ้น</div><div style="font-size:22px;font-weight:800;margin:4px 0">' + E(r.prize.name) + '</div><div class="small muted">โอกาสถูก ' + r.odds + '%</div><div class="soft mt8" style="text-align:left"><b>ได้รับเข้าบัญชีแล้ว</b><ul class="st-log" style="margin:6px 0 0;padding-left:18px">' + r.out.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></div></div><div class="small muted center">เหลือสิทธิ์ ' + (cs().tickets[f.id] || 0) + ' ใบ</div>';
      var cont = $$('.dialog-f .btn.contained', bd)[0]; cont.textContent = 'ลุ้นต่อ (' + (cs().tickets[f.id] || 0) + ' ใบ)'; cont.setAttribute('data-lcont', 1);
      rerender();
    }, 3300);
  });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-lcont]')) { var bd = $('.backdrop.relative'); bd.style.display = 'none'; } });

  /* ================= ADMIN LISTS (same table markup as the static mockup) ================= */
  function statusChip(o, now) { var s = PMP.status(o, now); return '<span class="chip ' + ({ running: 'success', upcoming: 'warning', expired: 'error', exhausted: 'error', inactive: '' }[s]) + '">' + PMP.statusLabel[s] + '</span>'; }
  function tbody(sel, html, cols) { var tb = $(sel); tb.innerHTML = html || '<tr><td colspan="' + (cols || 8) + '" class="center muted" style="padding:24px">ไม่มีรายการ</td></tr>'; }
  function allClaims() { return PMP.state().claims || []; }

  /* ---- coupon/02 รายการชุดคูปองกระดาษ ---- */
  H['coupon/02-admin-paper-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), pcs = st.paperClaims || [];
    tbody('table.table tbody', cfg.paper.map(function (p) {
      var got = pcs.filter(function (c) { return c.ppId === p.id && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + (c.counted != null ? c.counted : c.stubs); }, 0), pct = p.issued ? Math.min(100, Math.round(got / p.issued * 100)) : 0;
      return '<tr><td><b class="mono">' + E(p.code) + '</b></td><td><b>' + E(p.name) + '</b></td><td class="num">' + B(p.value) + '</td><td class="num">' + B(p.min) + '</td><td class="num">' + p.issued.toLocaleString() + '</td><td><div style="min-width:120px"><div class="progress "><i style="width:' + pct + '%"></i></div><div class="small muted mt8" style="margin-top:4px">' + got.toLocaleString() + ' / ' + p.issued.toLocaleString() + ' (' + pct + '%)</div></div></td><td>' + (p.stores.mode === 'all' ? 'ทุกร้านที่ลงทะเบียน' : p.stores.ids.length + ' แห่ง') + '</td><td><span class="chip soft-success">หน้าร้าน</span></td><td class="nowrap">ส่งก้นภายใน ' + p.payDays + ' วัน</td><td><span class="chip ' + (p.active ? 'success' : '') + '">' + (p.active ? 'ใช้งาน' : 'ปิดชุด') + '</span></td><td><div class="small nowrap" style="line-height:2"><a href="04-admin-paper-preview.html" data-lpp="' + p.id + '">ดูหน้า-หลัง</a> · <a href="03-admin-paper-editor.html" data-lpp="' + p.id + '">แก้ไข</a><br><a href="#" data-lppact="dup|' + p.id + '">ทำซ้ำชุด</a> · <a href="#" data-lppact="tog|' + p.id + '" style="color:var(--error-dark)">' + (p.active ? 'ปิดชุด' : 'เปิดชุด') + '</a></div></td></tr>';
    }).join(''), 11);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lppact]'); if (a) { e.preventDefault(); var d = a.getAttribute('data-lppact').split('|'), cfg = PMP.cfg(), i = cfg.paper.map(function (p) { return p.id; }).indexOf(d[1]), p = cfg.paper[i]; if (d[0] === 'tog') p.active = !p.active; else { var n = U.clone(p); n.id = U.uid('pp'); n.code = p.code + '-2'; n.name += ' (สำเนา)'; n.active = false; cfg.paper.push(n); } PMP.saveCfg(cfg); rerender(); toast('บันทึกแล้ว'); return; }
    var l = e.target.closest && e.target.closest('[data-lpp]'); if (l) U.wr('pmpc.live.paper', l.getAttribute('data-lpp'));
  });

  /* ---- coupon/05 คิวเบิกเงินร้าน (นับก้น) ---- */
  H['coupon/05-admin-paper-claims.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), pcs = st.paperClaims || [];
    var rows = pcs.map(function (c, i) {
      var pp = cfg.paper.filter(function (x) { return x.id === c.ppId; })[0], su = PMP.stores.filter(function (x) { return x.id === c.storeId; })[0], fl = c.flags.map(function (f) { return '<div style="margin-top:4px"><span class="chip soft-error">' + E(f) + '</span></div>'; }).join('');
      var act = c.status === 'รอตรวจนับ' ? '<input class="input" data-lpcn="' + c.id + '" type="number" placeholder="นับได้" style="width:80px;min-height:30px"> <a href="#" data-lpcact="count|' + c.id + '">บันทึกนับ</a> · <a href="#" data-lpcact="reject|' + c.id + '" style="color:var(--error-dark)">ปฏิเสธ</a>' : c.status === 'ตรวจนับแล้ว' ? '<a href="#" data-lpcact="pay|' + c.id + '">บันทึกจ่ายเงิน</a>' : '—';
      return '<tr><td><b class="mono">C-' + String(131 + pcs.length - i).padStart(4, '0') + '</b></td><td><b>' + E(su.name) + '</b></td><td class="mono">' + E(pp.code) + '</td><td class="num">' + c.stubs + '</td><td class="num">' + (c.counted != null ? c.counted : '—') + '</td><td class="num">' + B(pp.value) + '</td><td class="num"><b>' + B(c.amount) + (c.counted == null ? '*' : '') + '</b></td><td><span class="chip ' + ({ 'รอตรวจนับ': 'warning', 'ตรวจนับแล้ว': 'info', 'จ่ายแล้ว': 'success', 'ปฏิเสธ': 'error' }[c.status]) + '">' + c.status + '</span>' + fl + '</td><td class="nowrap">' + dmy(c.d) + '</td><td class="nowrap">' + act + '</td></tr>';
    }).join('');
    var tb = $$('table.table tbody')[0]; tb.innerHTML = rows || '<tr><td colspan="10" class="center muted" style="padding:24px">ยังไม่มีคำขอเบิก — ร้านส่งก้นที่แท็บ “คูปองกระดาษ” ของหน้า <a href="../simulator/03-state.html#paper">สิทธิ์ & ผลลัพธ์</a></td></tr>';
    // per-store summary table
    var t2 = $$('table.table tbody')[1]; if (t2) t2.innerHTML = PMP.stores.map(function (su) { var tot = pcs.filter(function (c) { return c.storeId === su.id && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + c.stubs; }, 0), mx = Math.max.apply(null, cfg.paper.map(function (p) { return p.maxPerStore; })); return '<tr><td>' + E(su.name) + '</td><td class="num">' + tot + '</td><td class="num">' + mx + '</td><td style="width:140px"><div class="progress ' + (tot > mx ? '' : 'green') + '"><i style="width:' + Math.min(100, tot / mx * 100) + '%"></i></div></td><td><span class="chip ' + (tot > mx ? 'soft-error' : 'soft-success') + '">' + (tot > mx ? 'เกินใบสูงสุด' : 'ปกติ') + '</span></td></tr>'; }).join('');
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lpcact]'); if (!a) return; e.preventDefault(); var d = a.getAttribute('data-lpcact').split('|'), inp = $('[data-lpcn="' + d[1] + '"]'), r = PMP.paperAct(d[1], d[0], inp ? +inp.value : null); toast(r.error || 'บันทึกแล้ว', !!r.error); rerender(); });

  /* ---- campaign/01 รายการแคมเปญ ---- */
  H['campaign/01-admin-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now, rows = '';
    cfg.ladders.forEach(function (L) {
      var users = Object.keys(st.customers).map(function (k) { return st.customers[k].ladder[L.id]; }).filter(function (v) { return v && v.spent > 0; }), req = (st.claims || []).filter(function (c) { return c.lid === L.id && c.status === 'รอตรวจ'; }).length;
      var days = Math.max(0, Math.round((new Date(L.end) - new Date(now)) / 864e5));
      rows += '<tr><td><b>' + E(L.name) + '</b><div class="sub">' + L.tiers.length + ' ขั้นรางวัล · ' + users.length + ' ร้านที่มียอด</div></td><td><span class="chip soft-primary">สะสมยอดรายปี</span></td><td><b>' + dmy(L.start) + ' – ' + dmy(L.end) + '</b><div class="sub">เหลือ ' + days + ' วัน</div></td><td>' + (L.scope.mode === 'all' ? 'ทุกสินค้า' : L.scope.mode === 'pset' ? 'กลุ่มสินค้าที่ตั้งไว้' : 'เลือกรายสินค้า') + '<div class="sub">กลุ่มเป้าหมาย: ' + E(L.aud) + '</div></td><td>' + statusChip(L, now) + '</td><td class="prog-cell"><b>' + users.length + ' ร้านเข้าร่วม</b><div class="mini-steps">' + L.tiers.map(function (t, i) { return '<span>ขั้น ' + (i + 1) + ' · ' + users.filter(function (v) { return v.unlocked.indexOf(t.id) > -1; }).length + '</span>'; }).join('') + '</div><div class="sub mt8">คำขอรอตรวจ ' + req + '</div></td><td><div class="acts"><a class="btn text sm" href="03-admin-ladder-editor.html">จัดการขั้น</a><a class="btn text sm" href="04-admin-claims.html">คิวคำขอ</a><a class="btn text sm" href="05-admin-progress.html">ความคืบหน้า</a></div></td></tr>';
    });
    cfg.quota.forEach(function (q) {
      var p = PMP.product(q.sku);
      rows += '<tr><td><b>' + E(q.name) + '</b><div class="sub">ราคาพิเศษ ' + B(q.special) + ' · ต่อคน ' + q.perCust + '</div></td><td><span class="chip soft-info">ช่วงเวลา + โควตา</span></td><td><b>' + dmy(q.start) + ' – ' + dmy(q.end) + '</b></td><td>1 SKU<div class="sub">' + E(p.name) + '</div></td><td>' + statusChip({ active: q.active, start: q.start, end: q.end, quotaTotal: q.quotaTotal, used: q.used }, now) + '</td><td class="prog-cell"><b>ใช้โควตา ' + q.used + ' / ' + q.quotaTotal + '</b><div class="progress mt8"><i style="width:' + Math.min(100, q.used / q.quotaTotal * 100) + '%"></i></div></td><td><div class="acts"><a class="btn text sm" href="02-admin-quota-editor.html" data-lsel-quota="' + q.id + '">แก้ไข</a></div></td></tr>';
    });
    tbody('table.table tbody', rows, 7);
  };

  /* ---- campaign/04 คิวคำขอรับรางวัล ---- */
  H['campaign/04-admin-claims.html'] = function () {
    var cl = allClaims();
    tbody('table.table tbody', cl.map(function (c, i) {
      var cu = PMP.customers.filter(function (x) { return x.id === c.cid; })[0];
      var act = c.status === 'รอตรวจ' ? '<div class="acts"><button class="btn contained sm" data-lcact="approve|' + c.id + '">อนุมัติ</button><button class="btn text sm grey" data-lcact="reject|' + c.id + '">ปฏิเสธ</button></div>' : '<span class="muted">' + (c.reason ? E(c.reason) : 'staff1') + '</span>';
      return '<tr><td class="nowrap">' + dmy(c.d) + '<div class="sub">CL-' + String(46 + cl.length - i - 1).padStart(4, '0') + '</div></td><td><b>' + E(cu.name) + '</b><div class="sub">' + cu.type + '</div></td><td><span class="chip src-camp">แคมเปญ</span><div><b>' + E(c.name) + '</b></div><div class="sub">' + c.labels.map(function (l, k) { return E(l) + ': ' + E(c.answers[k] || '-'); }).join(' · ') + '</div></td><td><span class="chip ' + ({ 'รอตรวจ': 'soft-warning', 'ปฏิเสธ': 'error' }[c.status] || 'success') + '">' + c.status + '</span></td><td>' + act + '</td></tr>';
    }).join(''), 5);
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lcact]'); if (!a) return; var d = a.getAttribute('data-lcact').split('|'), rs = d[0] === 'reject' ? prompt('เหตุผลที่ปฏิเสธ (ต้องระบุ)') : null, r = PMP.claimAct(d[1], d[0], rs); toast(r.error || r.out.join(' · '), !!r.error); rerender(); });

  /* ---- raffle/01 รายการกิจกรรม ---- */
  H['raffle/01-admin-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now;
    tbody('table.table tbody', cfg.raffles.map(function (f) {
      var held = Object.keys(st.customers).reduce(function (a, k) { return a + (st.customers[k].tickets[f.id] || 0); }, 0), draws = Object.keys(st.customers).reduce(function (a, k) { return a + st.customers[k].draws.filter(function (d) { return d.f === f.name; }).length; }, 0), pool = Object.keys(st.shared.rafflePool[f.id] || {}).reduce(function (a, k) { return a + st.shared.rafflePool[f.id][k]; }, 0);
      var cost = f.prizes.reduce(function (a, z) { return a + (st.shared.prizeUsed[z.id] || 0); }, 0);
      return '<tr><td><b>' + E(f.name) + '</b><div class="ev-id">' + f.id.toUpperCase() + ' · ทางเข้า: ยอดซื้อ · ผลตอบแทนโปร · แลกพอยท์</div></td><td><span class="mode a">A</span> <span class="mode b">B</span></td><td class="nowrap">' + dmy(f.start) + ' – ' + dmy(f.end) + '<div class="small muted">กองโหมด B ' + (pool + f.poolOthers) + ' สิทธิ์</div></td><td class="num">' + (held + draws + pool).toLocaleString() + ' / ' + (draws + pool).toLocaleString() + '</td><td class="budget"><div class="row between small"><b>ถูกรางวัลแล้ว ' + cost + '</b><span class="muted">/ ' + f.prizes.reduce(function (a, z) { return a + z.stock; }, 0).toLocaleString() + ' ชิ้น</span></div><div class="progress green"><i style="width:' + Math.min(100, cost / Math.max(1, f.prizes.reduce(function (a, z) { return a + z.stock; }, 0)) * 100) + '%"></i></div></td><td>' + statusChip(f, now).replace('กำลังใช้งาน', 'เปิด') + '</td><td class="nowrap"><a class="btn text sm" href="02-admin-editor.html" data-lsel-raffle="' + f.id + '">แก้ไข</a><a class="btn text sm" href="03-admin-prizes-budget.html" data-lsel-raffle="' + f.id + '">รางวัล/งบ</a><a class="btn text sm grey" href="05-admin-audit.html">บันทึก</a></td></tr>';
    }).join(''), 7);
  };

  /* ---- foundation/01 กลุ่มลูกค้า ---- */
  H['foundation/01-admin-customer-sets.html'] = function () {
    var cfg = PMP.cfg();
    function usage(id) { var a = 'set:' + id, p = cfg.promos.filter(function (x) { return x.aud === a; }).length, k = cfg.coupons.filter(function (x) { return x.aud === a; }).length, c = cfg.quota.filter(function (x) { return x.aud === a; }).length + cfg.ladders.filter(function (x) { return x.aud === a; }).length; return 'โปรโมชั่น ' + p + ' · คูปอง ' + k + ' · แคมเปญ ' + c; }
    tbody('table.table tbody', cfg.csets.map(function (c, i) { return '<tr><td><div class="nm">' + E(c.name) + '</div><div class="sub">' + E(c.note || '-') + '</div></td><td><b>' + (c.members.length + c.extra) + '</b> ราย</td><td>' + usage(c.id) + '</td><td>' + dm(cfg.now) + ' · staff1</td><td><a class="btn text sm" href="02-admin-customer-set-editor.html" data-lsel-cset="' + c.id + '">แก้ไข</a><button class="btn text sm grey" data-lcsdel="' + c.id + '">ลบกลุ่ม</button></td></tr>'; }).join(''), 5);
  };
  document.addEventListener('click', function (e) {
    var d = e.target.closest && e.target.closest('[data-lcsdel]'); if (d) { if (!confirm('ลบกลุ่มลูกค้านี้? (รายการที่ใช้กลุ่มนี้จะกลับเป็น “ทุกคน”)')) return; var cfg = PMP.cfg(), id = d.getAttribute('data-lcsdel'), a = 'set:' + id; cfg.csets = cfg.csets.filter(function (c) { return c.id !== id; }); [].concat(cfg.promos, cfg.coupons, cfg.quota, cfg.ladders).forEach(function (x) { if (x.aud === a) x.aud = 'all'; }); PMP.saveCfg(cfg); rerender(); toast('ลบกลุ่มแล้ว'); return; }
    var l = e.target.closest && e.target.closest('[data-lcs]'); if (l) U.wr('pmpc.live.cset', l.getAttribute('data-lcs'));
  });

  /* ---- starterkit/01 รายการเซตร้านยา ---- */
  H['starterkit/01-admin-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state();
    tbody('table.table tbody', cfg.kits.map(function (k) {
      var r = PMP.kitCalc(k, null), req = k.items.filter(function (x) { return x.req; }).length, opt = k.items.length - req, orders = (st.kitOrders || []).filter(function (o) { return o.kit === k.name; }).length;
      var low = r.lines.map(function (l) { var s = cfg.stock[l.it.sku]; return s == null ? null : { n: l.p.name, can: Math.floor(s / Math.max(1, l.q)), req: l.it.req }; }).filter(Boolean).sort(function (a, b) { return a.can - b.can; })[0];
      return '<tr><td class="nm"><b>' + E(k.name) + '</b><span class="small muted">ส่วนลดเซต ' + k.disc + '%</span></td><td><span class="chip soft-info">' + (k.aud === 'B2B' ? 'เฉพาะ B2B' : 'ทุกคน') + '</span></td><td class="cnt"><span class="chip soft-primary">บังคับ ' + req + '</span> <span class="chip outline">ทางเลือก ' + opt + '</span></td><td class="num nowrap">' + B(r.total) + '<div class="small muted">ราคาตั้งต้น ' + B(r.sub) + '</div></td><td class="num">−' + B(r.disc) + '</td><td><div class="health"><span class="chip ' + (low && low.can < 1 ? 'soft-error' : 'soft-success') + '" style="width:fit-content">' + (low ? 'พอขาย ' + low.can + ' เซต' : 'สต็อกไม่จำกัด') + '</span>' + (low ? '<span class="line">จุดคอขวด: ' + E(low.n) + '</span>' : '') + '</div></td><td><span class="chip success">ขาย</span></td><td class="num"><b>' + orders + '</b></td><td><div class="acts"><a class="btn text sm" href="02-admin-editor.html" data-lsel-kit="' + k.id + '">แก้ไข</a><a class="btn text sm" href="03-admin-order-behalf.html">สั่งแทนลูกค้า</a></div></td></tr>';
    }).join(''), 9);
  };

  /* ---- points/03 สมุดพอยท์ลูกค้า ---- */
  H['points/03-admin-ledger.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), bal = c.points, led = c.ledger || [];
    var rows = led.map(function (e) {
      var plus = e.t.charAt(0) === '+', n = parseInt(e.t.replace('+', '').replace('-', ''), 10), row = '<tr><td>' + dmy(e.d) + '</td><td><span class="chip ' + (plus ? 'soft-success' : 'soft-error') + '">' + (/แลก/.test(e.why) ? 'แลก' : /หมดอายุ/.test(e.why) ? 'หมดอายุ' : plus ? 'ได้รับ' : 'ใช้') + '</span></td><td>' + E(e.why) + '</td><td class="amt ' + (plus ? 'plus' : 'minus') + '">' + e.t.replace('-', '−') + '</td><td class="amt">' + bal.toLocaleString() + '</td><td>' + (plus ? dm(PMP.addDays(e.d, cfg.points.expiryDays)) : '—') + '</td><td>ระบบ</td></tr>';
      bal += plus ? -n : n; return row;
    }).join('');
    tbody('table.table tbody', rows, 7);
    var nm = $$('.muted,.small,.nm,b').filter(function (x) { return !x.childElementCount && x.textContent.indexOf('ร้านยา ทดสอบ จำกัด') > -1; }); nm.forEach(function (x) { x.textContent = x.textContent.replace('ร้านยา ทดสอบ จำกัด', cust().name); });
  };

  /* ---- points/02 แคตตาล็อกแลก (ตาราง + dialog แก้ไข) ---- */
  var KC = { coupon: ['soft-primary', 'คูปอง'], gift: ['soft-success', 'ของแถม'], offpos: ['soft-success', 'ของนอก POS'], credit: ['soft-info', 'เครดิต'], entitle: ['soft-warning', 'สิทธิ์ลุ้น'], points: ['soft-warning', 'พอยท์'] };
  var catSel = null;
  H['points/02-admin-catalog.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state();
    tbody('table.table tbody', cfg.catalog.map(function (it, i) {
      var items = PMP.rewardsOf('points', it.id), kinds = items.map(function (x) { return x.k; }).filter(function (k, j, a) { return a.indexOf(k) === j; });
      var redeemed = Object.keys(st.customers).reduce(function (a, k) { return a + st.customers[k].ledger.filter(function (l) { return l.why === 'แลก ' + it.name; }).length; }, 0);
      return '<tr><td><b>' + E(it.name) + '</b><span class="sub mono">RW-' + String(i + 1).padStart(4, '0') + '</span></td><td>' + kinds.map(function (k) { return '<span class="chip ' + KC[k][0] + '">' + KC[k][1] + '</span>'; }).join(' ') + '</td><td>' + E(items.map(function (x) { return PMP.describe(x, cfg); }).join(' + ') || '—') + '<span class="sub">ผลตอบแทนตั้งในรายการนี้ (component)</span></td><td class="num"><b>' + it.pts.toLocaleString() + '</b></td><td>' + (it.stock < 1 ? '<span class="chip error">หมดแล้ว</span>' : it.stock + ' คงเหลือ') + '<span class="sub">แลกแล้ว ' + redeemed + ' ครั้ง</span></td><td>' + (it.aud === 'all' ? 'ทุกคน' : E(it.aud)) + '</td><td>' + (it.stock < 1 ? '<span class="chip error">หมดแล้ว</span>' : '<span class="chip ' + (it.active ? 'success' : '') + '">' + (it.active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว') + '</span>') + '</td><td><button class="btn text sm" data-lcatedit="' + it.id + '">แก้ไข</button><button class="btn text sm grey" data-lcattog="' + it.id + '">' + (it.active ? 'ปิดชั่วคราว' : 'เปิด') + '</button></td></tr>';
    }).join(''), 8);
    var it = cfg.catalog.filter(function (x) { return x.id === catSel; })[0] || cfg.catalog[0]; if (!it) return;
    var d = $('.dialog.lg'); if (!d) return;
    $('.dialog-h', d).firstChild.textContent = 'แก้ไขรายการแลก: ' + it.name;
    var ins = $$('.input', d); ins[0].value = it.name; // ชื่อรายการ
    var pts = $$('.form-sec', d)[2]; var pin = $$('.input-adorn .input', d)[0]; if (pin) pin.value = it.pts;
    var quota = $$('.field', d).filter(function (f) { return f.textContent.indexOf('โควตารวม') > -1 && $('input', f); })[0]; if (quota) $('input', quota).value = it.stock;
    var ck = $$('label.switch input', d)[0]; if (ck) ck.checked = it.active;
    var box = $('[data-rwd]', d); if (box && box.getAttribute('data-ref') !== it.id) { box.setAttribute('data-ref', it.id); if (PMP.Reward) PMP.Reward.render(box); }
    var sv = $('.dialog-f .btn.contained', d); sv.setAttribute('data-lcatsave', it.id);
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lcatedit]'); if (a) { catSel = a.getAttribute('data-lcatedit'); rerender(); $('.dialog.lg').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    var t = e.target.closest && e.target.closest('[data-lcattog]'); if (t) { var cfg = PMP.cfg(), it = cfg.catalog.filter(function (x) { return x.id === t.getAttribute('data-lcattog'); })[0]; it.active = !it.active; PMP.saveCfg(cfg); rerender(); return; }
    var s = e.target.closest && e.target.closest('[data-lcatsave]'); if (s) { var cfg2 = PMP.cfg(), it2 = cfg2.catalog.filter(function (x) { return x.id === s.getAttribute('data-lcatsave'); })[0], d = $('.dialog.lg'); it2.name = $$('.input', d)[0].value; it2.pts = +$$('.input-adorn .input', d)[0].value || it2.pts; var q = $$('.field', d).filter(function (f) { return f.textContent.indexOf('โควตารวม') > -1 && $('input', f); })[0]; if (q && $('input', q).value !== '') it2.stock = +$('input', q).value; it2.active = $$('label.switch input', d)[0].checked; PMP.saveCfg(cfg2); toast('บันทึกรายการแลกแล้ว'); rerender(); }
  });

  /* ---- coupon/06 โค้ดส่วนลด (ตาราง + dialog) ---- */
  var cpSel = null;
  H['coupon/06-admin-online.html'] = function () {
    var cfg = PMP.cfg(), now = cfg.now, codes = cfg.coupons.filter(function (k) { return k.kind === 'code'; });
    tbody('table.table tbody', codes.map(function (k) {
      var pct = k.quotaTotal ? Math.round(k.used / k.quotaTotal * 100) : 0;
      return '<tr><td><b class="mono">' + E(k.code) + '</b></td><td>' + kindDesc(k) + '</td><td class="num">' + B(k.min) + '</td><td>' + (k.quotaTotal ? '<div style="min-width:110px"><div class="progress ' + (pct > 90 ? '' : 'green') + '"><i style="width:' + pct + '%"></i></div><div class="small muted" style="margin-top:4px">' + k.used + ' / ' + k.quotaTotal + ' (' + pct + '%)</div></div>' : '<div class="small"><b>' + k.used + '</b> / ไม่จำกัด</div>') + '</td><td>' + (k.perCust ? k.perCust + ' / คน' : 'ไม่จำกัด') + '</td><td class="nowrap">' + dmy(k.start) + ' – ' + dmy(k.end) + '</td><td><span class="chip ' + (k.stackPromo ? 'soft-success' : 'soft-error') + '">' + (k.stackPromo ? 'ได้' : 'ไม่ได้') + '</span></td><td><span class="chip soft-success">ได้</span></td><td>' + statusChip(k, now) + '</td><td><a href="#dlg" data-lkedit="' + k.id + '">แก้ไข</a></td></tr>';
    }).join(''), 10);
    var k = codes.filter(function (x) { return x.id === cpSel; })[0] || codes[0]; if (!k) return;
    var d = $('#dlg'); $('.dialog-h', d).firstChild.textContent = 'แก้ไขโค้ดออนไลน์ · ' + k.code + ' ';
    var ins = $$('input.input', d); [k.code, k.value, k.cap || '', k.min, k.quotaTotal || '', k.perCust || '', k.start, k.end].forEach(function (v, i) { if (ins[i]) { ins[i].value = v; ins[i].readOnly = (i === 2 && k.dtype !== 'pct'); } });
    $$('.seg button', d).forEach(function (b, i) { b.classList.toggle('on', (i === 0 && k.dtype === 'baht') || (i === 1 && k.dtype === 'pct')); });
    var sw = $$('label.switch input', d); if (sw[0]) sw[0].checked = k.stackPromo;
    var sv = $('.dialog-f .btn.contained', d); sv.setAttribute('data-lksave', k.id);
    var h = $('.help', d); if (h && k.quotaTotal) { var hh = $$('.help', d).filter(function (x) { return x.textContent.indexOf('ใช้แล้ว') > -1; })[0]; if (hh) hh.textContent = 'ใช้แล้ว ' + k.used + ' ครั้ง — เหลือ ' + (k.quotaTotal - k.used); }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lkedit]'); if (a) { cpSel = a.getAttribute('data-lkedit'); rerender(); return; }
    var sg = e.target.closest && e.target.closest('#dlg .seg button'); if (sg && KEY === 'coupon/06-admin-online.html') { var cfg0 = PMP.cfg(), k0 = cfg0.coupons.filter(function (x) { return x.id === (cpSel || $('[data-lksave]').getAttribute('data-lksave')); })[0]; k0.dtype = [].indexOf.call(sg.parentNode.children, sg) === 1 ? 'pct' : 'baht'; PMP.saveCfg(cfg0); setTimeout(rerender, 0); return; }
    var s = e.target.closest && e.target.closest('[data-lksave]'); if (s) {
      var cfg = PMP.cfg(), k = cfg.coupons.filter(function (x) { return x.id === s.getAttribute('data-lksave'); })[0], ins = $$('#dlg input.input');
      k.code = String(ins[0].value).toUpperCase().replace(/\s+/g, ''); k.value = +ins[1].value || 0; k.cap = +ins[2].value || 0; k.min = +ins[3].value || 0; k.quotaTotal = +ins[4].value || 0; k.perCust = +ins[5].value || 0; if (ins[6].value) k.start = ins[6].value; if (ins[7].value) k.end = ins[7].value; k.stackPromo = $$('#dlg label.switch input')[0].checked;
      PMP.saveCfg(cfg); toast('บันทึกโค้ดแล้ว'); rerender();
    }
  });

  /* ---- promotion/06 หน้ารวมโปรโมชั่น (ลูกค้า) ---- */
  var PF = 'all', POK = true;
  H['promotion/06-customer-list.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), cu = cust(), now = cfg.now;
    var fl = cfg.flash.filter(function (f) { return PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, now) === 'running'; })[0], hero = $('.hero');
    if (fl) { hero.style.display = ''; $('.ft', hero).textContent = fl.name + ' — ลดสูงสุด ' + Math.max.apply(null, fl.rules.map(function (r) { return r.pct; })) + '%'; $('.fs', hero).textContent = 'เฉพาะกลุ่มสินค้าที่ร่วมรายการ · จบ ' + dm(fl.end) + (fl.quota ? ' หรือเมื่อโควตาหมด (เหลือ ' + (fl.quota - fl.used) + ')' : ''); $('.cats', hero).innerHTML = fl.rules.map(function (r) { var ps = cfg.psets.filter(function (p) { return p.id === r.ps; })[0]; return '<span>' + E(ps ? ps.name : r.ps) + ' −' + r.pct + '%</span>'; }).join(''); } else hero.style.display = 'none';
    var chk = $('.filters input[type=checkbox]'); POK = chk ? chk.checked : true;
    var list = cfg.promos.filter(function (p) { var s = PMP.status(p, now); return s === 'running' || (!POK && s === 'upcoming'); });
    if (PF !== 'all') list = list.filter(function (p) { return PMP.rewardsOf('promotion', p.id).some(function (i) { return i.k === PF; }); });
    var CH = { gift: ['gift', 'ของแถม'], disc: ['', 'ส่วนลด'], ship: ['ship', 'ส่งฟรี'], points: ['', 'พอยท์'], coupon: ['', 'คูปอง'], credit: ['', 'เครดิต'], entitle: ['', 'สิทธิ์ลุ้น'], offpos: ['gift', 'ของนอก POS'] };
    $('.promos').innerHTML = list.map(function (p) {
      var items = PMP.rewardsOf('promotion', p.id), s = PMP.status(p, now), uses = c.promoUse[p.id] || 0, left = p.perCust ? p.perCust - uses : null, qleft = p.quotaTotal ? p.quotaTotal - p.used : null;
      var okAud = cu.type && (p.aud === 'all' || (p.aud === 'new' && c.orders === 0) || p.aud === cu.type || (String(p.aud).indexOf('set:') === 0 && (cfg.csets.filter(function (x) { return x.id === p.aud.slice(4); })[0] || { members: [] }).members.indexOf(cu.id) > -1));
      return '<div class="card pc"><div class="card-b"><div class="row between top"><h6>' + E(p.name) + '</h6><span class="chip ' + (s === 'running' ? 'success' : 'warning') + '">' + (s === 'running' ? PMP.statusLabel[s] : 'ยังไม่เริ่มต้น') + '</span></div><div class="row mt8" style="gap:6px">' + items.map(function (i) { return '<span class="promo-tag ' + CH[i.k][0] + '">' + CH[i.k][1] + '</span>'; }).join('') + (okAud ? '' : '<span class="chip soft-warning">ไม่ตรงกลุ่มของคุณ</span>') + '</div><p class="mt8">' + (p.ctype === 'qty' ? 'ซื้อสินค้าที่ร่วมรายการครบ ' + p.min + ' หน่วย' : 'ซื้อครบ ' + B(p.min)) + (p.aud === 'new' ? ' · เฉพาะลูกค้าใหม่ที่ยังไม่เคยสั่งซื้อ' : '') + '</p><div class="kv2"><div><b>ประเภทเงื่อนไข:</b> ' + (p.ctype === 'qty' ? 'ตามจำนวน' : 'ตามยอดเงิน') + '</div><div><b>ระยะเวลา:</b> ' + dm(p.start) + ' - ' + dm(p.end) + '</div><div><b>ใช้ร่วมกับโปรอื่น:</b> ' + (p.stackPromo ? 'ได้' : 'ไม่ได้') + '</div></div><div class="quota"><div class="t">โควต้า</div><div class="r"><span class="muted">ต่อลูกค้า ใช้แล้ว ' + uses + (p.perCust ? '/' + p.perCust : '') + '</span><span class="ok">' + (qleft == null ? 'ไม่จำกัดโควต้ารวม' : 'โควต้ารวมเหลือ ' + qleft + '/' + p.quotaTotal) + '</span></div></div><div class="sumline"><b>ผลตอบแทน:</b> ' + E(items.map(function (i) { return PMP.describe(i, cfg); }).join(' + ')) + '</div><a class="btn contained block" href="08-customer-detail.html" data-lsel-promo="' + p.id + '">ดูรายละเอียด</a></div></div>';
    }).join('') + (list.length ? '' : '<div class="muted" style="grid-column:1/-1;padding:24px">ไม่มีโปรโมชั่นที่เปิดอยู่</div>');
    $$('.pill').forEach(function (p, i) { p.classList.toggle('on', ['all', 'gift', 'disc', 'ship'][i] === PF); });
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var p = e.target.closest && e.target.closest('.pill'); if (p && KEY === 'promotion/06-customer-list.html') { PF = ['all', 'gift', 'disc', 'ship'][[].indexOf.call(p.parentNode.children, p) - ($$('.pill')[0] ? 0 : 0)] || 'all'; rerender(); } });
  document.addEventListener('change', function (e) { if (KEY === 'promotion/06-customer-list.html' && e.target.closest && e.target.closest('.filters')) rerender(); });

  /* ---- coupon/10 ตรวจสอบคูปองกระดาษ ---- */
  var shown = { code: 'OCT50', val: '฿50', min: '฿300', name: 'บูทสัมมนาเภสัช ต.ค. 69', end: '31 ธ.ค. 2569' };
  H['coupon/10-customer-paper-info.html'] = function () {
    var cfg = PMP.cfg(), id = U.rd('pmpc.live.paper', null), inp = $('input.mono'), btn = inp.nextElementSibling;
    var pp = cfg.paper.filter(function (x) { return x.id === id; })[0] || cfg.paper[0]; if (!pp) return;
    if (!inp._b) { inp._b = 1; btn.addEventListener('click', function () { var v = inp.value.trim().toUpperCase(), q = PMP.cfg().paper.filter(function (x) { return x.code === v; })[0]; if (!q) { toast('ไม่พบรหัสคูปองกระดาษ “' + v + '”', true); return; } U.wr('pmpc.live.paper', q.id); rerender(); }); }
    inp.value = pp.code;
    var main = $('#screen'), html = main.innerHTML;
    var next = { code: pp.code, val: B(pp.value), min: B(pp.min), name: pp.name.replace('คูปองกระดาษ ', ''), end: 'ส่งก้นภายใน ' + pp.payDays + ' วัน' };
    function swap(a, b) { if (a !== b) html = html.split(a).join(b); }
    swap('>' + shown.code + '<', '>' + next.code + '<'); swap('ชุด ' + shown.code, 'ชุด ' + next.code); swap('>' + shown.val + '<', '>' + next.val + '<'); swap('ครบ ' + shown.min, 'ครบ ' + next.min); swap(shown.name, next.name); swap('value="' + shown.code + '"', 'value="' + next.code + '"');
    if (html !== main.innerHTML) { main.innerHTML = html; shown = next; inp = $('input.mono'); inp._b = 0; btn = inp.nextElementSibling; btn.addEventListener('click', function () { var v = inp.value.trim().toUpperCase(), q = PMP.cfg().paper.filter(function (x) { return x.code === v; })[0]; if (!q) { toast('ไม่พบรหัสคูปองกระดาษ “' + v + '”', true); return; } U.wr('pmpc.live.paper', q.id); rerender(); }); inp._b = 1; }
    var stores = pp.stores.mode === 'all' ? PMP.stores : PMP.stores.filter(function (s) { return pp.stores.ids.indexOf(s.id) > -1; });
    $$('.pb-cols ul')[0].innerHTML = stores.map(function (s) { return '<li>' + E(s.name) + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : '');
    var al = $('.alert.success .a-title'); if (al) { al.textContent = 'ชุด ' + pp.code + ' · ' + (pp.active ? 'ใช้ได้' : 'ปิดชุดแล้ว') + ' — ลด ' + B(pp.value) + ' เมื่อซื้อครบ ' + B(pp.min); al.parentNode.lastChild.textContent = pp.name + ' · ส่งก้นเบิกภายใน ' + pp.payDays + ' วัน · ใช้ที่ร้านที่ร่วมรายการ ' + (pp.stores.mode === 'all' ? 'ทุกแห่ง' : stores.length + ' แห่ง'); }
    var n = PMP.cfg(); // channel text kept as is
  };

  /* ================= EDITOR BINDING (admin setting pages: same fields/buttons as the mockup, saved to the simulator data) ================= */
  function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  /* find the control that belongs to the label containing `text` (nth match) */
  function ctl(root, text, nth, sel) {
    var n = 0, labs = $$('label,.label,.lbl', root);
    for (var i = 0; i < labs.length; i++) {
      if (norm(labs[i].textContent).indexOf(text) === 0 || norm(labs[i].textContent).indexOf(text) > -1 && norm(labs[i].textContent).indexOf(text) < 3) {
        if (n++ !== (nth || 0)) continue;
        var scope = labs[i].closest('.field') || labs[i].parentElement, c = scope && scope.querySelector(sel || 'input:not([type=radio]):not([type=checkbox]),select,textarea');
        if (c) return c;
      }
    }
    return null;
  }
  function bindc(el, get, set, kind) {
    if (!el) return;
    var v = get();
    if (kind === 'date') { if (el.type !== 'date') el.type = 'date'; el.value = v || ''; }
    else if (kind === 'chk') el.checked = !!v;
    else el.value = v == null ? '' : v;
    el.classList.remove('is-err'); var er = el.parentElement && el.parentElement.querySelector('.err'); if (er && el.parentElement.querySelector('.err') && /ต้องไม่น้อยกว่า/.test(er.textContent)) er.style.display = 'none';
    if (el._lb) { el._lb = { get: get, set: set }; return; }
    el._lb = { get: get, set: set };
    var h = function () { var f = el._lb; var val = kind === 'chk' ? el.checked : kind === 'num' ? (el.value === '' ? 0 : +el.value) : el.value; f.set(val); flashSaved(); };
    el.addEventListener(kind === 'chk' || el.tagName === 'SELECT' || kind === 'date' ? 'change' : 'input', h);
    if (kind === 'text' || kind === 'num') el.addEventListener('change', h);
  }
  var savedT = null;
  function flashSaved() { var t = $('#liveSaved'); if (!t) { t = document.createElement('div'); t.id = 'liveSaved'; t.className = 'live-saved'; document.body.appendChild(t); } t.textContent = '✓ บันทึกอัตโนมัติแล้ว'; t.classList.add('on'); clearTimeout(savedT); savedT = setTimeout(function () { t.classList.remove('on'); }, 1400); }
  function bindRadio(root, name, get, set, map) {
    var els = $$('input[type=radio][name="' + name + '"]', root);
    els.forEach(function (r) {
      r.checked = (map ? map(get()) : get()) === r.value;
      r._lbs = set; if (!r._lb) { r._lb = 1; r.addEventListener('change', function () { if (r.checked) { r._lbs(r.value); flashSaved(); } }); }
    });
  }
  function bindSeg(seg, get, set, vals) {
    if (!seg) return; var bs = [].slice.call(seg.children), cur = vals.indexOf(get()); bs.forEach(function (b, i) { b.classList.toggle('on', i === cur); });
    seg._lbs = set; seg._lbv = vals; if (!seg._lb) { seg._lb = 1; seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var i = [].indexOf.call(seg.children, b); if (i > -1) { seg._lbs(seg._lbv[i]); [].forEach.call(seg.children, function (x, k) { x.classList.toggle('on', k === i); }); flashSaved(); } }); }
  }
  function pickBar(afterEl, items, cur, onPick, onNew, newLabel) {
    var old = $('#livePick'); if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div'); d.id = 'livePick'; d.className = 'live-pick';
    d.innerHTML = '<b>เลือกรายการที่จะแก้ไข</b><select class="select">' + items.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + E(x.label) + '</option>'; }).join('') + '</select>' + (onNew ? '<button class="btn outlined sm" type="button">' + (newLabel || '＋ สร้างใหม่') + '</button>' : '') + '<span class="small muted">แก้ไขแล้วบันทึกอัตโนมัติ · ข้อมูลชุดเดียวกับหน้ารายการ</span>';
    afterEl.insertAdjacentElement('afterend', d);
    $('select', d).onchange = function () { onPick(this.value); };
    var nb = $('button', d); if (nb) nb.onclick = onNew;
  }
  function selKey(kind) { return 'pmpc.live.sel.' + kind; }
  function pickId(kind, list) { var id = U.rd(selKey(kind), null); return list.filter(function (x) { return x.id === id; })[0] ? id : (list[0] && list[0].id); }
  function hl(kind) { document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lsel-' + kind + ']'); if (a) U.wr(selKey(kind), a.getAttribute('data-lsel-' + kind)); }); }
  function audVal(rec) { return String(rec.aud || 'all'); }
  function setCfg(fn) { var cfg = PMP.cfg(); fn(cfg); PMP.saveCfg(cfg); }
  function recOf(listName, id) { return PMP.cfg()[listName].filter(function (x) { return x.id === id; })[0]; }
  function editRec(listName, id, fn) { var cfg = PMP.cfg(), r = cfg[listName].filter(function (x) { return x.id === id; })[0]; if (r) { fn(r, cfg); PMP.saveCfg(cfg); } }
  function updateReveal() { document.dispatchEvent(new Event('change')); }

  /* ===== promotion/02 สร้าง/แก้ไขโปรโมชั่น ===== */
  H['promotion/02-admin-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('promo', cfg.promos), root = $('.ed-grid'), P = function () { return recOf('promos', id); };
    if (!P()) return;
    pickBar($('.page-head'), cfg.promos.map(function (p) { return { id: p.id, label: p.name }; }), id, function (v) { U.wr(selKey('promo'), v); location.reload(); }, function () {
      var nid = U.uid('p'); setCfg(function (c) { c.promos.push({ id: nid, name: 'โปรโมชั่นใหม่', desc: '', condText: '', kind: 'cond', start: c.now, end: PMP.addDays(c.now, 60), active: false, quotaTotal: 100, used: 0, perCust: 2, aud: 'all', ctype: 'amt', min: 1000, scope: { mode: 'all', ref: null }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true }); }); PMP.saveRewards('promotion', nid, [{ k: 'disc', mode: 'baht', value: 100, cap: 0 }]); U.wr(selKey('promo'), nid); location.reload();
    }, '＋ สร้างโปรโมชั่น');
    var p0 = P(); if (p0.condText == null) { editRec('promos', id, function (r) { r.desc = r.desc || r.name; r.condText = (r.ctype === 'qty' ? 'ซื้อสินค้าที่ร่วมรายการครบ ' + r.min + ' หน่วย' : 'ซื้อสินค้าที่ร่วมรายการครบ ' + B(r.min)) + ' รับผลตอบแทนตามที่กำหนด'; }); p0 = P(); }
    $('.crumbs').innerHTML = '<a href="01-admin-list.html">← รายการโปรโมชั่น</a> / ' + E(p0.name);
    function S(fn) { editRec('promos', id, fn); refresh(); }
    var nm = ctl(root, 'ชื่อ *'); bindc(nm, function () { return P().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    var tas = $$('textarea', root); bindc(tas[0], function () { return P().desc || ''; }, function (v) { S(function (r) { r.desc = v; }); }, 'text');
    bindc(tas[1], function () { return P().condText || ''; }, function (v) { S(function (r) { r.condText = v; }); }, 'text');
    bindc(ctl(root, 'โควต้าทั้งหมด'), function () { return P().quotaTotal || ''; }, function (v) { S(function (r) { r.quotaTotal = v; }); }, 'num');
    bindc(ctl(root, 'โควต้าต่อลูกค้า'), function () { return P().perCust || ''; }, function (v) { S(function (r) { r.perCust = v; }); }, 'num');
    bindc(ctl(root, 'วันที่เริ่มต้น'), function () { return P().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date');
    bindc(ctl(root, 'วันที่สิ้นสุด'), function () { return P().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
    var sw = $$('label.switch input', root); bindc(sw[0], function () { return P().active; }, function (v) { S(function (r) { r.active = v; }); }, 'chk');
    bindc($('input[name=strict]', root), function () { return P().strict; }, function (v) { S(function (r) { r.strict = v; }); }, 'chk');
    bindc($('input[name=newonly]', root), function () { return P().aud === 'new'; }, function (v) { S(function (r) { r.aud = v ? 'new' : 'all'; }); }, 'chk');
    var ct = $('select[name=ctype]', root); bindc(ct, function () { return P().ctype; }, function (v) { S(function (r) { r.ctype = v; }); updateReveal(); }, 'sel');
    bindc(ctl(root, 'จำนวนเงินรวม'), function () { return P().min; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    bindc(ctl(root, 'จำนวนที่ต้องการ'), function () { return P().min; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    // scope: add "ทุกสินค้า" card + bind
    var rc = $('.radio-cards.c4', root); if (rc && !$('input[value=all]', rc)) { var first = rc.firstElementChild.cloneNode(true); $('input', first).value = 'all'; $('input', first).checked = false; $('.rc-t', first).textContent = 'ทุกสินค้า'; $('.rc-d', first).textContent = 'ไม่จำกัดสินค้า (เช่น ซื้อครบทั้งบิล)'; rc.insertBefore(first, rc.firstElementChild); rc.style.gridTemplateColumns = 'repeat(5,minmax(0,1fr))'; }
    var smap = { all: 'all', skus: 'items', pset: 'pset' };
    bindRadio(root, 'scope', function () { return P().scope.mode; }, function (v) { S(function (r) { r.scope = v === 'all' ? { mode: 'all', ref: null } : v === 'items' ? { mode: 'skus', ref: r.scope.mode === 'skus' ? r.scope.ref : ['BM-VC500'] } : { mode: 'pset', ref: (r.scope.mode === 'pset' && r.scope.ref) || cfg.psets[0].id }; }); updateReveal(); }, function (m) { return smap[m] || 'pset'; });
    updateReveal();
    var ps = $('[data-reveal="scope=pset"] select', root); if (ps) { ps.innerHTML = cfg.psets.map(function (x) { return '<option value="' + x.id + '">' + E(x.name) + '</option>'; }).join(''); bindc(ps, function () { return P().scope.ref || cfg.psets[0].id; }, function (v) { S(function (r) { r.scope = { mode: 'pset', ref: v }; }); }, 'sel'); }
    var it = $('[data-reveal="scope=items"]', root); if (it) {
      it.innerHTML = '<div class="subsec"><span class="subsec-n">C</span><b>สินค้าที่ต้องมี</b></div><div class="itemcard"><div class="itemcard-h"><span class="t"><span class="handle">⋮⋮</span>สินค้าที่นับเข้าเงื่อนไข (เลือกได้หลายหน่วย — เงื่อนไข OR)</span></div><div class="cfg-chk" style="display:flex;gap:8px;flex-wrap:wrap">' + PMP.products.map(function (pr) { return '<label class="check" style="background:var(--g50);border:1px solid var(--g200);border-radius:8px;padding:5px 9px"><input type="checkbox" data-lsku="' + pr.sku + '"> ' + E(pr.sku + ' · ' + pr.name) + '</label>'; }).join('') + '</div><div class="help mt8">จำนวนที่ต้องการ/ยอดเงินตั้งที่ส่วน A · เปิด “ตรวจหน่วยเข้มงวด” เพื่อไม่นับ 1 กล่อง = 6 ขวด</div></div>';
      $$('[data-lsku]', it).forEach(function (cb) { bindc(cb, function () { return (P().scope.ref || []).indexOf(cb.getAttribute('data-lsku')) > -1; }, function (v) { S(function (r) { r.scope.ref = r.scope.ref || []; var i = r.scope.ref.indexOf(cb.getAttribute('data-lsku')); if (v && i < 0) r.scope.ref.push(cb.getAttribute('data-lsku')); if (!v && i > -1) r.scope.ref.splice(i, 1); }); }, 'chk'); });
    }
    // audience picker
    bindRadio(root, 'aud', function () { return P().aud; }, function (v) { S(function (r) { if (v === 'all') r.aud = 'all'; else r.aud = 'set:' + cfg.csets[0].id; }); updateReveal(); }, function (a) { return String(a).indexOf('set:') === 0 ? 'some' : 'all'; });
    updateReveal();
    var as = $$('.aud-row select', root); if (as[0]) { as[0].innerHTML = cfg.csets.map(function (x) { return '<option value="' + x.id + '">' + E(x.name) + ' · ' + (x.members.length + x.extra) + ' ราย</option>'; }).join(''); bindc(as[0], function () { return String(P().aud).indexOf('set:') === 0 ? P().aud.slice(4) : cfg.csets[0].id; }, function (v) { S(function (r) { r.aud = 'set:' + v; }); }, 'sel'); }
    // stack segs
    var rows = $$('.stack-row .seg', root);
    [['stackCoupon', 0], ['stackPromo', 1], ['stackPoints', 2]].forEach(function (m) { bindSeg(rows[m[1]], function () { return P()[m[0]]; }, function (v) { S(function (r) { r[m[0]] = v; }); }, [true, false]); });
    var rw = $('[data-rwd]', root); if (rw && rw.getAttribute('data-ref') !== id) { rw.setAttribute('data-ref', id); if (PMP.Reward) PMP.Reward.render(rw); }
    function refresh() {
      var p = P(), pv = $('.prev-card'); if (!pv) return;
      $('b', pv).textContent = p.name; var sm = $$('p.small.muted', pv); if (sm[0]) sm[0].textContent = p.desc || ''; if (sm[1]) sm[1].textContent = p.condText || '';
      var kv = $$('.small.mt8 div', pv); if (kv[0]) kv[0].innerHTML = '<b>ประเภทเงื่อนไข:</b> ' + (p.ctype === 'qty' ? 'ตามจำนวน ' + p.min : 'ตามยอดเงิน ' + B(p.min)); if (kv[1]) kv[1].innerHTML = '<b>ระยะเวลา:</b> ' + dm(p.start) + ' - ' + dm(p.end);
      var qr = $('.soft .row', pv); if (qr) qr.innerHTML = '<span class="muted">โควต้ารวม: ' + p.used + '/' + (p.quotaTotal || '∞') + '</span><span style="color:var(--success-dark)">ต่อคน: ' + (p.perCust || '∞') + '</span>';
      var items = PMP.rewardsOf('promotion', p.id), last = $$('.small.mt8', pv).filter(function (x) { return !x.querySelector('div'); }).pop(); if (last) last.innerHTML = '<b>ผลตอบแทน:</b> ' + E(items.map(function (i) { return PMP.describe(i); }).join(' + ') || '—');
      var tags = $('.promo-tag') && $('.promo-tag').parentNode; if (tags) tags.innerHTML = items.map(function (i) { return '<span class="promo-tag">' + PMP.kindLabel[i.k] + '</span>'; }).join(' ');
      var al = $('.alert.info div'); if (al) al.innerHTML = 'โปรนี้ถูกใช้สิทธิ์ไปแล้ว <b>' + p.used + ' ครั้ง</b> — การแก้ไขมีผลกับตะกร้าและออเดอร์ใหม่เท่านั้น ประวัติเดิมไม่เปลี่ยน';
    }
    refresh(); document.addEventListener('rwd:change', refresh);
  };
  hl('promo');

  /* ---- more editors ---- */
  function pickBar2(afterEl, id, items, cur, onPick, onNew, newLabel) {
    var old = $('#' + id); if (old) old.parentNode.removeChild(old);
    var d = document.createElement('div'); d.id = id; d.className = 'live-pick';
    d.innerHTML = '<b>เลือกรายการที่จะแก้ไข</b><select class="select">' + items.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + E(x.label) + '</option>'; }).join('') + '</select>' + (onNew ? '<button class="btn outlined sm" type="button">' + (newLabel || '＋ สร้างใหม่') + '</button>' : '') + '<span class="small muted">แก้ไขแล้วบันทึกอัตโนมัติ · ข้อมูลชุดเดียวกับหน้ารายการ</span>';
    afterEl.insertAdjacentElement('afterend', d); $('select', d).onchange = function () { onPick(this.value); }; var nb = $('button', d); if (nb) nb.onclick = onNew;
  }
  function prod(sku) { return PMP.product(sku); }

  /* ===== promotion/04 แคมเปญลดตามวันพิเศษ (Flash) ===== */
  H['promotion/04-admin-flash.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('flash', cfg.flash), root = $('#screen'); if (!id) return;
    var F = function () { return recOf('flash', id); };
    pickBar2($('.page-head'), 'livePick', cfg.flash.map(function (f) { return { id: f.id, label: f.name }; }), id, function (v) { U.wr(selKey('flash'), v); location.reload(); }, function () { var nid = U.uid('fl'); setCfg(function (c) { c.flash.push({ id: nid, name: 'Flash Sale ใหม่', start: c.now, end: PMP.addDays(c.now, 1), active: true, quota: 50, used: 0, rules: [{ ps: c.psets[0].id, pct: 10 }] }); }); U.wr(selKey('flash'), nid); location.reload(); }, '＋ สร้างแคมเปญ');
    function S(fn) { editRec('flash', id, fn); }
    bindc(ctl(root, 'ชื่อแคมเปญ'), function () { return F().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'เริ่ม'), function () { return F().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date');
    bindc(ctl(root, 'สิ้นสุด'), function () { return F().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
    function draw() {
      var f = F(), tb = $('table.table tbody'), pct = f.quota ? Math.round(f.used / f.quota * 100) : 0, st = PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, PMP.cfg().now);
      tb.innerHTML = f.rules.map(function (r, i) {
        var ps = PMP.cfg().psets.filter(function (p) { return p.id === r.ps; })[0], n = PMP.products.filter(function (x) { return PMP.inScope(PMP.cfg(), { mode: 'pset', ref: r.ps }, x); }).length;
        return '<tr><td><select class="select" data-lfr="' + i + '" style="min-height:34px">' + PMP.cfg().psets.map(function (p) { return '<option value="' + p.id + '"' + (p.id === r.ps ? ' selected' : '') + '>' + E(p.name) + '</option>'; }).join('') + '</select><div class="small muted">' + n + ' รายการ</div></td><td><div class="input-adorn" style="width:100px"><input class="input" style="width:60px" data-lfp="' + i + '" value="' + r.pct + '"><span class="adorn">%</span></div></td><td><div class="input-adorn" style="width:130px"><input class="input" style="width:84px" data-lfq="1" value="' + f.quota + '"><span class="adorn">ชิ้น</span></div></td><td class="prog"><div class="small"><b>' + f.used + '</b><span class="muted">' + pct + '%</span></div><div class="progress green"><i style="width:' + pct + '%"></i></div></td><td><span class="chip ' + (st === 'running' ? 'success' : '') + '">' + (st === 'running' ? 'กำลังลด' : PMP.statusLabel[st]) + '</span></td><td><button class="x-btn" data-lfdel="' + i + '">−</button></td></tr>';
      }).join('');
    }
    draw();
    if (!root._lf) {
      root._lf = 1;
      root.addEventListener('change', function (e) { var t = e.target; if (t.getAttribute('data-lfr') != null) { S(function (r) { r.rules[+t.getAttribute('data-lfr')].ps = t.value; }); draw(); flashSaved(); } });
      root.addEventListener('input', function (e) { var t = e.target; if (t.getAttribute('data-lfp') != null) { S(function (r) { r.rules[+t.getAttribute('data-lfp')].pct = +t.value || 0; }); flashSaved(); } if (t.getAttribute('data-lfq') != null) { S(function (r) { r.quota = +String(t.value).replace(/,/g, '') || 0; }); flashSaved(); } });
      root.addEventListener('click', function (e) { var d = e.target.closest('[data-lfdel]'); if (d) { S(function (r) { r.rules.splice(+d.getAttribute('data-lfdel'), 1); }); draw(); return; } var b = e.target.closest('button'); if (b && /เพิ่มกลุ่ม/.test(b.textContent) && !b.getAttribute('data-lfdel')) { S(function (r) { r.rules.push({ ps: PMP.cfg().psets[0].id, pct: 10 }); }); draw(); } });
    }
  };
  hl('flash');

  /* ===== starterkit/02 สร้าง/แก้ไขเซต ===== */
  H['starterkit/02-admin-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('kit', cfg.kits), root = $('#screen'); if (!id) return;
    var K = function () { return recOf('kits', id); };
    pickBar2($('.page-head'), 'livePick', cfg.kits.map(function (k) { return { id: k.id, label: k.name }; }), id, function (v) { U.wr(selKey('kit'), v); location.reload(); }, function () { var nid = U.uid('kt'); setCfg(function (c) { c.kits.push({ id: nid, name: 'เซตร้านยาใหม่', desc: '', disc: 5, aud: 'B2B', items: [{ sku: 'PAR-500', qty: 20, min: 10, req: true }] }); }); U.wr(selKey('kit'), nid); location.reload(); }, '＋ สร้างเซต');
    function S(fn) { editRec('kits', id, fn); }
    bindc(ctl(root, 'ชื่อเซต'), function () { return K().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc($('textarea', root), function () { return K().desc || ''; }, function (v) { S(function (r) { r.desc = v; }); }, 'text');
    bindc(ctl(root, 'มูลค่าส่วนลด'), function () { return K().disc; }, function (v) { S(function (r) { r.disc = v; }); }, 'num');
    function draw() {
      var k = K(), cfgc = PMP.cfg(), tbs = $$('table.table', root); var h4 = $('h4', root); if (h4) h4.textContent = 'แก้ไขเซต: ' + k.name;
      function stock(sku, q) { var s = cfgc.stock[sku]; return s == null ? '<span class="chip soft-success">ไม่จำกัด</span>' : '<span class="chip ' + (s < q ? 'soft-error' : 'soft-success') + '">' + s + ' ' + prod(sku).unit + '</span>'; }
      function opts(sel) { return PMP.products.map(function (p) { return '<option value="' + p.sku + '"' + (p.sku === sel ? ' selected' : '') + '>' + E(p.name) + '</option>'; }).join(''); }
      var req = k.items.map(function (it, i) { return [it, i]; }).filter(function (x) { return x[0].req; }), opt = k.items.map(function (it, i) { return [it, i]; }).filter(function (x) { return !x[0].req; });
      if (tbs[0]) $('tbody', tbs[0]).innerHTML = req.map(function (x, n) { var it = x[0], p = prod(it.sku); return '<tr><td class="drag">⋮⋮</td><td>' + (n + 1) + '</td><td><select class="select" data-lki="' + x[1] + '" style="min-height:34px">' + opts(it.sku) + '</select></td><td class="num"><input class="input n" data-lkm="' + x[1] + '" value="' + it.min + '"></td><td class="num">' + B(p.price) + '</td><td class="num"><b>' + B(p.price * it.min) + '</b></td><td>' + stock(it.sku, it.min) + '</td><td><button class="x" data-lkd="' + x[1] + '">✕</button></td></tr>'; }).join('') + '<tr><td colspan="8"><button class="btn outlined sm" data-lkadd="1">＋ เพิ่มสินค้าบังคับ</button></td></tr>';
      if (tbs[1]) $('tbody', tbs[1]).innerHTML = opt.map(function (x, n) { var it = x[0], p = prod(it.sku); return '<tr><td class="drag">⋮⋮</td><td>' + (n + 1) + '</td><td><select class="select" data-lki="' + x[1] + '" style="min-height:34px">' + opts(it.sku) + '</select></td><td class="num"><input class="input n" data-lkq="' + x[1] + '" value="' + it.qty + '"></td><td><label class="switch"><input type="checkbox" data-lkon="' + x[1] + '"' + (it.on === false ? '' : ' checked') + '></label></td><td class="num">' + B(p.price) + '</td><td class="num"><b>' + B(p.price * it.qty) + '</b></td><td>' + stock(it.sku, it.qty) + '</td><td><button class="x" data-lkd="' + x[1] + '">✕</button></td></tr>'; }).join('') + '<tr><td colspan="9"><button class="btn outlined sm" data-lkadd="0">＋ เพิ่มสินค้าทางเลือก</button></td></tr>';
    }
    draw();
    if (!root._lk) {
      root._lk = 1;
      root.addEventListener('change', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-lki')) != null) { S(function (r) { r.items[+a].sku = t.value; }); draw(); flashSaved(); } if ((a = t.getAttribute('data-lkon')) != null) { S(function (r) { r.items[+a].on = t.checked; }); flashSaved(); } });
      root.addEventListener('input', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-lkm')) != null) { S(function (r) { r.items[+a].min = +t.value || 0; }); flashSaved(); } if ((a = t.getAttribute('data-lkq')) != null) { S(function (r) { r.items[+a].qty = +t.value || 0; }); flashSaved(); } });
      root.addEventListener('click', function (e) { var d = e.target.closest('[data-lkd]'); if (d) { S(function (r) { r.items.splice(+d.getAttribute('data-lkd'), 1); }); draw(); return; } var a = e.target.closest('[data-lkadd]'); if (a) { var rq = a.getAttribute('data-lkadd') === '1'; S(function (r) { r.items.push({ sku: 'BM-VC500', qty: rq ? 10 : 1, min: rq ? 5 : 0, req: rq }); }); draw(); } });
      root.addEventListener('change', function () { /* tables recompute totals on draw() */ });
    }
  };
  hl('kit');

  /* ===== foundation/02 กลุ่มลูกค้า: สมาชิก ===== */
  H['foundation/02-admin-customer-set-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('cset', cfg.csets), root = $('#screen'); if (!id) return;
    var C = function () { return recOf('csets', id); };
    var ah = $('.page-head') || $('h4', root).parentNode;
    pickBar2(ah, 'livePick', cfg.csets.map(function (c) { return { id: c.id, label: c.name }; }), id, function (v) { U.wr(selKey('cset'), v); location.reload(); }, function () { var nid = U.uid('cs'); setCfg(function (c) { c.csets.push({ id: nid, name: 'กลุ่มลูกค้าใหม่', members: [], extra: 0, note: '' }); }); U.wr(selKey('cset'), nid); location.reload(); }, '＋ สร้างกลุ่ม');
    function S(fn) { editRec('csets', id, fn); }
    bindc(ctl(root, 'ชื่อกลุ่ม'), function () { return C().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc($('textarea', root), function () { return C().note || ''; }, function (v) { S(function (r) { r.note = v; }); }, 'text');
    function draw() {
      var c = C(), tb = $$('table.table', root)[0]; if (!tb) return;
      $('tbody', tb).innerHTML = c.members.map(function (m) { var u = PMP.customers.filter(function (x) { return x.id === m; })[0]; return '<tr><td>' + m.toUpperCase().replace('C-', 'C-') + '</td><td><div class="nm">' + E(u.name) + '</div></td><td>' + (u.type === 'B2B' ? 'กรุงเทพฯ' : 'นนทบุรี') + '</td><td><span class="chip outline">เลือกเอง</span></td><td>' + dm(PMP.cfg().now) + '</td><td><button class="btn text sm grey" data-lcm="' + m + '">นำออก</button></td></tr>'; }).join('') + (c.extra ? '<tr><td colspan="6" class="muted">… และสมาชิกอื่นอีก ' + c.extra + ' ราย (นอกชุดลูกค้าจำลอง)</td></tr>' : '') + '<tr><td colspan="6"><div class="row"><select class="select" id="lcmSel" style="max-width:320px">' + PMP.customers.filter(function (u) { return c.members.indexOf(u.id) < 0; }).map(function (u) { return '<option value="' + u.id + '">' + E(u.name) + '</option>'; }).join('') + '</select><button class="btn outlined sm" id="lcmAdd" type="button">＋ เพิ่มสมาชิก</button><button class="btn outlined sm" id="lcmImp" type="button">นำเข้ารหัสลูกค้า (วางทีละบรรทัด)</button></div></td></tr>';
      var h = $$('h6,.muted,.small', root).filter(function (x) { return /\d+\s*ราย/.test(x.textContent) && !x.childElementCount; })[0];
    }
    draw();
    if (!root._lm) { root._lm = 1; root.addEventListener('click', function (e) { var r = e.target.closest('[data-lcm]'); if (r) { S(function (x) { x.members.splice(x.members.indexOf(r.getAttribute('data-lcm')), 1); }); draw(); return; } if (e.target.id === 'lcmAdd') { var v = $('#lcmSel').value; if (v) { S(function (x) { x.members.push(v); }); draw(); toast('เพิ่มสมาชิกแล้ว'); } } if (e.target.id === 'lcmImp') { var t = prompt('วางรหัสลูกค้า (c-b2b / c-new / c-b2c) ทีละบรรทัด'); if (t) { var n = 0, bad = 0; t.split(/\s+/).filter(Boolean).forEach(function (code) { if (PMP.customers.some(function (u) { return u.id === code; })) { S(function (x) { if (x.members.indexOf(code) < 0) { x.members.push(code); n++; } }); } else bad++; }); draw(); toast('นำเข้า ' + n + ' ราย · ไม่พบรหัส ' + bad + ' แถว', bad > 0 && n === 0); } } }); }
  };
  hl('cset');

  /* ===== coupon/07 เก็บเอง / แจกรายเดือน ===== */
  H['coupon/07-admin-collectible.html'] = function () {
    var cfg = PMP.cfg();
    [['manual', 'collect', 'livePickM'], ['monthly', 'monthly', 'livePickD']].forEach(function (cfgp) {
      var panel = $('[data-panel="' + cfgp[0] + '"]'), list = cfg.coupons.filter(function (k) { return k.kind === cfgp[1]; }), key = 'cpn' + cfgp[1], id = pickId(key, list);
      if (!panel || !id) return;
      var K = function () { return recOf('coupons', id); }, S = function (fn) { editRec('coupons', id, fn); };
      pickBar2(panel.firstElementChild, cfgp[2], list.map(function (k) { return { id: k.id, label: k.code + ' · ' + k.name }; }), id, function (v) { U.wr(selKey(key), v); rerender(); }, function () { var nid = U.uid('k'); setCfg(function (c) { c.coupons.push({ id: nid, code: 'NEW' + nid.slice(1, 4).toUpperCase(), name: 'คูปองใหม่', kind: cfgp[1], start: c.now, end: PMP.addDays(c.now, 60), active: true, quotaTotal: cfgp[1] === 'collect' ? 100 : 0, used: 0, perCust: 1, aud: 'all', dtype: 'baht', value: 100, cap: 0, min: 1000, scope: { mode: 'all', ref: null }, except: [], stackPromo: true, stackPoints: true }); }); U.wr(selKey(key), nid); rerender(); }, '＋ สร้างคูปอง');
      // move picker above content (inside panel top)
      panel.insertBefore($('#' + cfgp[2]), panel.firstElementChild);
      bindc(ctl(panel, 'ชื่อ'), function () { return K().name; }, function (v) { S(function (r) { r.name = v; }); refreshPrev(); }, 'text');
      var seg = $$('.seg', panel).filter(function (sg) { return /ส่งฟรี/.test(sg.textContent) && /เปอร์เซ็นต์/.test(sg.textContent); })[0]; bindSeg(seg, function () { return K().dtype; }, function (v) { S(function (r) { r.dtype = v; }); refreshPrev(); }, ['ship', 'baht', 'pct']);
      bindc(ctl(panel, 'มูลค่าส่วนลด'), function () { return K().value; }, function (v) { S(function (r) { r.value = v; }); refreshPrev(); }, 'num');
      var cap = ctl(panel, 'ลดสูงสุดไม่เกิน'); if (cap) { cap.readOnly = false; cap.classList.remove('readonly'); bindc(cap, function () { return K().cap || ''; }, function (v) { S(function (r) { r.cap = v; }); }, 'num'); }
      bindc(ctl(panel, 'ยอดซื้อขั้นต่ำ'), function () { return K().min; }, function (v) { S(function (r) { r.min = v; }); refreshPrev(); }, 'num');
      bindc(ctl(panel, 'จำนวนสิทธิ์ทั้งหมด'), function () { return K().quotaTotal || ''; }, function (v) { S(function (r) { r.quotaTotal = v; }); refreshPrev(); }, 'num');
      bindc(ctl(panel, 'จำกัดต่อคน'), function () { return K().perCust || ''; }, function (v) { S(function (r) { r.perCust = v; }); }, 'num');
      bindc(ctl(panel, 'เริ่มเก็บได้'), function () { return K().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date');
      bindc(ctl(panel, 'เก็บได้ถึง'), function () { return K().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
      var sw = $$('label.switch input', panel)[0]; bindc(sw, function () { return K().stackPromo; }, function (v) { S(function (r) { r.stackPromo = v; }); }, 'chk');
      function refreshPrev() { var k = K(), tk0 = $('.ticket .t-main b', panel); if (tk0) tk0.textContent = k.name; var tv = $$('.ticket .t-val', panel); tv.forEach(function (x) { x.textContent = kindVal(k); }); var pg = $('.ticket .small b', panel); if (pg && k.quotaTotal) pg.textContent = 'เหลือ ' + (k.quotaTotal - k.used) + ' / ' + k.quotaTotal + ' สิทธิ์'; }
      refreshPrev();
    });
    updateReveal();
  };
  hl('cpncollect'); hl('cpnmonthly');

  /* ===== coupon/03 สร้างชุดคูปองกระดาษ ===== */
  H['coupon/03-admin-paper-editor.html'] = function () {
    var cfg = PMP.cfg(), id = U.rd('pmpc.live.paper', null), list = cfg.paper; id = list.filter(function (x) { return x.id === id; })[0] ? id : list[0].id; var root = $('#screen');
    var P = function () { return recOf('paper', id); }, S = function (fn) { editRec('paper', id, fn); };
    pickBar2($('.page-head'), 'livePick', list.map(function (p) { return { id: p.id, label: p.code + ' · ' + p.name }; }), id, function (v) { U.wr('pmpc.live.paper', v); location.reload(); }, function () { var nid = U.uid('pp'); setCfg(function (c) { c.paper.push({ id: nid, code: 'NEW' + nid.slice(2, 5).toUpperCase(), name: 'คูปองกระดาษชุดใหม่', value: 50, min: 500, issued: 500, maxPerStore: 100, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, back: '' }); }); U.wr('pmpc.live.paper', nid); location.reload(); }, '＋ สร้างชุดใหม่');
    bindc(ctl(root, 'รหัสชุด'), function () { return P().code; }, function (v) { S(function (r) { r.code = String(v).toUpperCase(); }); }, 'text');
    bindc(ctl(root, 'ชื่อ/ที่มาของชุด'), function () { return P().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'จำนวนที่ออก'), function () { return P().issued; }, function (v) { S(function (r) { r.issued = v; }); }, 'num');
    bindc(ctl(root, 'มูลค่าส่วนลดต่อใบ'), function () { return P().value; }, function (v) { S(function (r) { r.value = v; }); }, 'num');
    bindc(ctl(root, 'ยอดซื้อขั้นต่ำ', 0), function () { return P().min; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    bindc(ctl(root, 'ร้านต้องส่งก้นเบิกภายใน'), function () { return P().payDays; }, function (v) { S(function (r) { r.payDays = v; }); }, 'num');
    bindc(ctl(root, 'ชื่อสั้นที่พิมพ์ด้านหน้า'), function () { return P().name.slice(0, 30); }, function (v) { }, 'text');
    bindRadio(root, 'shopmode', function () { return P().stores.mode; }, function (v) { S(function (r) { r.stores.mode = v === 'pick' ? 'pick' : 'all'; }); updateReveal(); }, function (m) { return m; });
    updateReveal();
    var pk = $('[data-reveal="shopmode=pick"]', root); if (pk) { var tbl = $('table.table tbody', pk); var html = PMP.stores.map(function (u) { return '<tr><td><input type="checkbox" data-lps="' + u.id + '"' + (P().stores.ids.indexOf(u.id) > -1 ? ' checked' : '') + '></td><td>' + E(u.name) + '</td><td>ร้านที่ลงทะเบียนแล้ว</td></tr>'; }).join(''); if (tbl) { tbl.innerHTML = html; } else { var tc = $('.card,.table-wrap', pk); (tc || pk).insertAdjacentHTML('beforeend', '<table class="table"><thead><tr><th></th><th>ร้าน/สาขา</th><th>ที่มา</th></tr></thead><tbody>' + html + '</tbody></table>'); }
      $$('[data-lps]', pk).forEach(function (cb) { bindc(cb, function () { return P().stores.ids.indexOf(cb.getAttribute('data-lps')) > -1; }, function (v) { S(function (r) { var i = r.stores.ids.indexOf(cb.getAttribute('data-lps')); if (v && i < 0) r.stores.ids.push(cb.getAttribute('data-lps')); if (!v && i > -1) r.stores.ids.splice(i, 1); }); }, 'chk'); }); }
  };

  /* ===== campaign/02 แคมเปญช่วงเวลา + โควตา ===== */
  H['campaign/02-admin-quota-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('quota', cfg.quota), root = $('#screen'); if (!id) return;
    var Q = function () { return recOf('quota', id); }, S = function (fn) { editRec('quota', id, fn); };
    pickBar2($('.page-head'), 'livePick', cfg.quota.map(function (q) { return { id: q.id, label: q.name }; }), id, function (v) { U.wr(selKey('quota'), v); location.reload(); }, function () { var nid = U.uid('q'); setCfg(function (c) { c.quota.push({ id: nid, name: 'แคมเปญราคาพิเศษใหม่', start: c.now, end: PMP.addDays(c.now, 14), active: true, sku: 'BM-VC500', special: 350, quotaTotal: 30, used: 0, perCust: 5, holdMin: 15, aud: 'all' }); }); U.wr(selKey('quota'), nid); location.reload(); }, '＋ สร้างแคมเปญ');
    bindc(ctl(root, 'ชื่อแคมเปญ'), function () { return Q().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    var st = ctl(root, 'สถานะ'); if (st) { st.innerHTML = '<option value="1">เปิดใช้งาน</option><option value="0">ปิด/ร่าง</option>'; bindc(st, function () { return Q().active ? '1' : '0'; }, function (v) { S(function (r) { r.active = v === '1'; }); }, 'sel'); }
    bindc(ctl(root, 'เริ่ม'), function () { return Q().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date');
    bindc(ctl(root, 'สิ้นสุด'), function () { return Q().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
    bindc(ctl(root, 'โควตารวมทั้งระบบ'), function () { return Q().quotaTotal; }, function (v) { S(function (r) { r.quotaTotal = v; }); }, 'num');
    bindc(ctl(root, 'โควตาต่อร้านค้า'), function () { return Q().perCust; }, function (v) { S(function (r) { r.perCust = v; }); }, 'num');
    bindc(ctl(root, 'พักโควตาระหว่างชำระเงิน'), function () { return Q().holdMin; }, function (v) { S(function (r) { r.holdMin = v; }); }, 'num');
    var pr = ctl(root, 'ราคาแคมเปญ'); if (pr) { var f = pr.closest('.field') || pr.parentElement, ip = f.querySelector('input:not([type=radio]):not([type=checkbox])'); if (ip) bindc(ip, function () { return Q().special; }, function (v) { S(function (r) { r.special = v; }); }, 'num'); }
    var sk = $$('.field', root).filter(function (x) { return x.textContent.indexOf('สินค้า') > -1 && $('select', x) && !$('input', x); })[0]; if (sk && $('select', sk)) { var se = $('select', sk); se.innerHTML = PMP.products.map(function (p) { return '<option value="' + p.sku + '">' + E(p.sku + ' · ' + p.name) + '</option>'; }).join(''); bindc(se, function () { return Q().sku; }, function (v) { S(function (r) { r.sku = v; }); }, 'sel'); }
    bindRadio(root, 'aud', function () { return Q().aud; }, function (v) { S(function (r) { r.aud = v === 'all' ? 'all' : 'set:' + cfg.csets[0].id; }); updateReveal(); }, function (a) { return String(a).indexOf('set:') === 0 ? 'some' : 'all'; });
    updateReveal();
  };
  hl('quota');

  /* ===== raffle/02 ตั้งค่ากิจกรรม + raffle/03 รางวัล ===== */
  H['raffle/02-admin-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('raffle', cfg.raffles), root = $('#screen'); if (!id) return;
    var R = function () { return recOf('raffles', id); }, S = function (fn) { editRec('raffles', id, fn); };
    pickBar2($('.page-head') || $('h4', root).parentNode, 'livePick', cfg.raffles.map(function (f) { return { id: f.id, label: f.name }; }), id, function (v) { U.wr(selKey('raffle'), v); location.reload(); }, function () { var nid = U.uid('f'); setCfg(function (c) { c.raffles.push({ id: nid, name: 'กิจกรรมใหม่', start: c.now, end: PMP.addDays(c.now, 30), active: true, perBaht: 1000, mode: 'A', poolOthers: 100, prizes: [{ id: U.uid('z'), name: 'รางวัลปลอบใจ', weight: 100, stock: 999 }] }); }); U.wr(selKey('raffle'), nid); location.reload(); }, '＋ สร้างกิจกรรม');
    bindc(ctl(root, 'ชื่อกิจกรรม'), function () { return R().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'ชื่อที่ลูกค้าเห็น'), function () { return R().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    var dts = $$('input[type=date]', root); if (dts[0]) bindc(dts[0], function () { return R().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date'); if (dts[1]) bindc(dts[1], function () { return R().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
    $$('table.table tbody tr', root).forEach(function (tr) { if (/ยอดซื้อ/.test(tr.textContent)) { var ip = $('.rate input', tr); bindc(ip, function () { return R().perBaht; }, function (v) { S(function (r) { r.perBaht = v || 1; }); }, 'num'); var sp = ip && ip.nextSibling; if (sp) sp.textContent = ' บาท / สิทธิ์'; } });
  };
  hl('raffle');
  H['raffle/03-admin-prizes-budget.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('raffle', cfg.raffles), root = $('#screen'); if (!id) return; var st = PMP.state();
    pickBar2($('.page-head') || $('h4', root).parentNode, 'livePick', cfg.raffles.map(function (f) { return { id: f.id, label: f.name }; }), id, function (v) { U.wr(selKey('raffle'), v); location.reload(); }, null);
    function draw() {
      var f = recOf('raffles', id), tb = $$('table.table', root)[0].querySelector('tbody'), tw = f.prizes.reduce(function (a, z) { return a + z.weight; }, 0) || 1;
      tb.innerHTML = f.prizes.map(function (z, i) { var items = PMP.rewardsOf('raffle', z.id), used = (PMP.state().shared.prizeUsed[z.id] || 0), val = items.reduce(function (a, it) { return a + (it.k === 'points' ? it.pts : it.k === 'credit' ? it.amount : it.k === 'coupon' ? 100 : 0); }, 0); return '<tr><td><b>' + E(z.name) + '</b></td><td>' + E(items.map(function (x) { return PMP.kindLabel[x.k]; }).join(' + ') || '—') + '</td><td><span class="mode a">A</span></td><td class="num"><input class="input w-in num" data-lzw="' + i + '" value="' + z.weight + '"></td><td class="num odds">' + (z.weight / tw * 100).toFixed(1) + '%</td><td class="num"><input class="input w-in num" data-lzs="' + i + '" value="' + z.stock + '"></td><td class="num">' + (z.stock - used) + '</td><td class="num">' + B(val) + '</td><td class="num">' + B(val * z.weight / tw) + '</td><td><button class="btn text sm grey" data-lzd="' + i + '">ลบ</button></td></tr>'; }).join('') + '<tr><td colspan="10"><button class="btn outlined primary sm" data-lza="1">＋ เพิ่มรางวัล</button></td></tr>';
    }
    draw();
    if (!root._lz) { root._lz = 1; root.addEventListener('input', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-lzw')) != null) { editRec('raffles', id, function (r) { r.prizes[+a].weight = +t.value || 0; }); flashSaved(); } if ((a = t.getAttribute('data-lzs')) != null) { editRec('raffles', id, function (r) { r.prizes[+a].stock = +t.value || 0; }); flashSaved(); } });
      root.addEventListener('change', function (e) { if (e.target.getAttribute('data-lzw') != null) draw(); });
      root.addEventListener('click', function (e) { var d = e.target.closest('[data-lzd]'); if (d) { editRec('raffles', id, function (r) { r.prizes.splice(+d.getAttribute('data-lzd'), 1); }); draw(); return; } if (e.target.closest('[data-lza]')) { var zid = U.uid('z'); editRec('raffles', id, function (r) { r.prizes.push({ id: zid, name: 'รางวัลใหม่', weight: 10, stock: 50 }); }); PMP.saveRewards('raffle', zid, [{ k: 'points', pts: 100 }]); draw(); toast('เพิ่มรางวัลแล้ว — ตั้งผลตอบแทนด้านล่าง'); } }); }
  };

  /* ===== campaign/03 แคมเปญสะสมยอดรายปี (ขั้นบันได) ===== */
  H['campaign/03-admin-ladder-editor.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('ladder', cfg.ladders), root = $('#screen'); if (!id) return;
    var L = function () { return recOf('ladders', id); }, S = function (fn) { editRec('ladders', id, fn); };
    pickBar2($('.page-head'), 'livePick', cfg.ladders.map(function (l) { return { id: l.id, label: l.name }; }), id, function (v) { U.wr(selKey('ladder'), v); location.reload(); }, function () { var nid = U.uid('l'); setCfg(function (c) { c.ladders.push({ id: nid, name: 'แคมเปญสะสมยอดใหม่', start: c.now, end: PMP.addDays(c.now, 365), active: true, aud: 'B2B', scope: { mode: 'all', ref: null }, tiers: [{ id: 't1', at: 10000, name: 'ขั้น 1', cap: 0, formText: 'ที่อยู่จัดส่ง*' }] }); }); PMP.saveRewards('campaign', nid + '-t1', [{ k: 'points', pts: 100 }]); U.wr(selKey('ladder'), nid); location.reload(); }, '＋ สร้างแคมเปญ');
    var l0 = L(); $('.page-head h4').firstChild.textContent = l0.name + ' ';
    bindc(ctl(root, 'ชื่อแคมเปญ'), function () { return L().name; }, function (v) { S(function (r) { r.name = v; }); $('.page-head h4').firstChild.textContent = v + ' '; }, 'text');
    var df = $$('.field', root).filter(function (f) { return /วันเริ่ม/.test(f.textContent) && $$('input[type=date]', f).length === 2; })[0];
    if (df) { var d2 = $$('input[type=date]', df); d2[0].readOnly = false; d2[0].classList.remove('readonly'); bindc(d2[0], function () { return L().start; }, function (v) { S(function (r) { r.start = v; }); }, 'date'); bindc(d2[1], function () { return L().end; }, function (v) { S(function (r) { r.end = v; }); }, 'date'); }
    var yr = ctl(root, 'ปีสัญญา'); if (yr) { yr.innerHTML = '<option>' + (+l0.end.slice(0, 4) + 543) + '</option>'; }
    bindRadio(root, 'aud', function () { return L().aud; }, function (v) { S(function (r) { r.aud = v === 'all' ? 'all' : 'set:' + cfg.csets[0].id; }); updateReveal(); }, function (a) { return String(a).indexOf('set:') === 0 ? 'some' : 'all'; });
    var as = $$('.aud-row select', root)[0]; if (as) { as.innerHTML = cfg.csets.map(function (x) { return '<option value="' + x.id + '">' + E(x.name) + ' · ' + (x.members.length + x.extra) + ' ราย</option>'; }).join(''); bindc(as, function () { return String(L().aud).indexOf('set:') === 0 ? L().aud.slice(4) : cfg.csets[0].id; }, function (v) { S(function (r) { r.aud = 'set:' + v; }); }, 'sel'); }
    bindRadio(root, 'scope', function () { return L().scope.mode; }, function (v) { S(function (r) { r.scope = v === 'all' ? { mode: 'all', ref: null } : { mode: 'pset', ref: cfg.psets[0].id }; }); updateReveal(); }, function (m) { return m === 'all' ? 'all' : 'set'; });
    var ps = $('[data-reveal="scope=set"] select', root); if (ps) { ps.innerHTML = cfg.psets.map(function (x) { return '<option value="' + x.id + '">' + E(x.name) + '</option>'; }).join(''); bindc(ps, function () { return L().scope.ref || cfg.psets[0].id; }, function (v) { S(function (r) { r.scope = { mode: 'pset', ref: v }; }); }, 'sel'); }
    updateReveal();
    // ---- tiers ----
    var hdr = $$('h6', root).filter(function (h) { return /ขั้นรางวัล/.test(h.textContent); })[0], wrap = hdr.closest('div').parentNode.querySelector('.stack.s12') || hdr.parentNode.nextElementSibling;
    var openMap = (H._lopen = H._lopen || {});
    function tierUsers(tid) { var st = PMP.state(); return Object.keys(st.customers).filter(function (k) { var v = st.customers[k].ladder[id]; return v && v.unlocked.indexOf(tid) > -1; }).length; }
    function draw() {
      var l = L(), cf = PMP.cfg(); hdr.firstChild.textContent = 'ขั้นรางวัล (' + l.tiers.length + ' ขั้น) ';
      wrap.innerHTML = l.tiers.map(function (t, i) {
        var users = tierUsers(t.id), open = openMap[t.id] !== false, items = PMP.rewardsOf('campaign', id + '-' + t.id), form = PMP.formFields(t), left = t.cap ? t.cap - (t.used || 0) : null;
        var head = '<div class="scard-h"><span class="drag">⋮⋮</span><span class="no">' + (i + 1) + '</span><div><b>' + E(t.name) + '</b><div class="small muted">' + B(t.at) + ' · ' + E(items.map(function (x) { return PMP.kindLabel[x.k]; }).join(' + ') || '—') + ' · ' + (t.cap ? t.cap + ' สิทธิ์' : 'ไม่จำกัดสิทธิ์') + ' · ฟอร์ม ' + form.length + ' ช่อง</div></div><div class="row">' + (users ? '<span class="chip soft-warning">มี ' + users + ' ร้านถึงขั้นนี้แล้ว</span>' : '') + '<button class="btn text sm grey" data-ltog="' + t.id + '">' + (open ? 'ยุบ' : 'แก้ไข') + '</button><button class="btn text sm grey" data-ltdel="' + i + '"' + (users ? ' disabled' : '') + '>ลบ</button></div></div>';
        if (!open) return '<div class="scard collapsed" data-lt="' + i + '">' + head + '</div>';
        var body = '<div class="scard-b"><div class="form-grid"><div class="field"><label>ยอดเกณฑ์สะสม *</label><div class="input-adorn"><span class="adorn">฿</span><input class="input' + (users ? ' readonly' : '') + '" data-ltf="at|' + i + '" value="' + t.at + '"' + (users ? ' readonly' : '') + '></div>' + (users ? '<span class="help">แก้ไม่ได้เพราะมีลูกค้าถึงขั้นนี้แล้ว</span>' : '') + '</div><div class="field"><label>ชื่อรางวัล *</label><input class="input" data-ltf="name|' + i + '" value="' + E(t.name) + '"></div></div>' +
          '<div class="field span2"><div data-rwd data-module="campaign" data-ref="' + id + '-' + t.id + '" data-title="รางวัลของขั้นนี้" data-kinds="gift,points,coupon,credit,entitle,offpos"></div></div>' +
          '<div class="form-grid"><div class="field"><label>จำนวนสิทธิ์ทั้งหมด (เว้นว่าง = ไม่จำกัด)</label><input class="input" data-ltf="cap|' + i + '" value="' + (t.cap || '') + '" placeholder="ไม่จำกัด"><span class="help">ใช้ไปแล้ว ' + (t.used || 0) + ' · ลดต่ำกว่านี้ไม่ได้</span></div></div>' +
          '<div class="hint">' + (t.cap ? 'ตั้งจำนวนน้อย = ใครถึงเกณฑ์แล้วกดขอก่อนได้ก่อน · ลูกค้าเห็น <b>"เหลือ ' + left + '/' + t.cap + ' สิทธิ์"</b>' : '<b>ไม่จำกัดสิทธิ์</b> — ทุกคนที่ถึงยอดกดขอได้เสมอ ทีมงานคัดเลือกเอง') + '</div>' +
          '<div class="fb"><div class="small semi mb8">ฟอร์มขอข้อมูลตอนกดรับสิทธิ์ (ลูกค้าทุกคนที่ปลดล็อกขั้นนี้เห็นฟอร์มเดียวกัน)</div>' + form.map(function (f, j) { return '<div class="fb-row"><span class="drag">⋮⋮</span><select class="select"><option>ข้อความ</option></select><input class="input" data-ltform="' + i + '|' + j + '" value="' + E(f.label) + '"><label class="check"><input type="checkbox" data-ltreq="' + i + '|' + j + '"' + (f.req ? ' checked' : '') + '> จำเป็น</label><button class="iconbtn" data-ltfd="' + i + '|' + j + '">✕</button></div>'; }).join('') + '<button class="btn text sm" data-ltfa="' + i + '">＋ เพิ่มช่องข้อมูล</button></div></div>';
        return '<div class="scard open" data-lt="' + i + '">' + head + body + '</div>';
      }).join('');
      if (PMP.Reward) PMP.Reward.init();
    }
    function setForm(i, fn) { S(function (r) { var f = PMP.formFields(r.tiers[i]); fn(f); r.tiers[i].formText = f.map(function (x) { return x.label + (x.req ? '*' : ''); }).join('\n'); }); }
    draw();
    if (!root._ll) {
      root._ll = 1;
      root.addEventListener('input', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-ltf'))) { var p = a.split('|'); S(function (r) { var v = p[0] === 'name' ? t.value : +String(t.value).replace(/,/g, '') || 0; r.tiers[+p[1]][p[0]] = v; }); flashSaved(); }
        if ((a = t.getAttribute('data-ltform'))) { var q = a.split('|'); setForm(+q[0], function (f) { f[+q[1]].label = t.value; }); flashSaved(); } });
      root.addEventListener('change', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-ltreq'))) { var q = a.split('|'); setForm(+q[0], function (f) { f[+q[1]].req = t.checked; }); flashSaved(); }
        if ((a = t.getAttribute('data-ltf')) && /^(at|name|cap)/.test(a)) { if (a.indexOf('at|') === 0) S(function (r) { r.tiers.sort(function (x, y) { return x.at - y.at; }); }); draw(); } });
      root.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a;
        if ((a = b.getAttribute('data-ltog'))) { openMap[a] = openMap[a] === false; draw(); return; }
        if ((a = b.getAttribute('data-ltdel'))) { if (!confirm('ลบขั้นนี้?')) return; S(function (r) { r.tiers.splice(+a, 1); }); draw(); return; }
        if ((a = b.getAttribute('data-ltfd'))) { var q = a.split('|'); setForm(+q[0], function (f) { f.splice(+q[1], 1); }); draw(); return; }
        if ((a = b.getAttribute('data-ltfa'))) { setForm(+a, function (f) { f.push({ label: 'ช่องใหม่', req: false }); }); draw(); return; }
        if (/เพิ่มขั้นรางวัล/.test(b.textContent)) { var tid = 't' + U.uid('').slice(0, 3); S(function (r) { r.tiers.push({ id: tid, at: (r.tiers.length ? r.tiers[r.tiers.length - 1].at : 0) + 20000, name: 'ขั้นใหม่', cap: 0, formText: 'ที่อยู่จัดส่ง*' }); }); PMP.saveRewards('campaign', id + '-' + tid, [{ k: 'points', pts: 100 }]); draw(); toast('เพิ่มขั้นแล้ว'); } });
    }
  };
  hl('ladder');

  /* ===== campaign/05 ความคืบหน้าลูกค้า + แจ้งเตือน ===== */
  H['campaign/05-admin-progress.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), L = cfg.ladders[0], tb = $('table.table tbody'); if (!L || !tb) return;
    var top = L.tiers[L.tiers.length - 1].at;
    var rows = PMP.customers.map(function (c) { var lv = st.customers[c.id].ladder[L.id] || { spent: 0, unlocked: [], claimed: [] }, nxt = L.tiers.filter(function (t) { return t.at > lv.spent; })[0], pct = nxt ? lv.spent / nxt.at * 100 : 100; return { c: c, lv: lv, nxt: nxt, pct: pct }; }).sort(function (a, b) { return b.lv.spent - a.lv.spent; });
    var h = $$('thead th', tb.parentNode).map(function (x) { return norm(x.textContent); });
    tb.innerHTML = rows.map(function (r) { var last = r.lv.unlocked.length ? L.tiers.filter(function (t) { return r.lv.unlocked.indexOf(t.id) > -1; }).pop() : null, hot = r.pct >= 95 && r.nxt; return '<tr' + (hot ? ' class="hot95"' : '') + '><td><b>' + E(r.c.name) + '</b><div class="sub">' + r.c.type + '</div></td><td class="num"><b>' + B(r.lv.spent) + '</b></td><td>' + (last ? E(last.name) : '—') + '</td><td class="pbar"><div class="row between"><b' + (hot ? ' style="color:var(--error-dark)"' : '') + '>' + r.pct.toFixed(1) + '%</b><span class="small muted">' + (r.nxt ? '→ ' + E(r.nxt.name) + ' · ' + B(r.nxt.at) : 'ครบทุกขั้น') + '</span></div><div class="progress ' + (hot ? 'red' : 'green') + '"><i style="width:' + Math.min(100, r.pct) + '%"></i></div>' + (r.nxt ? '<div class="small">อีก <b>' + B(r.nxt.at - r.lv.spent) + '</b></div>' : '') + '</td><td>' + dmy(cfg.now) + '</td><td>' + dmy(L.end) + '</td><td>' + (hot ? '<span class="chip soft-success">LINE · ถึง 95%</span>' : r.pct >= 80 && r.nxt ? '<span class="chip soft-success">ในเว็บ · ถึง 80%</span>' : '—') + '</td></tr>'; }).join('');
  };

  /* ===== raffle/04 จับรางวัลโหมด B ===== */
  H['raffle/04-admin-draw-run.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), f = cfg.raffles[0]; if (!f) return;
    var pool = st.shared.rafflePool[f.id] || {}, mine = Object.keys(pool).reduce(function (a, k) { return a + pool[k]; }, 0), tot = mine + f.poolOthers;
    $$('h4,h5,h6,.mono,b,.big,.v,.num,.small').forEach(function (e) { if (e.childElementCount) return; var t = e.textContent; if (/กอง.*[\d,]{4,}\s*(ใบ|สิทธิ์)/.test(t) && !e._lr) { e._lr = 1; } });
    var btn = $$('button.btn').filter(function (b) { return /จับรางวัล/.test(b.textContent) && !b.disabled; })[0] || $$('button.btn').filter(function (b) { return /จับรางวัล/.test(b.textContent); })[0];
    var bar = document.createElement('div'); bar.className = 'card mb16'; bar.innerHTML = '<div class="card-b"><div class="row between"><div><b>กองสิทธิ์ ' + E(f.name) + '</b><div class="small muted">กองทั้งหมด ' + tot.toLocaleString() + ' สิทธิ์ (ของลูกค้าในจำลอง ' + mine + ' · อื่นๆ ' + f.poolOthers + ') · รหัสยืนยัน <span class="mono">' + PMP.fnv(tot + ':' + f.id) + '</span></div></div><button class="btn contained" id="lDrawB">จับรางวัลโหมด B (ยืนยันแล้วย้อนกลับไม่ได้)</button></div><div id="lDrawRes"></div></div>';
    if (!$('#lDrawB')) $('.page-head').insertAdjacentElement('afterend', bar);
    $('#lDrawB').onclick = function () { if (!confirm('จับรางวัลโหมด B? ยืนยันแล้วย้อนกลับไม่ได้')) return; var r = PMP.drawB(f.id); $('#lDrawRes').innerHTML = '<div class="st-res" style="background:var(--success-lighter);border-radius:10px;padding:10px 12px;margin-top:10px"><b>จับรางวัลแล้ว</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px"><li>seed: <span class="mono">' + r.seed + '</span> (เปิดเผยหลังจับ)</li><li>ตำแหน่งที่จับได้ #' + r.idx + ' จากกอง ' + r.total + '</li><li>ผู้ชนะ: ' + (r.winner.indexOf('other-') === 0 ? 'ผู้เข้าร่วมรายอื่น (' + r.winner + ')' : '<b>' + E(PMP.customers.filter(function (c) { return c.id === r.winner; })[0].name) + '</b> — รางวัลเข้าบัญชี/คิวแล้ว') + '</li></ul></div>'; toast('จับรางวัลแล้ว'); };
  };

  /* ===== raffle/05 บันทึกการลุ้น / ตรวจสอบย้อนหลัง ===== */
  H['raffle/05-admin-audit.html'] = function () {
    var st = PMP.state(), tb = $('table.table tbody'); if (!tb) return;
    var rows = []; Object.keys(st.customers).forEach(function (k) { var c = PMP.customers.filter(function (x) { return x.id === k; })[0]; st.customers[k].draws.forEach(function (d, i) { rows.push({ c: c, d: d, i: i }); }); });
    tb.innerHTML = rows.map(function (r, n) { var f = PMP.cfg().raffles.filter(function (x) { return x.name === r.d.f; })[0], z = f && f.prizes.filter(function (y) { return y.name === r.d.prize; })[0]; return '<tr><td class="nowrap">' + dmy(r.d.d) + '</td><td><b>' + E(r.c.name) + '</b><div class="small muted">' + r.c.id.toUpperCase() + '</div></td><td>ยอดซื้อ/โปร/แลกพอยท์ <span class="small muted">(1 สิทธิ์)</span></td><td><span class="mode a">A</span></td><td><span class="chip success">ถูก</span> ' + E(r.d.prize) + '</td><td class="num">' + (z ? z.weight + ' · คงเหลือ ' + (z.stock - (st.shared.prizeUsed[z.id] || 0)) : '—') + '</td><td class="mono small">DR-' + String(4899 - n).padStart(6, '0') + '<br>' + E(r.d.out.join(', ')) + '</td></tr>'; }).join('') || '<tr><td colspan="7" class="center muted" style="padding:24px">ยังไม่มีการลุ้น — ลุ้นที่หน้า “ลุ้นทันที”</td></tr>';
  };

  /* ===== promotion/09 ตะกร้า: การ์ดเลือกโปร + สรุปยอด (ชำระได้จริง) ===== */
  function cartOpts() { var s = U.rd('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); return { customerId: custId(), promoIds: s.promos, couponRef: s.couponRef, usePoints: s.usePoints, useCredit: s.useCredit }; }
  function cartArr() { var c = U.rd('pmpc.sim.cart', {}); return Object.keys(c).filter(function (k) { return c[k] > 0; }).map(function (k) { return { sku: k, qty: c[k] }; }); }
  function selGet() { return U.rd('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); }
  var CHIPK = { gift: 'gift', disc: '', ship: 'ship', points: '', coupon: '', credit: '', entitle: '', offpos: 'gift' };
  H['promotion/09-customer-cart.html'] = function () {
    if (U.rd('pmpc.sim.cart', null) === null) U.wr('pmpc.sim.cart', { 'BM-VC500': 3, 'DX-MP1': 2, 'PP-DM': 2 });
    var cfg = PMP.cfg(), cart = U.rd('pmpc.sim.cart', {}), sel = selGet(), R = PMP.price(cartArr(), cartOpts());
    var ok = R.eligible.filter(function (c) { return c.ok; }).map(function (c) { return c.p.id; });
    var cl = sel.promos.filter(function (i) { return ok.indexOf(i) > -1; }); if (cl.length !== sel.promos.length) { sel.promos = cl; U.wr('pmpc.sim.sel', sel); R = PMP.price(cartArr(), cartOpts()); }
    var qty = R.lines.reduce(function (a, l) { return a + l.qty; }, 0);
    $('h4.mb16').innerHTML = 'ตะกร้าสินค้า <span class="muted" style="font-weight:400;font-size:15px">(' + R.lines.length + ' รายการ)</span>';
    // lines
    var card = $('.cg .stack > .card .card-b');
    function qtyBtns(sku, n) { return '<div class="qty"><button data-lq="-1|' + sku + '">−</button><span>' + n + '</span><button data-lq="1|' + sku + '">+</button></div>'; }
    var h = R.lines.map(function (l) { var tag = l.flash ? ' <span class="promo-tag flash">Flash −' + l.flash.pct + '%</span>' : l.quota ? ' <span class="promo-tag flash">ราคาพิเศษ</span>' : ''; return '<div class="cart-line"><span class="thumb"></span><div><div class="nm">' + E(l.p.name) + tag + '</div><div class="pr">' + (l.amount < l.qty * l.base ? '<s>' + B(l.base) + '</s> ' + B(l.amount / l.qty) : B(l.base)) + ' × ' + l.qty + '</div></div><div class="row">' + qtyBtns(l.sku, l.qty) + '<b style="min-width:70px;text-align:right">' + B(l.amount) + '</b></div></div>'; }).join('');
    R.gifts.forEach(function (g) { var p = PMP.product(g.sku); h += '<div class="cart-line gift relative"><span class="thumb"></span><div><div class="nm">' + E(p.name) + ' <span class="promo-tag gift">ของแถม ฟรี</span></div><div class="pr">ได้รับจากโปร “' + E(g.from) + '” · มูลค่า ' + B(p.price * g.qty) + '</div></div><div class="row"><span class="locked">จำนวนล็อก ×' + g.qty + '</span><b style="min-width:70px;text-align:right;color:var(--success-darker)">ฟรี</b></div></div>'; });
    R.promoApplied.forEach(function (p) { if (p.discount) h += '<div class="cart-line disc relative"><span class="thumb">%</span><div><div class="nm">ส่วนลดโปรโมชั่น</div><div class="pr">' + E(p.name) + '</div></div><b style="min-width:70px;text-align:right;color:var(--primary-dark)">−' + B(p.discount) + '</b></div>'; });
    h += '<div class="cart-line" style="border-bottom:0"><div class="row" style="gap:8px;flex:1;grid-column:1/-1"><select class="select" id="lcAddSel" style="width:340px;max-width:100%">' + PMP.products.map(function (p) { return '<option value="' + p.sku + '">' + E(p.name) + ' · ' + B(p.price) + '</option>'; }).join('') + '</select><button class="btn outlined sm" id="lcAdd" type="button">＋ เพิ่มสินค้าลงตะกร้า</button></div></div>';
    card.innerHTML = h || '<div class="muted" style="padding:20px">ตะกร้าว่าง</div>' + h;
    // promo cards
    var pcs = $('#pcards'), chosen = R.eligible.filter(function (c) { return sel.promos.indexOf(c.p.id) > -1; }), cs0 = cs();
    pcs.innerHTML = R.eligible.filter(function (c) { return c.ok; }).map(function (c) {
      var p = c.p, on = sel.promos.indexOf(p.id) > -1, clash = !on && chosen.filter(function (o) { return !PMP.compat(p, o.p); })[0], items = PMP.rewardsOf('promotion', p.id), cls = 'pcard' + (on ? ' sel' : '') + (clash ? ' dim' : '');
      return '<div class="' + cls + '" data-lpc="' + p.id + '"><div class="pc-h"><span class="tick"></span><div><b>' + E(p.name) + '</b><div class="small muted">โควต้ารวมเหลือ ' + (p.quotaTotal ? p.quotaTotal - p.used : '∞') + ' · ต่อคน ' + (p.perCust ? (p.perCust - (cs0.promoUse[p.id] || 0)) + '/' + p.perCust : '∞') + '</div></div></div><div class="pc-g">' + items.map(function (i) { return '<span class="promo-tag ' + CHIPK[i.k] + '">' + E(PMP.describe(i, cfg)) + '</span>'; }).join(' ') + '</div><div class="pc-w">' + (clash ? 'เลือกไม่ได้ — ใช้ร่วมกับ “' + E(clash.p.name) + '” ไม่ได้' : p.stackPromo ? 'ใช้ร่วมกับโปรอื่นได้' : 'ใช้ร่วมกับโปรอื่นไม่ได้') + '</div></div>';
    }).join('') || '<div class="muted small" style="grid-column:1/-1">ยังไม่มีโปรที่ตะกร้านี้เข้าเงื่อนไข</div>';
    var hd = $('.card-b > .row.between h6'); if (hd) hd.textContent = 'โปรโมชั่นที่ใช้ได้กับตะกร้านี้ (' + R.eligible.filter(function (c) { return c.ok; }).length + ')';
    var pm = $('#pcmsg'); if (pm) pm.textContent = 'เลือกอยู่ ' + sel.promos.length + ' โปร' + (sel.promos.length ? '' : ' (ยังไม่ใช้โปรโมชั่น)');
    var info = $('.msg.info ul'); if (info) info.innerHTML = R.eligible.filter(function (c) { return !c.ok; }).map(function (c) { return '<li>“' + E(c.p.name) + '” — <span class="muted">' + E(c.why) + '</span></li>'; }).join('') || '<li class="muted">ไม่มี</li>';
    ['.msg.warn', '.nudge'].forEach(function (s2) { var e = $(s2); if (e) e.style.display = 'none'; });
    // summary
    var sm = $('.sum-card .card-b'), base = R.lines.reduce(function (a, l) { return a + l.qty * l.base; }, 0), fl = R.lines.reduce(function (a, l) { return a + (l.flash ? l.flash.disc : 0); }, 0), qd = R.lines.reduce(function (a, l) { return a + (l.quota ? l.quota.n * (l.base - l.quota.special) : 0); }, 0);
    var rows = '<span class="pin abs">7</span><h6 class="mb8" style="font-size:16px">สรุปคำสั่งซื้อ</h6><div class="sum-row"><span>ยอดสินค้า (ราคาปกติ)</span><span>' + B(base) + '</span></div>';
    if (fl) rows += '<div class="sum-row disc"><span>ส่วนลด Flash Sale</span><span>−' + B(fl) + '</span></div>'; if (qd) rows += '<div class="sum-row disc"><span>ส่วนลดแคมเปญราคาพิเศษ</span><span>−' + B(qd) + '</span></div>';
    R.promoApplied.forEach(function (p) { rows += '<div class="sum-row disc"><span><b>ส่วนลดโปรโมชั่น</b><small>' + E(p.name) + '</small></span><span>' + (p.discount ? '−' + B(p.discount) : '—') + '</span></div>'; });
    R.gifts.forEach(function (g) { rows += '<div class="sum-row"><span>ของแถมโปรโมชั่น<small>' + E(PMP.product(g.sku).name) + ' × ' + g.qty + '</small></span><span>฿0</span></div>'; });
    rows += '<div class="sum-sep">คูปองและพอยท์ (แยกจากโปรโมชั่น)</div><div class="sum-row"><span>ส่วนลดคูปอง<small><a href="#" id="lcCoupon">เลือก/ใส่คูปอง</a> · ' + (R.coupon ? E(R.coupon.code) + ' ใช้แล้ว' : R.couponErr ? '<span style="color:var(--error-dark)">' + E(R.couponErr) + '</span>' : 'ยังไม่ได้ใช้') + '</small></span><span>' + (R.coupon ? (R.coupon.ship ? 'ส่งฟรี' : '−' + B(R.coupon.discount)) : '−฿0') + '</span></div>';
    rows += '<div class="sum-row"><span>ใช้พอยท์ชำระ<small>มี ' + cs0.points.toLocaleString() + ' พอยท์ · <a href="#" id="lcPts">ตั้งจำนวน</a>' + (R.pointsBlocked ? ' · ใช้ไม่ได้ (' + E(R.pointsBlocked) + ')' : ' · ใช้ได้สูงสุด ' + R.pointsMax) + '</small></span><span>−' + B(R.pointsDisc) + '</span></div>';
    rows += '<div class="sum-sep">การจัดส่ง</div><div class="sum-row"><span>ค่าจัดส่ง<small>' + (R.shipFree ? 'ฟรีจากโปร/คูปอง' : 'ฟรีเมื่อยอดสินค้า ≥ ' + B(cfg.shipping.freeOver)) + '</small></span><span>' + (R.shipping ? B(R.shipping) : 'ฟรี') + '</span></div>';
    rows += '<div class="sum-row total"><span>ยอดสุทธิ</span><span>' + B(R.total) + '</span></div><div class="save relative">คุณประหยัดจากโปรโมชั่น Flash และคูปองไปแล้ว ' + B(fl + qd + R.promoDisc + R.couponDisc) + '</div>';
    var earn = []; if (R.earnBase) earn.push('พอยท์ +' + R.earnBase); R.grants.forEach(function (g) { earn.push(PMP.describe(g.it, cfg)); }); Object.keys(R.ticketsBuy).forEach(function (f) { earn.push('สิทธิ์ลุ้น +' + R.ticketsBuy[f]); });
    rows += (earn.length ? '<div class="small mt8" style="background:var(--success-lighter);border-radius:8px;padding:8px 10px"><b>หลังชำระจะได้:</b> ' + E(earn.join(' · ')) + '</div>' : '') + '<button class="btn contained lg block mt16" id="lcPay"' + (R.lines.length ? '' : ' disabled') + '>ดำเนินการชำระเงิน</button><a class="btn text block mt8" href="06-customer-list.html">ดูโปรโมชั่นอื่น</a><div class="small muted mt8 center">ยอดชำระจริงคำนวณที่ระบบอีกครั้งตอนยืนยันคำสั่งซื้อ</div>';
    sm.innerHTML = rows; relabelCustomer();
  };
  document.addEventListener('click', function (e) {
    if (KEY !== 'promotion/09-customer-cart.html') return;
    var q = e.target.closest('[data-lq]'), pc = e.target.closest('[data-lpc]'), cart = U.rd('pmpc.sim.cart', {}), sel = selGet();
    if (q) { var p = q.getAttribute('data-lq').split('|'); cart[p[1]] = Math.max(0, (cart[p[1]] || 0) + (+p[0])); U.wr('pmpc.sim.cart', cart); rerender(); return; }
    if (e.target.id === 'lcAdd') { var sku = $('#lcAddSel').value; cart[sku] = (cart[sku] || 0) + 1; U.wr('pmpc.sim.cart', cart); rerender(); return; }
    if (pc) { if (pc.classList.contains('dim')) { toast($('.pc-w', pc).textContent, true); return; } var id = pc.getAttribute('data-lpc'), i = sel.promos.indexOf(id); if (i > -1) sel.promos.splice(i, 1); else sel.promos.push(id); U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcCoupon') { e.preventDefault(); var w = cs().wallet.filter(function (x) { return !x.used; }).map(function (x) { return PMP.cfg().coupons.filter(function (k) { return k.id === x.couponId; })[0].code; }), v = prompt('กรอกโค้ดคูปอง' + (w.length ? ' (ในกระเป๋า: ' + w.join(', ') + ')' : '') + ' — เว้นว่าง = ยกเลิกคูปอง', w[0] || ''); if (v == null) return; sel.couponRef = v.trim() ? { type: 'code', value: v.trim() } : null; U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcPts') { e.preventDefault(); var n = prompt('ใช้พอยท์กี่พอยท์ (0 = ไม่ใช้)', sel.usePoints || 0); if (n == null) return; sel.usePoints = Math.max(0, +n || 0); U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcPay') { var r = PMP.checkout(cartArr(), cartOpts()); if (r.error) { toast(r.error, true); return; } U.wr('pmpc.sim.cart', {}); U.wr('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); toast('ชำระเงินสำเร็จ ' + r.order.no + ': ' + r.order.effects.slice(0, 4).join(' · ')); rerender(); }
  });

  /* ===== points/01 กติกาพอยท์ + อัตรารายสินค้า ===== */
  H['points/01-admin-rules.html'] = function () {
    var cfg = PMP.cfg(), tbs = $$('table.table'), now = cfg.now; cfg.pts = cfg.pts || {};
    var mults = cfg.points.mults.filter(function (m) { return PMP.status({ active: true, start: m.start, end: m.end }, now) === 'running'; });
    function multFor(p) { var f = 1; mults.forEach(function (m) { if (PMP.inScope(cfg, m.scope, p)) f += m.mult - 1; }); return f; }
    var t1 = tbs.filter(function (t) { return /พอยท์ต่อหน่วย/.test(t.textContent); })[0];
    if (t1) {
      $('tbody', t1).innerHTML = PMP.products.map(function (p) {
        var own = cfg.pts[p.sku] != null, v = own ? cfg.pts[p.sku] : p.pts, f = multFor(p);
        return '<tr><td><b>' + E(p.name) + '</b><span class="sub mono">' + p.sku + '</span></td><td>' + E(p.brand) + '</td><td>' + E(p.cat) + '</td><td>' + p.unit + ' · ' + B(p.price) + '</td><td class="num"><input class="input pts" data-lpts="' + p.sku + '" value="' + v + '"></td><td><span class="chip ' + (own ? 'soft-primary' : '') + '">' + (own ? 'ตั้งเอง' : 'ค่าเริ่มต้น') + '</span></td><td>' + (f > 1 ? '<span class="mult">×' + f + '</span>' : '<span class="muted">—</span>') + '</td><td class="num"><b>' + (v * f) + '</b></td></tr>';
      }).join('');
    }
    var t3 = tbs.filter(function (t) { return /ตัวคูณ/.test(t.textContent) && /ขอบเขตสินค้า/.test(t.textContent); })[0];
    if (t3) {
      $('tbody', t3).innerHTML = cfg.points.mults.map(function (m, i) {
        var s = PMP.status({ active: true, start: m.start, end: m.end }, now), ps = m.scope.mode === 'pset' ? (cfg.psets.filter(function (x) { return x.id === m.scope.ref; })[0] || {}).name : 'ทุกสินค้าที่มีพอยท์ > 0';
        return '<tr><td><b>' + E(m.name) + '</b></td><td class="num"><input class="input pts" style="width:70px" data-lpm="' + i + '" value="' + m.mult + '"></td><td>' + E(ps) + '</td><td>' + dmy(m.start) + ' – ' + dmy(m.end) + '</td><td><span class="chip ' + (s === 'running' ? 'success' : s === 'upcoming' ? 'warning' : '') + '">' + (s === 'running' ? 'กำลังใช้งาน' : s === 'upcoming' ? 'ยังไม่เริ่ม' : 'หมดอายุ') + '</span></td><td>ตามนโยบายเริ่มต้น (' + dm(PMP.addDays(now, cfg.points.expiryDays)) + ')</td><td><button class="btn text sm grey" data-lpmd="' + i + '">ลบ</button></td></tr>';
      }).join('') + '<tr><td colspan="7"><button class="btn outlined sm" id="lpmAdd">＋ เพิ่มตัวคูณ</button></td></tr>';
    }
    var ed = $$('.field', document).filter(function (f) { return /พอยท์หมดอายุ|หมดอายุ/.test(f.textContent) && $('input', f); });
    var root = $('#screen'); if (!root._lp) { root._lp = 1;
      root.addEventListener('input', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-lpts'))) { setCfg(function (c) { c.pts = c.pts || {}; c.pts[a] = +t.value || 0; }); flashSaved(); } if ((a = t.getAttribute('data-lpm'))) { setCfg(function (c) { c.points.mults[+a].mult = +t.value || 1; }); flashSaved(); } });
      root.addEventListener('change', function (e) { var t = e.target; if (t.getAttribute('data-lpts') != null || t.getAttribute('data-lpm') != null) rerender(); });
      root.addEventListener('click', function (e) { var d = e.target.closest('[data-lpmd]'); if (d) { setCfg(function (c) { c.points.mults.splice(+d.getAttribute('data-lpmd'), 1); }); rerender(); return; } if (e.target.id === 'lpmAdd') { setCfg(function (c) { c.points.mults.push({ id: U.uid('m'), name: 'ตัวคูณใหม่', start: c.now, end: PMP.addDays(c.now, 30), mult: 2, scope: { mode: 'all', ref: null } }); }); rerender(); } });
    }
  };

  /* ===== raffle/09 ประวัติการลุ้น + รางวัลของฉัน ===== */
  H['raffle/09-customer-history.html'] = function () {
    var c = cs(), tb = $('table.table tbody'); if (!tb) return;
    tb.innerHTML = (c.draws || []).map(function (d, n) { return '<tr><td class="nowrap">' + dmy(d.d) + '</td><td>' + E(d.f) + '</td><td><b>ยอดซื้อ/โปร/แลกพอยท์</b><div class="trace"><span>TK-' + (n + 1) + '</span><i>→</i><span>DR-' + String(4899 - n).padStart(6, '0') + '</span></div></td><td><span class="mode a">A</span></td><td><span class="chip success">ถูก</span> ' + E(d.prize) + '<div class="small muted">' + E(d.out.join(', ')) + '</div></td></tr>'; }).join('') || '<tr><td colspan="5" class="center muted" style="padding:24px">ยังไม่มีประวัติการลุ้น</td></tr>';
    relabelCustomer();
  };

  /* ===== starterkit/04 เลือกเซตร้านยา (ลูกค้า) ===== */
  H['starterkit/04-customer-catalog.html'] = function () {
    var cfg = PMP.cfg(), cu = cust(), grid = $('.grid.g2'); if (!grid) return;
    var b2b = cu.type === 'B2B'; var badge = $('.page-head .chip.lg'); if (badge) { badge.className = 'chip lg ' + (b2b ? 'soft-success' : 'soft-warning'); badge.textContent = (b2b ? 'บัญชีร้านค้า (B2B) · สั่งเซตได้' : 'บัญชีทั่วไป (B2C) · ดูได้ สั่งไม่ได้'); }
    grid.innerHTML = cfg.kits.map(function (k) {
      var r = PMP.kitCalc(k, null), req = k.items.filter(function (x) { return x.req; }), opt = k.items.filter(function (x) { return !x.req; }), reqTot = req.reduce(function (a, x) { return a + x.min * PMP.product(x.sku).price; }, 0), blocked = r.blocked.length;
      return '<div class="card kcard' + (blocked ? ' blocked' : '') + '"><div class="img"><div>' + (blocked ? '<span class="chip error">สั่งไม่ได้ชั่วคราว</span>' : '') + '</div><span>รูปเซต</span></div><div class="kb"><div class="row between"><h5>' + E(k.name) + '</h5><span class="chip soft-info">ส่วนลด ' + k.disc + '%</span></div><div class="small muted">สิ่งที่รวมอยู่ในเซต</div><ul>' + k.items.map(function (x) { return '<li>' + E(PMP.product(x.sku).name) + ' × ' + x.qty + (x.req ? ' (บังคับ ≥ ' + x.min + ')' : ' (ทางเลือก)') + '</li>'; }).join('') + '</ul><div class="row wrap"><span class="chip soft-primary">บังคับ ' + req.length + ' รายการ</span><span class="chip outline">ทางเลือก ' + opt.length + ' รายการ</span></div>' + (blocked ? '<div class="alert error" style="padding:8px 12px;font-size:12px">' + E(r.blocked.join(' · ')) + '</div>' : '') + '<div class="priceline"><div><div class="from">ราคาเริ่มต้น (เฉพาะสินค้าบังคับ)</div><div class="amt"' + (blocked ? ' style="color:var(--g600)"' : '') + '>' + B(reqTot * (1 - k.disc / 100)) + '</div><span class="chip soft-success">ส่วนลดเซต ' + k.disc + '%</span></div><a class="btn ' + (blocked ? 'outlined primary' : 'contained') + '" href="' + (blocked ? '06-customer-blocked.html' : '05-customer-builder.html') + '" data-lsel-kit="' + k.id + '">' + (blocked ? 'ดูสถานะ / แจ้งเตือน' : 'ดูและปรับเซต') + '</a></div></div></div>';
    }).join('');
    relabelCustomer();
  };

  /* ================= STARTER KIT BUILDER (customer + admin on-behalf) ================= */
  function kitStockChip(sku, q) { var s = PMP.cfg().stock[sku]; return s == null ? '<span class="chip soft-success" style="width:fit-content">พร้อมส่ง</span>' : s < 1 ? '<span class="chip soft-error" style="width:fit-content">หมดชั่วคราว</span>' : s < q ? '<span class="chip soft-warning" style="width:fit-content">เหลือน้อย ' + s + ' ' + PMP.product(sku).unit + '</span>' : '<span class="chip soft-success" style="width:fit-content">พร้อมส่ง</span>'; }
  function krow(it, i, req) {
    var p = PMP.product(it.sku), on = it.on !== false;
    return '<div class="krow' + (req ? ' locked' : '') + '" data-type="' + (req ? 'req' : 'opt') + '" data-price="' + p.price + '" data-min="' + (req ? it.min : 1) + '" data-idx="' + i + '"><div class="ctl">' + (req ? '<i class="lk" title="บังคับ ถอดออกไม่ได้"></i>' : '<label class="switch"><input type="checkbox" class="k-sw"' + (on ? ' checked' : '') + '></label>') + '</div><span class="thumb"></span><div class="nm"><b>' + E(p.name) + '</b><span class="small muted">หน่วย: ' + p.unit + (req ? ' · ขั้นต่ำ ' + it.min + ' ' + p.unit : ' · แนะนำ ' + it.qty + ' ' + p.unit) + '</span>' + kitStockChip(it.sku, it.qty) + '</div><div class="pr"><b>' + B(p.price) + '</b><div class="xs muted">/' + p.unit + '</div></div><div class="qty"><button data-d="-1">−</button><input class="qv" value="' + it.qty + '" inputmode="numeric"><button data-d="1">+</button></div><div class="sub k-sub">' + B(p.price * it.qty) + '</div><div class="k-err">' + (req ? 'จำนวนต้องไม่ต่ำกว่าขั้นต่ำ ' + it.min + ' ' + p.unit : 'เลือกแล้วต้องมีอย่างน้อย 1 ' + p.unit + ' — ปิดสวิตช์ถ้าไม่ต้องการ') + '</div></div>';
  }
  function kitBuilder(by) {
    var cfg = PMP.cfg(), id = pickId('kit', cfg.kits), kit0 = $('[data-kit]'); if (!id || !kit0) return;
    var k = recOf('kits', id), root = kit0.cloneNode(true); kit0.parentNode.replaceChild(root, kit0);
    var reqIdx = [], optIdx = []; k.items.forEach(function (it, i) { (it.req ? reqIdx : optIdx).push(i); });
    ['req', 'opt'].forEach(function (ty) {
      var rows = $$('.krow[data-type="' + ty + '"]', root); if (!rows.length) return;
      var anchor = rows[0].previousElementSibling, par = rows[0].parentNode; rows.forEach(function (r) { r.parentNode.removeChild(r); });
      var html = (ty === 'req' ? reqIdx : optIdx).map(function (i) { return krow(k.items[i], i, ty === 'req'); }).join('');
      if (anchor) anchor.insertAdjacentHTML('afterend', html); else par.insertAdjacentHTML('afterbegin', html);
    });
    $$('.krow[data-oos],.krow.invalid-static', root).forEach(function (r) { r.parentNode.removeChild(r); });
    var chips = $$('.sec-h h6 .chip', root); if (chips[0]) chips[0].textContent = reqIdx.length + ' รายการ'; if (chips[1]) chips[1].textContent = optIdx.length + ' รายการ';
    var lastNet = null;
    function money(n) { return B(n); }
    function out(key, v) { $$('[data-out="' + key + '"]').forEach(function (e) { e.textContent = v; }); }
    function calc(why) {
      var m = 0, o = 0, on = 0, bad = 0, qtys = {};
      $$('.krow[data-type]', root).forEach(function (r) {
        var ty = r.getAttribute('data-type'), price = +r.getAttribute('data-price'), min = +r.getAttribute('data-min') || 0, inp = $('.qv', r), sw = $('.k-sw', r), q = parseInt(inp.value, 10); if (isNaN(q)) q = 0;
        var active = ty === 'req' || (sw && sw.checked), invalid = active && q < min, idx = +r.getAttribute('data-idx');
        r.classList.toggle('invalid', !!invalid); r.classList.toggle('off', !active); var dec = $('.qty button[data-d="-1"]', r); if (dec) dec.disabled = (!active || q <= min); $('.qty', r).classList.toggle('dis', !active);
        if (invalid) bad++; var sub = (active ? Math.max(q, min) : 0) * price; $('.k-sub', r).textContent = active ? money(sub) : '—';
        qtys[idx] = active ? Math.max(q, min) : 0; if (ty === 'req') m += sub; else if (active) { o += sub; on++; }
      });
      var gross = m + o, disc = Math.round(gross * k.disc) / 100, net = gross - disc;
      out('mand', money(m)); out('opt', money(o)); out('optn', on + ' จาก ' + optIdx.length + ' รายการที่สั่งได้'); ['net', 'net2', 'net3', 'net4'].forEach(function (x) { out(x, money(net)); }); out('gross', money(gross));
      var dr = $('.sum-row.disc span:last-child', document); if (dr) dr.textContent = '−' + money(disc);
      var sv = $('.save', document); if (sv) sv.innerHTML = 'ซื้อแยกรายชิ้น <s>' + money(gross) + '</s> → ซื้อเป็นเซต <b>' + money(net) + '</b><br><b>ประหยัด ' + money(disc) + '</b> (ส่วนลดชุดเซต ' + k.disc + '%)';
      var cta = $('[data-cta]', document); if (cta) cta.classList.toggle('disabled', bad > 0);
      var msg = $('[data-out-msg]', document); if (msg) msg.style.display = bad > 0 ? 'block' : 'none';
      if (lastNet !== null && net !== lastNet && why) { var d2 = net - lastNet; out('prev', money(lastNet)); out('dlt', (d2 > 0 ? '▲ +' : '▼ −') + money(Math.abs(d2))); out('why', why); var bx = $('[data-box="delta"]', document); if (bx) { bx.classList.remove('flash'); void bx.offsetWidth; bx.classList.add('flash'); } }
      lastNet = net; root._qtys = qtys; root._bad = bad;
    }
    root.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.qty button'); if (!b || b.disabled) return; var r = b.closest('.krow'), i = $('.qv', r), q = parseInt(i.value, 10) || 0, d = +b.getAttribute('data-d'); i.value = Math.max(+r.getAttribute('data-min') || 0, q + d); calc((d > 0 ? 'เพิ่ม ' : 'ลด ') + $('.nm b', r).textContent); });
    root.addEventListener('input', function (e) { if (e.target.classList.contains('qv')) calc(); });
    root.addEventListener('change', function (e) { if (e.target.classList.contains('k-sw')) calc((e.target.checked ? 'เปิด ' : 'ปิด ') + $('.nm b', e.target.closest('.krow')).textContent); });
    root._kitId = id; calc(); return { kit: k, root: root, id: id };
  }
  function kitHeader(k) { var h = $('.page-head h4'); if (h) h.textContent = (KEY.indexOf('03-') > -1 ? 'สั่งแทนลูกค้า: ' : '') + k.name; var cr = $('.crumbs'); if (cr && KEY.indexOf('05-') > -1) cr.innerHTML = '<a href="04-customer-catalog.html">เซตร้านยาเปิดใหม่</a> / ' + E(k.name); }
  H['starterkit/05-customer-builder.html'] = function () {
    var b = kitBuilder(); if (!b) return; kitHeader(b.kit); var cu = cust(), ok = b.kit.aud !== 'B2B' || cu.type === 'B2B';
    var badge = $('.page-head .chip.lg'); if (badge) { badge.className = 'chip lg ' + (ok ? 'soft-success' : 'soft-warning'); badge.textContent = (cu.type === 'B2B' ? 'บัญชีร้านค้า (B2B) · ' : 'บัญชีทั่วไป (B2C) · ') + cu.name + (ok ? ' · สั่งเซตนี้ได้' : ' · สั่งเซตนี้ไม่ได้'); }
    var cta = $('[data-cta]'); if (cta && !cta._l) { cta._l = 1; cta.removeAttribute('href'); cta.addEventListener('click', function (e) { e.preventDefault(); if (!ok) { toast('เซตนี้สั่งได้เฉพาะลูกค้า B2B', true); return; } var root = $('[data-kit]'); if (root._bad) { toast('มีรายการที่จำนวนต่ำกว่าขั้นต่ำ', true); return; } var r = PMP.kitOrder(custId(), root._kitId, root._qtys, 'ลูกค้า'); if (r.error) { toast(r.error, true); return; } toast('สั่งเซตสำเร็จ ' + r.order.no + ' · ' + B(r.order.total) + ' · ได้พอยท์ ' + r.order.pts); setTimeout(rerender, 300); }); }
    var p = $('.page-head p.muted'); if (p) p.textContent = b.kit.desc || 'สินค้าบังคับครบตามที่ร้านต้องมี เลือกสินค้าเสริมเพิ่มได้ ราคาถูกกว่าซื้อแยก';
  };
  var behalfId = null;
  H['starterkit/03-admin-order-behalf.html'] = function () {
    var cfg = PMP.cfg(), b = kitBuilder(); if (!b) return; kitHeader(b.kit);
    var kit = b.kit, sel = U.rd('pmpc.live.behalf', 'c-b2b'); var list = $$('label.cust'); var wrap = list[0] && list[0].parentNode;
    if (wrap) { wrap.innerHTML = PMP.customers.map(function (c) { var blocked = kit.aud === 'B2B' && c.type !== 'B2B'; return '<label class="cust' + (c.id === sel ? ' sel' : '') + (blocked ? ' blocked' : '') + '"><input type="radio" name="cu" data-lbu="' + c.id + '"' + (c.id === sel ? ' checked' : '') + (blocked ? ' disabled' : '') + '><div><b>' + E(c.name) + '</b> <span class="chip ' + (blocked ? 'soft-error' : 'soft-success') + '">' + (blocked ? 'บัญชีทั่วไป สั่งเซตนี้ไม่ได้' : 'บัญชีร้านค้า B2B') + '</span><div class="small muted">' + E(c.tag) + '</div>' + (blocked ? '<div class="small mt8" style="color:#B26A00">เซตนี้สำหรับร้านค้า (B2B) เท่านั้น — ให้ลูกค้าส่งคำขออัปเกรดบัญชีร้านค้าก่อน แล้วจึงสั่งแทนได้</div>' : '') + '</div>' + (c.id === sel ? '<span class="chip primary">กำลังสั่งแทน</span>' : '<span></span>') + '</label>'; }).join(''); wrap.onchange = function (e) { if (e.target.getAttribute('data-lbu')) { U.wr('pmpc.live.behalf', e.target.getAttribute('data-lbu')); rerender(); } }; }
    var cu = PMP.customers.filter(function (c) { return c.id === sel; })[0], sm = $('.aside .small.muted, aside .small.muted'); if (sm) sm.textContent = cu.name + ' · สั่งโดย staff1';
    var aside = $('aside'); if (aside && !$('#lkBehalf')) { aside.insertAdjacentHTML('beforeend', '<div class="card"><div class="card-b"><button class="btn contained lg block" id="lkBehalf">ยืนยันสั่งแทนลูกค้า</button></div></div>'); }
    var bt = $('#lkBehalf'); if (bt) bt.onclick = function () { var root = $('[data-kit]'); if (root._bad) { toast('มีรายการที่จำนวนต่ำกว่าขั้นต่ำ', true); return; } var r = PMP.kitOrder(sel, root._kitId, root._qtys, 'แอดมิน (สั่งแทน)'); if (r.error) { toast(r.error, true); return; } toast('สั่งแทนสำเร็จ ' + r.order.no + ' · ' + B(r.order.total)); };
  };
  /* starterkit/06 สถานะสินค้าบังคับหมด / B2C */
  H['starterkit/06-customer-blocked.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('kit', cfg.kits), k = recOf('kits', id), r = PMP.kitCalc(k, null), cu = cust(); if (!k) return;
    var h4 = $('h4'); if (h4) h4.textContent = k.name + ' — สถานะการสั่งซื้อ';
    var box = $('.alert.error'); if (box) { box.style.display = r.blocked.length ? '' : 'none'; if (r.blocked.length) box.innerHTML = '<div><div class="a-title">สั่งไม่ได้ชั่วคราว</div>' + E(r.blocked.join(' · ')) + ' — ตั้งสต็อกสินค้าที่<a href="../simulator/01-config.html#general">ตั้งค่าจำลอง</a>เพื่อลองสถานะนี้</div>'; }
    var st = $('.page-head .chip.lg'); if (st) { st.className = 'chip lg ' + (cu.type === 'B2B' ? 'soft-success' : 'soft-warning'); st.textContent = cu.type === 'B2B' ? 'B2B · ' + cu.name : 'บัญชีทั่วไป (B2C) · สั่งเซตนี้ไม่ได้'; }
    var intro = $('.page-head p.muted'); if (intro) intro.textContent = r.blocked.length ? 'มีสินค้าบังคับที่สต็อกไม่พอ ' + r.blocked.length + ' รายการ' : 'ตอนนี้สินค้าบังคับครบ สั่งเซตได้ปกติ' + (cu.type === 'B2B' ? '' : ' (บัญชีนี้เป็น B2C — สั่งเซตนี้ไม่ได้)');
  };

  /* ================= promotion/07 สินค้า (ลูกค้า) ================= */
  var P7 = { q: '', only: true, type: 0, sort: 0 };
  function promoTagsFor(p, cfg) {
    var now = cfg.now, tags = [], hint = '', flash = null, price = p.price;
    cfg.flash.forEach(function (f) { if (PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, now) !== 'running') return; var r = f.rules.filter(function (x) { return PMP.inScope(cfg, { mode: 'pset', ref: x.ps }, p); })[0]; if (r && !flash) { flash = { pct: r.pct, f: f }; price = p.price * (100 - r.pct) / 100; tags.push('<span class="promo-tag flash">Flash −' + r.pct + '%</span>'); hint = '<div class="hint flash">เหลือ ' + (f.quota ? f.quota - f.used : '∞') + ' ชิ้นในราคา Flash · ถึง ' + dm(f.end) + '</div>'; } });
    var q = cfg.quota.filter(function (x) { return x.sku === p.sku && PMP.status(x, now) === 'running'; })[0]; if (q) { price = q.special; tags.push('<span class="promo-tag flash">ราคาพิเศษ จำนวนจำกัด</span>'); hint = '<div class="hint flash">โควตาเหลือ ' + (q.quotaTotal - q.used) + ' ชิ้น · ถึง ' + dm(q.end) + '</div>'; }
    var kinds = {}; cfg.promos.forEach(function (pr) { if (PMP.status(pr, now) !== 'running') return; if (!PMP.inScope(cfg, pr.scope, p)) return; PMP.rewardsOf('promotion', pr.id).forEach(function (i) { if (!kinds[i.k]) { kinds[i.k] = pr; } }); if (!hint) hint = '<div class="hint">' + E(pr.name) + '</div>'; });
    Object.keys(kinds).forEach(function (k) { var L = { gift: ['gift', 'ซื้อครบรับฟรี'], disc: ['', 'ส่วนลด'], ship: ['ship', 'ส่งฟรี'], points: ['', 'พอยท์'], coupon: ['', 'คูปอง'], credit: ['', 'เครดิต'], entitle: ['', 'สิทธิ์ลุ้น'], offpos: ['gift', 'ของนอก POS'] }[k]; tags.push('<span class="promo-tag ' + L[0] + '">' + L[1] + '</span>'); });
    return { tags: tags, hint: hint, price: price, flash: !!flash, has: tags.length > 0, kinds: Object.keys(kinds) };
  }
  H['promotion/07-customer-product.html'] = function () {
    var cfg = PMP.cfg(), g = $('.product-grid'), fb = $('.fbar');
    var inp = $('input.input', fb), cb = $('input[type=checkbox]', fb), sels = $$('select', fb);
    var rows = PMP.products.map(function (p) { return { p: p, t: promoTagsFor(p, cfg) }; });
    rows = rows.filter(function (r) { return (!P7.only || r.t.has) && (!P7.q || (r.p.name + r.p.brand + r.p.sku).toLowerCase().indexOf(P7.q.toLowerCase()) > -1) && (P7.type === 0 || (P7.type === 1 && r.t.kinds.indexOf('gift') > -1) || (P7.type === 2 && (r.t.kinds.indexOf('disc') > -1)) || (P7.type === 3 && r.t.kinds.indexOf('ship') > -1) || (P7.type === 4 && r.t.flash)); });
    rows.sort(function (a, b) { return P7.sort === 1 ? a.t.price - b.t.price : P7.sort === 2 ? b.t.price - a.t.price : (b.t.has - a.t.has); });
    g.innerHTML = rows.map(function (r) { var p = r.p; return '<div class="product-card"><div class="img">ภาพสินค้า<div class="tags">' + r.t.tags.join('') + '</div></div><div class="pc-b"><div class="nm">' + E(p.name) + '</div><div class="muted xs">' + p.brand + ' · ' + p.unit + '</div><div class="price">' + B(r.t.price) + (r.t.price < p.price ? '<s>' + B(p.price) + '</s>' : '') + '</div>' + (r.t.hint || '') + '<button class="btn outlined sm block" data-lpadd="' + p.sku + '">เพิ่มในตะกร้า</button></div></div>'; }).join('') || '<div class="muted" style="padding:24px">ไม่พบสินค้า</div>';
    var cnt = $('.fbar .muted.small'); if (cnt) cnt.textContent = 'พบ ' + rows.length + ' รายการ';
    if (inp && !inp._l) { inp._l = 1; inp.addEventListener('input', function () { P7.q = inp.value; rerender(); inp.focus(); }); cb.addEventListener('change', function () { P7.only = cb.checked; rerender(); }); sels[0].addEventListener('change', function () { P7.type = sels[0].selectedIndex; rerender(); }); sels[1].addEventListener('change', function () { P7.sort = sels[1].selectedIndex; rerender(); }); }
    // part ข: detail add
    var pd = $('.pd'); if (pd && !pd._l) { pd._l = 1; var qn = $('.qty span', pd); pd.addEventListener('click', function (e) { var b = e.target.closest('.qty button'); if (b) { qn.textContent = Math.max(1, (+qn.textContent || 1) + (b.textContent.trim() === '+' ? 1 : -1)); return; } var a = e.target.closest('.btn.contained'); if (a) { var c = U.rd('pmpc.sim.cart', {}); c['DX-MP1'] = (c['DX-MP1'] || 0) + (+qn.textContent || 1); U.wr('pmpc.sim.cart', c); toast('เพิ่มนมผง Dumex ' + qn.textContent + ' ลงตะกร้าแล้ว'); } }); }
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lpadd]'); if (a) { var c = U.rd('pmpc.sim.cart', {}), s = a.getAttribute('data-lpadd'); c[s] = (c[s] || 0) + 1; U.wr('pmpc.sim.cart', c); toast('เพิ่ม ' + PMP.product(s).name + ' ลงตะกร้าแล้ว (' + c[s] + ') — ดูที่ตะกร้า'); } });

  /* ================= promotion/08 รายละเอียดโปร ================= */
  H['promotion/08-customer-detail.html'] = function () {
    var cfg = PMP.cfg(), id = pickId('promo', cfg.promos), p = recOf('promos', id), cs0 = cs(); if (!p) return;
    var items = PMP.rewardsOf('promotion', p.id), scoped = PMP.products.filter(function (x) { return PMP.inScope(cfg, p.scope, x); });
    $('.crumbs').innerHTML = '<a href="06-customer-list.html">โปรโมชั่น</a> / ' + E(p.name);
    var c1 = $$('.card')[0]; $('h4', c1).textContent = p.name; var st = PMP.status(p, cfg.now); var chip = $('.chip.lg', c1); chip.className = 'chip lg ' + (st === 'running' ? 'success' : 'warning'); chip.textContent = PMP.statusLabel[st];
    $$('p', c1)[0].textContent = p.desc || p.name; $$('p', c1)[1].innerHTML = '<b>เงื่อนไข</b>: ' + E(p.condText || (p.ctype === 'qty' ? 'ซื้อสินค้าที่ร่วมรายการครบ ' + p.min + ' หน่วย' : 'ซื้อครบ ' + B(p.min)));
    var dds = $$('dd', c1); dds[0].textContent = (p.ctype === 'qty' ? 'ตามจำนวน ' + p.min + ' หน่วย' : 'ตามยอดเงิน ' + B(p.min)) + (p.strict ? ' · ตรวจหน่วยเข้มงวด' : '') + (p.aud === 'new' ? ' · เฉพาะลูกค้าใหม่' : '');
    dds[1].innerHTML = items.map(function (i) { return '<span class="promo-tag ' + (CHIPK[i.k] || '') + '">' + PMP.kindLabel[i.k] + '</span> ' + E(PMP.describe(i, cfg)); }).join('<br>');
    dds[2].textContent = (p.stackCoupon ? 'คูปองได้' : 'คูปองไม่ได้') + ' · ' + (p.stackPromo ? 'โปรโมชั่นอื่นได้' : 'โปรโมชั่นอื่นไม่ได้') + ' · ' + (p.stackPoints ? 'ใช้พอยท์ชำระได้' : 'ใช้พอยท์ชำระไม่ได้'); dds[3].textContent = dm(p.start) + ' - ' + dm(p.end);
    var uses = cs0.promoUse[p.id] || 0, q = $('.quota', c1); q.innerHTML = '<span class="pin abs" style="top:-10px">1</span><h6 class="mb8">โควต้า</h6><div class="row2"><span class="muted">ต่อลูกค้า ใช้แล้ว: ' + uses + (p.perCust ? ' / ' + p.perCust : '') + '</span><span style="color:var(--success-dark)">' + (p.perCust ? 'เหลือ ' + (p.perCust - uses) : 'ไม่จำกัด') + ' · โควต้ารวมเหลือ ' + (p.quotaTotal ? p.quotaTotal - p.used : '∞') + '</span></div>';
    var addAll = $('.btn.contained.lg', c1); addAll.setAttribute('data-lpall', p.id); addAll.textContent = 'เพิ่มสินค้าที่ต้องมีทั้งหมดเข้าตะกร้า'; addAll.removeAttribute('href');
    var cards = $$('.card.mt16'), req = cards[0], free = cards[1];
    $('h5', req).textContent = 'สินค้าที่ต้องมี (' + scoped.length + ' รายการให้เลือก)';
    var reqs = $$('.req', req); reqs.forEach(function (r, i) { if (i > 0) r.parentNode.removeChild(r); });
    $('.req-h h6', req).textContent = 'รายการที่ 1'; $('.req-h .chip', req).textContent = 'จำนวนที่ต้องมี: ' + (p.ctype === 'qty' ? p.min : 'ยอด ' + B(p.min));
    $('.choices', req).innerHTML = scoped.map(function (x, i) { return '<div class="pu"><span class="ch">ตัวเลือก ' + (i + 1) + '</span><div class="img">ภาพสินค้า</div><div class="b"><div class="nm">' + E(x.name) + '</div><div>หน่วย: ' + x.unit + '</div><div class="price" style="font-size:14px">' + B(x.price) + '</div><button class="btn outlined sm block" data-lpadd="' + x.sku + '">เพิ่มในตะกร้า</button></div></div>'; }).join('') || '<div class="muted">ไม่จำกัดสินค้า — ซื้อสินค้าใดก็ได้ครบยอด</div>';
    var gifts = items.filter(function (i) { return i.k === 'gift'; }); $('h5', free).textContent = 'ผลตอบแทนที่ได้ (' + items.length + ' รายการ)';
    $('.choices', free).innerHTML = items.map(function (i) { var gp = i.k === 'gift' ? PMP.product(i.sku) : null; return '<div class="pu free"><div class="img" style="background:var(--success-lighter)">' + (gp ? 'ภาพสินค้า' : PMP.kindLabel[i.k]) + '</div><div class="b"><div class="nm">' + E(gp ? gp.name : PMP.kindLabel[i.k]) + '</div><div>' + E(PMP.describe(i, cfg)) + '</div><div><span class="promo-tag gift">ได้เมื่อเข้าเงื่อนไข</span></div></div></div>'; }).join('');
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lpall]'); if (!a) return; var p = recOf('promos', a.getAttribute('data-lpall')), cfg = PMP.cfg(), sc = PMP.products.filter(function (x) { return PMP.inScope(cfg, p.scope, x); }), c = U.rd('pmpc.sim.cart', {}), pick = sc[0] || PMP.products[0]; c[pick.sku] = (c[pick.sku] || 0) + (p.ctype === 'qty' ? p.min : Math.ceil(p.min / pick.price)); U.wr('pmpc.sim.cart', c); var sel = U.rd('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); if (sel.promos.indexOf(p.id) < 0) sel.promos.push(p.id); U.wr('pmpc.sim.sel', sel); toast('เพิ่มสินค้าเข้าตะกร้าแล้ว — ไปที่ตะกร้าเพื่อชำระ'); });

  /* ================= home/01 หน้าแรกลูกค้า ================= */
  H['home/01-customer-home.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), cu = cust(), now = cfg.now, L = cfg.ladders[0], lv = (L && c.ladder[L.id]) || { spent: 0, unlocked: [] }, lots2 = lots(c, cfg);
    var want = cu.type === 'B2B' ? 'b2b' : 'b2c', vb = $('.seg button[data-view="' + want + '"]'); if (vb && !vb.classList.contains('on') && !document.body._lhv) { document.body._lhv = 1; vb.click(); }
    // status strip
    var strip = $('.strip'); if (strip) {
      var nxt = L && L.tiers.filter(function (t) { return t.at > lv.spent; })[0], top = L ? L.tiers[L.tiers.length - 1].at : 1, soon = lots2.filter(function (l) { return (new Date(l.exp) - new Date(now)) / 864e5 <= 30; })[0], ready = c.wallet.filter(function (w) { return !w.used; }).length, collectable = cfg.coupons.filter(function (k) { return k.kind === 'collect' && PMP.status(k, now) === 'running' && !c.wallet.some(function (w) { return w.couponId === k.id; }); }).length, tk = Object.keys(c.tickets).reduce(function (a, k) { return a + c.tickets[k]; }, 0);
      strip.innerHTML = '<span class="pin abs" style="top:-8px">2</span><a class="st" href="../points/04-customer-dashboard.html"><div class="l">พอยท์ของฉัน</div><div class="v">' + c.points.toLocaleString() + '</div>' + (soon ? '<div class="s warn">' + soon.pts + ' พอยท์หมดอายุใน 30 วัน</div>' : '<div class="s">ยังไม่มีพอยท์ใกล้หมดอายุ</div>') + '</a><a class="st" href="../coupon/08-customer-center.html"><div class="l">คูปองพร้อมใช้</div><div class="v">' + ready + ' ใบ</div><div class="s">เก็บเพิ่มได้ ' + collectable + ' ใบ</div></a><a class="st" href="../campaign/06-customer-ladder.html"><div class="l">ยอดสะสมปี 2569</div><div class="v">' + B(lv.spent) + '</div><div class="progress mt8"><i style="width:' + Math.min(100, lv.spent / top * 100) + '%"></i></div><div class="s mt8">' + (nxt ? 'อีก ' + B(nxt.at - lv.spent) + ' ถึง' + E(nxt.name) : 'ถึงขั้นสูงสุดแล้ว') + '</div></a><a class="st" href="../raffle/06-customer-tickets.html"><div class="l">สิทธิ์ลุ้นรางวัล</div><div class="v">' + tk + ' Tickets</div><div class="s">' + E(cfg.raffles[0] ? cfg.raffles[0].name : '') + '</div></a>';
    }
    // flash
    var fl = cfg.flash.filter(function (f) { return PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, now) === 'running'; })[0], fbox = $('.flash-h') && $('.flash-h').parentNode;
    if (fbox) { fbox.parentNode.style.display = fl ? '' : 'none'; if (fl) { $('.ft', fbox).textContent = fl.name + ' — ลดสูงสุด ' + Math.max.apply(null, fl.rules.map(function (r) { return r.pct; })) + '%'; var prs = PMP.products.map(function (p) { return { p: p, t: promoTagsFor(p, cfg) }; }).filter(function (x) { return x.t.flash; }).slice(0, 4); $('.product-grid', fbox).innerHTML = prs.map(function (x) { return '<a class="product-card" href="../promotion/07-customer-product.html"><div class="img">ภาพสินค้า<div class="tags">' + x.t.tags.filter(function (g) { return /flash/.test(g); }).join('') + '</div></div><div class="pc-b"><div class="nm" style="color:var(--g800)">' + E(x.p.name) + '</div><div class="muted xs" style="color:var(--g600)">' + x.p.brand + ' · ' + x.p.unit + '</div><div class="price" style="color:var(--primary-dark)">' + B(x.t.price) + '<s style="color:var(--g500)">' + B(x.p.price) + '</s></div>' + (x.t.hint || '').replace('hint flash', 'hint') + '</div></a>'; }).join(''); } }
    // promotions (cards3 first)
    var c3 = $$('.cards3'), pm = cfg.promos.filter(function (p) { return PMP.status(p, now) === 'running'; }).slice(0, 3);
    if (c3[0]) c3[0].innerHTML = pm.map(function (p) { var it = PMP.rewardsOf('promotion', p.id), k = it[0] ? it[0].k : 'disc'; return '<a class="pcard" href="../promotion/08-customer-detail.html" data-lsel-promo="' + p.id + '"><span class="promo-tag ' + (CHIPK[k] || '') + '">' + PMP.kindLabel[k] + '</span><h6>' + E(p.name) + '</h6><p>' + E(it.map(function (i) { return PMP.describe(i, cfg); }).join(' + ')) + '</p><div class="ft"><span>ถึง ' + dm(p.end) + '</span><b style="color:var(--primary)">ดูรายละเอียด</b></div></a>'; }).join('') || '<div class="muted">ไม่มีโปรโมชั่นที่เปิดอยู่</div>';
    // coupons (cards3 second)
    if (c3[1]) { var cps = cfg.coupons.filter(function (k) { return k.kind !== 'code' && PMP.status(k, now) === 'running'; }).slice(0, 3); c3[1].innerHTML = cps.map(function (k) { var have = c.wallet.some(function (w) { return w.couponId === k.id; }); return '<div class="cpn"><div class="a">' + kindVal(k) + '<small>' + (k.min ? 'ซื้อครบ ' + B(k.min) : '') + '</small></div><div class="b"><b>' + E(k.name) + '</b><span>' + (k.quotaTotal ? 'เหลือ ' + (k.quotaTotal - k.used) + ' / ' + k.quotaTotal + ' สิทธิ์ · ' : '') + 'ถึง ' + dmy(k.end) + '</span>' + (have ? '<span class="chip soft-success sq" style="align-self:flex-start">ได้รับแล้ว</span>' : k.kind === 'collect' ? '<button class="btn contained sm" style="align-self:flex-start" data-lcollect="' + k.id + '">เก็บคูปอง</button>' : '<span class="chip soft-info sq" style="align-self:flex-start">แจกอัตโนมัติรายเดือน</span>') + '</div></div>'; }).join(''); }
    // campaigns
    var c2 = $('.cards2'); if (c2 && L) { var q = cfg.quota[0], qp = q && PMP.product(q.sku); c2.innerHTML = '<a class="pcard" href="../campaign/06-customer-ladder.html"><span class="chip soft-primary sq" style="align-self:flex-start">สะสมยอดรายปี</span><h6>' + E(L.name) + '</h6><div class="step-mini">' + L.tiers.map(function (t) { return '<i class="' + (lv.unlocked.indexOf(t.id) > -1 ? 'done' : '') + '"></i>'; }).join('') + '</div><p>ปลดล็อกแล้ว ' + lv.unlocked.length + ' / ' + L.tiers.length + ' ขั้น · ยอดสะสม ' + B(lv.spent) + '</p><div class="ft"><span>ถึง ' + dm(L.end) + '</span><b style="color:var(--primary)">ดูความคืบหน้า</b></div></a>' + (q ? '<a class="pcard" href="../campaign/08-customer-quota-product.html"><span class="chip soft-warning sq" style="align-self:flex-start">ราคาพิเศษ · จำนวนจำกัด</span><h6>' + E(qp.name) + ' ' + B(q.special) + ' <s style="font-weight:400;color:var(--g500);font-size:12px">' + B(qp.price) + '</s></h6><div class="progress warn"><i style="width:' + Math.min(100, (q.quotaTotal - q.used) / q.quotaTotal * 100) + '%"></i></div><p>เหลือ ' + (q.quotaTotal - q.used) + ' / ' + q.quotaTotal + ' ชิ้น · ร้านคุณซื้อได้อีก ' + (q.perCust - (c.quotaUse[q.id] || 0)) + ' ชิ้น</p><div class="ft"><span>ถึง ' + dm(q.end) + '</span><b style="color:var(--primary)">ดูสินค้า</b></div></a>' : ''); }
    // starter kits
    var kit = $('.kit'); if (kit) kit.innerHTML = cfg.kits.map(function (k) { var r = PMP.kitCalc(k, null); return '<a class="pcard" href="../starterkit/05-customer-builder.html" data-lsel-kit="' + k.id + '"><h6>' + E(k.name) + '</h6><p>' + k.items.length + ' รายการ · ส่วนลดเซต ' + k.disc + '%</p><div class="ft"><span>เริ่มต้น</span><b>' + B(k.items.filter(function (x) { return x.req; }).reduce(function (a, x) { return a + x.min * PMP.product(x.sku).price; }, 0) * (1 - k.disc / 100)) + '</b></div></a>'; }).join('');
    // raffle
    var rf = $('.raffle'), f0 = cfg.raffles[0]; if (rf && f0) { $('.t', rf).textContent = f0.name; $('.d', rf).textContent = 'ซื้อครบ ' + B(f0.perBaht) + ' ได้ 1 สิทธิ์ลุ้น · คุณมี ' + (c.tickets[f0.id] || 0) + ' Tickets · กิจกรรมถึง ' + dm(f0.end); }
    // redeem
    var c4 = $('.cards4'); if (c4) { var sub = $$('.sec-h .sub').filter(function (x) { return /พอยท์ของคุณ/.test(x.textContent); })[0]; if (sub) sub.textContent = 'พอยท์ของคุณ ' + c.points.toLocaleString() + ' · แสดงเฉพาะรายการที่คุณแลกได้'; c4.innerHTML = cfg.catalog.filter(function (i) { return i.active && i.stock > 0; }).sort(function (a, b) { return (c.points >= a.pts ? 0 : 1) - (c.points >= b.pts ? 0 : 1) || a.pts - b.pts; }).slice(0, 4).map(function (i) { var ok = c.points >= i.pts; return '<div class="rw"><div class="img"></div><div class="b"><b>' + E(i.name) + '</b><span class="muted">เหลือ ' + i.stock + ' สิทธิ์</span><b style="color:var(--primary)">' + i.pts.toLocaleString() + ' พอยท์</b><button class="btn ' + (ok ? 'contained' : 'outlined') + ' sm" data-lhredeem="' + i.id + '"' + (ok ? '' : ' disabled') + '>' + (ok ? 'แลก' : 'พอยท์ไม่พอ') + '</button></div></div>'; }).join(''); }
    var cnt = $('.cust-top .cart b'); relabelCustomer();
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lhredeem]'); if (!a) return; var it = PMP.cfg().catalog.filter(function (x) { return x.id === a.getAttribute('data-lhredeem'); })[0]; if (!confirm('ยืนยันแลก “' + it.name + '” ใช้ ' + it.pts + ' พอยท์ ? (ยกเลิกไม่ได้)')) return; var r = PMP.redeem(custId(), it.id); toast(r.error || 'แลกสำเร็จ: ' + r.out.join(' · '), !!r.error); rerender(); });

  /* ================= coupon/09 ใช้คูปองในตะกร้า/เช็คเอาต์ ================= */
  H['coupon/09-customer-cart-coupon.html'] = function () {
    if (U.rd('pmpc.sim.cart', null) === null) U.wr('pmpc.sim.cart', { 'BM-VC500': 3, 'DX-MP1': 1, 'SY-3ML': 4, 'PAR-500': 10 });
    var cfg = PMP.cfg(), R = PMP.price(cartArr(), cartOpts()), cs0 = cs();
    var lc = $('.cart-grid .card .card-b'); lc.innerHTML = R.lines.map(function (l) { var ex = R.coupon && R.coupon.excluded.indexOf(l.p.name) > -1; return '<div class="cart-line"><span class="thumb"></span><div><b>' + E(l.p.name) + '</b>' + (ex ? ' <span class="chip soft-warning">ไม่เข้าร่วมคูปอง</span>' : '') + '<div class="small muted">' + B(l.base) + ' × ' + l.qty + '</div></div><b>' + B(l.amount) + '</b></div>'; }).join('') + (R.coupon && R.coupon.excluded.length ? '<div class="legal mt16">' + E(R.coupon.excluded.join(', ')) + ' อยู่ในรายการยกเว้นของคูปอง — ไม่นับเป็นยอดคิดส่วนลด</div>' : '') + '<div class="row mt16" style="gap:8px"><select class="select" id="lcAddSel2" style="width:300px">' + PMP.products.map(function (p) { return '<option value="' + p.sku + '">' + E(p.name) + '</option>'; }).join('') + '</select><button class="btn outlined sm" id="lcAdd2">＋ เพิ่มสินค้า</button></div>';
    var sc = $$('.cart-grid .card .card-b')[1];
    var applied = R.coupon ? '<div class="applied"><div><b>' + E(R.coupon.name) + '</b><div class="small muted">' + E(R.coupon.code) + ' · ' + (R.coupon.ship ? 'ฟรีค่าจัดส่ง' : 'ลด ' + B(R.coupon.discount)) + '</div></div><button class="rm" id="lcRm">✕ เอาออก</button></div>' : '<div class="small muted mb8">ยังไม่ได้ใช้คูปอง</div>';
    sc.innerHTML = '<h6 class="mb8">สรุปคำสั่งซื้อ</h6><div class="sum-row"><span>ยอดสินค้า</span><span>' + B(R.subtotal) + '</span></div><div class="sum-row"><span>ส่วนลดโปรโมชั่น</span><span>' + (R.promoDisc ? '−' + B(R.promoDisc) : '—') + '</span></div><div class="sep" style="margin:8px 0"></div><div class="row between mb8"><b>คูปอง</b><span class="small muted">ใช้แล้ว ' + (R.coupon ? 1 : 0) + ' / 1 ใบ</span></div>' + applied + '<a class="btn outlined primary block mt8" href="#addcoupon" id="lcOpenDlg">＋ เพิ่มคูปอง</a><div class="sep"></div>' + (R.coupon && !R.coupon.ship ? '<div class="sum-row disc"><span>คูปอง ' + E(R.coupon.code) + '</span><span>−' + B(R.coupon.discount) + '</span></div>' : '') + '<div class="sum-row"><span>ค่าจัดส่ง</span><span>' + (R.shipping ? B(R.shipping) : 'ฟรี') + '</span></div>' + (R.coupon && R.coupon.ship ? '<div class="sum-row disc"><span>คูปอง ส่งฟรี</span><span>−' + B(cfg.shipping.fee) + '</span></div>' : '') + '<div class="sum-row total"><span>ยอดสุทธิ</span><span>' + B(R.total) + '</span></div><div class="legal mt8">ยอดที่ชำระจริงคำนวณที่ระบบตอนยืนยันคำสั่งซื้อ · ราคารวม VAT แล้ว</div><button class="btn contained lg block mt16" id="lcPay2">ไปชำระเงิน</button><a class="btn text block mt8" href="08-customer-center.html">ดูกระเป๋าคูปอง</a>';
    // dialog
    var d = $('.dialog.md'); if (d) {
      var ci = $('.dialog-b input.mono', d), st = $$('.st-ex', d); ci.value = (selGet().couponRef && selGet().couponRef.type === 'code') ? selGet().couponRef.value : ''; ci.classList.remove('good'); ci.id = 'lcCode'; var ub = ci.nextElementSibling; ub.id = 'lcUse';
      st.forEach(function (x) { x.style.display = 'none'; });
      var fb = $('#lcFeedback'); if (!fb) { ci.parentNode.insertAdjacentHTML('afterend', '<div id="lcFeedback" class="mb16"></div>'); fb = $('#lcFeedback'); } fb.innerHTML = R.couponErr ? '<div class="msg err" style="padding:8px 12px;background:var(--error-lighter);color:var(--error-dark);border-radius:8px">✕ ' + E(R.couponErr) + '</div>' : R.coupon ? '<div class="msg ok" style="padding:8px 12px;background:var(--success-lighter);color:var(--success-darker);border-radius:8px">✔ ใช้โค้ดได้ — ' + (R.coupon.ship ? 'ฟรีค่าจัดส่ง' : 'ลด ' + B(R.coupon.discount)) + '</div>' : '';
      var wl = $$('.wl', d); var host = wl[0] && wl[0].parentNode; var html = cs0.wallet.filter(function (w) { return !w.used; }).map(function (w) { var k = cfg.coupons.filter(function (x) { return x.id === w.couponId; })[0], on = R.coupon && R.coupon.walletId === w.id; return '<div class="wl"><div><b>' + E(k.name) + '</b><div class="rs" style="color:var(--success-darker)">' + (on ? '✔ ใช้อยู่ในบิลนี้' : E(w.src) + ' · ใช้ได้ถึง ' + dmy(k.end)) + '</div></div><button class="btn ' + (on ? 'outlined' : 'contained') + ' sm" data-lcw="' + (on ? '' : w.id) + '">' + (on ? 'เอาออก' : 'ใช้') + '</button></div>'; }).join(''); if (host) { wl.forEach(function (x) { x.parentNode.removeChild(x); }); var lab = $$('.label', d).filter(function (x) { return /กระเป๋า/.test(x.textContent); })[0]; if (lab) lab.insertAdjacentHTML('afterend', html || '<div class="muted small">ไม่มีคูปองในกระเป๋า — <a href="08-customer-center.html">ไปเก็บคูปอง</a></div>'); }
    }
    relabelCustomer();
  };
  document.addEventListener('click', function (e) {
    if (KEY !== 'coupon/09-customer-cart-coupon.html') return; var sel = selGet(), cart = U.rd('pmpc.sim.cart', {});
    if (e.target.id === 'lcAdd2') { var s = $('#lcAddSel2').value; cart[s] = (cart[s] || 0) + 1; U.wr('pmpc.sim.cart', cart); rerender(); return; }
    if (e.target.id === 'lcRm') { sel.couponRef = null; U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcUse') { var v = $('#lcCode').value.trim(); sel.couponRef = v ? { type: 'code', value: v } : null; U.wr('pmpc.sim.sel', sel); rerender(); return; }
    var w = e.target.closest('[data-lcw]'); if (w) { var id = w.getAttribute('data-lcw'); sel.couponRef = id ? { type: 'wallet', value: id } : null; U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcPay2') { var r = PMP.checkout(cartArr(), cartOpts()); if (r.error) { toast(r.error, true); return; } U.wr('pmpc.sim.cart', {}); U.wr('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); toast('ชำระเงินสำเร็จ ' + r.order.no); rerender(); }
  });

  /* ================= points/06 พอยท์ที่จะได้รับ ================= */
  var P6qty = 5;
  H['points/06-customer-earn-preview.html'] = function () {
    var cfg = PMP.cfg(), now = cfg.now; cfg.pts = cfg.pts || {};
    function pv(p) { return cfg.pts[p.sku] != null ? cfg.pts[p.sku] : p.pts; }
    var mults = cfg.points.mults.filter(function (m) { return PMP.status({ active: true, start: m.start, end: m.end }, now) === 'running'; });
    function mf(p) { var f = 1, parts = []; mults.forEach(function (m) { if (PMP.inScope(cfg, m.scope, p)) { f += m.mult - 1; parts.push('×' + m.mult); } }); return { f: f, parts: parts }; }
    var g = $('.product-grid'); var show = [PMP.product('DX-MP1'), PMP.product('BM-VC500'), PMP.product('PP-DM')];
    g.innerHTML = show.map(function (p, i) { var m = mf(p), v = pv(p); return '<div class="relative"><div class="product-card" style="height:100%"><div class="img">' + (m.f > 1 ? '<div class="tags"><span class="promo-tag flash">×' + m.f + '</span></div>' : '') + 'รูปสินค้า</div><div class="pc-b"><b>' + E(p.name) + '</b><div class="price">' + B(p.price) + '</div><div class="row wrap" style="gap:6px">' + (v ? '<span class="pt-badge"><i></i>ได้ ' + v + ' พอยท์/' + p.unit + '</span>' : '<span class="pt-badge zero"><i></i>ไม่ได้พอยท์</span>') + (m.f > 1 ? '<span class="mult' + (m.parts.length > 1 ? ' stack' : '') + '">' + m.parts.join(' + ') + (m.parts.length > 1 ? ' = ×' + m.f : '') + '</span>' : '') + '</div><div class="small muted">' + (v ? 'รวมตัวคูณแล้วได้ <b style="color:var(--primary)">' + (v * m.f) + ' พอยท์/' + p.unit + '</b>' : 'สินค้านี้ไม่ร่วมรายการสะสมพอยท์') + '</div><button class="btn contained sm block mt8" data-lpadd="' + p.sku + '">ใส่ตะกร้า</button></div></div></div>'; }).join('');
    var dp = PMP.product('DX-MP1'), dv = pv(dp), dm2 = mf(dp), box = $('.pbox'); $('.qty span').textContent = P6qty; if (box) { $('.big', box).textContent = Math.floor(dv * dm2.f * P6qty) + ' พอยท์'; $('.eq', box).innerHTML = '<b>' + dv + ' พอยท์/' + dp.unit + '</b> × <b>' + P6qty + ' ' + dp.unit + '</b> = ' + dv * P6qty + ' &nbsp;→&nbsp; × <span class="mult">×' + dm2.f + '</span> = <b style="color:var(--primary)">' + Math.floor(dv * dm2.f * P6qty) + '</b>'; }
    // cart / after-payment states from real cart
    var R = PMP.price(cartArr(), cartOpts()), total = R.earnBase, cr = $$('.card-b').filter(function (x) { return /ตะกร้า/.test(x.textContent) && /พอยท์/.test(x.textContent); });
    var tgt = $$('[data-lpe]'); var anchor = $('.state-h + div', document);
    var hdr = $$('.state-h')[1]; if (hdr && !$('#lpeBox')) hdr.insertAdjacentHTML('afterend', '<div id="lpeBox" class="card mb16"><div class="card-b"></div></div>');
    var lb = $('#lpeBox .card-b'); if (lb) lb.innerHTML = '<b>ตะกร้าปัจจุบันของคุณจะได้ ' + total + ' พอยท์</b>' + R.lines.map(function (l) { var m = mf(l.p), v = pv(l.p); return '<div class="row between small" style="padding:4px 0"><span>' + E(l.p.name) + ' × ' + l.qty + '</span><span>' + (v ? l.qty + ' × ' + v + ' × ' + m.f + ' = <b>' + Math.floor(l.qty * v * m.f) + '</b>' : 'ไม่ได้พอยท์') + '</span></div>'; }).join('') + '<div class="small muted mt8">เพิ่มสินค้า/ชำระที่ <a href="../promotion/09-customer-cart.html">ตะกร้า</a> · พอยท์เข้าทันทีหลังชำระ</div>';
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { if (KEY !== 'points/06-customer-earn-preview.html') return; var b = e.target.closest('.pd .qty button, .qty button'); if (b && !e.target.closest('.product-card')) { var t = b.textContent.trim(); P6qty = Math.max(1, P6qty + (t === '+' ? 1 : t === '−' ? -1 : 0)); rerender(); } });

  /* ================= campaign/08 สินค้าแคมเปญ: โควตา + พักโควตา ================= */
  var C8qty = 25, holdT = null, holdEnd = 0;
  H['campaign/08-customer-quota-product.html'] = function () {
    var cfg = PMP.cfg(), q = cfg.quota[0], c = cs(); if (!q) return; var p = PMP.product(q.sku), left = q.quotaTotal - q.used, mine = q.perCust - (c.quotaUse[q.id] || 0), st = PMP.status({ active: q.active, start: q.start, end: q.end, quotaTotal: q.quotaTotal, used: q.used }, cfg.now);
    var pd = $('.pd'); $('h4', pd).textContent = p.name; $('.small.muted', pd).textContent = p.brand + ' · ' + p.cat;
    $('.bigprice', pd).innerHTML = B(q.special) + ' <s>' + B(p.price) + '</s> <span class="chip soft-primary" style="vertical-align:middle">ลด ' + Math.round((1 - q.special / p.price) * 100) + '%</span>';
    var sm = $('.bigprice', pd).nextElementSibling; if (sm) sm.textContent = 'ราคาแคมเปญถึง ' + dm(q.end) + ' · ' + (st === 'running' ? 'กำลังดำเนินการ' : PMP.statusLabel[st]);
    var qb = $('.quota-box', pd); $('.chip.warning', qb).textContent = left < q.quotaTotal * .3 ? 'เหลือน้อย' : st === 'running' ? 'ปกติ' : PMP.statusLabel[st]; $('.meter i', qb).style.width = Math.max(0, left / q.quotaTotal * 100) + '%'; $('.row.between b', qb).textContent = 'เหลือ ' + left.toLocaleString() + ' / ' + q.quotaTotal.toLocaleString() + ' ชิ้น'; var mb = $('.relative b', qb); if (mb) { mb.textContent = 'ร้านคุณซื้อได้อีก ' + mine + ' ' + p.unit; mb.nextElementSibling.textContent = '· สิทธิ์ต่อร้าน ' + q.perCust + ' ซื้อไปแล้ว ' + (c.quotaUse[q.id] || 0); }
    var maxQ = Math.max(0, Math.min(left, mine)), over = C8qty > maxQ; $('.qty span', pd).textContent = C8qty; var add = $('.qty-err .btn.contained', pd); add.disabled = over || st !== 'running' || maxQ < 1; add.setAttribute('data-lc8add', 1); var er = $('.qty-err .err', pd); er.style.display = over ? '' : 'none'; er.innerHTML = '<b>เกินสิทธิ์ร้านคุณ</b> — ซื้อราคาแคมเปญได้อีกไม่เกิน ' + maxQ + ' ' + p.unit + ' <button class="btn text sm" data-lc8fit="' + maxQ + '">ปรับเป็น ' + maxQ + '</button>';
    var hold = $('.hold'); if (hold) { var secs = Math.max(0, Math.round((holdEnd - Date.now()) / 1000)); $('.clock', hold).textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'); $('.meter i', hold).style.width = (secs / 900 * 100) + '%'; }
    relabelCustomer();
  };
  document.addEventListener('click', function (e) {
    if (KEY !== 'campaign/08-customer-quota-product.html') return; var b = e.target.closest('.pd .qty button'); if (b) { var t = b.textContent.trim(); C8qty = Math.max(1, C8qty + (t === '+' ? 1 : t === '−' ? -1 : 0)); rerender(); return; }
    var f = e.target.closest('[data-lc8fit]'); if (f) { C8qty = +f.getAttribute('data-lc8fit') || 1; rerender(); return; }
    if (e.target.closest('[data-lc8add]')) { var q = PMP.cfg().quota[0], c = U.rd('pmpc.sim.cart', {}); c[q.sku] = (c[q.sku] || 0) + C8qty; U.wr('pmpc.sim.cart', c); holdEnd = Date.now() + 900000; clearInterval(holdT); holdT = setInterval(function () { if (Date.now() > holdEnd) { clearInterval(holdT); } rerender(); }, 1000); toast('ใส่ตะกร้าแล้ว — พักโควตา 15 นาที ไปชำระที่ตะกร้า'); rerender(); }
  });

  /* ================= raffle/08 จับตามรอบ (โหมด B) ================= */
  H['raffle/08-customer-scheduled.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), f = cfg.raffles[0], c = cs(), cid = custId(); if (!f) return;
    var pool = st.shared.rafflePool[f.id] || {}, mine = pool[cid] || 0, tot = Object.keys(pool).reduce(function (a, k) { return a + pool[k]; }, 0) + f.poolOthers;
    $('.hero h5').textContent = f.name; var cards = $$('.grid.g2 > .card'); var c1 = cards[0], c2 = cards[1];
    $('.chip.soft-info', c1).textContent = 'เข้ากองแล้ว ' + mine + ' ใบ'; var cb = $('.card-b', c1);
    cb.innerHTML = '<div class="stack s8">' + (mine ? '<div class="row between"><span class="mono">TK-' + f.id.toUpperCase() + '-B × ' + mine + '</span><span class="small muted">ลงกองโหมด B</span></div>' : '<div class="muted small">ยังไม่มีสิทธิ์ในกองนี้ — คุณมี ' + (c.tickets[f.id] || 0) + ' สิทธิ์พร้อมใช้</div>') + '</div><div class="row mt8" style="gap:8px"><button class="btn contained sm" data-lpool2="' + f.id + '"' + ((c.tickets[f.id] || 0) < 1 ? ' disabled' : '') + '>ลง 1 สิทธิ์เข้ากอง</button></div><hr class="divider"><div class="row between"><span>โอกาสโดยประมาณที่จะถูกอย่างน้อย 1 รางวัล</span><b>≈ ' + (Math.min(100, mine * f.prizes.length / tot * 100)).toFixed(1) + '%</b></div><div class="small muted mt8">คำนวณจาก ' + mine + ' ใบ ในกอง ' + tot.toLocaleString() + ' ใบ — สิทธิ์ที่เข้ากองแล้วถอนคืนหรือโอนไม่ได้</div>';
    var wn = $$('.winners-n', c2); if (wn[0]) wn[0].textContent = tot.toLocaleString() + ' ใบ'; if (wn[1]) wn[1].textContent = (Object.keys(pool).length + Math.round(f.poolOthers / 8)) + ' ร้าน'; var hs = $('.hash', c2); if (hs) hs.textContent = PMP.fnv(tot + ':' + f.id) + PMP.fnv('a' + tot) + PMP.fnv('b' + tot) + PMP.fnv('c' + tot) + PMP.fnv('d' + tot) + PMP.fnv('e' + tot) + PMP.fnv('f' + tot) + PMP.fnv('g' + tot);
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-lpool2]'); if (b) { var r = PMP.enterPool(custId(), b.getAttribute('data-lpool2'), 1); toast(r.error || 'ลงกองแล้ว (ถอนคืนไม่ได้)', !!r.error); rerender(); } });

  /* ================= coupon/04 ตัวอย่างคูปองกระดาษ (หน้า-หลัง) ================= */
  var shown4 = { code: 'NOV80', val: '฿80', min: '฿600', name: 'บูทสัมมนาเภสัช พ.ย. 69', issued: '1,500' };
  H['coupon/04-admin-paper-preview.html'] = function () {
    var cfg = PMP.cfg(), id = U.rd('pmpc.live.paper', null), pp = cfg.paper.filter(function (x) { return x.id === id; })[0] || cfg.paper[0]; if (!pp) return;
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), pp.id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null);
    var main = $('#screen'), html = main.innerHTML, next = { code: pp.code, val: B(pp.value), min: B(pp.min), name: pp.name.replace('คูปองกระดาษ ', ''), issued: pp.issued.toLocaleString() };
    function sw(a, b) { if (a !== b) html = html.split(a).join(b); }
    sw('>' + shown4.code + '<', '>' + next.code + '<'); sw('ชุด ' + shown4.code, 'ชุด ' + next.code); sw('>' + shown4.val + '<', '>' + next.val + '<'); sw('ครบ ' + shown4.min, 'ครบ ' + next.min); sw(shown4.name, next.name); sw(shown4.issued + ' ใบ', next.issued + ' ใบ'); sw('฿80/ใบ', B(pp.value) + '/ใบ');
    if (html !== main.innerHTML) { var pk = $('#livePick'), pkp = pk && pk.previousElementSibling; main.innerHTML = html; shown4 = next; var ah = $('.page-head'); if (ah && !$('#livePick')) pickBar2(ah, 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), pp.id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null); }
    var stores = pp.stores.mode === 'all' ? PMP.stores : PMP.stores.filter(function (s) { return pp.stores.ids.indexOf(s.id) > -1; });
    $$('.pb-cols ul').forEach(function (u, i) { if (i % 2 === 0) u.innerHTML = stores.map(function (s) { return '<li>' + E(s.name) + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : ''); });
    var chip = $('.page-head h4 .chip'); if (chip) { chip.className = 'chip ' + (pp.active ? 'success' : 'warning'); chip.textContent = pp.active ? 'ใช้งาน' : 'ร่าง/ปิด'; }
  };

  /* ===== foundation/04 กลุ่มสินค้า (รายการ + แก้กติกา รวม/ยกเว้น) ===== */
  var PSsel = null;
  H['foundation/04-admin-product-sets.html'] = function () {
    var cfg = PMP.cfg(), id = PSsel || cfg.psets[0].id, p = cfg.psets.filter(function (x) { return x.id === id; })[0] || cfg.psets[0]; id = p.id;
    function count(x) { return PMP.products.filter(function (pr) { return PMP.inScope(cfg, { mode: 'pset', ref: x.id }, pr); }).length; }
    function usage(x) { var a = cfg.promos.filter(function (y) { return y.scope.mode === 'pset' && y.scope.ref === x.id; }).length, k = cfg.coupons.filter(function (y) { return (y.except || []).indexOf(x.id) > -1 || (y.scope.mode === 'pset' && y.scope.ref === x.id); }).length, m = cfg.points.mults.filter(function (y) { return y.scope.mode === 'pset' && y.scope.ref === x.id; }).length, f = cfg.flash.filter(function (y) { return y.rules.some(function (r) { return r.ps === x.id; }); }).length; return 'โปรโมชั่น ' + a + ' · คูปอง ' + k + ' · ตัวคูณพอยท์ ' + m + ' · Flash ' + f; }
    $('table.table tbody').innerHTML = cfg.psets.map(function (x) { return '<tr class="' + (x.id === id ? 'sel' : '') + '" data-lps="' + x.id + '" style="cursor:pointer"><td><div class="nm">' + E(x.name) + '</div></td><td>แบรนด์ ' + x.brands.length + ' · หมวด ' + x.cats.length + ' · SKU ' + x.skus.length + (x.exclude.length ? ' · ยกเว้น SKU ' + x.exclude.length : '') + '</td><td><b>' + count(x) + '</b></td><td>' + usage(x) + '</td></tr>'; }).join('');
    var card = $$('.card')[1].querySelector('.card-b'), brands = PMP.products.map(function (x) { return x.brand; }).filter(function (v, i, a) { return a.indexOf(v) === i; }), cats = PMP.products.map(function (x) { return x.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    function rl(kind, type, val, idx) { var opts = type === 'brand' ? brands : type === 'cat' ? cats : PMP.products.map(function (x) { return x.sku; }); return '<div class="rl"><span class="chip ' + (kind === 'inc' ? 'soft-success' : 'soft-error') + '">' + (kind === 'inc' ? 'รวม' : 'ยกเว้น') + '</span><select class="select" data-lpst="' + kind + '|' + idx + '"><option value="brand"' + (type === 'brand' ? ' selected' : '') + '>แบรนด์</option><option value="cat"' + (type === 'cat' ? ' selected' : '') + '>หมวด</option><option value="sku"' + (type === 'sku' ? ' selected' : '') + '>SKU</option></select><select class="select" data-lpsv="' + kind + '|' + idx + '">' + opts.map(function (o) { var lbl = type === 'sku' ? o + ' · ' + PMP.product(o).name : o; return '<option value="' + E(o) + '"' + (o === val ? ' selected' : '') + '>' + E(lbl) + '</option>'; }).join('') + '</select><button class="btn text sm grey" data-lpsd="' + kind + '|' + idx + '">✕</button></div>'; }
    var rules = []; p.brands.forEach(function (v, i) { rules.push(['inc', 'brand', v, i, 'brands']); }); p.cats.forEach(function (v, i) { rules.push(['inc', 'cat', v, i, 'cats']); }); p.skus.forEach(function (v, i) { rules.push(['inc', 'sku', v, i, 'skus']); }); p.exclude.forEach(function (v, i) { rules.push(['exc', 'sku', v, i, 'exclude']); });
    var ex = PMP.products.filter(function (pr) { return PMP.inScope(cfg, { mode: 'pset', ref: p.id }, pr); });
    card.innerHTML = '<h6>' + E(p.name) + '</h6><div class="field mt8"><label>ชื่อกลุ่ม *</label><input class="input" id="lpsName" value="' + E(p.name) + '"></div><div class="mt8"><b class="small">กติกา</b>' + rules.map(function (r) { return '<div class="rl" data-r="' + r[4] + '|' + r[3] + '"><span class="chip ' + (r[0] === 'inc' ? 'soft-success' : 'soft-error') + '">' + (r[0] === 'inc' ? 'รวม' : 'ยกเว้น') + '</span><span class="small">' + { brand: 'แบรนด์', cat: 'หมวด', sku: 'SKU' }[r[1]] + ': <b>' + E(r[1] === 'sku' ? r[2] + ' · ' + PMP.product(r[2]).name : r[2]) + '</b></span><span style="flex:1"></span><button class="btn text sm grey" data-lpsdel="' + r[4] + '|' + r[3] + '">✕</button></div>'; }).join('') + '<div class="row mt8" style="gap:6px;flex-wrap:wrap"><select class="select" id="lpsT" style="max-width:110px"><option value="brand">แบรนด์</option><option value="cat">หมวด</option><option value="sku">SKU</option></select><select class="select" id="lpsV" style="max-width:240px"></select><select class="select" id="lpsK" style="max-width:110px"><option value="inc">รวม</option><option value="exc">ยกเว้น</option></select><button class="btn outlined sm" id="lpsAdd">＋ เพิ่มกติกา</button></div></div><div class="alert info mt8"><div class="small"><b>สินค้าที่เข้ากลุ่ม (' + ex.length + ')</b><br>' + E(ex.map(function (x) { return x.name; }).join(' · ') || '—') + '</div></div><div class="row mt8" style="justify-content:flex-end"><button class="btn outlined" id="lpsDelSet">ลบกลุ่มนี้</button></div>';
    function fillV() { var t = $('#lpsT').value, o = t === 'brand' ? brands : t === 'cat' ? cats : PMP.products.map(function (x) { return x.sku; }); $('#lpsV').innerHTML = o.map(function (v) { return '<option value="' + E(v) + '">' + E(t === 'sku' ? v + ' · ' + PMP.product(v).name : v) + '</option>'; }).join(''); }
    fillV(); $('#lpsT').onchange = fillV;
    var root = $('#screen'); if (!root._lps) { root._lps = 1;
      root.addEventListener('click', function (e) {
        var tr = e.target.closest('[data-lps]'); if (tr) { PSsel = tr.getAttribute('data-lps'); rerender(); return; }
        var d = e.target.closest('[data-lpsdel]'); if (d) { var a = d.getAttribute('data-lpsdel').split('|'); editRec('psets', PSsel || PMP.cfg().psets[0].id, function (r) { r[a[0]].splice(+a[1], 1); }); rerender(); return; }
        if (e.target.id === 'lpsAdd') { var t = $('#lpsT').value, v = $('#lpsV').value, k = $('#lpsK').value; editRec('psets', PSsel || PMP.cfg().psets[0].id, function (r) { if (k === 'exc') { if (r.exclude.indexOf(v) < 0 && t === 'sku') r.exclude.push(v); else if (t !== 'sku') { PMP.products.forEach(function (pr) { if ((t === 'brand' ? pr.brand : pr.cat) === v && r.exclude.indexOf(pr.sku) < 0) r.exclude.push(pr.sku); }); } } else { var key = t === 'brand' ? 'brands' : t === 'cat' ? 'cats' : 'skus'; if (r[key].indexOf(v) < 0) r[key].push(v); } }); rerender(); toast('เพิ่มกติกาแล้ว'); return; }
        var nb = e.target.closest('.page-head .btn.contained'); if (nb) { var nid = U.uid('ps'); setCfg(function (c) { c.psets.push({ id: nid, name: 'กลุ่มสินค้าใหม่', brands: [], cats: [], skus: [], exclude: [] }); }); PSsel = nid; rerender(); return; }
        if (e.target.id === 'lpsDelSet') { if (!confirm('ลบกลุ่มสินค้านี้?')) return; var del = PSsel || PMP.cfg().psets[0].id; setCfg(function (c) { c.psets = c.psets.filter(function (x) { return x.id !== del; }); if (!c.psets.length) c.psets.push({ id: 'ps1', name: 'กลุ่มสินค้า', brands: [], cats: [], skus: [], exclude: [] }); }); PSsel = null; rerender(); }
      });
      root.addEventListener('input', function (e) { if (e.target.id === 'lpsName') { editRec('psets', PSsel || PMP.cfg().psets[0].id, function (r) { r.name = e.target.value; }); flashSaved(); } });
      root.addEventListener('change', function (e) { if (e.target.id === 'lpsName') rerender(); });
    }
  };

  /* ===== coupon/01 ภาพรวมคูปอง ===== */
  H['coupon/01-admin-hub.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now, pcs = st.paperClaims || [];
    var paperActive = cfg.paper.filter(function (p) { return p.active; }).length, waiting = pcs.filter(function (c) { return c.status === 'รอตรวจนับ' || c.status === 'ตรวจนับแล้ว'; }), stubVal = waiting.reduce(function (a, c) { return a + c.amount; }, 0);
    var code = cfg.coupons.filter(function (k) { return k.kind === 'code'; }), col = cfg.coupons.filter(function (k) { return k.kind === 'collect'; }), mon = cfg.coupons.filter(function (k) { return k.kind === 'monthly'; });
    function run(a) { return a.filter(function (k) { return PMP.status(k, now) === 'running'; }).length; }
    var cards = $$('.card .tile, .card-b.tile'); var big = $$('.big');
    var P = cards[0]; if (P) { var bs = $$('.big', P); if (bs[0]) bs[0].textContent = paperActive; if (bs[1]) bs[1].textContent = cfg.paper.length - paperActive; var chips = $$('.chip', P); if (chips[0]) chips[0].textContent = 'รอเบิกเงิน ' + waiting.length + ' รายการ'; if (chips[1]) chips[1].textContent = 'ก้นรอตรวจ ' + B(stubVal); }
    var soft = $$('.soft'); function setSoft(i, a, b2, c, d) { var s = soft[i]; if (!s) return; var v = $$('.big', s); if (v[0]) v[0].textContent = a; if (v[1]) v[1].textContent = b2; }
    setSoft(0, run(code), code.reduce(function (x, k) { return x + k.used; }, 0)); setSoft(1, run(col), col.reduce(function (x, k) { return x + k.used; }, 0)); setSoft(2, run(mon), st.customers ? Object.keys(st.customers).reduce(function (x, k) { return x + st.customers[k].wallet.filter(function (w) { return mon.some(function (m) { return m.id === w.couponId; }); }).length; }, 0) : 0);
    var todo = $$('.todo b'); if (todo[0]) todo[0].textContent = 'ก้นคูปองรอตรวจนับ ' + waiting.length + ' รายการ';
    var top = code.sort(function (a, b) { return (b.quotaTotal ? b.used / b.quotaTotal : 0) - (a.quotaTotal ? a.used / a.quotaTotal : 0); })[0]; if (top && todo[2]) todo[2].textContent = 'โควตาใกล้หมด: ' + top.code + ' ใช้แล้ว ' + top.used + ' / ' + (top.quotaTotal || '∞');
  };

  /* ---------- boot ---------- */
  function boot() {
    var f = H[KEY]; if (!f) return;
    ctl(); document.body.setAttribute('data-hydrated', '1'); f();
    var lp = $('.live-panel'); if (lp) lp.parentNode.removeChild(lp);
  }
  window.PMP_LIVE = { H: H, E: E, $: $, $$: $$, dm: dm, dmy: dmy, cust: cust, cs: cs, custId: custId, toast: toast, rerender: rerender, tk: tk, prog: prog, empty: empty, relabel: relabelCustomer, lots: lots, ladderSum: ladderSum, ST: ST };
  window.PMP_LIVE.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 60); }); else setTimeout(boot, 60);
})();
