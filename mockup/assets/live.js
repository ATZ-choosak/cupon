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
  function simCtl() {
    if ($('#liveCtl')) return;
    var cfg = PMP.cfg(), d = document.createElement('div'); d.id = 'liveCtl'; d.className = 'live-ctl';
    d.innerHTML = '<b>จำลอง</b><select class="select" id="lcCust">' + PMP.customers.map(function (c) { return '<option value="' + c.id + '"' + (c.id === custId() ? ' selected' : '') + '>' + c.name + ' (' + c.type + ')</option>'; }).join('') + '</select><input class="input" id="lcNow" type="date" value="' + cfg.now + '"><button class="btn text sm grey" id="lcReset" type="button" title="รีเซ็ตข้อมูลจำลองทั้งหมด">รีเซ็ต</button>' + (PMP.cfg().raffles.some(function (f) { return f.mode === 'B'; }) ? '<button class="btn outlined sm" id="lcAnn" type="button" title="เดโม: จับรางวัลโหมด B ให้ลูกค้าที่เลือกอยู่ถูกรางวัลแรก แล้วเด้งหน้าต่างลุ้นผล">ประกาศผล (ถูก)</button><button class="btn text sm grey" id="lcRv" type="button" title="เดโม: ให้ลูกค้าที่เลือกอยู่เปิดผลโหมด B ซ้ำได้">ลุ้นผลอีกครั้ง</button>' : '');
    document.body.appendChild(d);
    var ann = $('#lcAnn'); if (ann) ann.onclick = function () {
      var fs = PMP.cfg().raffles.filter(function (f) { return f.mode === 'B'; }), cid = custId(), st = PMP.state(), f = fs.filter(function (x) { return !(st.shared.drawResult || {})[x.id]; })[0];
      if (!f) { alert('จับรางวัลโหมด B ครบแล้ว — กด “รีเซ็ต” เพื่อเริ่มใหม่ หรือ “ลุ้นผลอีกครั้ง” เพื่อเปิดผลซ้ำ'); return; }
      var pool = st.shared.rafflePool[f.id] || (st.shared.rafflePool[f.id] = {}); if (!pool[cid]) pool[cid] = 1; PMP.saveState(st);
      var r = PMP.drawB(f.id, cid, 'DEMO-123456'); if (r.error) { alert(r.error); return; } PMP.resetReveal(cid, f.id); location.reload();
    };
    var rv = $('#lcRv'); if (rv) rv.onclick = function () {
      var cid = custId(), st = PMP.state(), f = PMP.cfg().raffles.filter(function (x) { return x.mode === 'B' && (st.shared.drawResult || {})[x.id] && ((st.shared.rafflePool[x.id] || {})[cid] || 0) > 0; })[0];
      if (!f) { alert('ลูกค้าคนนี้ยังไม่มีผลจับรางวัลโหมด B ให้ลุ้น — กด “ประกาศผล (ถูก)” ก่อน'); return; }
      PMP.resetReveal(cid, f.id); location.reload();
    };
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
    var cfg = PMP.cfg(), c = cs(), L = lots(c, cfg);
    $('.bal-pts .v').innerHTML = c.points.toLocaleString() + '<small>พอยท์</small>';
    var soon = L[0]; $('.bal-pts .small[style*="right"]').innerHTML = (soon ? soon.pts + ' พอยท์ หมดอายุ ' + dm(soon.exp) : 'ยังไม่มีพอยท์') + '<br><a href="04-customer-dashboard.html" style="color:#fff;text-decoration:underline">ดูประวัติ</a>';
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
    $('.dialog-h', host).firstChild.textContent = 'ขอรับสิทธิ์ · ขั้น ' + idx + ' ' + tier.name; var nof = !fields.length; if (nof) { var fb = $('.dialog-b .alert', host); }
    var sb = $('.sum-box', host); sb.innerHTML = '<div><span class="small muted">ยอดเกณฑ์ขั้น ' + idx + '</span><b>' + B(tier.at) + ' <span style="color:var(--success-dark)">✓</span></b></div><div><span class="small muted">ยอดสะสมของคุณ</span><b>' + B(S.lv.spent) + '</b></div><div><span class="small muted">สิทธิ์คงเหลือ</span><b style="color:var(--warning-dark)">' + (tier.cap ? left + ' / ' + tier.cap : 'ไม่จำกัด') + '</b></div>';
    var er = $('.dialog-b .alert.error', host); if (er) er.style.display = 'none';
    var wrap = $('.dialog-b > .relative', host);
    wrap.innerHTML = fields.map(function (f, i) { return '<div class="field"><label>' + E(f.label) + (f.req ? ' <span style="color:var(--error-dark)">*</span>' : '') + '</label><input class="input" data-lans="' + i + '"></div>'; }).join('') || '<div class="muted small">ขั้นนี้ไม่มีฟอร์มขอข้อมูล</div>';
    var cb = $('.dialog-b label.check input', host), btn = $('.dialog-f .btn.contained', host); btn.disabled = true; if (nof) btn.textContent = 'รับรางวัลเลย'; btn.setAttribute('data-lclaim', L.id + '|' + tier.id);
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

  /* ===== raffle/07 ลุ้นทันที (โหมด A) — ภาพเปิดผล 3 แบบ admin เลือกต่อกิจกรรม: วงล้อ / กล่องของขวัญ / บัตรขูด (ผลตัดสินที่ระบบก่อนเสมอ) ===== */
  var spinning = false, STY = { wheel: ['วงล้อ', '🎡', 'วงล้อหมุนแล้วค่อย ๆ หยุดที่ช่องรางวัล'], box: ['กล่องของขวัญ', '🎁', 'กล่องสั่น แล้วเปิดกล่องเผยรางวัล'], scratch: ['บัตรขูด', '🎟️', 'ลูกค้าใช้นิ้ว/เมาส์ขูดเปิดผลเอง'] };
  function rfStyle(f) { return STY[f.style] ? f.style : 'wheel'; }
  function rfMs(f, normal, fast) { return f.speed === 'fast' ? fast : normal; }
  function zShort(z) { return z.name.replace('คูปองลด ', '฿').slice(0, 12); }
  function buildArt(f) {
    var art = $('#rfArt'), sty = rfStyle(f), h = '';
    if (sty === 'wheel') {
      h = '<div class="wheel-wrap"><div class="pointer"></div><div class="wheel">';
      for (var i = 0; i < 8; i++) h += '<div class="lb' + (i % 2 ? ' dk' : '') + '" style="transform:rotate(' + (22.5 + 45 * i) + 'deg)"><span>' + E(zShort(f.prizes[i % f.prizes.length])) + '</span></div>';
      h += '<div class="hub">หมุน</div></div></div>';
    } else if (sty === 'box') {
      h = '<div class="gift-grid">'; for (var j = 0; j < 6; j++) h += '<div class="gift" data-gi="' + j + '"><span class="g-ic">🎁</span><div class="g-pz"><b>🎉</b><span></span></div></div>'; h += '</div><div class="scr-hint"><b>แตะกล่องที่ชอบเพื่อเปิด</b> (ใช้ 1 สิทธิ์) — หรือกดปุ่มด้านล่างให้ระบบสุ่มกล่องให้</div>';
    } else {
      h = '<div class="scr-card" id="scrCard"><div class="scr-prize"><small>รางวัลของคุณคือ</small><b>?</b></div><canvas width="340" height="170"></canvas></div><div class="scr-hint" id="scrHint">กด “ซื้อบัตรขูด” แล้วใช้นิ้วหรือเมาส์ขูดเปิดผล</div>';
    }
    art.innerHTML = h; art.setAttribute('data-key', f.id + ':' + sty); art._busy = 0;
    if (sty === 'scratch') paintFoil($('canvas', art));
  }
  function paintFoil(cv) {
    var g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, cv.width, cv.height); gr.addColorStop(0, '#9E9E9E'); gr.addColorStop(.5, '#E0E0E0'); gr.addColorStop(1, '#BDBDBD');
    g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '800 22px "Noto Sans Thai",sans-serif'; g.textAlign = 'center'; g.fillText('ขูดตรงนี้', cv.width / 2, cv.height / 2 + 8);
    for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(Math.random() * cv.width, Math.random() * cv.height, 2, 2); }
  }
  function armScratch(art, onClear) {
    var cv = $('canvas', art), card = $('#scrCard'), g = cv.getContext('2d'), down = false, n = 0; card.classList.add('armed'); art._armed = 1;
    function pos(ev) { var r = cv.getBoundingClientRect(), t = ev.touches ? ev.touches[0] : ev; return { x: (t.clientX - r.left) * cv.width / r.width, y: (t.clientY - r.top) * cv.height / r.height }; }
    function check() { var d = g.getImageData(0, 0, cv.width, cv.height).data, c = 0, tot = 0; for (var i = 3; i < d.length; i += 64) { tot++; if (d[i] < 128) c++; } return c / tot; }
    function dot(ev) { if (!art._armed) return; var p = pos(ev); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(p.x, p.y, 24, 0, 7); g.fill(); if (++n % 4 === 0 && check() > .45) onClear(); }
    cv.onmousedown = function (e) { down = true; dot(e); }; cv.onmousemove = function (e) { if (down) dot(e); }; cv.onmouseup = cv.onmouseleave = function () { down = false; };
    cv.ontouchstart = function (e) { e.preventDefault(); dot(e); }; cv.ontouchmove = function (e) { e.preventDefault(); dot(e); };
  }
  function showResult(r, f) {
    spinning = false; var bd = $('.backdrop.relative'); bd._shown = 1; bd.style.display = '';
    $('.dialog-h', bd).firstChild.textContent = r.prize.name === f.prizes[0].name ? 'ขอบคุณที่ร่วมลุ้น' : 'ยินดีด้วย!';
    $('.res-win', bd).innerHTML = '<div class="center" style="padding:6px 0 14px"><div class="small muted">ผลการลุ้น</div><div style="font-size:22px;font-weight:800;margin:4px 0">' + E(r.prize.name) + '</div><div class="small muted">โอกาสถูก ' + r.odds + '%</div><div class="soft mt8" style="text-align:left"><b>ได้รับเข้าบัญชีแล้ว</b><ul class="st-log" style="margin:6px 0 0;padding-left:18px">' + r.out.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul></div></div><div class="small muted center">เหลือสิทธิ์ ' + (cs().tickets[f.id] || 0) + ' ใบ</div>';
    var cont = $$('.dialog-f .btn.contained', bd)[0]; cont.textContent = 'ลุ้นต่อ (' + (cs().tickets[f.id] || 0) + ' ใบ)'; cont.setAttribute('data-lcont', 1);
    $('#rfArt')._busy = 0; rerender();
  }
  H['raffle/07-customer-instant-draw.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), f = rfCur('A', 'raffleA'), st = PMP.state(); if (!f) { $('.stage').innerHTML = '<div class="muted center" style="padding:30px">ตอนนี้ยังไม่มีกิจกรรมลุ้นทันที</div>'; return; }
    var as = cfg.raffles.filter(function (x) { return x.mode === 'A'; }); if (as.length > 1) pickBar2($('.page-head') || $('h4').parentNode, 'livePick', as.map(function (x) { return { id: x.id, label: x.name }; }), f.id, function (v) { U.wr(selKey('raffleA'), v); history.replaceState(null, '', location.pathname); rerender(); }, null);
    var n = c.tickets[f.id] || 0, sty = rfStyle(f), stage = $('.stage');
    $('.tk-chip').lastChild.textContent = 'สิทธิ์ของฉัน ' + n + ' ใบ';
    var seg = $('.seg', stage); if (seg) seg.outerHTML = '<div class="sty-chip" id="rfSty"></div>';
    var ww = $('.wheel-wrap', stage); if (ww) ww.outerHTML = '<div id="rfArt" style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%"></div>';
    $('#rfSty').textContent = STY[sty][1] + ' รูปแบบ: ' + STY[sty][0];
    var art = $('#rfArt'); if (!art._busy && art.getAttribute('data-key') !== f.id + ':' + sty) buildArt(f);
    var go = $('.stage > .btn.contained.lg'); go.setAttribute('data-ldraw', f.id); go.removeAttribute('data-lskip'); go.disabled = n < 1 || spinning; go.textContent = n < 1 ? 'ไม่มีสิทธิ์ลุ้น — ซื้อสินค้าเพื่อรับสิทธิ์' : sty === 'scratch' ? 'ใช้ 1 สิทธิ์ ซื้อบัตรขูด' : sty === 'box' ? 'สุ่มกล่องให้ (ใช้ 1 สิทธิ์)' : 'ใช้ 1 สิทธิ์ ลุ้นเลย';
    if (art._busy) { go.disabled = false; }
    $('.stage > .small.muted').textContent = n ? 'เหลือ ' + n + ' ใบ → หลังกด เหลือ ' + (n - 1) + ' ใบ' : 'สิทธิ์หมด';
    var tw = f.prizes.reduce(function (a, z) { return a + z.weight; }, 0);
    var card = $$('.odds-row').filter(function (r) { return !r.classList.contains('small'); }); card.forEach(function (r) { r.parentNode.removeChild(r); });
    var hd = $('.odds-row.small'); hd.insertAdjacentHTML('afterend', f.prizes.map(function (z) { var left = z.stock - (st.shared.prizeUsed[z.id] || 0); return '<div class="odds-row"><span><b>' + E(z.name) + '</b></span><span class="o">' + (z.weight / tw * 100).toFixed(1) + '%</span><span class="muted" style="text-align:right">' + left + '</span></div>'; }).join(''));
    var bd = $('.backdrop.relative'); if (bd && !bd._shown) bd.style.display = 'none';
  };
  document.addEventListener('click', function (e) {
    var sk = e.target.closest && e.target.closest('[data-lskip]');
    if (sk) { var a0 = $('#rfArt'); if (a0 && a0._reveal) a0._reveal(); return; }
    var gp = e.target.closest && e.target.closest('[data-gi]'), b = gp ? $('.stage > .btn.contained.lg') : e.target.closest && e.target.closest('[data-ldraw]'); if (!b || spinning || !b.getAttribute('data-ldraw')) return;
    var gpick = gp ? +gp.getAttribute('data-gi') : -1;
    var fid = b.getAttribute('data-ldraw'), f = PMP.raffle(fid), sty = rfStyle(f), art = $('#rfArt'), bd0 = $('.backdrop.relative'); if (bd0) bd0.style.display = 'none';
    var r = PMP.drawA(custId(), fid); if (r.error) { toast(r.error, true); return; }
    spinning = true; art._busy = 1; b.disabled = true; var idx = 0; for (var i = 0; i < 8; i++) { if (f.prizes[i % f.prizes.length].id === r.prize.id) { idx = i; break; } }
    function done() { showResult(r, f); }
    if (sty === 'wheel') {
      var wheel = $('.wheel', art), ms = rfMs(f, 3200, 1600);
      wheel.style.transition = 'none'; wheel.style.transform = 'rotate(0deg)'; void wheel.offsetWidth;
      wheel.style.transition = 'transform ' + ms / 1000 + 's cubic-bezier(.17,.67,.2,1)'; wheel.style.transform = 'rotate(' + (1440 - (22.5 + 45 * idx)) + 'deg)';
      setTimeout(function () { wheel.style.transition = 'none'; wheel.style.transform = 'rotate(' + (-(22.5 + 45 * idx)) + 'deg)'; done(); }, ms + 100);
    } else if (sty === 'box') {
      buildArt(f); art._busy = 1; var gs = $$('.gift', art), pick = gpick >= 0 ? gpick : Math.floor(Math.random() * gs.length), win = r.prize.name !== f.prizes[0].name;
      gs.forEach(function (x) { x.classList.add('shake'); });
      setTimeout(function () {
        gs.forEach(function (x, i) { x.classList.remove('shake'); if (i !== pick) x.classList.add('dim'); });
        var g = gs[pick]; $('.g-pz b', g).textContent = win ? '🎉' : '🍀'; $('.g-pz span', g).textContent = zShort(r.prize); g.classList.add('open');
        setTimeout(done, 1500);
      }, rfMs(f, 1100, 600));
    } else {
      buildArt(f); art._busy = 1; var win2 = r.prize.name !== f.prizes[0].name;
      $('.scr-prize', art).innerHTML = '<small>' + (win2 ? 'ยินดีด้วย! คุณได้' : 'ครั้งนี้ได้') + '</small><b>' + E(r.prize.name) + '</b>';
      var finished = 0; function reveal() { if (finished) return; finished = 1; art._armed = 0; $('#scrCard').classList.add('revealed'); $('#scrHint').textContent = ''; setTimeout(done, 900); }
      art._reveal = reveal; armScratch(art, reveal); $('#scrHint').textContent = 'ขูดให้เกิน 45% เพื่อเปิดผล — หรือกด “เปิดทั้งหมด” ด้านล่าง';
      b.disabled = false; b.removeAttribute('data-ldraw'); b.setAttribute('data-lskip', 1); b.textContent = 'เปิดทั้งหมด (ข้ามการขูด)';
    }
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
      var pp = cfg.paper.filter(function (x) { return x.id === c.ppId; })[0], su = PMP.partners().filter(function (x) { return x.id === c.storeId; })[0], fl = c.flags.map(function (f) { return '<div style="margin-top:4px"><span class="chip soft-error">' + E(f) + '</span></div>'; }).join('');
      var act = c.status === 'รอตรวจนับ' ? '<input class="input" data-lpcn="' + c.id + '" type="number" placeholder="นับได้" style="width:80px;min-height:30px"> <a href="#" data-lpcact="count|' + c.id + '">บันทึกนับ</a> · <a href="#" data-lpcact="reject|' + c.id + '" style="color:var(--error-dark)">ปฏิเสธ</a>' : c.status === 'ตรวจนับแล้ว' ? '<a href="#" data-lpcact="pay|' + c.id + '">บันทึกจ่ายเงิน</a>' : '—';
      return '<tr><td><b class="mono">C-' + String(131 + pcs.length - i).padStart(4, '0') + '</b></td><td><b>' + E(su.name) + '</b></td><td class="mono">' + E(pp.code) + '</td><td class="num">' + c.stubs + '</td><td class="num">' + (c.counted != null ? c.counted : '—') + '</td><td class="num">' + B(pp.value) + '</td><td class="num"><b>' + B(c.amount) + (c.counted == null ? '*' : '') + '</b></td><td><span class="chip ' + ({ 'รอตรวจนับ': 'warning', 'ตรวจนับแล้ว': 'info', 'จ่ายแล้ว': 'success', 'ปฏิเสธ': 'error' }[c.status]) + '">' + c.status + '</span>' + fl + '</td><td class="nowrap">' + dmy(c.d) + '</td><td class="nowrap">' + act + '</td></tr>';
    }).join('');
    var tb = $$('table.table tbody')[0]; tb.innerHTML = rows || '<tr><td colspan="10" class="center muted" style="padding:24px">ยังไม่มีคำขอเบิก — ร้านส่งก้นที่แท็บ “คูปองกระดาษ” ของหน้า <a href="../simulator/03-state.html#paper">สิทธิ์ & ผลลัพธ์</a></td></tr>';
    // per-store summary table
    var t2 = $$('table.table tbody')[1]; if (t2) t2.innerHTML = PMP.partners().map(function (su) { var tot = pcs.filter(function (c) { return c.storeId === su.id && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + c.stubs; }, 0), mx = Math.max.apply(null, cfg.paper.map(function (p) { return p.maxPerStore || 0; })); return '<tr><td>' + E(su.name) + '</td><td class="num">' + tot + '</td><td class="num">' + (mx || '—') + '</td><td style="width:140px"><div class="progress ' + (tot > mx ? '' : 'green') + '"><i style="width:' + Math.min(100, tot / mx * 100) + '%"></i></div></td><td><span class="chip ' + (mx && tot > mx ? 'soft-error' : 'soft-success') + '">' + (mx && tot > mx ? 'เกินใบสูงสุดต่อร้าน' : 'ปกติ') + '</span></td></tr>'; }).join('');
  };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-lpcact]'); if (!a) return; e.preventDefault(); var d = a.getAttribute('data-lpcact').split('|'), inp = $('[data-lpcn="' + d[1] + '"]'), r = PMP.paperAct(d[1], d[0], inp ? +inp.value : null); toast(r.error || 'บันทึกแล้ว', !!r.error); rerender(); });

  /* ---- campaign/01 รายการแคมเปญ ---- */
  H['campaign/01-admin-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now, rows = '';
    cfg.ladders.forEach(function (L) {
      var users = Object.keys(st.customers).map(function (k) { return st.customers[k].ladder[L.id]; }).filter(function (v) { return v && v.spent > 0; }), req = (st.claims || []).filter(function (c) { return c.lid === L.id && c.status === 'รอตรวจ'; }).length;
      var days = Math.max(0, Math.round((new Date(L.end) - new Date(now)) / 864e5));
      rows += '<tr><td><b>' + E(L.name) + '</b><div class="sub">' + L.tiers.length + ' ขั้นรางวัล · ' + users.length + ' ร้านที่มียอด</div></td><td><b>' + dmy(L.start) + ' – ' + dmy(L.end) + '</b><div class="sub">เหลือ ' + days + ' วัน</div></td><td>' + (L.scope.mode === 'all' ? 'ทุกสินค้า' : L.scope.mode === 'pset' ? 'กลุ่มสินค้าที่ตั้งไว้' : 'เลือกรายสินค้า') + '<div class="sub">กลุ่มเป้าหมาย: ' + E(L.aud) + '</div></td><td>' + statusChip(L, now) + '</td><td class="prog-cell"><b>' + users.length + ' ร้านเข้าร่วม</b><div class="mini-steps">' + L.tiers.map(function (t, i) { return '<span>ขั้น ' + (i + 1) + ' · ' + users.filter(function (v) { return v.unlocked.indexOf(t.id) > -1; }).length + '</span>'; }).join('') + '</div><div class="sub mt8">คำขอรอตรวจ ' + req + '</div></td><td><div class="acts"><a class="btn text sm" href="03-admin-ladder-editor.html">จัดการขั้น</a><a class="btn text sm" href="04-admin-claims.html">คิวคำขอ</a><a class="btn text sm" href="05-admin-progress.html">ความคืบหน้า</a></div></td></tr>';
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


  /* ---- foundation/01 กลุ่มลูกค้า ---- */
  H['foundation/01-admin-customer-sets.html'] = function () {
    var cfg = PMP.cfg();
    function usage(id) { var a = 'set:' + id, p = cfg.promos.filter(function (x) { return x.aud === a; }).length, k = cfg.coupons.filter(function (x) { return x.aud === a; }).length, c = cfg.ladders.filter(function (x) { return x.aud === a; }).length; return 'โปรโมชั่น ' + p + ' · คูปอง ' + k + ' · แคมเปญ ' + c; }
    tbody('table.table tbody', cfg.csets.map(function (c, i) { return '<tr><td><div class="nm">' + E(c.name) + '</div><div class="sub">' + E(c.note || '-') + '</div></td><td><b>' + (c.members.length + c.extra) + '</b> ราย</td><td>' + usage(c.id) + '</td><td>' + dm(cfg.now) + ' · staff1</td><td><a class="btn text sm" href="02-admin-customer-set-editor.html" data-lsel-cset="' + c.id + '">แก้ไข</a><button class="btn text sm grey" data-lcsdel="' + c.id + '">ลบกลุ่ม</button></td></tr>'; }).join(''), 5);
  };
  document.addEventListener('click', function (e) {
    var d = e.target.closest && e.target.closest('[data-lcsdel]'); if (d) { if (!confirm('ลบกลุ่มลูกค้านี้? (รายการที่ใช้กลุ่มนี้จะกลับเป็น “ทุกคน”)')) return; var cfg = PMP.cfg(), id = d.getAttribute('data-lcsdel'), a = 'set:' + id; cfg.csets = cfg.csets.filter(function (c) { return c.id !== id; }); [].concat(cfg.promos, cfg.coupons, cfg.ladders).forEach(function (x) { if (x.aud === a) x.aud = 'all'; }); PMP.saveCfg(cfg); rerender(); toast('ลบกลุ่มแล้ว'); return; }
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
    var stores = pp.stores.mode === 'all' ? PMP.partners() : PMP.partners().filter(function (s) { return pp.stores.ids.indexOf(s.id) > -1; });
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
    bindc(ctl(root, 'ชื่อโปรโมชั่น'), function () { return F().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
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
    pickBar2($('.page-head'), 'livePick', list.map(function (p) { return { id: p.id, label: p.code + ' · ' + p.name }; }), id, function (v) { U.wr('pmpc.live.paper', v); location.href = location.pathname; }, function () { var nid = U.uid('pp'); setCfg(function (c) { c.paper.push({ id: nid, code: 'NEW' + nid.slice(2, 5).toUpperCase(), name: 'คูปองกระดาษชุดใหม่', value: 50, min: 500, issued: 500, maxPerStore: 100, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, back: '' }); }); U.wr('pmpc.live.paper', nid); location.reload(); }, '＋ สร้างชุดใหม่');
    bindc(ctl(root, 'รหัสชุด'), function () { return P().code; }, function (v) { S(function (r) { r.code = String(v).toUpperCase(); }); }, 'text');
    bindc(ctl(root, 'ชื่อ/ที่มาของชุด'), function () { return P().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'จำนวนที่ออก'), function () { return P().issued; }, function (v) { S(function (r) { r.issued = v; }); }, 'num');
    bindc(ctl(root, 'มูลค่าส่วนลดต่อใบ'), function () { return P().value; }, function (v) { S(function (r) { r.value = v; }); }, 'num');
    bindc(ctl(root, 'ยอดซื้อขั้นต่ำ', 0), function () { return P().min; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    bindc(ctl(root, 'ร้านต้องส่งก้นเบิกภายใน'), function () { return P().payDays; }, function (v) { S(function (r) { r.payDays = v; }); }, 'num');
    bindc(ctl(root, 'ชื่อสั้นที่พิมพ์ด้านหน้า'), function () { return P().name.slice(0, 30); }, function (v) { }, 'text');
    bindRadio(root, 'shopmode', function () { return P().stores.mode; }, function (v) { S(function (r) { r.stores.mode = v === 'pick' ? 'pick' : 'all'; }); updateReveal(); }, function (m) { return m; });
    updateReveal();
    var pk = $('[data-reveal="shopmode=pick"]', root); if (pk) { var tbl = $('table.table tbody', pk); var html = PMP.partners().map(function (u) { return '<tr><td><input type="checkbox" data-lps="' + u.id + '"' + (P().stores.ids.indexOf(u.id) > -1 ? ' checked' : '') + '></td><td>' + E(u.name) + '</td><td>ร้านที่ลงทะเบียนแล้ว</td></tr>'; }).join(''); if (tbl) { tbl.innerHTML = html; } else { var tc = $('.card,.table-wrap', pk); (tc || pk).insertAdjacentHTML('beforeend', '<table class="table"><thead><tr><th></th><th>ร้าน/สาขา</th><th>ที่มา</th></tr></thead><tbody>' + html + '</tbody></table>'); }
      $$('[data-lps]', pk).forEach(function (cb) { bindc(cb, function () { return P().stores.ids.indexOf(cb.getAttribute('data-lps')) > -1; }, function (v) { S(function (r) { var i = r.stores.ids.indexOf(cb.getAttribute('data-lps')); if (v && i < 0) r.stores.ids.push(cb.getAttribute('data-lps')); if (!v && i > -1) r.stores.ids.splice(i, 1); }); }, 'chk'); }); }
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
          '<div class="fb"><div class="small semi mb8">ฟอร์มขอข้อมูลตอนกดรับสิทธิ์ (ลูกค้าทุกคนที่ปลดล็อกขั้นนี้เห็นฟอร์มเดียวกัน)</div><div class="small muted mb8">'+(form.length ? 'มีช่องข้อมูล = ลูกค้ากรอกแล้วคำขอเข้าคิวให้ทีมงานตรวจ' : '<b>ไม่มีช่องข้อมูล = ลูกค้ากด “รับรางวัล” ได้ทันที</b> ระบบอนุมัติและส่งรางวัลให้อัตโนมัติ ไม่เข้าคิวตรวจ (เหมาะกับพอยท์ คูปอง เครดิตเงินคืน สิทธิ์ลุ้น)')+'</div>' + form.map(function (f, j) { return '<div class="fb-row"><span class="drag">⋮⋮</span><select class="select"><option>ข้อความ</option></select><input class="input" data-ltform="' + i + '|' + j + '" value="' + E(f.label) + '"><label class="check"><input type="checkbox" data-ltreq="' + i + '|' + j + '"' + (f.req ? ' checked' : '') + '> จำเป็น</label><button class="iconbtn" data-ltfd="' + i + '|' + j + '">✕</button></div>'; }).join('') + '<button class="btn text sm" data-ltfa="' + i + '">＋ เพิ่มช่องข้อมูล</button></div></div>';
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
    tb.innerHTML = rows.map(function (r) { var last = r.lv.unlocked.length ? L.tiers.filter(function (t) { return r.lv.unlocked.indexOf(t.id) > -1; }).pop() : null, hot = r.pct >= 95 && r.nxt; return '<tr' + (hot ? ' class="hot95"' : '') + '><td><b>' + E(r.c.name) + '</b><div class="sub">' + r.c.type + '</div></td><td class="num"><b>' + B(r.lv.spent) + '</b></td><td>' + (last ? E(last.name) : '—') + '</td><td class="pbar"><div class="row between"><b' + (hot ? ' style="color:var(--error-dark)"' : '') + '>' + r.pct.toFixed(1) + '%</b><span class="small muted">' + (r.nxt ? '→ ' + E(r.nxt.name) + ' · ' + B(r.nxt.at) : 'ครบทุกขั้น') + '</span></div><div class="progress ' + (hot ? 'red' : 'green') + '"><i style="width:' + Math.min(100, r.pct) + '%"></i></div>' + (r.nxt ? '<div class="small">อีก <b>' + B(r.nxt.at - r.lv.spent) + '</b></div>' : '') + '</td><td>' + dmy(cfg.now) + '</td><td>' + dmy(L.end) + '</td><td>' + (hot ? '<span class="chip soft-success">ในเว็บ · ถึง 95%</span>' : r.pct >= 80 && r.nxt ? '<span class="chip soft-success">ในเว็บ · ถึง 80%</span>' : '—') + '</td></tr>'; }).join('');
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
    rows += '<div class="sum-row"><span>เครดิตเงินคืน<small>มี ' + B(cs0.credit) + ' · <a href="#" id="lcCredit">' + (selGet().useCredit ? 'ยกเลิกการใช้เครดิต' : 'ใช้เครดิต') + '</a></small></span><span>−' + B(R.creditUsed || 0) + '</span></div>';
    rows += '<div class="sum-sep">การจัดส่ง</div><div class="sum-row"><span>ค่าจัดส่ง<small>' + (R.shipFree ? 'ฟรีจากโปร/คูปอง' : 'ฟรีเมื่อยอดสินค้า ≥ ' + B(cfg.shipping.freeOver)) + '</small></span><span>' + (R.shipping ? B(R.shipping) : 'ฟรี') + '</span></div>';
    rows += '<div class="sum-row total"><span>ยอดสุทธิ</span><span>' + B(R.total) + '</span></div><div class="save relative">คุณประหยัดจากโปรโมชั่น Flash และคูปองไปแล้ว ' + B(fl + qd + R.promoDisc + R.couponDisc) + '</div>';
    var earn = []; if (R.earnBase) earn.push('พอยท์ +' + R.earnBase); R.grants.forEach(function (g) { earn.push(PMP.describe(g.it, cfg)); }); Object.keys(R.ticketsBuy).forEach(function (f) { earn.push('สิทธิ์ลุ้น +' + R.ticketsBuy[f]); });
    rows += (earn.length ? '<div class="small mt8" style="background:var(--success-lighter);border-radius:8px;padding:8px 10px"><b>หลังชำระจะได้:</b> ' + E(earn.join(' · ')) + '</div>' : '') + '<button class="btn contained lg block mt16" id="lcPay"' + (R.lines.length ? '' : ' disabled') + '>ดำเนินการชำระเงิน</button><a class="btn text block mt8" href="06-customer-list.html">ดูโปรโมชั่นอื่น</a><div class="small muted mt8 center">ยอดชำระจริงคำนวณที่ระบบอีกครั้งตอนยืนยันคำสั่งซื้อ</div>';
    sm.innerHTML = rows; relabelCustomer();
  };
  function cartDlg(kind) {
    var cfg = PMP.cfg(), c = cs(), sel = selGet(), R = PMP.price(cartArr(), cartOpts()), mod = $('#lcMod');
    if (!mod) { mod = document.createElement('div'); mod.id = 'lcMod'; mod.className = 'modal'; document.body.appendChild(mod); mod.addEventListener('click', function (e) { if (e.target === mod || e.target.closest('[data-close]')) mod.classList.remove('on'); }); }
    var body, foot;
    if (kind === 'coupon') {
      var w = c.wallet.filter(function (x) { return !x.used; });
      body = '<div class="field"><label>กรอกโค้ดคูปอง</label><div class="row"><input class="input" id="lcCode" placeholder="เช่น SAVE100" style="text-transform:uppercase" value="' + E(sel.couponRef && sel.couponRef.type === 'code' ? sel.couponRef.value : '') + '"><button class="btn contained" type="button" id="lcCodeOk">ใช้โค้ด</button></div><span class="help">ลองใส่ SAVE100 หรือ FREESHIP · ระบบตรวจเงื่อนไข ยอดขั้นต่ำ และโควตาให้</span></div>' +
        '<div class="label mt16 mb8">คูปองในกระเป๋าของฉัน (' + w.length + ')</div>' + (w.map(function (x) { var k = cfg.coupons.filter(function (y) { return y.id === x.couponId; })[0], on = sel.couponRef && sel.couponRef.type === 'wallet' && sel.couponRef.value === x.id; return '<div class="nf-it ' + (on ? 'success' : 'info') + '" style="margin-bottom:8px"><span></span><div><b>' + E(k.code) + '</b> · ' + E(k.name) + '<div class="small muted">ได้จาก ' + E(x.src) + '</div></div><button class="btn ' + (on ? 'outlined' : 'contained') + ' sm" type="button" data-lcw="' + x.id + '">' + (on ? 'ยกเลิก' : 'ใช้คูปองนี้') + '</button></div>'; }).join('') || '<div class="muted small">กระเป๋าว่าง — เก็บคูปองได้ที่ศูนย์คูปอง</div>') +
        (R.couponErr ? '<div class="alert error mt8"><div>' + E(R.couponErr) + '</div></div>' : '');
      foot = '<button class="btn text grey" type="button" id="lcCodeClr">ไม่ใช้คูปอง</button><button class="btn contained" type="button" data-close>เสร็จสิ้น</button>';
    } else {
      var mx = R.pointsMax, cur = sel.usePoints || 0;
      body = R.pointsBlocked ? '<div class="alert error"><div>ใช้พอยท์ชำระไม่ได้ — “' + E(R.pointsBlocked) + '” ไม่อนุญาตให้ใช้ร่วมกับพอยท์</div></div>' : '<div class="small mb8">มี <b>' + c.points.toLocaleString() + '</b> พอยท์ · 1 พอยท์ = ' + B(cfg.pay.ptBaht) + ' · ใช้ได้ไม่เกิน ' + cfg.pay.maxPct + '% ของยอดสินค้า (สูงสุดตอนนี้ ' + mx.toLocaleString() + ' พอยท์)</div><div class="row"><input type="range" id="lcRange" min="0" max="' + mx + '" value="' + Math.min(cur, mx) + '" style="flex:1"><input class="input" id="lcNum" type="number" min="0" max="' + mx + '" value="' + Math.min(cur, mx) + '" style="width:110px"></div><div class="row mt8" style="gap:8px"><button class="btn outlined sm" type="button" id="lcMax">ใช้สูงสุด</button><button class="btn text sm grey" type="button" id="lcZero">ไม่ใช้พอยท์</button></div>';
      foot = '<button class="btn text grey" type="button" data-close>ยกเลิก</button><button class="btn contained" type="button" id="lcPtsOk"' + (R.pointsBlocked ? ' disabled' : '') + '>ยืนยัน</button>';
    }
    mod.innerHTML = '<div class="dialog md"><div class="dialog-h"><span>' + (kind === 'coupon' ? 'คูปอง / โค้ดส่วนลด' : 'ใช้พอยท์ชำระ') + '</span><button class="x" type="button" data-close>✕</button></div><div class="dialog-b">' + body + '</div><div class="dialog-f">' + foot + '</div></div>'; mod.classList.add('on');
    function save(fn) { var s2 = selGet(); fn(s2); U.wr('pmpc.sim.sel', s2); }
    var ok = $('#lcCodeOk'); if (ok) ok.onclick = function () { var v = $('#lcCode').value.trim().toUpperCase(); save(function (s2) { s2.couponRef = v ? { type: 'code', value: v } : null; }); mod.classList.remove('on'); rerender(); };
    var cl = $('#lcCodeClr'); if (cl) cl.onclick = function () { save(function (s2) { s2.couponRef = null; }); mod.classList.remove('on'); rerender(); };
    $$('[data-lcw]', mod).forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-lcw'); save(function (s2) { s2.couponRef = (s2.couponRef && s2.couponRef.value === id) ? null : { type: 'wallet', value: id }; }); mod.classList.remove('on'); rerender(); }; });
    var rg = $('#lcRange'), nm = $('#lcNum'); if (rg) { rg.oninput = function () { nm.value = rg.value; }; nm.oninput = function () { rg.value = nm.value; }; $('#lcMax').onclick = function () { nm.value = rg.value = rg.max; }; $('#lcZero').onclick = function () { nm.value = rg.value = 0; }; $('#lcPtsOk').onclick = function () { var v = Math.max(0, Math.min(+nm.value || 0, +rg.max)); save(function (s2) { s2.usePoints = v; }); mod.classList.remove('on'); rerender(); }; }
  }
  document.addEventListener('click', function (e) {
    if (KEY !== 'promotion/09-customer-cart.html') return;
    var q = e.target.closest('[data-lq]'), pc = e.target.closest('[data-lpc]'), cart = U.rd('pmpc.sim.cart', {}), sel = selGet();
    if (q) { var p = q.getAttribute('data-lq').split('|'); cart[p[1]] = Math.max(0, (cart[p[1]] || 0) + (+p[0])); U.wr('pmpc.sim.cart', cart); rerender(); return; }
    if (e.target.id === 'lcAdd') { var sku = $('#lcAddSel').value; cart[sku] = (cart[sku] || 0) + 1; U.wr('pmpc.sim.cart', cart); rerender(); return; }
    if (pc) { if (pc.classList.contains('dim')) { toast($('.pc-w', pc).textContent, true); return; } var id = pc.getAttribute('data-lpc'), i = sel.promos.indexOf(id); if (i > -1) sel.promos.splice(i, 1); else sel.promos.push(id); U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcCoupon') { e.preventDefault(); cartDlg('coupon'); return; }
    if (e.target.id === 'lcPts') { e.preventDefault(); cartDlg('points'); return; }
    if (e.target.id === 'lcCredit') { e.preventDefault(); sel.useCredit = !sel.useCredit; U.wr('pmpc.sim.sel', sel); rerender(); return; }
    if (e.target.id === 'lcPay') { var r = PMP.checkout(cartArr(), cartOpts()); if (r.error) { toast(r.error, true); return; } U.wr('pmpc.sim.cart', {}); U.wr('pmpc.sim.sel', { promos: [], couponRef: null, usePoints: 0, useCredit: false }); toast('ชำระเงินสำเร็จ ' + r.order.no + ': ' + r.order.effects.slice(0, 4).join(' · ')); rerender(); }
  });

  /* ===== points/01 กติกาพอยท์ + อัตรารายสินค้า · ตัวคูณมาจากโปรโมชั่นเท่านั้น ===== */
  H['points/01-admin-rules.html'] = function () {
    var cfg = PMP.cfg(), tbs = $$('table.table'); cfg.pts = cfg.pts || {};
    var t1 = tbs.filter(function (t) { return /พอยท์ต่อหน่วย/.test(t.textContent); })[0];
    if (t1) {
      var th = $$('thead th', t1); if (th.length > 6) th.slice(6).forEach(function (x) { x.parentNode.removeChild(x); });
      $('tbody', t1).innerHTML = PMP.products.map(function (p) {
        var own = cfg.pts[p.sku] != null, v = own ? cfg.pts[p.sku] : p.pts;
        return '<tr class="' + (v ? '' : 'zero') + '"><td><b>' + E(p.name) + '</b><span class="sub mono">' + p.sku + '</span></td><td>' + E(p.brand) + '</td><td>' + E(p.cat) + '</td><td>' + p.unit + ' · ' + B(p.price) + '</td><td class="num"><input class="input pts" data-lpts="' + p.sku + '" value="' + v + '"></td><td>' + (own ? '<span class="chip soft-primary">ตั้งเอง</span>' : v ? '<span class="chip soft-info">ตามที่ตั้งไว้เดิม</span>' : '<span class="chip">ยังไม่ตั้ง</span>') + (v ? '' : ' <span class="chip soft-error">ได้ 0 พอยท์</span>') + '</td></tr>';
      }).join('');
    }
    var root = $('#screen'); if (!root._lp) { root._lp = 1;
      root.addEventListener('input', function (e) { var t = e.target, a; if ((a = t.getAttribute('data-lpts'))) { setCfg(function (c) { c.pts = c.pts || {}; c.pts[a] = +t.value || 0; }); flashSaved(); } });
      root.addEventListener('change', function (e) { if (e.target.getAttribute('data-lpts') != null) rerender(); });
    }
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
    var c2 = $('.cards2'); if (c2 && L) { c2.innerHTML = '<a class="pcard" href="../campaign/06-customer-ladder.html"><span class="chip soft-primary sq" style="align-self:flex-start">สะสมยอดรายปี</span><h6>' + E(L.name) + '</h6><div class="step-mini">' + L.tiers.map(function (t) { return '<i class="' + (lv.unlocked.indexOf(t.id) > -1 ? 'done' : '') + '"></i>'; }).join('') + '</div><p>ปลดล็อกแล้ว ' + lv.unlocked.length + ' / ' + L.tiers.length + ' ขั้น · ยอดสะสม ' + B(lv.spent) + '</p><div class="ft"><span>ถึง ' + dm(L.end) + '</span><b style="color:var(--primary)">ดูความคืบหน้า</b></div></a>'; }
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
    var mults = []; cfg.promos.forEach(function (pr) { if (PMP.status(pr, now) !== 'running') return; PMP.rewardsOf('promotion', pr.id).forEach(function (i) { if (i.k === 'points' && i.mode === 'mult') mults.push({ mult: i.value, scope: pr.scope, name: pr.name }); }); });
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

  /* ================= coupon/04 ตัวอย่างคูปองกระดาษ (หน้า-หลัง) ================= */
  var shown4 = { code: 'NOV80', val: '฿80', min: '฿600', name: 'บูทสัมมนาเภสัช พ.ย. 69', issued: '1,500' };
  H['coupon/04-admin-paper-preview.html'] = function () {
    var cfg = PMP.cfg(), id = U.rd('pmpc.live.paper', null), pp = cfg.paper.filter(function (x) { return x.id === id; })[0] || cfg.paper[0]; if (!pp) return;
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), pp.id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null);
    var main = $('#screen'), html = main.innerHTML, next = { code: pp.code, val: B(pp.value), min: B(pp.min), name: pp.name.replace('คูปองกระดาษ ', ''), issued: pp.issued.toLocaleString() };
    function sw(a, b) { if (a !== b) html = html.split(a).join(b); }
    sw('>' + shown4.code + '<', '>' + next.code + '<'); sw('ชุด ' + shown4.code, 'ชุด ' + next.code); sw('>' + shown4.val + '<', '>' + next.val + '<'); sw('ครบ ' + shown4.min, 'ครบ ' + next.min); sw(shown4.name, next.name); sw(shown4.issued + ' ใบ', next.issued + ' ใบ'); sw('฿80/ใบ', B(pp.value) + '/ใบ');
    if (html !== main.innerHTML) { var pk = $('#livePick'), pkp = pk && pk.previousElementSibling; main.innerHTML = html; shown4 = next; var ah = $('.page-head'); if (ah && !$('#livePick')) pickBar2(ah, 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), pp.id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null); }
    var stores = pp.stores.mode === 'all' ? PMP.partners() : PMP.partners().filter(function (s) { return pp.stores.ids.indexOf(s.id) > -1; });
    $$('.pb-cols ul').forEach(function (u, i) { if (i % 2 === 0) u.innerHTML = stores.map(function (s) { return '<li>' + E(s.name) + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : ''); });
    var chip = $('.page-head h4 .chip'); if (chip) { chip.className = 'chip ' + (pp.active ? 'success' : 'warning'); chip.textContent = pp.active ? 'ใช้งาน' : 'ร่าง/ปิด'; }
  };

  /* ===== foundation/04 กลุ่มสินค้า (รายการ + แก้กติกา รวม/ยกเว้น) ===== */
  var PSsel = null;
  H['foundation/04-admin-product-sets.html'] = function () {
    var cfg = PMP.cfg(), id = PSsel || cfg.psets[0].id, p = cfg.psets.filter(function (x) { return x.id === id; })[0] || cfg.psets[0]; id = p.id;
    function count(x) { return PMP.products.filter(function (pr) { return PMP.inScope(cfg, { mode: 'pset', ref: x.id }, pr); }).length; }
    function usage(x) { var a = cfg.promos.filter(function (y) { return y.scope.mode === 'pset' && y.scope.ref === x.id; }).length, k = cfg.coupons.filter(function (y) { return (y.except || []).indexOf(x.id) > -1 || (y.scope.mode === 'pset' && y.scope.ref === x.id); }).length, f = cfg.flash.filter(function (y) { return y.rules.some(function (r) { return r.ps === x.id; }); }).length; return 'โปรโมชั่น ' + a + ' · คูปอง ' + k + ' · Flash ' + f; }
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

  /* ================= PAPER COUPON v2: discount / free-item · in-system stores + external partners · serials ================= */
  function ppSel() { var cfg = PMP.cfg(), q = /[?&]set=(\w+)/.exec(location.search), id = q ? q[1] : U.rd('pmpc.live.paper', null), p = cfg.paper.filter(function (x) { return x.id === id; })[0] || cfg.paper[0]; return p; }
  function kindChipP(u) { return '<span class="chip ' + (u.kind === 'ext' ? 'soft-warning' : 'soft-info') + '">' + (u.kind === 'ext' ? 'นอกระบบ' : 'ในระบบ') + '</span>'; }
  function ppRecipients(pp) { return pp.stores.mode === 'all' ? PMP.partners().filter(function (x) { return x.kind === 'sys'; }) : PMP.partners().filter(function (x) { return pp.stores.ids.indexOf(x.id) > -1; }); }
  /* paint the front/back preview of every .pcw on the page for a given set */
  function paperPreview(pp) {
    var rec = ppRecipients(pp), item = pp.benefit === 'item';
    $$('.pface.front').forEach(function (f) {
      var br = $('.pf-brand', f); if (br) br.textContent = 'PHARMAPLEX · ' + (item ? 'คูปองของแถม' : 'คูปองส่วนลด');
      var big = $('.big', f); if (big) big.textContent = item ? 'ฟรี!' : B(pp.value);
      var sub = $('.pf-sub', f); if (sub) sub.textContent = item ? 'แลก ' + (pp.item || 'ของแถม') + ' ฟรี 1 สิทธิ์' : 'ส่วนลดทันที เมื่อซื้อสินค้าครบ ' + B(pp.min);
      var ch = $$('.pf-chips span', f); if (ch[0]) ch[0].textContent = item ? 'แลกที่ร้านพาร์ทเนอร์ (ดูด้านหลัง)' : 'ใช้ที่ร้านที่ร่วมรายการ (ดูด้านหลัง)'; if (ch[2]) ch[2].textContent = item ? '1 ใบ/1 สิทธิ์' : '1 ใบ/บิล';
      var ft = $('.pf-foot', f); if (ft) ft.textContent = pp.name.replace('คูปองกระดาษ ', '') + (pp.serial && pp.serial.on ? ' · เลขที่ ' + PMP.serialLabel(pp, pp.serial.from) : '');
      var cd = $('.stub .cd', f); if (cd) cd.textContent = pp.code;
    });
    $$('.pface.rear').forEach(function (r) {
      var h = $('.pb-h span', r); if (h) h.textContent = 'ชุด ' + pp.code;
      var cols = $$('.pb-cols > div', r), ul = cols[0] && $('ul', cols[0]);
      if (cols[0]) { var hh = $('h6', cols[0]); if (hh) hh.textContent = item ? 'แลกได้ที่ร้านพาร์ทเนอร์' : 'ใช้ได้ที่ร้าน/สาขา'; }
      if (ul) ul.innerHTML = rec.slice(0, 6).map(function (u) { return '<li>' + E(u.name) + (u.kind === 'ext' && u.branches ? ' — ' + E(u.branches) : '') + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : '');
      if (cols[1]) { var cu = $('ul', cols[1]); if (cu) cu.innerHTML = (item ? '<li>แลก ' + E(pp.item || '') + ' ฟรี 1 ใบต่อ 1 สิทธิ์ · ไม่ต้องซื้อขั้นต่ำ</li><li>' + E(pp.back || 'ไม่แลกเป็นเงินสด') + '</li>' : '<li>ซื้อครบ ' + B(pp.min) + ' ขึ้นไปต่อบิล · ใช้ได้ 1 ใบ/บิล</li><li>' + E(pp.back || '') + '</li>') + '<li>ไม่ทอนเงินสด · แลกเป็นเงินสดไม่ได้</li><li>ร้านส่งก้นเบิกภายใน ' + pp.payDays + ' วัน</li>' + (pp.serial && pp.serial.on ? '<li>มีเลขใบกำกับ ' + PMP.serialLabel(pp, pp.serial.from) + ' ถึง ' + PMP.serialLabel(pp, pp.serial.to) + '</li>' : ''); }
    });
  }

  /* ---- coupon/02 รายการชุดคูปองกระดาษ ---- */
  H['coupon/02-admin-paper-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), pcs = st.paperClaims || [];
    var th = $$('table.table thead th'); if (th[2]) th[2].innerHTML = 'สิทธิ์ที่ได้รับ'; if (th[3]) th[3].textContent = 'ขั้นต่ำ'; var th7 = th.filter(function (x) { return /ช่องทาง/.test(x.textContent); })[0]; if (th7) th7.textContent = 'ผู้รับ';
    tbody('table.table tbody', cfg.paper.map(function (p) {
      var got = pcs.filter(function (c) { return c.ppId === p.id && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + (c.counted != null ? c.counted : c.stubs); }, 0), pct = p.issued ? Math.min(100, Math.round(got / p.issued * 100)) : 0, rec = ppRecipients(p), ext = rec.filter(function (x) { return x.kind === 'ext'; }).length, item = p.benefit === 'item';
      return '<tr><td><b class="mono">' + E(p.code) + '</b>' + (p.serial && p.serial.on ? '<div><span class="chip outline" style="height:18px;font-size:10px">serial</span></div>' : '') + '</td><td><b>' + E(p.name) + '</b></td><td class="num">' + (item ? '<span class="chip soft-warning">ของฟรี</span><div class="small">' + E(p.item) + '</div>' : B(p.value)) + '</td><td class="num">' + (item ? '—' : B(p.min)) + '</td><td class="num">' + p.issued.toLocaleString() + '</td><td><div style="min-width:120px"><div class="progress "><i style="width:' + pct + '%"></i></div><div class="small muted mt8" style="margin-top:4px">' + got.toLocaleString() + ' / ' + p.issued.toLocaleString() + ' (' + pct + '%)</div></div></td><td>' + (p.stores.mode === 'all' ? 'ทุกร้านในระบบ' : (rec.length - ext) + ' ในระบบ') + (ext ? '<div class="small"><span class="chip soft-warning" style="height:18px;font-size:10px">+ ' + ext + ' นอกระบบ</span></div>' : '') + '</td><td><span class="chip soft-success">หน้าร้าน/พาร์ทเนอร์</span>' + (p.settle === 'sponsored' ? '<div class="small muted">พาร์ทเนอร์ออกเอง</div>' : item ? '<div class="small muted">จ่าย ' + B(p.cost) + '/ใบ</div>' : '') + '</td><td class="nowrap">ส่งก้นภายใน ' + p.payDays + ' วัน</td><td><span class="chip ' + (p.active ? 'success' : '') + '">' + (p.active ? 'ใช้งาน' : 'ปิดชุด') + '</span></td><td><div class="small nowrap" style="line-height:2"><a href="04-admin-paper-preview.html" data-lpp="' + p.id + '">ดูหน้า-หลัง</a> · <a href="03-admin-paper-editor.html" data-lpp="' + p.id + '">แก้ไข</a><br><a href="#" data-lppact="dup|' + p.id + '">ทำซ้ำชุด</a> · <a href="#" data-lppact="tog|' + p.id + '" style="color:var(--error-dark)">' + (p.active ? 'ปิดชุด' : 'เปิดชุด') + '</a></div></td></tr>';
    }).join(''), 11);
  };

  /* ---- coupon/03 สร้างชุดคูปองกระดาษ ---- */
  H['coupon/03-admin-paper-editor.html'] = function () {
    var cfg = PMP.cfg(), pp0 = ppSel(), id = pp0.id, root = $('#screen');
    var P = function () { return recOf('paper', id); }, S = function (fn) { editRec('paper', id, fn); paperPreview(P()); updateSummary(); };
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (p) { return { id: p.id, label: p.code + ' · ' + p.name }; }), id, function (v) { U.wr('pmpc.live.paper', v); location.href = location.pathname; }, function () { var nid = U.uid('pp'); setCfg(function (c) { c.paper.push({ id: nid, benefit: 'discount', item: '', settle: 'pay', cost: 0, serial: { on: false, prefix: '', from: 1, to: 0 }, code: 'NEW' + nid.slice(2, 5).toUpperCase(), name: 'คูปองกระดาษชุดใหม่', value: 50, min: 500, issued: 500, maxPerStore: 100, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, back: '' }); }); U.wr('pmpc.live.paper', nid); location.reload(); }, '＋ สร้างชุดใหม่');
    var h4 = $('.page-head h4 .mono-b'); if (h4) h4.textContent = P().code;
    bindc(ctl(root, 'รหัสชุด'), function () { return P().code; }, function (v) { S(function (r) { r.code = String(v).toUpperCase(); }); if (h4) h4.textContent = String(v).toUpperCase(); }, 'text');
    bindc(ctl(root, 'ชื่อ/ที่มาของชุด'), function () { return P().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'จำนวนที่ออก'), function () { return P().issued; }, function (v) { S(function (r) { r.issued = v; }); }, 'num');
    bindc(ctl(root, 'มูลค่าส่วนลดต่อใบ'), function () { return P().value; }, function (v) { S(function (r) { r.value = v; }); }, 'num');
    bindc(ctl(root, 'ยอดซื้อขั้นต่ำ', 0), function () { return P().min; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    bindc(ctl(root, 'ร้านต้องส่งก้นเบิกภายใน'), function () { return P().payDays; }, function (v) { S(function (r) { r.payDays = v; }); }, 'num');
    bindc(ctl(root, 'ชื่อสั้นที่พิมพ์ด้านหน้า'), function () { return P().name.replace('คูปองกระดาษ ', '').slice(0, 30); }, function () { }, 'text');
    bindc(ctl(root, 'รายการที่แลกได้ฟรี'), function () { return P().item || ''; }, function (v) { S(function (r) { r.item = v; }); }, 'text');
    bindc(ctl(root, 'ราคาตกลงต่อใบที่แลก'), function () { return P().cost || ''; }, function (v) { S(function (r) { r.cost = v; }); }, 'num');
    bindc(ctl(root, 'จำกัดใบต่อผู้รับ'), function () { return P().maxPerStore || ''; }, function (v) { S(function (r) { r.maxPerStore = v; }); }, 'num');
    bindRadio(root, 'benefit', function () { return P().benefit; }, function (v) { S(function (r) { r.benefit = v; if (v === 'item' && !r.item) r.item = 'ของแถม 1 ชิ้น'; }); updateReveal(); }, function (m) { return m; });
    bindRadio(root, 'settle', function () { return P().settle; }, function (v) { S(function (r) { r.settle = v; }); updateReveal(); }, function (m) { return m; });
    bindRadio(root, 'shopmode', function () { return P().stores.mode; }, function (v) { S(function (r) { r.stores.mode = v === 'pick' ? 'pick' : 'all'; }); updateReveal(); }, function (m) { return m; });
    function updateSummary() { var p = P(), box = $('.soft', sp); if (box) box.innerHTML = '<b>ยอดรับผิดชอบสูงสุด (ถ้าแลกครบทุกใบ)</b><div class="small muted mt8">' + p.issued.toLocaleString() + ' ใบ × ' + B(PMP.paperUnit(p)) + ' = <b>' + B(p.issued * PMP.paperUnit(p)) + '</b>' + (p.settle === 'sponsored' && p.benefit === 'item' ? ' (พาร์ทเนอร์ออกเอง — ไม่มีการจ่าย)' : '') + ' · ใช้ประกอบการอนุมัติงบก่อนเผยแพร่ชุด</div>'; var hp = $$('.help', sp).filter(function (x) { return /ต้องเท่ากับจำนวนที่ออก/.test(x.textContent); })[0]; if (hp) hp.textContent = 'ต้องเท่ากับจำนวนที่ออก (' + p.issued.toLocaleString() + ' ใบ)'; var chips = $$('.page-head .chip')[0]; }
    updateReveal();
    // recipients table: in-system + external partners
    var pk = $('[data-reveal="shopmode=pick"]', root);
    if (pk) { var tb = $('table.table tbody', pk), thead = $('table.table thead tr', pk), rows = function () { return PMP.partners().map(function (u) { return '<tr><td><input type="checkbox" data-lps="' + u.id + '"' + (P().stores.ids.indexOf(u.id) > -1 ? ' checked' : '') + '></td><td><b>' + E(u.name) + '</b>' + (u.kind === 'ext' ? '<div class="small muted">' + E(u.cat || '') + ' · ' + E(u.contact || '') + '</div>' : '') + '</td><td>' + kindChipP(u) + '</td><td>' + E(u.kind === 'ext' ? (u.branches || '-') : 'ในระบบ') + '</td></tr>'; }).join(''); };
      if (thead) thead.innerHTML = '<th style="width:36px"></th><th>ผู้รับคูปอง</th><th>ประเภท</th><th>สาขา/หมายเหตุ</th>';
      var wrap = $('.table-wrap', pk) || pk;
      function draw() { if (tb) tb.innerHTML = rows(); else wrap.innerHTML = '<table class="table"><thead><tr><th></th><th>ผู้รับคูปอง</th><th>ประเภท</th><th>สาขา/หมายเหตุ</th></tr></thead><tbody>' + rows() + '</tbody></table>'; $$('[data-lps]', pk).forEach(function (cb) { bindc(cb, function () { return P().stores.ids.indexOf(cb.getAttribute('data-lps')) > -1; }, function (v) { S(function (r) { var i = r.stores.ids.indexOf(cb.getAttribute('data-lps')); if (v && i < 0) r.stores.ids.push(cb.getAttribute('data-lps')); if (!v && i > -1) r.stores.ids.splice(i, 1); }); var c = $('.chip.soft-primary', pk); if (c) c.textContent = 'เลือกแล้ว ' + P().stores.ids.length + ' จาก ' + PMP.partners().length; }, 'chk'); }); var c2 = $('.chip.soft-primary', pk); if (c2) c2.firstChild.textContent = 'เลือกแล้ว ' + P().stores.ids.length + ' จาก ' + PMP.partners().length + ' '; }
      draw();
      if (!$('#lpAddBox')) pk.insertAdjacentHTML('beforeend', '<div id="lpAddBox" style="padding:12px 16px;border-top:1px solid var(--g200)"><b class="small">＋ เพิ่มพาร์ทเนอร์นอกระบบ</b><div class="row mt8" style="gap:8px;flex-wrap:wrap"><input class="input" id="lpnN" placeholder="ชื่อพาร์ทเนอร์ เช่น ร้านไอศกรีม…" style="max-width:240px"><input class="input" id="lpnC" placeholder="ผู้ติดต่อ/เบอร์" style="max-width:180px"><input class="input" id="lpnB" placeholder="สาขาที่รับแลก" style="max-width:220px"><button class="btn outlined sm" id="lpnAdd" type="button">เพิ่มและเลือกในชุดนี้</button></div></div>');
      $('#lpnAdd').onclick = function () { var n = $('#lpnN').value.trim(); if (!n) { toast('กรอกชื่อพาร์ทเนอร์', true); return; } var nid = U.uid('x'); setCfg(function (c) { c.partners = c.partners || []; c.partners.push({ id: nid, name: n, kind: 'ext', cat: '', contact: $('#lpnC').value, branches: $('#lpnB').value }); var p = c.paper.filter(function (x) { return x.id === id; })[0]; p.stores.mode = 'pick'; p.stores.ids.push(nid); }); toast('เพิ่มพาร์ทเนอร์แล้ว'); location.reload(); };
    }
    paperPreview(P()); updateSummary();
  };

  /* ---- coupon/04 ตัวอย่างคูปองกระดาษ ---- */
  H['coupon/04-admin-paper-preview.html'] = function () {
    var cfg = PMP.cfg(), pp = ppSel();
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), pp.id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null);
    var h4 = $('.page-head h4 .mono-b'); if (h4) h4.textContent = pp.code; var sub = $('.page-head p.muted'); if (sub) sub.textContent = pp.name + ' · ' + PMP.paperBenefitText(pp) + ' · ' + pp.issued.toLocaleString() + ' ใบ' + (pp.settle === 'sponsored' ? ' · พาร์ทเนอร์ออกเอง' : '');
    var chip = $('.page-head h4 .chip'); if (chip) { chip.className = 'chip ' + (pp.active ? 'success' : 'warning'); chip.textContent = pp.active ? 'ใช้งาน' : 'ร่าง/ปิด'; }
    paperPreview(pp);
  };

  /* ---- coupon/05 คิวเบิกเงิน/เบิกจ่าย ---- */
  H['coupon/05-admin-paper-claims.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), pcs = st.paperClaims || [];
    var tb = $$('table.table tbody')[0];
    tb.innerHTML = pcs.map(function (c, i) {
      var pp = cfg.paper.filter(function (x) { return x.id === c.ppId; })[0], su = PMP.partner(c.storeId), payable = !(pp.benefit === 'item' && pp.settle !== 'pay'), unit = PMP.paperUnit(pp);
      var fl = c.flags.map(function (f) { return '<div style="margin-top:4px"><span class="chip soft-error">' + E(f) + '</span></div>'; }).join('');
      var ser = c.serials && c.serials.length ? '<div class="small muted mono" style="margin-top:2px">' + c.serials.slice(0, 4).map(function (x) { return PMP.serialLabel(pp, x); }).join(', ') + (c.serials.length > 4 ? ' … (' + c.serials.length + ' ใบ)' : '') + '</div>' : '';
      var act = c.status === 'รอตรวจนับ' ? '<input class="input" data-lpcn="' + c.id + '" type="number" placeholder="นับได้" style="width:80px;min-height:30px"> <a href="#" data-lpcact="count|' + c.id + '">บันทึกนับ</a> · <a href="#" data-lpcact="reject|' + c.id + '" style="color:var(--error-dark)">ปฏิเสธ</a>' : c.status === 'ตรวจนับแล้ว' ? '<a href="#" data-lpcact="pay|' + c.id + '">' + (payable ? 'บันทึกจ่ายเงิน' : 'ปิดงาน') + '</a>' : '—';
      return '<tr><td><b class="mono">C-' + String(131 + pcs.length - i).padStart(4, '0') + '</b></td><td><b>' + E(su.name) + '</b><div style="margin-top:2px">' + kindChipP(su) + '</div>' + (c.by ? '<div class="small muted">' + E(c.by) + '</div>' : '') + '</td><td class="mono">' + E(pp.code) + ser + '</td><td class="num">' + c.stubs + '</td><td class="num">' + (c.counted != null ? c.counted : '—') + '</td><td class="num">' + (pp.benefit === 'item' ? (payable ? B(unit) + '<div class="xs muted">ราคาตกลง</div>' : '—') : B(unit)) + '</td><td class="num"><b>' + (payable ? B(c.amount) + (c.counted == null ? '*' : '') : 'ไม่มีการจ่าย') + '</b></td><td><span class="chip ' + ({ 'รอตรวจนับ': 'warning', 'ตรวจนับแล้ว': 'info', 'จ่ายแล้ว': 'success', 'ปิดงานแล้ว': 'success', 'ปฏิเสธ': 'error' }[c.status]) + '">' + c.status + '</span>' + fl + '</td><td class="nowrap">' + dmy(c.d) + '</td><td class="nowrap">' + act + '</td></tr>';
    }).join('') || '<tr><td colspan="10" class="center muted" style="padding:24px">ยังไม่มีคำขอเบิก — บันทึกด้านบน</td></tr>';
    // admin entry form (on behalf of external partners)
    var card = $('table.table').closest('.card'); if (!$('#lpcForm')) card.insertAdjacentHTML('beforebegin', '<div class="card mb16" id="lpcForm"><div class="card-b"><h6 class="mb8">บันทึกก้นคูปองที่ส่งเข้ามา <span class="chip soft-primary sq">ใหม่: รวมพาร์ทเนอร์นอกระบบ</span></h6><div class="small muted mb8">ร้านในระบบส่งเองได้ · พาร์ทเนอร์นอกระบบ (เช่น ร้านไอศกรีม) ส่งก้นให้ทีมงาน แอดมินบันทึกแทนและเก็บหลักฐาน</div><div class="row" style="gap:8px;flex-wrap:wrap"><select class="select" id="lpcSet" style="max-width:300px"></select><select class="select" id="lpcWho" style="max-width:300px"></select><input class="input" id="lpcN" type="number" min="1" placeholder="จำนวนก้น" style="width:110px"><button class="btn contained" id="lpcGo" type="button">บันทึกส่งเบิก</button></div><div id="lpcRes"></div></div></div>');
    $('#lpcSet').innerHTML = cfg.paper.map(function (p) { return '<option value="' + p.id + '">' + E(p.code + ' · ' + p.name) + '</option>'; }).join(''); $('#lpcWho').innerHTML = PMP.partners().map(function (u) { return '<option value="' + u.id + '">' + E(u.name) + (u.kind === 'ext' ? ' · นอกระบบ' : '') + '</option>'; }).join('');
    $('#lpcGo').onclick = function () { var r = PMP.paperClaim($('#lpcSet').value, $('#lpcWho').value, +$('#lpcN').value); if (r.error) { toast(r.error, true); return; } toast('บันทึกแล้ว ' + r.n + ' ใบ' + (r.flags.length ? ' — มีธง ' + r.flags.length : '')); rerender(); };
    var t2 = $$('table.table tbody')[1]; if (t2) t2.innerHTML = PMP.partners().map(function (su) { var tot = pcs.filter(function (c) { return c.storeId === su.id && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + c.stubs; }, 0), mx = Math.max.apply(null, cfg.paper.map(function (p) { return p.maxPerStore || 0; })); return '<tr><td>' + E(su.name) + ' ' + kindChipP(su) + '</td><td class="num">' + tot + '</td><td class="num">' + (mx || '—') + '</td><td style="width:140px"><div class="progress ' + (tot > mx ? '' : 'green') + '"><i style="width:' + Math.min(100, tot / mx * 100) + '%"></i></div></td><td><span class="chip ' + (mx && tot > mx ? 'soft-error' : 'soft-success') + '">' + (mx && tot > mx ? 'เกินใบสูงสุดต่อร้าน' : 'ปกติ') + '</span></td></tr>'; }).join('');
  };

  /* ---- coupon/10 ตรวจสอบคูปองกระดาษ (ลูกค้า) ---- */
  H['coupon/10-customer-paper-info.html'] = function () {
    var cfg = PMP.cfg(), pp = ppSel(), inp = $('input.mono'), btn = inp.nextElementSibling; if (!pp) return;
    inp.value = pp.code; if (!btn._l) { btn._l = 1; btn.addEventListener('click', function () { var v = inp.value.trim().toUpperCase(), q = PMP.cfg().paper.filter(function (x) { return x.code === v; })[0]; if (!q) { toast('ไม่พบรหัสคูปองกระดาษ “' + v + '”', true); return; } U.wr('pmpc.live.paper', q.id); rerender(); }); }
    var rec = ppRecipients(pp), item = pp.benefit === 'item', al = $('.alert.success');
    al.className = 'alert ' + (pp.active ? 'success' : 'warning') + ' mb16 relative'; al.innerHTML = '<span class="pin">2</span><div><div class="a-title">ชุด ' + E(pp.code) + ' · ' + (pp.active ? 'ใช้ได้' : 'ปิดชุดแล้ว') + ' — ' + E(PMP.paperBenefitText(pp)) + '</div>' + E(pp.name) + ' · ' + (item ? 'แลกที่ร้านพาร์ทเนอร์ ' + rec.length + ' แห่ง' : 'ใช้ที่ร้านที่ร่วมรายการ ' + rec.length + ' แห่ง') + (pp.serial && pp.serial.on ? ' · มีเลขใบกำกับ' : '') + '</div>';
    paperPreview(pp);
    var ch = $$('.chan'); if (ch[0]) { $('b', ch[0]).textContent = item ? 'แลกที่ร้านพาร์ทเนอร์ที่ร่วมรายการ' : 'หน้าร้าน / POS ของร้านที่ร่วมรายการ'; $('.small', ch[0]).textContent = item ? 'ยื่นคูปองที่ร้าน ร้านจะฉีกก้นคูปองเก็บไว้ แล้วให้ ' + (pp.item || 'ของแถม') + ' · ไม่ต้องซื้อขั้นต่ำ' : 'ยื่นคูปองที่แคชเชียร์ ร้านจะฉีกก้นคูปองเก็บไว้'; }
    var cond = $('.cond'); if (cond) cond.innerHTML = (item ? '<li>แลก ' + E(pp.item) + ' ฟรี</li>' : '') + (pp.min ? '<li>ซื้อครบ ' + B(pp.min) + ' ขึ้นไป</li>' : '') + (pp.back ? '<li>' + E(pp.back) + '</li>' : '') + '<li>ใช้ที่หน้าร้านที่ร่วมรายการเท่านั้น</li><li>ไม่ทอนเงินสด · แลกเป็นเงินสดไม่ได้</li>' + (pp.serial && pp.serial.on ? '<li>ใบนี้มีเลขกำกับ ใช้ได้ครั้งเดียว</li>' : '');
    var place = $('#lpPlaces'); if (!place) { var sc = $$('.card')[2] || $$('.card').pop(); (ch[0] ? ch[0].closest('.card') : sc).insertAdjacentHTML('afterend', '<div class="card" id="lpPlaces"><div class="card-b"></div></div>'); place = $('#lpPlaces'); }
    $('.card-b', place).innerHTML = '<h6 class="mb8">ร้านที่รับคูปองนี้ (' + rec.length + ')</h6>' + rec.map(function (u) { return '<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--g200)"><div><b>' + E(u.name) + '</b>' + (u.kind === 'ext' ? '<div class="small muted">' + E(u.branches || '') + '</div>' : '') + '</div>' + kindChipP(u) + '</div>'; }).join('');
  };

  /* ===== PAPER COUPON v3 (simplified): 2 groups — card info / conditions & price ===== */
  function paperPreview(pp) {
    var rec = ppRecipients(pp), item = pp.benefit === 'item';
    $$('.pface.front').forEach(function (f) {
      var br = $('.pf-brand', f); if (br) br.textContent = 'PHARMAPLEX · ' + (item ? 'คูปองของแถม' : 'คูปองส่วนลด');
      var big = $('.big', f); if (big) big.textContent = item ? 'ฟรี!' : B(pp.value);
      var sub = $('.pf-sub', f); if (sub) sub.textContent = item ? 'แลก ' + (pp.item || 'ของแถม') + ' ฟรี' + (pp.min ? ' เมื่อซื้อครบ ' + B(pp.min) : '') : 'ส่วนลดทันที' + (pp.min ? ' เมื่อซื้อสินค้าครบ ' + B(pp.min) : '');
      var ch = $$('.pf-chips span', f); if (ch[0]) ch[0].textContent = item ? 'แลกที่ร้านพาร์ทเนอร์ (ดูด้านหลัง)' : 'ใช้ที่ร้านที่ร่วมรายการ (ดูด้านหลัง)'; if (ch[2]) ch[2].style.display = 'none';
      var ft = $('.pf-foot', f); if (ft) ft.textContent = (pp.end ? 'ใช้ได้ถึง ' + dm(pp.end) + ' · ' : '') + pp.name.replace('คูปองกระดาษ ', '') + (pp.serial && pp.serial.on ? ' · เลขที่ ' + PMP.serialLabel(pp, pp.serial.from) : '');
      var cd = $('.stub .cd', f); if (cd) cd.textContent = pp.code;
    });
    $$('.pface.rear').forEach(function (r) {
      var h = $('.pb-h span', r); if (h) h.textContent = 'ชุด ' + pp.code;
      var cols = $$('.pb-cols > div', r), ul = cols[0] && $('ul', cols[0]);
      if (cols[0]) { var hh = $('h6', cols[0]); if (hh) hh.textContent = item ? 'แลกได้ที่ร้านพาร์ทเนอร์' : 'ใช้ได้ที่ร้าน/สาขา'; var ch2 = $('.pb-chan', cols[0]); if (ch2) ch2.innerHTML = '<div class="y">✔ ใช้ที่หน้าร้านเท่านั้น</div><div class="n">✘ ใช้สั่งซื้อออนไลน์ไม่ได้</div>'; }
      if (ul) ul.innerHTML = rec.slice(0, 6).map(function (u) { return '<li>' + E(u.name) + (u.kind === 'ext' && u.branches ? ' — ' + E(u.branches) : '') + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : '');
      if (cols[1]) { var cu = $('ul', cols[1]); if (cu) cu.innerHTML = (item ? '<li>แลก ' + E(pp.item || '') + ' ฟรี</li>' : '') + (pp.min ? '<li>ซื้อครบ ' + B(pp.min) + ' ขึ้นไป</li>' : '') + (pp.back ? '<li>' + E(pp.back) + '</li>' : '') + '<li>ไม่ทอนเงินสด · แลกเป็นเงินสดไม่ได้</li><li>ร้านส่งก้นเบิกภายใน ' + pp.payDays + ' วัน</li>' + (pp.end ? '<li>ใช้ได้ ' + (pp.start ? dm(pp.start) + ' – ' : 'ถึง ') + dm(pp.end) + '</li>' : ''); }
    });
  }
  H['coupon/03-admin-paper-editor.html'] = function () {
    var cfg = PMP.cfg(), pp0 = ppSel(), id = pp0.id, root = $('#screen');
    var P = function () { return recOf('paper', id); };
    function S(fn) { editRec('paper', id, fn); paperPreview(P()); refresh(); }
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (p) { return { id: p.id, label: p.code + ' · ' + p.name }; }), id, function (v) { U.wr('pmpc.live.paper', v); location.href = location.pathname; }, function () { location.href = '12-admin-paper-template.html'; }, '＋ สร้างชุดใหม่');
    var h4 = $('.page-head h4 .mono-b'); if (h4) h4.textContent = P().code;
    bindc(ctl(root, 'รหัสชุด'), function () { return P().code; }, function (v) { S(function (r) { r.code = String(v).toUpperCase(); }); if (h4) h4.textContent = String(v).toUpperCase(); }, 'text');
    bindc(ctl(root, 'ชื่อ/ที่มาของชุด'), function () { return P().name; }, function (v) { S(function (r) { r.name = v; }); }, 'text');
    bindc(ctl(root, 'จำนวนที่ออก'), function () { return P().issued; }, function (v) { S(function (r) { r.issued = v; }); }, 'num');
    var df = $$('.field', root).filter(function (f) { return /ใช้ได้ตั้งแต่/.test(f.textContent); })[0], dd = df ? $$('input', df) : [];
    bindc(dd[0], function () { return P().start || ''; }, function (v) { S(function (r) { r.start = v; }); }, 'date'); bindc(dd[1], function () { return P().end || ''; }, function (v) { S(function (r) { r.end = v; }); }, 'date');
    // price / benefit
    bindRadio(root, 'benefit', function () { return P().benefit; }, function (v) { S(function (r) { r.benefit = v; if (v === 'item' && !r.item) r.item = 'ของแถม 1 ชิ้น'; }); updateReveal(); }, function (m) { return m; });
    bindRadio(root, 'settle', function () { return P().settle; }, function (v) { S(function (r) { r.settle = v; }); updateReveal(); }, function (m) { return m; });
    bindRadio(root, 'shopmode', function () { return P().stores.mode; }, function (v) { S(function (r) { r.stores.mode = v === 'pick' ? 'pick' : 'all'; }); updateReveal(); }, function (m) { return m; });
    bindc(ctl(root, 'มูลค่าส่วนลดต่อใบ'), function () { return P().value; }, function (v) { S(function (r) { r.value = v; if (r.benefit === 'discount') r.cost = v; }); }, 'num');
    bindc(ctl(root, 'รายการที่แลกได้ฟรี'), function () { return P().item || ''; }, function (v) { S(function (r) { r.item = v; }); }, 'text');
    bindc(ctl(root, 'ยอดซื้อขั้นต่ำ'), function () { return P().min || ''; }, function (v) { S(function (r) { r.min = v; }); }, 'num');
    bindc(ctl(root, 'ราคาจ่ายต่อใบ'), function () { var p = P(); return p.benefit === 'item' ? (p.cost || '') : p.value; }, function (v) { S(function (r) { if (r.benefit === 'item') r.cost = v; else { r.value = v; r.cost = v; } }); }, 'num');
    bindc(ctl(root, 'ส่งก้นเบิกภายใน'), function () { return P().payDays; }, function (v) { S(function (r) { r.payDays = v; }); }, 'num');
    updateReveal();
    // recipients
    var pk = $('[data-reveal="shopmode=pick"]', root);
    function rows() { return PMP.partners().map(function (u) { return '<tr><td><input type="checkbox" data-lps="' + u.id + '"' + (P().stores.ids.indexOf(u.id) > -1 ? ' checked' : '') + '></td><td><b>' + E(u.name) + '</b>' + (u.kind === 'ext' ? '<div class="small muted">' + E(u.cat || '') + (u.contact ? ' · ' + E(u.contact) : '') + '</div>' : '') + '</td><td>' + kindChipP(u) + '</td><td>' + E(u.kind === 'ext' ? (u.branches || '-') : 'ในระบบ') + '</td><td>' + (u.kind === 'ext' ? '<button class="btn text sm grey" type="button" data-lpdel="' + u.id + '">✕ ลบพาร์ทเนอร์</button>' : '') + '</td></tr>'; }).join(''); }
    function drawRec() { var tb = $('table.table tbody', pk); tb.innerHTML = rows(); $$('[data-lps]', pk).forEach(function (cb) { bindc(cb, function () { return P().stores.ids.indexOf(cb.getAttribute('data-lps')) > -1; }, function (v) { S(function (r) { var i = r.stores.ids.indexOf(cb.getAttribute('data-lps')); if (v && i < 0) r.stores.ids.push(cb.getAttribute('data-lps')); if (!v && i > -1) r.stores.ids.splice(i, 1); }); }, 'chk'); }); }
    if (pk) {
      drawRec(); var ab = $$('button', pk).filter(function (b) { return /เพิ่มและเลือก/.test(b.textContent); })[0], ai = $$('.row input', pk);
      ab.onclick = function () { var n = ai[0].value.trim(); if (!n) { toast('กรอกชื่อพาร์ทเนอร์', true); return; } var nid = U.uid('x'); setCfg(function (c) { c.partners = c.partners || []; c.partners.push({ id: nid, name: n, kind: 'ext', cat: '', contact: ai[1].value, branches: ai[2].value }); var p = c.paper.filter(function (x) { return x.id === id; })[0]; p.stores.mode = 'pick'; p.stores.ids.push(nid); }); ai.forEach(function (x) { x.value = ''; }); drawRec(); paperPreview(P()); refresh(); toast('เพิ่มพาร์ทเนอร์แล้ว'); };
      if (!pk._ld) { pk._ld = 1; pk.addEventListener('click', function (e) { var d = e.target.closest('[data-lpdel]'); if (!d) return; var pid = d.getAttribute('data-lpdel'), who = PMP.partner(pid); if (!confirm('ลบพาร์ทเนอร์ “' + who.name + '” ออกจากทะเบียน? (จะถูกถอดออกจากทุกชุด · คำขอเบิกเดิมยังอยู่)')) return; setCfg(function (c) { c.partners = (c.partners || []).filter(function (x) { return x.id !== pid; }); c.paper.forEach(function (p) { p.stores.ids = p.stores.ids.filter(function (x) { return x !== pid; }); }); }); drawRec(); paperPreview(P()); refresh(); toast('ลบพาร์ทเนอร์แล้ว'); }); }
    }
    function refresh() {
      var p = P(), soft = $('.soft', root), n = p.stores.mode === 'all' ? ppRecipients(p).length : p.stores.ids.length, len = 0;
      if (soft) soft.innerHTML = '<b>ยอดรับผิดชอบสูงสุด (ถ้าแลกครบทุกใบ)</b><div class="small muted mt8">' + p.issued.toLocaleString() + ' ใบ × ' + B(PMP.paperUnit(p)) + ' = <b>' + B(p.issued * PMP.paperUnit(p)) + '</b>' + (p.settle === 'sponsored' && p.benefit === 'item' ? ' (พาร์ทเนอร์ออกให้เอง — ไม่มีการจ่าย)' : '') + ' — ใช้ประกอบการอนุมัติงบ</div>';
      var ck = $$('.vlist > div'); function setCk(i, ok, txt, warn) { if (!ck[i]) return; var b = $('.ck', ck[i]); b.className = 'ck ' + (ok ? 'y' : warn ? 'w' : 'n'); b.textContent = ok ? '✓' : warn ? '!' : '✕'; $('span:last-child', ck[i]).innerHTML = txt; }
      setCk(0, !!(p.code && p.name && p.issued > 0 && p.end), '① ข้อมูลบนบัตรครบ · รหัส ' + E(p.code) + ' ไม่ซ้ำ');
      setCk(1, (p.benefit === 'discount' ? p.value > 0 : !!p.item) && n > 0, '② สิทธิ์และราคาครบ · ผู้รับ ' + n + ' ราย' + (n ? '' : ' — เลือกอย่างน้อย 1 ราย'));
      var pub = $$('.btn.contained', root).filter(function (b) { return /เผยแพร่/.test(b.textContent); })[0]; if (pub) pub.disabled = len > 160 || n < 1;
      if (window.__ppChk) window.__ppChk();
    }
    paperPreview(P()); refresh();
  };
  /* ===== PAPER COUPON v4: numbered back conditions · editable fine print · stub barcode rotated 90° · print export ===== */
  var PT_MAX = 8, PT_LEN = 80, NOTE_MAX = 240;
  function paperTermsList(pp) {
    var a = [];
    if (pp.benefit === 'item') a.push('แลก ' + (pp.item || 'ของแถม') + ' ฟรี');
    if (pp.min) a.push('ซื้อครบ ' + B(pp.min) + ' ขึ้นไป');
    (pp.terms || []).forEach(function (t) { if (t) a.push(t); });
    a.push('ไม่ทอนเงินสด · แลกเป็นเงินสดไม่ได้');
    if (pp.end) a.push('ใช้ได้ ' + (pp.start ? dm(pp.start) + ' – ' : 'ถึง ') + dm(pp.end));
    return a;
  }
  function paperNote(pp) { return pp.note != null ? pp.note : PMP.PAPER_NOTE; }
  function paperPreview(pp, root) {
    root = root || document;
    var rec = ppRecipients(pp), item = pp.benefit === 'item', bc = PMP.code128svg(pp.code, 40);
    $$('.pface', root).forEach(function (f) { var t = f.getAttribute('data-tpl') || pp.tpl || 'classic', th = f.getAttribute('data-theme') || pp.theme || 'red'; f.className = f.className.replace(/\b(?:t|th)-[a-z]+\b/g, '').replace(/\s+/g, ' ').trim() + ' t-' + t + ' th-' + th; });
    $$('.pface.front', root).forEach(function (f) {
      var br = $('.pf-brand', f); if (br) br.textContent = 'PHARMAPLEX · ' + (item ? 'คูปองของแถม' : 'คูปองส่วนลด');
      var big = $('.big', f); if (big) big.textContent = item ? 'ฟรี!' : B(pp.value);
      var sub = $('.pf-sub', f); if (sub) sub.textContent = item ? 'แลก ' + (pp.item || 'ของแถม') + ' ฟรี' + (pp.min ? ' เมื่อซื้อครบ ' + B(pp.min) : '') : 'ส่วนลดทันที' + (pp.min ? ' เมื่อซื้อสินค้าครบ ' + B(pp.min) : '');
      var ch = $$('.pf-chips span', f); if (ch[0]) ch[0].textContent = item ? 'แลกที่ร้านพาร์ทเนอร์ (ดูด้านหลัง)' : 'ใช้ที่ร้านที่ร่วมรายการ (ดูด้านหลัง)'; if (ch[1]) ch[1].style.display = 'none'; if (ch[2]) ch[2].style.display = 'none';
      var ft = $('.pf-foot', f); if (ft) ft.textContent = (pp.end ? 'ใช้ได้ถึง ' + dm(pp.end) + ' · ' : '') + pp.name.replace('คูปองกระดาษ ', '');
      var st = $('.stub', f); if (st) st.innerHTML = '<div class="stub-in"><div class="barcode svg">' + bc.svg + '</div><div class="cd">' + E(pp.code) + '</div><div class="tr">✂ ก้นคูปอง · ร้านฉีกเก็บไว้เบิก</div></div>';
    });
    $$('.pface.rear', root).forEach(function (r) {
      var h = $('.pb-h span', r); if (h) h.textContent = 'ชุด ' + pp.code;
      var cols = $$('.pb-cols > div', r), ul = cols[0] && $('ul', cols[0]);
      if (cols[0]) { var hh = $('h6', cols[0]); if (hh) hh.textContent = item ? 'แลกได้ที่ร้านพาร์ทเนอร์' : 'ใช้ได้ที่ร้าน/สาขา'; var ch2 = $('.pb-chan', cols[0]); if (ch2) ch2.innerHTML = '<div class="y">✔ ใช้ที่หน้าร้านเท่านั้น</div>'; }
      if (ul) ul.innerHTML = rec.slice(0, 6).map(function (u) { return '<li>' + E(u.name) + (u.kind === 'ext' && u.branches ? ' — ' + E(u.branches) : '') + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li class="ln">ทุกร้านที่ลงทะเบียนในระบบ</li>' : '');
      if (cols[1]) { var cu = $('ul', cols[1]); if (cu) { cu.className = 'nm'; cu.innerHTML = paperTermsList(pp).map(function (t) { return '<li>' + E(t) + '</li>'; }).join(''); } }
      var nt = $('.pb-note', r); if (nt) nt.textContent = paperNote(pp);
      var st = $('.stub', r); if (st) st.innerHTML = '<div class="stub-in"><div class="cd" style="font-size:11px">ก้นคูปอง</div></div>';
    });
  }

  /* customer info page: numbered conditions from the same list */
  (function () {
    var prev = H['coupon/10-customer-paper-info.html'];
    H['coupon/10-customer-paper-info.html'] = function () {
      prev(); var pp = ppSel(), cond = $('.cond'); if (!pp || !cond) return;
      cond.innerHTML = paperTermsList(pp).map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '<li>ใช้ที่หน้าร้านที่ร่วมรายการเท่านั้น</li>';
    };
  })();

  /* editor: terms list + fine print */
  (function () {
    var prev = H['coupon/03-admin-paper-editor.html'];
    H['coupon/03-admin-paper-editor.html'] = function () {
      prev();
      var id = ppSel().id, root = $('#screen'), P = function () { return recOf('paper', id); };
      var box = $('#termsBox', root), add = $('#termAdd', root), cnt = $('#termCnt', root), ta = $('#noteTa', root), nc = $('#noteCnt', root), rs = $('#noteReset', root);
      function S(fn) { editRec('paper', id, fn); paperPreview(P()); chk(); }
      function chk() {
        var p = P(), n = (p.terms || []).length, nl = paperNote(p).length;
        cnt.textContent = n + ' / ' + PT_MAX + ' ข้อ'; add.disabled = n >= PT_MAX;
        nc.textContent = nl + ' / ' + NOTE_MAX; nc.classList.toggle('bad', nl > NOTE_MAX);
        var ck = $$('.vlist > div')[2];
        if (ck) { var okc = nl <= NOTE_MAX, b = $('.ck', ck); b.className = 'ck ' + (okc ? 'y' : 'n'); b.textContent = okc ? '✓' : '✕'; $('span:last-child', ck).innerHTML = '③ เงื่อนไขหลังบัตร ' + n + ' ข้อ · หมายเหตุท้ายบัตร ' + nl + ' / ' + NOTE_MAX + (okc ? '' : ' — เกิน ตัดออก ' + (nl - NOTE_MAX) + ' ตัว'); }
        var pub = $$('.btn.contained', root).filter(function (b) { return /เผยแพร่/.test(b.textContent); })[0];
        var rn = P().stores.mode === 'all' ? ppRecipients(P()).length : P().stores.ids.length; if (pub) pub.disabled = nl > NOTE_MAX || rn < 1;
      }
      function draw() {
        var t = P().terms || [];
        box.innerHTML = t.map(function (x, i) { return '<div class="row" style="gap:8px;margin-bottom:6px"><span class="muted" style="width:22px">' + (i + 1) + '.</span><input class="input" maxlength="' + PT_LEN + '" data-lt="' + i + '" value="' + E(x) + '"><button class="btn text sm grey" type="button" data-ltdel="' + i + '">✕</button></div>'; }).join('') || '<div class="help" style="margin-bottom:6px">ยังไม่มีเงื่อนไขเพิ่มเติม — ระบบพิมพ์ “ไม่ทอนเงินสด” และช่วงวันที่ให้เอง</div>';
        chk();
      }
      if (!box._l) {
        box._l = 1;
        box.addEventListener('input', function (e) { var i = e.target.getAttribute && e.target.getAttribute('data-lt'); if (i == null) return; S(function (r) { r.terms[+i] = e.target.value.slice(0, PT_LEN); }); flashSaved(); });
        box.addEventListener('click', function (e) { var d = e.target.closest('[data-ltdel]'); if (!d) return; var i = +d.getAttribute('data-ltdel'); editRec('paper', id, function (r) { r.terms.splice(i, 1); }); draw(); paperPreview(P()); flashSaved(); });
        add.onclick = function () { if ((P().terms || []).length >= PT_MAX) return; editRec('paper', id, function (r) { r.terms = r.terms || []; r.terms.push(''); }); draw(); var ins = $$('input', box); if (ins.length) ins[ins.length - 1].focus(); };
        ta.addEventListener('input', function () { S(function (r) { r.note = ta.value; }); flashSaved(); });
        rs.onclick = function () { ta.value = PMP.PAPER_NOTE; S(function (r) { r.note = PMP.PAPER_NOTE; }); flashSaved(); };
      }
      window.__ppChk = chk; ta.value = paperNote(P()); draw(); paperPreview(P());
    };
  })();

  /* ---- coupon/11 ส่งออกไฟล์สั่งพิมพ์ ---- */
  var PRT_CSS = 'html,body{margin:0;padding:0}body{font-family:"Noto Sans Thai",Tahoma,sans-serif;color:#222;background:#cfcfcf}.pg{position:relative;background:#fff;margin:0 auto 6mm;overflow:hidden;page-break-after:always;break-after:page}.pg:last-child{margin-bottom:0}'
    + '.art{position:absolute;overflow:hidden}.card{position:absolute;overflow:hidden}.cm{position:absolute;background:#000}'
    + '.pm{position:absolute;left:0;top:0;bottom:0;width:78%;box-sizing:border-box}.sb{position:absolute;top:0;bottom:0;width:22%}'
    + '.br{font-size:9pt;font-weight:800;letter-spacing:.14em;color:#B71C1C}.big{font-size:54pt;font-weight:800;line-height:1.05;color:#B71C1C;margin:1mm 0 0}.sub{font-size:14pt;font-weight:700}.chip{display:inline-block;border:.3mm solid #888;border-radius:1.5mm;padding:.3mm 2mm;font-size:8pt;font-weight:600;margin-top:3mm}.ft{position:absolute;left:10mm;right:6mm;bottom:5mm;border-top:.25mm solid #bbb;padding-top:1.5mm;font-size:8pt;color:#555}'
    + '.si{position:absolute;left:50%;top:50%;width:80mm;transform:translate(-50%,-50%) rotate(-90deg);text-align:center}.si svg{width:66mm;height:13mm;display:block;margin:0 auto}.si .cd{font:700 11pt ui-monospace,Consolas,monospace;margin-top:1mm}.si .tr{font-size:7.5pt;color:#555;margin-top:1mm}'
    + '.perf{position:absolute;top:0;bottom:0;border-left:.35mm dashed #777}.bh{display:flex;justify-content:space-between;font-weight:800;font-size:10pt;border-bottom:.6mm solid #222;padding-bottom:1mm;margin-bottom:2mm}.bc{display:grid;grid-template-columns:1fr 1fr;gap:6mm;font-size:8.5pt;line-height:1.35}.bc h6{font-size:9.5pt;font-weight:800;color:#B71C1C;margin:0 0 1mm}.bc ul{margin:0;padding:0;list-style:none}.bc li{position:relative;padding-left:3.5mm}.bc ul.dt li:before{content:"•";position:absolute;left:0}.bc ol{margin:0;padding:0;list-style:none;counter-reset:n}.bc ol li{counter-increment:n;padding-left:4.5mm}.bc ol li:before{content:counter(n) ".";position:absolute;left:0;font-weight:700}.bc .y{font-weight:700;color:#1B5E20;margin-top:1.5mm}.nt{position:absolute;left:8mm;right:6mm;bottom:4mm;border-top:.25mm dashed #888;padding-top:1mm;font-size:6.5pt;color:#555;line-height:1.3}';
  function prtOpts() { var o = U.rd('pmpc.live.print.' + ppSel().id) || {}; return { bleed: o.bleed !== false, crop: o.crop !== false, perf: o.perf !== false }; }
  function prtDoc(pp, o, autoPrint) {
    var Bm = o.bleed ? 3 : 0, M = o.crop ? 9 : 4, TW = 210, TH = 95, AW = TW + 2 * Bm, AH = TH + 2 * Bm, W = AW + 2 * M, Hh = AH + 2 * M, X0 = M + Bm, Y0 = M + Bm, item = pp.benefit === 'item';
    var bc = PMP.code128svg(pp.code, 40), rec = ppRecipients(pp), mm = function (n) { return n + 'mm'; }, sw = TW * 0.22, mw = TW - sw;
    function marks() {
      if (!o.crop) return ''; var s = '', L = 4, g = Bm + 1, xs = [X0, X0 + TW], ys = [Y0, Y0 + TH];
      xs.forEach(function (x) { ys.forEach(function (y) {
        var dx = x === X0 ? -1 : 1, dy = y === Y0 ? -1 : 1;
        s += '<div class="cm" style="left:' + mm(dx < 0 ? x - g - L : x + g) + ';top:' + mm(y - .125) + ';width:' + mm(L) + ';height:.25mm"></div>';
        s += '<div class="cm" style="top:' + mm(dy < 0 ? y - g - L : y + g) + ';left:' + mm(x - .125) + ';height:' + mm(L) + ';width:.25mm"></div>';
      }); });
      return s;
    }
    function page(inner, tint) { return '<section class="pg" style="width:' + mm(W) + ';height:' + mm(Hh) + '"><div class="art" style="left:' + mm(M) + ';top:' + mm(M) + ';width:' + mm(AW) + ';height:' + mm(AH) + ';background:' + tint + '"></div><div class="card" style="left:' + mm(X0) + ';top:' + mm(Y0) + ';width:' + mm(TW) + ';height:' + mm(TH) + '">' + inner + '</div>' + marks() + '</section>'; }
    var front = '<div class="pm" style="padding:9mm 6mm 4mm 10mm"><div class="br">PHARMAPLEX · ' + (item ? 'คูปองของแถม' : 'คูปองส่วนลด') + '</div><div class="big">' + (item ? 'ฟรี!' : B(pp.value)) + '</div><div class="sub">' + (item ? 'แลก ' + E(pp.item || 'ของแถม') + ' ฟรี' + (pp.min ? ' เมื่อซื้อครบ ' + B(pp.min) : '') : 'ส่วนลดทันที' + (pp.min ? ' เมื่อซื้อสินค้าครบ ' + B(pp.min) : '')) + '</div><span class="chip">' + (item ? 'แลกที่ร้านพาร์ทเนอร์ (ดูด้านหลัง)' : 'ใช้ที่ร้านที่ร่วมรายการ (ดูด้านหลัง)') + '</span><div class="ft">' + (pp.end ? 'ใช้ได้ถึง ' + E(dm(pp.end)) + ' · ' : '') + E(pp.name.replace('คูปองกระดาษ ', '')) + '</div></div>'
      + '<div class="sb" style="right:0;background:rgba(0,0,0,.03)"><div class="si"><div>' + bc.svg + '</div><div class="cd">' + E(pp.code) + '</div><div class="tr">✂ ก้นคูปอง · ร้านฉีกเก็บไว้เบิก</div></div></div>' + (o.perf ? '<div class="perf" style="left:' + mm(mw) + '"></div>' : '');
    var back = '<div class="sb" style="left:0;background:rgba(0,0,0,.03)"><div class="si"><div class="cd" style="margin:0">ก้นคูปอง</div></div></div>' + (o.perf ? '<div class="perf" style="left:' + mm(sw) + '"></div>' : '')
      + '<div class="pm" style="left:' + mm(sw) + ';width:' + mm(mw) + ';padding:7mm 6mm 4mm 7mm"><div class="bh"><span>เงื่อนไขการใช้คูปอง</span><span style="font-family:ui-monospace,Consolas,monospace;font-size:9pt">ชุด ' + E(pp.code) + '</span></div><div class="bc"><div><h6>' + (item ? 'แลกได้ที่ร้านพาร์ทเนอร์' : 'ใช้ได้ที่ร้าน/สาขา') + '</h6><ul class="dt">' + rec.slice(0, 6).map(function (u) { return '<li>' + E(u.name) + (u.kind === 'ext' && u.branches ? ' — ' + E(u.branches) : '') + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li>ทุกร้านที่ลงทะเบียนในระบบ</li>' : '') + '</ul><div class="y">✔ ใช้ที่หน้าร้านเท่านั้น</div></div><div><h6>สิทธิ์และเงื่อนไข</h6><ol>' + paperTermsList(pp).map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ol></div></div><div class="nt">' + E(paperNote(pp)) + '</div></div>';
    return '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + E(pp.code) + ' — ไฟล์พิมพ์คูปองกระดาษ</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&display=swap"><style>@page{size:' + mm(W) + ' ' + mm(Hh) + ';margin:0}' + PRT_CSS + '@media screen{.pg{box-shadow:0 1px 6px rgba(0,0,0,.3);margin-top:6mm}}@media print{body{background:#fff}.pg{margin:0;box-shadow:none}}</style></head><body>' + page(front, '#FFF3F3') + page(back, '#fff') + (autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.print()},700)}<\/script>' : '') + '</body></html>';
  }
  function dl(name, text, mime) { var b = new Blob([text], { type: mime + ';charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 600); }
  H['coupon/11-admin-paper-print.html'] = function () {
    var cfg = PMP.cfg(), pp = ppSel(), id = pp.id, root = $('#screen');
    pickBar2($('.page-head'), 'livePick', cfg.paper.map(function (x) { return { id: x.id, label: x.code + ' · ' + x.name }; }), id, function (v) { U.wr('pmpc.live.paper', v); rerender(); }, null);
    var h4 = $('.page-head h4 .mono-b'); if (h4) h4.textContent = pp.code;
    var KEY = 'pmpc.live.print.' + id, LOG = 'pmpc.live.printlog';
    function opt(fn) { var o = U.rd(KEY) || {}; fn(o); U.wr(KEY, o); flashSaved(); render(); }
    var o0 = prtOpts();
    $('#pQty').value = pp.issued.toLocaleString();
    $('#pBleed').checked = o0.bleed; $('#pCrop').checked = o0.crop; $('#pPerf').checked = o0.perf;
    [['pBleed', 'bleed', 'chk'], ['pCrop', 'crop', 'chk'], ['pPerf', 'perf', 'chk']].forEach(function (d) {
      var el = $('#' + d[0]); el.addEventListener(d[2] ? 'change' : (el.tagName === 'SELECT' ? 'change' : 'input'), function () { opt(function (o) { o[d[1]] = d[2] ? el.checked : el.value; }); });
    });
    function checks() {
      var p = recOf('paper', id), rn = ppRecipients(p).length, sent = (U.rd(LOG) || []).filter(function (x) { return x.id === id; }).reduce(function (a, x) { return a + (x.type === 'ไฟล์พิมพ์' || x.type === 'PDF' ? x.qty : 0); }, 0);
      var L = [];
      L.push([rn > 0, rn > 0 ? 'มีผู้รับคูปอง ' + rn + ' ราย' : 'ยังไม่มีผู้รับคูปอง — เลือกที่หน้าตั้งค่า', false]);
      L.push([!!(p.end && p.issued > 0), p.end && p.issued > 0 ? 'จำนวนที่ออก ' + p.issued.toLocaleString() + ' ใบ · ใช้ได้ถึง ' + dm(p.end) : 'ยังไม่ระบุจำนวน/วันสิ้นสุด', false]);
      L.push([/^[A-Z0-9]{2,12}$/.test(p.code), /^[A-Z0-9]{2,12}$/.test(p.code) ? 'รหัสชุด ' + p.code + ' เข้ารหัสเป็นบาร์โค้ด Code 128 ได้' : 'รหัสชุดต้องเป็น A–Z / 0–9', false]);
      var tl = (p.terms || []).length; L.push([tl <= PT_MAX && paperNote(p).length <= NOTE_MAX, 'เงื่อนไข ' + tl + ' ข้อ · หมายเหตุท้ายบัตร ' + paperNote(p).length + ' / ' + NOTE_MAX, false]);
      L.push([true, 'ใช้ได้หน้าร้านเท่านั้น (ทุกใบเหมือนกัน ไม่มีเลขรันนิ่ง)', false]);
      if (sent > p.issued) L.push([false, 'พิมพ์สะสม ' + sent.toLocaleString() + ' ใบ เกินจำนวนที่ออก — ตรวจก่อนส่งซ้ำ', true]);
      return L;
    }
    function render() {
      var p = recOf('paper', id), o = prtOpts(), ls = checks(), blocked = ls.some(function (x) { return !x[0] && !x[2]; });
      $('#pfl').innerHTML = ls.map(function (x) { return '<div><span class="ck ' + (x[0] ? 'y' : x[2] ? 'w' : 'n') + '">' + (x[0] ? '✓' : x[2] ? '!' : '✕') + '</span><span>' + E(x[1]) + '</span></div>'; }).join('');
      ['xPrint', 'xHtml'].forEach(function (k) { $('#' + k).disabled = blocked; });
      var Bm = o.bleed ? 3 : 0, M = o.crop ? 9 : 4, W = 210 + 2 * Bm + 2 * M, Hh = 95 + 2 * Bm + 2 * M;
      $('#pSheet').textContent = 'ขนาดกระดาษไฟล์ ' + W + ' × ' + Hh + ' มม. · 2 หน้า';
      var fr = $('#pFrame'), wrap = $('#pPrev'), pxW = Math.round(W * 3.78) + 40, pxH = Math.round(Hh * 3.78) * 2 + 80, s = Math.min(1, (wrap.clientWidth || 640) / pxW);
      fr.style.width = pxW + 'px'; fr.style.height = pxH + 'px'; fr.style.transform = 'scale(' + s + ')'; wrap.style.height = Math.round(pxH * s) + 'px';
      fr.srcdoc = prtDoc(p, o, false);
      var lg = (U.rd(LOG) || []).slice(0, 8);
      $('#pLog').innerHTML = lg.map(function (x) { return '<tr><td class="nowrap">' + E(x.at) + '</td><td class="mono">' + E(x.code) + '</td><td>' + E(x.type) + '</td><td class="num">' + x.qty.toLocaleString() + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="center muted" style="padding:16px">ยังไม่เคยส่งออก</td></tr>';
    }
    function logIt(type) { var p = recOf('paper', id), lg = U.rd(LOG) || []; lg.unshift({ id: id, code: p.code, type: type, qty: p.issued, at: dmy(PMP.cfg().now) + ' ' + new Date().toTimeString().slice(0, 5) }); U.wr(LOG, lg.slice(0, 40)); render(); }
    $('#xPrint').onclick = function () { var p = recOf('paper', id), w = window.open('', '_blank'); if (!w) { toast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — อนุญาตป๊อปอัปแล้วลองใหม่', true); return; } w.document.open(); w.document.write(prtDoc(p, prtOpts(), true)); w.document.close(); logIt('PDF'); };
    $('#xHtml').onclick = function () { var p = recOf('paper', id); dl(p.code + '-print.html', prtDoc(p, prtOpts(), false), 'text/html'); logIt('ไฟล์พิมพ์'); toast('ดาวน์โหลด ' + p.code + '-print.html แล้ว'); };
    render();
  };

  /* ===== PAPER COUPON v5: templates (layout) + colour themes ===== */
  function tplOf(id) { return PMP.PAPER_TPL.filter(function (t) { return t.id === id; })[0] || PMP.PAPER_TPL[0]; }
  function tplSkel(side, s, tpl, theme) {
    var cls = ' t-' + tpl + ' th-' + theme, att = ' data-tpl="' + tpl + '" data-theme="' + theme + '"';
    if (side === 'front') return '<div class="pcw" style="--s:' + s + '"><div class="pcs"><div class="pface front' + cls + '"' + att + '><span class="cap">หน้า</span><div class="pf-main"><div class="pf-brand"></div><div class="big"></div><div class="pf-sub"></div><div class="pf-chips"><span></span><span></span><span></span></div><div class="pf-foot"></div></div><div class="stub"></div></div></div></div>';
    return '<div class="pcw" style="--s:' + s + '"><div class="pcs"><div class="pface rear' + cls + '"' + att + '><span class="cap">หลัง</span><div class="pb-main"><div class="pb-h">เงื่อนไขการใช้คูปอง<span></span></div><div class="pb-cols"><div><h6></h6><ul></ul><div class="pb-chan"></div></div><div><h6>สิทธิ์และเงื่อนไข</h6><ul></ul></div></div><div class="pb-note"></div></div><div class="stub"></div></div></div></div>';
  }
  function tplSample(benefit, extra) {
    var now = PMP.cfg().now;
    return Object.assign({ code: 'SAMPLE', name: 'ตัวอย่างงานสัมมนา', benefit: benefit, value: 100, min: 500, item: 'ไอศกรีมวานิลลา 1 ถ้วย', terms: ['ใช้ได้ 1 ใบ/บิล'], note: PMP.PAPER_NOTE, stores: { mode: 'all', ids: [] }, start: now, end: PMP.addDays(now, 90) }, extra || {});
  }
  function swatches(host, cur, onPick) {
    $$('.sw', host).forEach(function (x) { x.parentNode.removeChild(x); });
    Object.keys(PMP.PAPER_THEMES).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sw' + (k === cur ? ' on' : ''); b.title = PMP.PAPER_THEMES[k].n; b.style.background = PMP.PAPER_THEMES[k].pc;
      b.onclick = function () { onPick(k); }; host.appendChild(b);
    });
  }

  /* editor: template name + colour swatches */
  (function () {
    var prev = H['coupon/03-admin-paper-editor.html'];
    H['coupon/03-admin-paper-editor.html'] = function () {
      prev();
      var id = ppSel().id, root = $('#screen'), P = function () { return recOf('paper', id); };
      function draw() {
        var p = P(), t = tplOf(p.tpl); $('#tplName', root).textContent = 'template: ' + t.name; $('#tplDesc', root).textContent = t.desc;
        $('#tplChange', root).href = '12-admin-paper-template.html?for=' + id;
        swatches($('#tplSw', root), p.theme || 'red', function (k) { editRec('paper', id, function (r) { r.theme = k; }); draw(); paperPreview(P()); flashSaved(); });
        if (p.active && p.published) $('#tplChange', root).classList.add('disabled');
      }
      draw();
    };
  })();

  /* coupon/12 เลือก template */
  H['coupon/12-admin-paper-template.html'] = function () {
    var cfg = PMP.cfg(), q = /[?&]for=(\w+)/.exec(location.search), cur = q ? recOf('paper', q[1]) : null, root = $('#screen');
    var st = { tpl: cur ? (cur.tpl || 'classic') : 'classic', theme: cur ? (cur.theme || 'red') : 'red', fit: 'all' };
    if (cur) { $('#tplTitle').textContent = 'เปลี่ยน template — ชุด ' + cur.code; $('#tplSub').textContent = 'ตัวอย่างใช้ข้อมูลจริงของชุดนี้ · เลือกแล้วกลับไปหน้าแก้ไข'; $('#tplGo').textContent = 'ใช้ template นี้ → กลับไปแก้ไข'; $('#dupCard').style.display = 'none'; }
    function pickPP(tpl) { var t = tplOf(tpl); return cur ? Object.assign({}, cur, { tpl: tpl, theme: st.theme }) : tplSample(t.fit === 'item' ? 'item' : 'discount', { tpl: tpl, theme: st.theme }); }
    function fits(t) { return st.fit === 'all' || t.fit === 'both' || t.fit === st.fit; }
    function render() {
      swatches($('#tplSw'), st.theme, function (k) { st.theme = k; render(); });
      $$('#tplFit button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-fit') === st.fit); });
      $('#tplGrid').innerHTML = PMP.PAPER_TPL.map(function (t) {
        return '<label class="tpl-card' + (st.tpl === t.id ? ' on' : '') + (fits(t) ? '' : ' dim') + '" data-t="' + t.id + '"><input type="radio" name="tpl" value="' + t.id + '"' + (st.tpl === t.id ? ' checked' : '') + '><div class="tpl-th">' + tplSkel('front', 0.4, t.id, st.theme) + '</div><div class="tpl-meta"><b>' + E(t.name) + '</b>' + (st.fit !== 'all' && fits(t) ? ' <span class="chip soft-success sq">แนะนำ</span>' : '') + '<div class="small muted">' + E(t.desc) + '</div></div></label>';
      }).join('');
      $$('#tplGrid .tpl-card').forEach(function (c) { paperPreview(pickPP(c.getAttribute('data-t')), c); });
      var t = tplOf(st.tpl), pv = $('#tplPrev'); pv.innerHTML = tplSkel('front', 0.83, st.tpl, st.theme) + tplSkel('rear', 0.83, st.tpl, st.theme); paperPreview(pickPP(st.tpl), pv);
      $('#tplPick').textContent = t.name + ' · ' + PMP.PAPER_THEMES[st.theme].n;
      $('#tplHelp').textContent = cur ? 'ตัวอย่างใช้ข้อมูลจริงของชุด ' + cur.code : 'ตัวอย่างใช้ข้อมูลสมมติ — ใส่ข้อมูลจริงในขั้นถัดไป' + (t.fit === 'item' ? ' · template นี้ตั้งสิทธิ์เริ่มต้นเป็น “ของแถม/บริการฟรี”' : '');
    }
    $('#tplGrid').addEventListener('click', function (e) { var c = e.target.closest('.tpl-card'); if (!c) return; e.preventDefault(); st.tpl = c.getAttribute('data-t'); render(); });
    $('#tplFit').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.fit = b.getAttribute('data-fit'); render(); });
    function base(extra) { var now = PMP.cfg().now; return Object.assign({ settle: 'pay', serial: { on: false, prefix: '', from: 1, to: 0 }, maxPerStore: 0, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, terms: [], note: PMP.PAPER_NOTE, tpl: st.tpl, theme: st.theme, start: now, end: PMP.addDays(now, 60) }, extra); }
    $('#tplGo').onclick = function () {
      if (cur) { editRec('paper', cur.id, function (r) { r.tpl = st.tpl; r.theme = st.theme; }); U.wr('pmpc.live.paper', cur.id); location.href = '03-admin-paper-editor.html'; return; }
      var nid = U.uid('pp'), item = tplOf(st.tpl).fit === 'item';
      setCfg(function (c) { c.paper.push(base({ id: nid, benefit: item ? 'item' : 'discount', item: item ? 'ของแถม 1 ชิ้น' : '', cost: item ? 25 : 50, code: 'NEW' + nid.slice(2, 5).toUpperCase(), name: 'คูปองกระดาษชุดใหม่', value: 50, min: 0, issued: 500 })); });
      U.wr('pmpc.live.paper', nid); location.href = '03-admin-paper-editor.html';
    };
    if (!cur) {
      var dl = $('#dupList'); dl.innerHTML = cfg.paper.map(function (p) { return '<div class="dup-row"><div><b class="mono-b">' + E(p.code) + '</b> · ' + E(p.name) + '<div class="small muted">' + E(PMP.paperBenefitText(p)) + ' · template ' + E(tplOf(p.tpl).name) + ' · ' + E((PMP.PAPER_THEMES[p.theme || 'red'] || {}).n || '') + '</div></div><button class="btn outlined sm" type="button" data-dup="' + p.id + '">ทำซ้ำ</button></div>'; }).join('');
      dl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-dup]'); if (!b) return; var src = recOf('paper', b.getAttribute('data-dup')), nid = U.uid('pp');
        setCfg(function (c) { var cp = JSON.parse(JSON.stringify(src)); cp.id = nid; cp.code = 'NEW' + nid.slice(2, 5).toUpperCase(); cp.name = src.name + ' (ทำซ้ำ)'; cp.active = true; c.paper.push(cp); });
        U.wr('pmpc.live.paper', nid); location.href = '03-admin-paper-editor.html';
      });
    }
    render();
  };

  /* ---- print file (template-aware) ---- */
  PRT_CSS = 'html,body{margin:0;padding:0}body{font-family:"Noto Sans Thai",Tahoma,sans-serif;color:#222;background:#cfcfcf}.pg{position:relative;background:#fff;margin:0 auto 6mm;overflow:hidden;page-break-after:always;break-after:page}.pg:last-child{margin-bottom:0}'
    + '.art{position:absolute;overflow:hidden}.card{position:absolute;overflow:hidden}.cm{position:absolute;background:#000}'
    + '.pm{position:absolute;left:0;top:0;bottom:0;width:78%;box-sizing:border-box}.sb{position:absolute;top:0;bottom:0;width:22%}'
    + '.br{font-size:9pt;font-weight:800;letter-spacing:.14em;color:var(--pc)}.big{font-size:54pt;font-weight:800;line-height:1.05;color:var(--pc);margin:1mm 0 0}.sub{font-size:14pt;font-weight:700}.chip{display:inline-block;border:.3mm solid #888;border-radius:1.5mm;padding:.3mm 2mm;font-size:8pt;font-weight:600;margin-top:3mm}.ft{position:absolute;left:10mm;right:6mm;bottom:5mm;border-top:.25mm solid #bbb;padding-top:1.5mm;font-size:8pt;color:#555}'
    + '.si{position:absolute;left:50%;top:50%;width:80mm;transform:translate(-50%,-50%) rotate(-90deg);text-align:center}.si svg{width:66mm;height:13mm;display:block;margin:0 auto}.si .cd{font:700 11pt ui-monospace,Consolas,monospace;margin-top:1mm}.si .tr{font-size:7.5pt;color:#555;margin-top:1mm}'
    + '.perf{position:absolute;top:0;bottom:0;border-left:.35mm dashed #777}.bh{display:flex;justify-content:space-between;font-weight:800;font-size:10pt;border-bottom:.6mm solid #222;padding-bottom:1mm;margin-bottom:2mm}.bc{display:grid;grid-template-columns:1fr 1fr;gap:6mm;font-size:8.5pt;line-height:1.35}.bc h6{font-size:9.5pt;font-weight:800;color:var(--pc);margin:0 0 1mm}.bc ul{margin:0;padding:0;list-style:none}.bc li{position:relative;padding-left:3.5mm}.bc ul.dt li:before{content:"•";position:absolute;left:0}.bc ol{margin:0;padding:0;list-style:none;counter-reset:n}.bc ol li{counter-increment:n;padding-left:4.5mm}.bc ol li:before{content:counter(n) ".";position:absolute;left:0;font-weight:700}.bc .y{font-weight:700;color:#1B5E20;margin-top:1.5mm}.nt{position:absolute;left:8mm;right:6mm;bottom:4mm;border-top:.25mm dashed #888;padding-top:1mm;font-size:6.5pt;color:#555;line-height:1.3}'
    + '.t-band .bandbar{position:absolute;left:0;top:0;right:0;height:12mm;background:var(--pc)}.t-band .br{position:absolute;left:10mm;top:3.6mm;color:#fff;z-index:1}.t-band .pm{padding-top:19mm!important}'
    + '.t-bold .pm{background:var(--pc);color:#fff}.t-bold .br,.t-bold .big,.t-bold .sub{color:#fff}.t-bold .chip{border-color:rgba(255,255,255,.8);color:#fff}.t-bold .ft{color:#fff;border-top-color:rgba(255,255,255,.5)}'
    + '.t-gift .gi{position:absolute;right:8mm;top:7mm;font-size:34pt}.t-gift.card{box-shadow:inset 0 0 0 1.2mm var(--pc)}'
    + '.t-minimal .pm{border-left:2.5mm solid var(--pc)}.t-minimal .big{color:#222}';
  prtDoc = function (pp, o, autoPrint) {
    var Bm = o.bleed ? 3 : 0, M = o.crop ? 9 : 4, TW = 210, TH = 95, AW = TW + 2 * Bm, AH = TH + 2 * Bm, W = AW + 2 * M, Hh = AH + 2 * M, X0 = M + Bm, Y0 = M + Bm, item = pp.benefit === 'item';
    var tpl = pp.tpl || 'classic', th = PMP.PAPER_THEMES[pp.theme || 'red'] || PMP.PAPER_THEMES.red, vars = '--pc:' + th.pc + ';--pt:' + th.pt;
    var bc = PMP.code128svg(pp.code, 40), rec = ppRecipients(pp), mm = function (n) { return n + 'mm'; }, sw = TW * 0.22, mw = TW - sw;
    var tint = { classic: th.pt, gift: th.pt, band: 'linear-gradient(180deg,' + th.pc + ' ' + mm(Bm + 12) + ',#fff ' + mm(Bm + 12) + ')', bold: 'linear-gradient(90deg,' + th.pc + ' ' + (((Bm + mw) / AW) * 100).toFixed(2) + '%,#fff ' + (((Bm + mw) / AW) * 100).toFixed(2) + '%)', minimal: 'linear-gradient(90deg,' + th.pc + ' ' + mm(Bm + 2.5) + ',#fff ' + mm(Bm + 2.5) + ')' }[tpl] || th.pt;
    function marks() {
      if (!o.crop) return ''; var s = '', L = 4, g = Bm + 1, xs = [X0, X0 + TW], ys = [Y0, Y0 + TH];
      xs.forEach(function (x) { ys.forEach(function (y) {
        var dx = x === X0 ? -1 : 1, dy = y === Y0 ? -1 : 1;
        s += '<div class="cm" style="left:' + mm(dx < 0 ? x - g - L : x + g) + ';top:' + mm(y - .125) + ';width:' + mm(L) + ';height:.25mm"></div>';
        s += '<div class="cm" style="top:' + mm(dy < 0 ? y - g - L : y + g) + ';left:' + mm(x - .125) + ';height:' + mm(L) + ';width:.25mm"></div>';
      }); });
      return s;
    }
    function page(inner, bg, cls) { return '<section class="pg" style="width:' + mm(W) + ';height:' + mm(Hh) + '"><div class="art" style="left:' + mm(M) + ';top:' + mm(M) + ';width:' + mm(AW) + ';height:' + mm(AH) + ';background:' + bg + '"></div><div class="card ' + cls + '" style="' + vars + ';left:' + mm(X0) + ';top:' + mm(Y0) + ';width:' + mm(TW) + ';height:' + mm(TH) + '">' + inner + '</div>' + marks() + '</section>'; }
    var front = (tpl === 'band' ? '<div class="bandbar"></div>' : '') + '<div class="pm" style="padding:9mm 6mm 4mm 10mm">' + (tpl === 'gift' ? '<div class="gi">🎁</div>' : '') + '<div class="br">PHARMAPLEX · ' + (item ? 'คูปองของแถม' : 'คูปองส่วนลด') + '</div><div class="big">' + (item ? 'ฟรี!' : B(pp.value)) + '</div><div class="sub">' + (item ? 'แลก ' + E(pp.item || 'ของแถม') + ' ฟรี' + (pp.min ? ' เมื่อซื้อครบ ' + B(pp.min) : '') : 'ส่วนลดทันที' + (pp.min ? ' เมื่อซื้อสินค้าครบ ' + B(pp.min) : '')) + '</div><span class="chip">' + (item ? 'แลกที่ร้านพาร์ทเนอร์ (ดูด้านหลัง)' : 'ใช้ที่ร้านที่ร่วมรายการ (ดูด้านหลัง)') + '</span><div class="ft">' + (pp.end ? 'ใช้ได้ถึง ' + E(dm(pp.end)) + ' · ' : '') + E(pp.name.replace('คูปองกระดาษ ', '')) + '</div></div>'
      + '<div class="sb" style="right:0;background:rgba(0,0,0,.03)"><div class="si"><div>' + bc.svg + '</div><div class="cd">' + E(pp.code) + '</div><div class="tr">✂ ก้นคูปอง · ร้านฉีกเก็บไว้เบิก</div></div></div>' + (o.perf ? '<div class="perf" style="left:' + mm(mw) + '"></div>' : '');
    var back = '<div class="sb" style="left:0;background:rgba(0,0,0,.03)"><div class="si"><div class="cd" style="margin:0">ก้นคูปอง</div></div></div>' + (o.perf ? '<div class="perf" style="left:' + mm(sw) + '"></div>' : '')
      + '<div class="pm" style="left:' + mm(sw) + ';width:' + mm(mw) + ';padding:7mm 6mm 4mm 7mm"><div class="bh"><span>เงื่อนไขการใช้คูปอง</span><span style="font-family:ui-monospace,Consolas,monospace;font-size:9pt">ชุด ' + E(pp.code) + '</span></div><div class="bc"><div><h6>' + (item ? 'แลกได้ที่ร้านพาร์ทเนอร์' : 'ใช้ได้ที่ร้าน/สาขา') + '</h6><ul class="dt">' + rec.slice(0, 6).map(function (u) { return '<li>' + E(u.name) + (u.kind === 'ext' && u.branches ? ' — ' + E(u.branches) : '') + '</li>'; }).join('') + (pp.stores.mode === 'all' ? '<li>ทุกร้านที่ลงทะเบียนในระบบ</li>' : '') + '</ul><div class="y">✔ ใช้ที่หน้าร้านเท่านั้น</div></div><div><h6>สิทธิ์และเงื่อนไข</h6><ol>' + paperTermsList(pp).map(function (t) { return '<li>' + E(t) + '</li>'; }).join('') + '</ol></div></div><div class="nt">' + E(paperNote(pp)) + '</div></div>';
    return '<!doctype html><html lang="th"><head><meta charset="utf-8"><title>' + E(pp.code) + ' — ไฟล์พิมพ์คูปองกระดาษ</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&display=swap"><style>@page{size:' + mm(W) + ' ' + mm(Hh) + ';margin:0}' + PRT_CSS + '@media screen{.pg{box-shadow:0 1px 6px rgba(0,0,0,.3);margin-top:6mm}}@media print{body{background:#fff}.pg{margin:0;box-shadow:none}}</style></head><body>' + page(front, tint, 't-' + tpl) + page(back, '#fff', 't-' + tpl) + (autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.print()},700)}<\/script>' : '') + '</body></html>';
  };

  /* ===== status tabs for the paper list (02) and claims queue (05) ===== */
  function segFilter(seg, tbody, sts, keys, map, memo) {
    if (!seg || !tbody) return;
    var all = $$('tr', tbody), ph = all.filter(function (r) { return r.querySelector('td[colspan]'); }), rows = all.filter(function (r) { return ph.indexOf(r) < 0; }), cols = rows[0] ? rows[0].children.length : 8;
    var empty = document.createElement('tr'); empty.className = 'seg-empty'; empty.style.display = 'none'; empty.innerHTML = '<td colspan="' + cols + '" class="center muted" style="padding:24px">ไม่มีรายการในสถานะนี้</td>'; tbody.appendChild(empty);
    var norm = function (s) { return map && map[s] ? map[s] : s; }, cur = U.rd(memo, null) || keys[0];
    if (keys.indexOf(cur) < 0) cur = keys[0];
    function draw() {
      seg.innerHTML = keys.map(function (k) { var n = k === keys[0] ? rows.length : sts.filter(function (s) { return norm(s) === k; }).length; return '<button type="button" data-k="' + k + '" class="' + (k === cur ? 'on' : '') + '">' + k + ' ' + n + '</button>'; }).join('');
      var shown = 0; rows.forEach(function (r, i) { var ok = cur === keys[0] || norm(sts[i]) === cur; r.style.display = ok ? '' : 'none'; if (ok) shown++; }); ph.forEach(function (r) { r.style.display = cur === keys[0] ? '' : 'none'; }); empty.style.display = !shown && cur !== keys[0] ? '' : 'none';
    }
    seg.onclick = function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; cur = b.getAttribute('data-k'); U.wr(memo, cur); draw(); };
    draw();
  }
  (function () {
    var p2 = H['coupon/02-admin-paper-list.html'];
    H['coupon/02-admin-paper-list.html'] = function () {
      p2(); var cfg = PMP.cfg(), now = cfg.now;
      var sts = cfg.paper.map(function (p) { return !p.active ? 'ปิด' : (p.end && p.end < now ? 'หมดอายุ' : 'ใช้งาน'); });
      segFilter($('.table-toolbar .seg'), $('table.table tbody'), sts, ['ทั้งหมด', 'ใช้งาน', 'ร่าง', 'หมดอายุ', 'ปิด'], null, 'pmpc.live.tab.paperlist');
    };
  })();
  /* ===== coupon/05 เบิกเงินจากก้นคูปองกระดาษ — ตาราง + แท็บสถานะ + popup (รับก้น / ตรวจนับ / จ่ายเงิน) ===== */
  H['coupon/05-admin-paper-claims.html'] = function () {
    var KT = 'pmpc.live.tab.paperclaims', KEYS = ['ทั้งหมด', 'รอตรวจนับ', 'ตรวจนับแล้ว', 'จ่ายแล้ว', 'ปฏิเสธ'];
    var tab = U.rd(KT, null); if (KEYS.indexOf(tab) < 0) tab = KEYS[0]; var q = '';
    function cfg() { return PMP.cfg(); }
    function claims() { return PMP.state().paperClaims || []; }
    function ppOf(c) { return cfg().paper.filter(function (x) { return x.id === c.ppId; })[0]; }
    function sponsored(pp) { return pp.benefit === 'item' && pp.settle !== 'pay'; }
    function amt(c) { return (c.counted != null ? c.counted : c.stubs) * PMP.paperUnit(ppOf(c)); }
    function cid(c) { var a = claims(), i = a.map(function (x) { return x.id; }).indexOf(c.id); return 'C-' + String(131 + a.length - i).padStart(4, '0'); }
    function tabOf(c) { return c.status === 'ปิดงานแล้ว' ? 'จ่ายแล้ว' : c.status; }
    function money(c) { return sponsored(ppOf(c)) ? 'ไม่มีการจ่าย' : B(amt(c)) + (c.counted == null ? '*' : ''); }
    function byId(id) { return claims().filter(function (c) { return c.id === id; })[0]; }
    function sum(a) { return a.reduce(function (t, c) { return t + (sponsored(ppOf(c)) ? 0 : amt(c)); }, 0); }
    function chip(c) { var m = { 'รอตรวจนับ': 'info', 'ตรวจนับแล้ว': 'warning', 'จ่ายแล้ว': 'success', 'ปิดงานแล้ว': 'success', 'ปฏิเสธ': 'error' }; return '<span class="chip ' + (m[c.status] || '') + '">' + E(c.status === 'ตรวจนับแล้ว' ? 'ตรวจนับแล้ว (รอจ่าย)' : c.status) + '</span>'; }

    /* ---- modal host (same .modal/.dialog classes as the rest of the system) ---- */
    var mod = $('#p5modal'); if (!mod) { mod = document.createElement('div'); mod.id = 'p5modal'; mod.className = 'modal'; document.body.appendChild(mod); }
    function openDlg(title, body, foot) { mod.innerHTML = '<div class="dialog md"><div class="dialog-h"><span>' + title + '</span><button class="x" type="button" data-close>✕</button></div><div class="dialog-b">' + body + '</div><div class="dialog-f">' + foot + '</div></div>'; mod.classList.add('on'); }
    function closeDlg() { mod.classList.remove('on'); }
    $$('.backdrop').forEach(function (b) { b.parentNode.removeChild(b); }); var note = $$('.muted.small.mb8')[0]; if (note) note.parentNode.removeChild(note);
    function flagsHtml(c) {
      if (!c.flags.length) return '<div class="fl ok"><span class="ck y">✓</span><span>ไม่มีธงเตือนจากระบบ — ผู้ส่งอยู่ในรายชื่อผู้รับ และก้นรวมไม่เกินจำนวนที่ออก</span></div>';
      return c.flags.map(function (f) { var sev = /^⚠/.test(f), todo = /ไม่ได้อยู่ในรายชื่อ/.test(f) ? 'ตรวจว่าเป็นผู้รับของชุดนี้จริงไหม — ถ้าไม่ใช่ให้ปฏิเสธ' : /เกินจำนวน/.test(f) ? 'ก้นรวมเกินที่พิมพ์ — สงสัยสำเนา ตรวจก้นทุกใบก่อนจ่าย' : 'ตรวจก่อนจ่าย'; return '<div class="fl ' + (sev ? 'sev' : 'wrn') + '"><span class="ck ' + (sev ? 'n' : 'w') + '">!</span><span><b>' + E(f.replace(/^⚠\s*/, '')) + '</b><div class="small muted">ต้องทำ: ' + todo + '</div></span></div>'; }).join('');
    }
    function factsHtml(c) { var pp = ppOf(c), who = PMP.partner(c.storeId), sp = sponsored(pp); return '<div class="facts"><div><div class="l">ผู้ส่ง</div><div class="v" style="font-size:13.5px">' + E(who.name) + '</div></div><div><div class="l">ชุด / สิทธิ์</div><div class="v" style="font-size:13.5px">' + E(pp.code) + '<div class="small muted" style="font-weight:400">' + E(PMP.paperBenefitText(pp)) + '</div></div></div><div><div class="l">ร้านแจ้งว่าส่งมา</div><div class="v">' + c.stubs + ' ก้น</div></div><div><div class="l">ราคาต่อใบ</div><div class="v">' + (sp ? 'ไม่มีการจ่าย' : B(PMP.paperUnit(pp))) + '</div></div></div>'; }
    function logHtml(c) { return '<div class="sep"></div><div class="label mb8">ประวัติ</div><div class="tl">' + (c.log || [{ d: c.d, t: 'รับก้น ' + c.stubs + ' ใบ' }]).map(function (l) { return '<div>' + dmy(l.d) + ' — ' + E(l.t) + '</div>'; }).join('') + '</div>'; }

    /* ---- popup: รับก้นเข้าระบบ ---- */
    function dlgAdd() {
      var cf = cfg();
      openDlg('รับก้นเข้าระบบ', '<div class="small muted mb8">บันทึกก้นคูปองที่ร้าน/พาร์ทเนอร์ส่งมา (ไปรษณีย์/หน้างาน) — บันทึกแล้วรายการไปรอ “ตรวจนับ”</div><div class="form-grid"><div class="field"><label>ใครส่งก้นมา *</label><select class="select" id="iWho">' + PMP.partners().map(function (u) { return '<option value="' + u.id + '">' + E(u.name) + (u.kind === 'ext' ? ' · นอกระบบ' : '') + '</option>'; }).join('') + '</select></div><div class="field"><label>ชุดคูปอง *</label><select class="select" id="iSet">' + cf.paper.map(function (p) { return '<option value="' + p.id + '">' + E(p.code + ' · ' + p.name) + '</option>'; }).join('') + '</select></div><div class="field"><label>จำนวนก้นที่แจ้ง (ใบ) *</label><input class="input" id="iN" type="number" min="1" placeholder="0"></div><div class="field"><label>วันที่รับก้น</label><input class="input" id="iD" type="date" value="' + cf.now + '"></div></div><div class="field mt16"><label>หมายเหตุ / หลักฐาน (ไม่บังคับ)</label><input class="input" id="iM" placeholder="เช่น ส่งทางไปรษณีย์ เลขพัสดุ EX123"></div><div class="soft mt16 small" id="iEst">ยอดประมาณ: ใส่จำนวนก้นเพื่อดูยอด</div>',
        '<button class="btn text grey" type="button" data-close>ยกเลิก</button><button class="btn contained" type="button" id="iGo">บันทึกรับก้น</button>');
      function est() { var p = cfg().paper.filter(function (x) { return x.id === $('#iSet').value; })[0], n = +$('#iN').value; $('#iEst').textContent = n > 0 ? 'ยอดประมาณ: ' + n.toLocaleString() + ' ใบ × ' + B(PMP.paperUnit(p)) + ' = ' + B(n * PMP.paperUnit(p)) + (sponsored(p) ? ' (พาร์ทเนอร์ออกเอง — ไม่มีการจ่าย)' : '') : 'ยอดประมาณ: ใส่จำนวนก้นเพื่อดูยอด'; }
      $('#iN').oninput = est; $('#iSet').onchange = est;
      $('#iGo').onclick = function () {
        var r = PMP.paperClaim($('#iSet').value, $('#iWho').value, +$('#iN').value); if (r.error) { toast(r.error, true); return; }
        var st = PMP.state(), c = st.paperClaims[0]; c.d = $('#iD').value || cfg().now; c.log[0].d = c.d; if ($('#iM').value.trim()) c.log[0].t += ' · ' + $('#iM').value.trim(); PMP.saveState(st);
        closeDlg(); toast('รับก้น ' + r.n + ' ใบแล้ว — รอตรวจนับ' + (r.flags.length ? ' (มีธง ' + r.flags.length + ')' : '')); tab = 'รอตรวจนับ'; U.wr(KT, tab); draw();
      };
    }
    /* ---- popup: ตรวจนับ ---- */
    function dlgCount(c) {
      var pp = ppOf(c), unit = PMP.paperUnit(pp), sp = sponsored(pp);
      openDlg('ตรวจนับก้นคูปอง · ' + cid(c), factsHtml(c) + '<div class="label mb8">ธงเตือนจากระบบ</div>' + flagsHtml(c) + '<div class="small muted mt8">วิธีนับ: นับก้นที่ได้รับจริง (สแกนบาร์โค้ดทีละใบหรือนับมือ) แล้วกรอกจำนวน — ระบบเทียบกับที่ร้านแจ้งให้</div><div class="field mt16"><label>นับก้นได้จริง (ใบ) *</label><div class="input-adorn" style="max-width:220px"><input class="input" id="dCnt" type="number" min="0" value="' + c.stubs + '"><span class="adorn">ใบ</span></div></div><div class="cmp" id="dCmp"></div><div id="dRejBox" style="display:none" class="mt16"><div class="field"><label>เหตุผลที่ปฏิเสธ * (บังคับ)</label><textarea class="textarea input" id="dRejTxt" style="min-height:60px" placeholder="เช่น ก้นไม่ใช่ของชุดนี้ / ก้นซีดเป็นสำเนา"></textarea></div></div>' + logHtml(c),
        '<button class="btn text grey" type="button" data-close>ยกเลิก</button><button class="btn outlined" type="button" id="dRej" style="color:var(--error-dark);border-color:var(--error)">ปฏิเสธ…</button><button class="btn contained" type="button" id="dOk">ยืนยันจำนวน</button>');
      function cmp() { var n = +$('#dCnt').value, df = n - c.stubs; $('#dCmp').innerHTML = '<span>ร้านแจ้ง <b>' + c.stubs + '</b></span><span>→ นับได้ <b>' + (isNaN(n) ? 0 : n) + '</b></span><span style="color:' + (df ? 'var(--error-dark)' : 'var(--success-darker)') + '"><b>' + (df ? 'ผลต่าง ' + (df > 0 ? '+' : '') + df : 'ตรงกัน ✓') + '</b></span>' + (sp ? '' : '<span>→ ยอด <b>' + B((n || 0) * unit) + '</b></span>'); }
      $('#dCnt').oninput = cmp; cmp();
      $('#dOk').onclick = function () { var n = $('#dCnt').value === '' ? NaN : +$('#dCnt').value, r = PMP.paperAct(c.id, 'count', n); if (r.error) { toast(r.error, true); return; } closeDlg(); toast('ยืนยันจำนวน ' + n + ' ใบแล้ว — รอจ่ายเงิน'); draw(); };
      var rejing = false;
      $('#dRej').onclick = function () {
        if (!rejing) { rejing = true; $('#dRejBox').style.display = 'block'; $('#dRejTxt').focus(); $('#dRej').textContent = 'ยืนยันปฏิเสธ'; $('#dRej').style.background = 'var(--error)'; $('#dRej').style.color = '#fff'; return; }
        var t = $('#dRejTxt').value.trim(); if (!t) { toast('กรอกเหตุผลที่ปฏิเสธ', true); return; } PMP.paperAct(c.id, 'reject', null, { reason: t }); closeDlg(); toast('ปฏิเสธรายการแล้ว'); draw();
      };
    }
    /* ---- popup: บันทึกจ่ายเงิน ---- */
    function dlgPay(c) {
      var pp = ppOf(c), sp = sponsored(pp), unit = PMP.paperUnit(pp);
      openDlg((sp ? 'ปิดงาน · ' : 'บันทึกจ่ายเงิน · ') + cid(c), factsHtml(c) + '<div class="soft mb16"><div class="small muted">ยอดที่ต้องจ่าย</div><div style="font-size:22px;font-weight:800">' + (sp ? 'ไม่มีการจ่าย (พาร์ทเนอร์ออกเอง)' : B(c.amount)) + '</div><div class="small muted">นับได้ ' + c.counted + ' ใบ' + (c.counted !== c.stubs ? ' (ร้านแจ้ง ' + c.stubs + ' · ผลต่าง ' + (c.counted - c.stubs > 0 ? '+' : '') + (c.counted - c.stubs) + ')' : '') + (sp ? '' : ' × ' + B(unit)) + '</div></div>'
        + (c.flags.length ? '<div class="label mb8">ธงเตือนจากระบบ</div>' + flagsHtml(c) + '<div class="field mt8"><label>เหตุผลอนุมัติพิเศษ * (บังคับ เพราะมีธงเตือน)</label><textarea class="textarea input" id="dNote" style="min-height:60px" placeholder="เช่น ตรวจก้นทุกใบแล้ว เป็นของจริง"></textarea></div>' : '')
        + (sp ? '' : '<div class="form-grid mt16"><div class="field"><label>วันที่จ่าย</label><input class="input" id="dDate" type="date" value="' + cfg().now + '"></div><div class="field"><label>เลขอ้างอิงการโอน (ไม่บังคับ)</label><input class="input" id="dRef" placeholder="เช่น SCB ****1234"></div></div>') + logHtml(c),
        '<button class="btn text grey" type="button" data-close>ยกเลิก</button><button class="btn outlined" type="button" id="dBack">ส่งกลับตรวจนับใหม่</button><button class="btn contained" type="button" id="dPay">' + (sp ? 'ปิดงาน' : 'บันทึกจ่ายเงิน') + '</button>');
      $('#dBack').onclick = function () { PMP.paperAct(c.id, 'recount'); closeDlg(); toast('ส่งกลับไปตรวจนับใหม่'); draw(); };
      $('#dPay').onclick = function () {
        var note = $('#dNote') ? $('#dNote').value.trim() : ''; if (c.flags.length && !note) { toast('มีธงเตือน — กรอกเหตุผลอนุมัติพิเศษก่อนจ่าย', true); $('#dNote').focus(); return; }
        var r = PMP.paperAct(c.id, 'pay', null, { ref: $('#dRef') ? $('#dRef').value.trim() : '', date: $('#dDate') ? $('#dDate').value : cfg().now, note: note }); if (r.error) { toast(r.error, true); return; }
        closeDlg(); toast(sp ? 'ปิดงานแล้ว' : 'บันทึกจ่ายเงินแล้ว'); draw();
      };
    }
    /* ---- popup: ดูรายละเอียด ---- */
    function dlgView(c) {
      var pp = ppOf(c), sp = sponsored(pp);
      openDlg('รายละเอียด · ' + cid(c) + ' ' + chip(c), factsHtml(c) + '<div class="soft"><b>' + (c.status === 'ปฏิเสธ' ? 'ปฏิเสธ' : sp ? 'ปิดงานแล้ว (ไม่มีการจ่าย)' : 'จ่ายแล้ว ' + B(c.amount)) + '</b>' + (c.counted != null ? '<div class="small muted mt8">นับได้ ' + c.counted + ' ก้น (ร้านแจ้ง ' + c.stubs + ')</div>' : '') + (c.reason ? '<div class="small muted">เหตุผล: ' + E(c.reason) + '</div>' : '') + (c.payRef ? '<div class="small muted">อ้างอิง: ' + E(c.payRef) + '</div>' : '') + '<div class="small muted">แก้ตัวเลขไม่ได้ — ถ้าผิดให้บันทึกรายการปรับยอดใหม่</div></div>' + logHtml(c), '<button class="btn contained" type="button" data-close>ปิด</button>');
    }

    /* ---- table + tabs ---- */
    function draw() {
      var a = claims(), wait = a.filter(function (c) { return c.status === 'รอตรวจนับ'; }), pay = a.filter(function (c) { return c.status === 'ตรวจนับแล้ว'; }), done = a.filter(function (c) { return c.status === 'จ่ายแล้ว' || c.status === 'ปิดงานแล้ว'; });
      var sv = $$('.stat-grid .stat'); function stat(i, v, l) { if (sv[i]) { $('.v', sv[i]).textContent = v; $('.l', sv[i]).textContent = l; } }
      stat(0, wait.length, 'รอตรวจนับ (ประมาณ ' + B(sum(wait)) + ')'); stat(1, pay.length, 'ตรวจนับแล้ว รอจ่าย (' + B(sum(pay)) + ')'); stat(2, B(sum(done)), 'จ่ายแล้ว'); stat(3, a.filter(function (c) { return c.flags.length && stOpen(c); }).length, 'มีธงเตือนที่ต้องตัดสินใจ');
      var seg = $('.table-toolbar .seg'); seg.innerHTML = KEYS.map(function (k) { var n = k === KEYS[0] ? a.length : a.filter(function (c) { return tabOf(c) === k; }).length; return '<button type="button" data-k="' + k + '" class="' + (k === tab ? 'on' : '') + '">' + k + ' ' + n + '</button>'; }).join('');
      var rows = a.filter(function (c) { if (tab !== KEYS[0] && tabOf(c) !== tab) return false; if (!q) return true; var t = (PMP.partner(c.storeId).name + ' ' + ppOf(c).code + ' ' + cid(c)).toLowerCase(); return t.indexOf(q) > -1; });
      $('table.table tbody').innerHTML = rows.map(function (c) {
        var who = PMP.partner(c.storeId), pp = ppOf(c), act = c.status === 'รอตรวจนับ' ? '<a href="#" data-a="count" data-id="' + c.id + '">ตรวจนับ</a>' : c.status === 'ตรวจนับแล้ว' ? '<a href="#" data-a="pay" data-id="' + c.id + '">' + (sponsored(pp) ? 'ปิดงาน' : 'บันทึกจ่ายเงิน') + '</a>' : '<a href="#" data-a="view" data-id="' + c.id + '">ดูรายละเอียด</a>';
        return '<tr><td class="nowrap"><b class="mono">' + cid(c) + '</b></td><td><b>' + E(who.name) + '</b> ' + kindChipP(who) + c.flags.map(function (f) { return '<div style="margin-top:4px"><span class="chip soft-error" style="height:20px;font-size:11px">⚠ ' + (/ไม่ได้อยู่ในรายชื่อ/.test(f) ? 'ไม่อยู่ในรายชื่อผู้รับ' : /เกินจำนวน/.test(f) ? 'ก้นรวมเกินจำนวนที่ออก' : 'ตรวจก่อนจ่าย') + '</span></div>'; }).join('') + '</td><td class="mono">' + E(pp.code) + '</td><td class="num">' + c.stubs.toLocaleString() + '</td><td class="num">' + (c.counted != null ? c.counted.toLocaleString() : '—') + '</td><td class="num"><b>' + money(c) + '</b></td><td class="nowrap">' + dmy(c.d) + '</td><td>' + chip(c) + '</td><td class="nowrap">' + act + '</td></tr>';
      }).join('') || '<tr><td colspan="9" class="center muted" style="padding:28px">' + (a.length ? 'ไม่มีรายการในสถานะนี้' : 'ยังไม่มีรายการ — กด “＋ รับก้นเข้าระบบ” เพื่อบันทึกก้นที่ร้าน/พาร์ทเนอร์ส่งมา') + '</td></tr>';
      var pg = $('.pager'); if (pg) pg.innerHTML = '<span>แถวต่อหน้า 25</span><span>' + (rows.length ? '1–' + rows.length : '0') + ' จาก ' + rows.length + '</span>';
    }
    function stOpen(c) { return c.status === 'รอตรวจนับ' || c.status === 'ตรวจนับแล้ว'; }
    var root = $('#screen');
    if (!root._p5) {
      root._p5 = 1;
      root.addEventListener('click', function (e) {
        var k = e.target.closest('.table-toolbar .seg button[data-k]'); if (k) { tab = k.getAttribute('data-k'); U.wr(KT, tab); draw(); return; }
        var a = e.target.closest('a[data-a]'); if (a) { e.preventDefault(); var c = byId(a.getAttribute('data-id')); if (c) ({ count: dlgCount, pay: dlgPay, view: dlgView })[a.getAttribute('data-a')](c); return; }
        var add = e.target.closest('.page-head a[href="#dlgAdd"]'); if (add) { e.preventDefault(); dlgAdd(); }
      });
      var s = $('.table-toolbar input'); if (s) s.addEventListener('input', function () { q = s.value.trim().toLowerCase(); draw(); });
    }
    draw();  };
  /* ===== campaign module: working status tabs (01 list · 05 progress) + claims queue as table + popup (04) ===== */
  function tabFilter(seg, tbody, defs, memo, input) {
    if (!seg || !tbody) return;
    var all = $$('tr', tbody), ph = all.filter(function (r) { return r.querySelector('td[colspan]'); }), rows = all.filter(function (r) { return ph.indexOf(r) < 0; }), cols = rows[0] ? rows[0].children.length : 6;
    var empty = document.createElement('tr'); empty.className = 'seg-empty'; empty.style.display = 'none'; empty.innerHTML = '<td colspan="' + cols + '" class="center muted" style="padding:24px">ไม่มีรายการในสถานะนี้</td>'; tbody.appendChild(empty);
    var keys = defs.map(function (d) { return d.k; }), cur = U.rd(memo, null); if (keys.indexOf(cur) < 0) cur = keys[0];
    function draw() {
      seg.innerHTML = defs.map(function (d) { var n = rows.filter(function (r, i) { return d.f(r, i); }).length; return '<button type="button" data-k="' + d.k + '" class="' + (d.k === cur ? 'on' : '') + '">' + d.k + ' ' + n + '</button>'; }).join('');
      var q = input ? input.value.trim().toLowerCase() : '', d0 = defs[keys.indexOf(cur)], shown = 0;
      rows.forEach(function (r, i) { var ok = d0.f(r, i) && (!q || r.textContent.toLowerCase().indexOf(q) > -1); r.style.display = ok ? '' : 'none'; if (ok) shown++; });
      ph.forEach(function (r) { r.style.display = rows.length ? 'none' : ''; }); empty.style.display = rows.length && !shown ? '' : 'none';
    }
    seg.onclick = function (e) { var b = e.target.closest('button[data-k]'); if (!b) return; cur = b.getAttribute('data-k'); U.wr(memo, cur); draw(); };
    if (input && !input._tf) { input._tf = 1; input.addEventListener('input', draw); }
    draw();
  }
  (function () {
    var p1 = H['campaign/01-admin-list.html'];
    H['campaign/01-admin-list.html'] = function () {
      p1(); var cfg = PMP.cfg(), now = cfg.now, lab = cfg.ladders.map(function (L) { var s = PMP.status(L, now); return s === 'running' ? 'กำลังดำเนินการ' : s === 'expired' ? 'สิ้นสุด' : 'ร่าง'; });
      tabFilter($('.table-toolbar .seg'), $('table.table tbody'), ['ทั้งหมด', 'กำลังดำเนินการ', 'ร่าง', 'สิ้นสุด'].map(function (k) { return { k: k, f: function (r, i) { return k === 'ทั้งหมด' || lab[i] === k; } }; }), 'pmpc.live.tab.camplist', $('.table-toolbar input'));
      var sel = $('.table-toolbar select'); if (sel) sel.style.display = 'none'; var cnt = $('.table-toolbar > .muted.small'); if (cnt) cnt.textContent = 'แสดง ' + cfg.ladders.length + ' แคมเปญ';
    };
    var p5 = H['campaign/05-admin-progress.html'];
    H['campaign/05-admin-progress.html'] = function () {
      p5(); var cfg = PMP.cfg(), st = PMP.state(), L = cfg.ladders[0]; if (!L) return;
      var arr = PMP.customers.map(function (c) { var lv = st.customers[c.id].ladder[L.id] || { spent: 0 }, nxt = L.tiers.filter(function (t) { return t.at > lv.spent; })[0]; return { s: lv.spent, p: nxt ? lv.spent / nxt.at * 100 : 100 }; }).sort(function (x, y) { return y.s - x.s; });
      var left = Math.round((new Date(L.end) - new Date(cfg.now)) / 864e5), pct = function (i) { return arr[i] ? arr[i].p : 0; };
      tabFilter($('.table-toolbar .seg'), $('table.table tbody'), [
        { k: 'ทั้งหมด', f: function () { return true; } }, { k: '≥ 80%', f: function (r, i) { return pct(i) >= 80 && pct(i) < 100; } }, { k: '≥ 95%', f: function (r, i) { return pct(i) >= 95 && pct(i) < 100; } }, { k: 'สัญญาใกล้หมด (≤ 90 วัน)', f: function () { return left <= 90; } }
      ], 'pmpc.live.tab.campprog', $('.table-toolbar input'));
      document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#screen button.btn'); if (b && /ส่งเตือน/.test(b.textContent)) { toast('ส่งเตือนแล้ว (ในเว็บ)'); b.textContent = 'ส่งเตือนแล้ว ✓'; b.disabled = true; } });
    };
  })();

  /* ---- campaign/04 คิวคำขอรับรางวัล ---- */
  H['campaign/04-admin-claims.html'] = function () {
    var KT = 'pmpc.live.tab.campclaims', KEYS = ['ทั้งหมด', 'รอตรวจ', 'อนุมัติแล้ว', 'ปฏิเสธ'], tab = U.rd(KT, null); if (KEYS.indexOf(tab) < 0) tab = KEYS[0]; var q = '';
    function claims() { return PMP.state().claims || []; }
    function tabOf(c) { return c.status === 'รอตรวจ' ? 'รอตรวจ' : c.status === 'ปฏิเสธ' ? 'ปฏิเสธ' : 'อนุมัติแล้ว'; }
    function cid(c) { var a = claims(), i = a.map(function (x) { return x.id; }).indexOf(c.id); return 'CL-' + String(44 + a.length - i).padStart(4, '0'); }
    function cust(c) { return PMP.customers.filter(function (x) { return x.id === c.cid; })[0] || { name: c.cid, type: '' }; }
    function lt(c) { var cfg = PMP.cfg(), L = cfg.ladders.filter(function (x) { return x.id === c.lid; })[0], t = L && L.tiers.filter(function (x) { return x.id === c.tid; })[0]; return { L: L, t: t }; }
    function reward(c) { return PMP.rewardsOf('campaign', c.lid + '-' + c.tid).map(function (i) { return PMP.describe(i, PMP.cfg()); }).join(' + ') || '—'; }
    function chip(c) { var t = tabOf(c); return '<span class="chip ' + (t === 'รอตรวจ' ? 'soft-warning' : t === 'ปฏิเสธ' ? 'error' : 'success') + '">' + t + '</span>'; }
    var mod = $('#p4modal'); if (!mod) { mod = document.createElement('div'); mod.id = 'p4modal'; mod.className = 'modal'; document.body.appendChild(mod); }
    function openDlg(title, body, foot) { mod.innerHTML = '<div class="dialog md"><div class="dialog-h"><span>' + title + '</span><button class="x" type="button" data-close>✕</button></div><div class="dialog-b">' + body + '</div><div class="dialog-f">' + foot + '</div></div>'; mod.classList.add('on'); }
    function closeDlg() { mod.classList.remove('on'); }
    $$('.backdrop').forEach(function (b) { b.parentNode.removeChild(b); }); var note = $$('.muted.small.mb8')[0]; if (note) note.parentNode.removeChild(note);
    function detail(c, review) {
      var x = lt(c), cu = cust(c), lv = (PMP.state().customers[c.cid].ladder[c.lid] || { spent: 0 }), snap = c.snap != null ? c.snap : lv.spent;
      var h = '<div class="facts"><div><div class="l">ลูกค้า</div><div class="v">' + E(cu.name) + '</div></div><div><div class="l">แคมเปญ / ขั้น</div><div class="v">' + E(c.name) + '</div></div><div><div class="l">รางวัลที่ขอ</div><div class="v" style="font-size:13px">' + E(reward(c)) + '</div></div><div><div class="l">ยอดสะสม ณ วันที่ขอ</div><div class="v">' + B(snap) + (x.t ? ' <span class="chip ' + (snap >= x.t.at ? 'success' : 'error') + ' sq">' + (snap >= x.t.at ? 'ถึงเกณฑ์ ' + B(x.t.at) + ' ✓' : 'ยังไม่ถึงเกณฑ์ ' + B(x.t.at)) + '</span>' : '') + '</div></div></div>';
      h += '<div class="sep"></div><div class="label mb8">คำตอบในฟอร์ม</div><dl class="kv">' + (c.labels.length ? c.labels.map(function (l, k) { return '<dt>' + E(l) + '</dt><dd>' + E(c.answers[k] || '-') + '</dd>'; }).join('') : '<dt>—</dt><dd>ขั้นนี้ไม่มีฟอร์ม</dd>') + '</dl>';
      if (review) h += '<div id="rjBox" style="display:none" class="mt16"><div class="field"><label>เหตุผลที่ปฏิเสธ * (บังคับ)</label><textarea class="textarea input" id="rjTxt" style="min-height:60px" placeholder="เช่น สำเนาพาสปอร์ตไม่ชัด"></textarea></div></div>';
      if (c.reason) h += '<div class="soft mt16 small">เหตุผลที่ปฏิเสธ: ' + E(c.reason) + '</div>';
      h += '<div class="sep"></div><div class="label mb8">ประวัติ</div><div class="tl">' + (c.log || [{ d: c.d, t: 'ส่งคำขอโดยลูกค้า (ตัดสิทธิ์ขั้นนี้ไว้แล้ว)' }]).map(function (l) { return '<div>' + dmy(l.d) + ' — ' + E(l.t) + '</div>'; }).join('') + '</div>';
      return h;
    }
    function dlgReview(c) {
      openDlg('ตรวจคำขอ · ' + cid(c), detail(c, true), '<button class="btn text grey" type="button" data-close>ยกเลิก</button><button class="btn outlined" type="button" id="rjBtn" style="color:var(--error-dark);border-color:var(--error)">ปฏิเสธ…</button><button class="btn contained" type="button" id="okBtn">อนุมัติ</button>');
      $('#okBtn').onclick = function () { var r = PMP.claimAct(c.id, 'approve'); if (r.error) { toast(r.error, true); return; } closeDlg(); toast('อนุมัติแล้ว — ' + r.out.join(' · ')); draw(); };
      var rej = false; $('#rjBtn').onclick = function () { if (!rej) { rej = true; $('#rjBox').style.display = 'block'; $('#rjTxt').focus(); this.textContent = 'ยืนยันปฏิเสธ'; this.style.background = 'var(--error)'; this.style.color = '#fff'; return; } var t = $('#rjTxt').value.trim(); if (!t) { toast('กรอกเหตุผลที่ปฏิเสธ', true); return; } var r = PMP.claimAct(c.id, 'reject', t); if (r.error) { toast(r.error, true); return; } closeDlg(); toast('ปฏิเสธแล้ว — คืนสิทธิ์ให้ขั้นนี้'); draw(); };
    }
    function dlgView(c) { openDlg('รายละเอียด · ' + cid(c) + ' ' + chip(c), detail(c, false), '<button class="btn contained" type="button" data-close>ปิด</button>'); }
    function draw() {
      var a = claims(), w = a.filter(function (c) { return tabOf(c) === 'รอตรวจ'; }).length, ok = a.filter(function (c) { return tabOf(c) === 'อนุมัติแล้ว'; }).length, no = a.filter(function (c) { return tabOf(c) === 'ปฏิเสธ'; }).length;
      var sv = $$('.stat-grid .stat'); function stat(i, v, l) { if (sv[i]) { $('.v', sv[i]).textContent = v; $('.l', sv[i]).textContent = l; } } stat(0, w, 'รอตรวจ'); stat(1, ok, 'อนุมัติแล้ว'); stat(2, no, 'ปฏิเสธ');
      var L = PMP.cfg().ladders[0], st = PMP.state(); if (L) stat(3, PMP.customers.filter(function (c) { var lv = st.customers[c.id].ladder[L.id] || { spent: 0 }, nx = L.tiers.filter(function (t) { return t.at > lv.spent; })[0]; return nx && lv.spent / nx.at >= .8; }).length, 'ลูกค้าใกล้ถึงเกณฑ์ (≥ 80%)');
      $('.table-toolbar .seg').innerHTML = KEYS.map(function (k) { var n = k === KEYS[0] ? a.length : k === 'รอตรวจ' ? w : k === 'อนุมัติแล้ว' ? ok : no; return '<button type="button" data-k="' + k + '" class="' + (k === tab ? 'on' : '') + '">' + k + ' ' + n + '</button>'; }).join('');
      var rows = a.filter(function (c) { if (tab !== KEYS[0] && tabOf(c) !== tab) return false; if (!q) return true; return (cust(c).name + ' ' + c.name + ' ' + cid(c)).toLowerCase().indexOf(q) > -1; });
      $('table.table tbody').innerHTML = rows.map(function (c) {
        var act = c.status === 'รอตรวจ' ? '<a href="#" data-a="review" data-id="' + c.id + '">ตรวจคำขอ</a>' : '<a href="#" data-a="view" data-id="' + c.id + '">ดูรายละเอียด</a>';
        return '<tr><td class="nowrap"><b class="mono">' + cid(c) + '</b></td><td><b>' + E(cust(c).name) + '</b><div class="small muted">' + E(cust(c).type) + '</div></td><td><span class="src">' + E(c.name) + '</span><div><b>' + E(reward(c)) + '</b></div><div class="small muted">' + c.labels.slice(0, 2).map(function (l, k) { return E(l) + ': ' + E(c.answers[k] || '-'); }).join(' · ') + '</div></td><td class="nowrap">' + dmy(c.d) + '</td><td>' + chip(c) + '</td><td class="nowrap">' + act + '</td></tr>';
      }).join('') || '<tr><td colspan="6" class="center muted" style="padding:28px">' + (a.length ? 'ไม่มีรายการในสถานะนี้' : 'ยังไม่มีคำขอรับรางวัล') + '</td></tr>';
      var pg = $('.pager'); if (pg) pg.innerHTML = '<span>แถวต่อหน้า 25</span><span>' + (rows.length ? '1–' + rows.length : '0') + ' จาก ' + rows.length + '</span>';
    }
    var root = $('#screen');
    if (!root._p4) {
      root._p4 = 1;
      root.addEventListener('click', function (e) {
        var k = e.target.closest('.table-toolbar .seg button[data-k]'); if (k) { tab = k.getAttribute('data-k'); U.wr(KT, tab); draw(); return; }
        var a = e.target.closest('a[data-a]'); if (a) { e.preventDefault(); var c = claims().filter(function (x) { return x.id === a.getAttribute('data-id'); })[0]; if (c) (a.getAttribute('data-a') === 'review' ? dlgReview : dlgView)(c); }
      });
      var s = $('.table-toolbar input'); if (s) s.addEventListener('input', function () { q = s.value.trim().toLowerCase(); draw(); });
    }
    draw();
  };
  /* ================= raffle v2 — ONE mode per activity (A ลุ้นทันที | B จับตามรอบ) ================= */
  var MODE = { A: ['ลุ้นทันที', 'a', 'ลูกค้าใช้สิทธิ์ 1 ใบ หมุนวงล้อ รู้ผลทันที'], B: ['จับตามรอบ', 'b', 'ลูกค้านำสิทธิ์ลงกอง แอดมินจับรางวัลตามวันประกาศผล'] };
  function mchip(f) { return '<span class="mode ' + MODE[f.mode][1] + '">' + f.mode + '</span> ' + MODE[f.mode][0]; }
  function rfQ() { var m = /[?&]f=([^&]+)/.exec(location.search); return m ? m[1] : null; }
  function rfCur(mode, kind) { var l = PMP.cfg().raffles.filter(function (x) { return !mode || x.mode === mode; }), id = rfQ() || U.rd(selKey(kind || 'raffle'), null); return l.filter(function (x) { return x.id === id; })[0] || l[0]; }
  function rfUsed(f) { var st = PMP.state(); return Object.keys(st.customers).some(function (k) { var c = st.customers[k]; return c.draws.some(function (d) { return d.fid === f.id; }) || (st.shared.rafflePool[f.id] || {})[k]; }) || !!(st.shared.drawResult || {})[f.id]; }
  function rfAudLabel(a) { return { all: 'ลูกค้าทุกคน', B2B: 'เฉพาะร้านค้า (B2B)', B2C: 'เฉพาะลูกค้าทั่วไป (B2C)' }[a] || a; }
  function rfTickets(f) { var st = PMP.state(); return Object.keys(st.customers).reduce(function (a, k) { return a + (st.customers[k].tickets[f.id] || 0); }, 0); }
  function rfPool(f) { var p = PMP.state().shared.rafflePool[f.id] || {}; return Object.keys(p).reduce(function (a, k) { return a + p[k]; }, 0); }
  function rfSources(f) { // where tickets can come from (other modules' reward = entitle → this activity)
    var cfg = PMP.cfg(), out = [];
    function chk(mod, ref, label) { if (PMP.rewardsOf(mod, ref).some(function (i) { return i.k === 'entitle' && i.activityId === f.id; })) out.push(label); }
    cfg.promos.forEach(function (p) { chk('promotion', p.id, 'โปรโมชั่น “' + p.name + '”'); });
    cfg.ladders.forEach(function (L) { L.tiers.forEach(function (t) { chk('campaign', L.id + '-' + t.id, 'แคมเปญ “' + L.name + '” · ' + t.name); }); });
    cfg.catalog && cfg.catalog.forEach(function (r) { chk('points', r.id, 'แลกพอยท์: ' + r.name); });
    return out;
  }
  function rfNew(mode) {
    var nid = U.uid('f');
    setCfg(function (c) {
      var base = { id: nid, mode: mode, name: mode === 'A' ? 'กิจกรรมลุ้นทันทีใหม่' : 'กิจกรรมจับตามรอบใหม่', desc: MODE[mode][2], start: c.now, end: PMP.addDays(c.now, 60), active: false, aud: 'all', perBaht: 1000, ptsPer: 0, style: 'wheel', speed: 'normal' };
      if (mode === 'A') base.prizes = [{ id: U.uid('z'), name: 'รางวัลปลอบใจ', weight: 100, stock: 999 }]; else { base.fair = { seedSrc: 'system', pubLabel: '' }; base.drawAt = PMP.addDays(c.now, 65); base.poolOthers = 100; base.prizes = [{ id: U.uid('z'), name: 'รางวัลใหญ่', winners: 1 }]; }
      c.raffles.push(base); base.prizes.forEach(function (z) { PMP.saveRewards('raffle', z.id, [{ k: 'points', mode: 'fixed', pts: 100 }]); });
    });
    U.wr(selKey('raffle'), nid); return nid;
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rfnew]'); if (b) { rfNew(b.getAttribute('data-rfnew')); location.href = '02-admin-editor.html'; } var s = e.target.closest && e.target.closest('[data-rfsel]'); if (s) U.wr(selKey('raffle'), s.getAttribute('data-rfsel')); });

  /* ---- 01 รายการกิจกรรม ---- */
  H['raffle/01-admin-list.html'] = function () {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now, root = $('#screen'), all = cfg.raffles;
    var run = all.filter(function (f) { return PMP.status(f, now) === 'running'; }).length, waitDraw = all.filter(function (f) { return f.mode === 'B' && !PMP.drawResult(f.id); }).length;
    var sv = $$('.grid.g4 .stat', root);
    function stat(i, l, v, s) { if (sv[i]) sv[i].innerHTML = '<div class="l">' + l + '</div><div class="v num">' + v + '</div><div class="small muted">' + s + '</div>'; }
    stat(0, 'กิจกรรมที่เปิดอยู่', run + ' / ' + all.length, 'ณ วันที่จำลอง ' + dmy(now));
    stat(1, '<span class="mode a">A</span> ลุ้นทันที', all.filter(function (f) { return f.mode === 'A'; }).length + ' กิจกรรม', 'สิทธิ์ค้างในบัญชีลูกค้า ' + all.filter(function (f) { return f.mode === 'A'; }).reduce(function (a, f) { return a + rfTickets(f); }, 0) + ' ใบ');
    stat(2, '<span class="mode b">B</span> จับตามรอบ', all.filter(function (f) { return f.mode === 'B'; }).length + ' กิจกรรม', 'อยู่ในกองรอจับ ' + all.filter(function (f) { return f.mode === 'B'; }).reduce(function (a, f) { return a + rfPool(f); }, 0) + ' ใบ (ลูกค้าในจำลอง)');
    stat(3, 'รอจับรางวัล', waitDraw, waitDraw ? 'ไปที่ “จับรางวัล (B)”' : 'ไม่มีกิจกรรมค้าง');
    var rows = all.map(function (f) {
      var s = PMP.status(f, now), used = f.prizes.reduce(function (a, z) { return a + (st.shared.prizeUsed[z.id] || 0); }, 0), res = PMP.drawResult(f.id);
      var stat2 = f.mode === 'A' ? 'ถูกรางวัลแล้ว <b>' + used + '</b> ครั้ง · สิทธิ์ค้าง ' + rfTickets(f) + ' ใบ' : res ? 'จับแล้ว · ' + res.winners.length + ' ผู้โชคดี' : 'กองรอจับ <b>' + (rfPool(f) + (f.poolOthers || 0)) + '</b> ใบ · ประกาศผล ' + dmy(f.drawAt);
      return '<tr><td><b>' + E(f.name) + '</b><div class="ev-id">' + f.id.toUpperCase() + ' · ' + E(rfAudLabel(f.aud)) + '</div></td><td>' + mchip(f) + (f.mode === 'A' ? '<div class="small muted">' + STY[rfStyle(f)][1] + ' ' + STY[rfStyle(f)][0] + '</div>' : '') + '</td><td class="nowrap">' + dmy(f.start) + ' – ' + dmy(f.end) + '</td><td>' + f.prizes.length + ' รายการ' + (f.mode === 'B' ? ' · ' + f.prizes.reduce(function (a, z) { return a + (z.winners || 1); }, 0) + ' ผู้โชคดี' : '') + '</td><td class="small">' + stat2 + '</td><td>' + statusChip(f, now) + '</td><td class="nowrap"><a class="btn text sm" href="02-admin-editor.html" data-rfsel="' + f.id + '">ตั้งค่า</a><a class="btn text sm" href="03-admin-prizes-budget.html" data-rfsel="' + f.id + '">รางวัล</a>' + (f.mode === 'B' ? '<a class="btn text sm" href="04-admin-draw-run.html" data-rfsel="' + f.id + '">จับรางวัล</a>' : '') + '<a class="btn text sm grey" href="#" data-rfact="tog|' + f.id + '">' + (f.active ? 'ปิด' : 'เปิด') + '</a><a class="btn text sm grey" href="#" data-rfact="dup|' + f.id + '">ทำซ้ำ</a></td></tr>';
    }).join('');
    $('table.table tbody', root).innerHTML = rows || '<tr><td colspan="7" class="center muted" style="padding:24px">ยังไม่มีกิจกรรม — กด “สร้างกิจกรรม” ด้านบน</td></tr>';
    tabFilter($('.table-toolbar .seg', root), $('table.table tbody', root), [
      { k: 'ทั้งหมด', f: function () { return true; } }, { k: 'ลุ้นทันที (A)', f: function (r, i) { return all[i].mode === 'A'; } }, { k: 'จับตามรอบ (B)', f: function (r, i) { return all[i].mode === 'B'; } }
    ], 'pmpc.live.tab.raffle', $('.table-toolbar input', root));
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-rfact]'); if (!a) return; e.preventDefault();
    var d = a.getAttribute('data-rfact').split('|'), cfg = PMP.cfg(), f = cfg.raffles.filter(function (x) { return x.id === d[1]; })[0]; if (!f) return;
    if (d[0] === 'tog') f.active = !f.active; else { var n = U.clone(f); n.id = U.uid('f'); n.name += ' (สำเนา)'; n.active = false; n.prizes = n.prizes.map(function (z) { var nz = U.clone(z); nz.id = U.uid('z'); PMP.saveRewards('raffle', nz.id, PMP.rewardsOf('raffle', z.id)); return nz; }); cfg.raffles.push(n); }
    PMP.saveCfg(cfg); rerender(); toast('บันทึกแล้ว');
  });
  hl('raffle');

  function fairBlock(f) {
    var cur = fairSrc(f);
    function card(k) { return '<label class="radio-card"><input type="radio" name="rfseed" data-rfseed="' + k + '"' + (cur === k ? ' checked' : '') + '><span><span class="rc-t">' + SEEDSRC[k][0] + '</span><span class="rc-d" style="display:block">' + SEEDSRC[k][1] + '</span></span></label>'; }
    return '<div class="mt16"><div class="label mb8"><b>ความโปร่งใสในการจับรางวัล</b> <span class="small muted">(ทุกกิจกรรมแบบจับตามรอบ: ล็อกกอง → จับ → ลูกค้าตรวจผลเองได้ — ตั้งแค่ว่า seed มาจากไหน)</span></div><div class="radio-cards c2">' + card('system') + card('public') + '</div>' +
      (cur === 'public' ? '<div class="field mt8"><label>ค่าสาธารณะที่จะใช้ (ประกาศให้ลูกค้ารู้ล่วงหน้า)</label><input class="input" data-rffair="pubLabel" value="' + E((f.fair && f.fair.pubLabel) || '') + '" placeholder="เช่น เลขท้าย 6 ตัวรางวัลที่ 1 สลากกินแบ่งรัฐบาลงวด 1 ม.ค. 2570"><span class="help">ลูกค้าเห็นข้อความนี้ในหน้า “จับตามรอบ” จึงรู้ล่วงหน้าว่า seed จะมาจากไหน · ตอนจับ แอดมินกรอกค่าจริงที่ออกมาแล้ว</span></div>' : '') +
      '<details class="mt8"><summary class="small"><b>ระบบนี้ทำงานยังไง / ปลอดภัยแค่ไหน (อ่านง่าย)</b></summary><div class="mt8">' + fairExplain() + '</div></details></div>';
  }
  function styleBlock(f) {
    if (f.mode !== 'A') return fairBlock(f);
    var cur = rfStyle(f);
    function card(k) { return '<label class="radio-card"><input type="radio" name="rfsty" data-rfsty="' + k + '"' + (cur === k ? ' checked' : '') + '><span class="sty-opt"><span class="si">' + STY[k][1] + '</span><span><span class="rc-t">' + STY[k][0] + '</span><span class="rc-d" style="display:block">' + STY[k][2] + '</span></span></span></label>'; }
    return '<div class="mt16"><div class="label mb8"><b>ภาพที่ลูกค้าเห็นตอนเปิดผล</b> <span class="small muted">(เลือกได้แบบเดียวต่อกิจกรรม · ผลถูกตัดสินที่ระบบก่อนเสมอ ภาพเป็นแค่วิธีเปิดเผย)</span></div><div class="radio-cards c3">' + card('wheel') + card('box') + card('scratch') + '</div>' +
      '<div class="form-grid mt8"><div class="field"><label>ความเร็วอนิเมชัน (วงล้อ/กล่อง)</label><select class="select" data-rf="speed"><option value="normal"' + (f.speed !== 'fast' ? ' selected' : '') + '>ปกติ (~3 วินาที)</option><option value="fast"' + (f.speed === 'fast' ? ' selected' : '') + '>เร็ว (~1.5 วินาที)</option></select><span class="help">บัตรขูดลูกค้าขูดเองจึงไม่ใช้ค่านี้ · มีปุ่ม “เปิดทั้งหมด” ให้ข้ามการขูดเสมอ</span></div></div>' +
      '<div class="sty-prev"><span class="si">' + STY[cur][1] + '</span><div><b>ตัวอย่าง: ' + STY[cur][0] + '</b><div class="small muted">ลูกค้าเปิดผลในหน้า <a href="07-customer-instant-draw.html" data-rfsela="' + f.id + '">ลุ้นทันที (ฝั่งลูกค้า)</a> — กดดูของจริงได้ที่หน้านั้น (ถ้ากิจกรรมนี้ถูกเลือกอยู่)</div></div></div></div>';
  }
  /* ---- 02 ตั้งค่ากิจกรรม (ย่อให้สั้น: รูปแบบ → ข้อมูล → ทางได้สิทธิ์ → รางวัล → เปิดใช้งาน) ---- */
  H['raffle/02-admin-editor.html'] = function () {
    var cfg = PMP.cfg(), root = $('#screen'), f0 = rfCur(null, 'raffle'); if (!f0) return; var id = f0.id;
    pickBar2($('.page-head'), 'livePick', cfg.raffles.map(function (f) { return { id: f.id, label: '[' + f.mode + '] ' + f.name }; }), id, function (v) { U.wr(selKey('raffle'), v); history.replaceState(null, '', location.pathname); rerender(); }, null);
    var f = recOf('raffles', id), used = rfUsed(f), src = rfSources(f), isA = f.mode === 'A';
    var ok1 = f.prizes.length > 0, ok2 = !!(f.perBaht || f.ptsPer || src.length), ready = ok1 && ok2;
    function fld(l, c, h) { return '<div class="field"><label>' + l + '</label>' + c + (h ? '<span class="help">' + h + '</span>' : '') + '</div>'; }
    function inp(k, v, t, extra) { return '<input class="input" data-rf="' + k + '" type="' + (t || 'text') + '" value="' + E(v == null ? '' : v) + '" ' + (extra || '') + '>'; }
    function modeCard(m) { var on = f.mode === m; return '<label class="radio-card' + (used && !on ? ' disabled' : '') + '"><input type="radio" name="rfmode" data-rfmode="' + m + '"' + (on ? ' checked' : '') + (used && !on ? ' disabled' : '') + '><span><span class="rc-t"><span class="mode ' + MODE[m][1] + '">' + m + '</span> ' + MODE[m][0] + '</span><span class="rc-d" style="display:block">' + (m === 'A' ? 'ลูกค้ากดใช้สิทธิ์ 1 ใบ → วงล้อหมุน → รู้ผลทันที<br>ตั้ง “โอกาสถูก” และ “จำนวนรางวัล” ต่อรางวัล' : 'ลูกค้านำสิทธิ์ลงกองรอจับ → แอดมินจับรางวัลตามวันประกาศผล<br>ตั้ง “จำนวนผู้โชคดี” ต่อรางวัล') + '</span></span></label>'; }
    $('#rfBody').innerHTML =
      '<div class="card relative"><span class="pin abs">1</span><div class="card-h"><h6>① รูปแบบกิจกรรม <span class="small muted">เลือกได้อย่างเดียว</span></h6>' + (used ? '<span class="chip soft-warning">เปลี่ยนไม่ได้ — มีลูกค้าใช้สิทธิ์แล้ว</span>' : '') + '</div><div class="card-b"><div class="radio-cards c2">' + modeCard('A') + modeCard('B') + '</div><div class="help small mt8">1 กิจกรรม = 1 รูปแบบ ถ้าต้องการทั้งสองแบบให้สร้างเป็น 2 กิจกรรม — หน้าลูกค้าจะแยกแสดงคนละส่วน ไม่ปนกัน</div>' + styleBlock(f) + '</div></div>' +
      '<div class="card relative"><span class="pin abs">2</span><div class="card-h"><h6>② ข้อมูลกิจกรรม</h6></div><div class="card-b"><div class="form-grid">' +
      fld('ชื่อกิจกรรม (ลูกค้าเห็น) *', inp('name', f.name)) + fld('คำอธิบายสั้น (ลูกค้าเห็น)', inp('desc', f.desc)) +
      fld('วันเริ่ม *', inp('start', f.start, 'date')) + fld('วันสิ้นสุดรับสิทธิ์/เล่น *', inp('end', f.end, 'date')) +
      (isA ? '' : fld('วันประกาศผล (จับรางวัล) *', inp('drawAt', f.drawAt, 'date'), 'ต้องหลังวันสิ้นสุด — แอดมินกดจับรางวัลที่หน้า “จับรางวัล (B)” ในวันนี้')) +
      fld('ใครร่วมได้', '<select class="select" data-rf="aud">' + ['all', 'B2B', 'B2C'].map(function (a) { return '<option value="' + a + '"' + (f.aud === a ? ' selected' : '') + '>' + rfAudLabel(a) + '</option>'; }).join('') + '</select>') +
      '</div></div></div>' +
      '<div class="card relative"><span class="pin abs">3</span><div class="card-h"><h6>③ ลูกค้าได้สิทธิ์ลุ้นอย่างไร</h6><span class="small muted">เปิดกี่ทางก็ได้ — สิทธิ์ที่ได้เป็นหน่วยเดียวกัน</span></div><div class="card-b">' +
      '<div class="rf-src"><label class="switch"><input type="checkbox" data-rfon="perBaht"' + (f.perBaht ? ' checked' : '') + '></label><div><b>ซื้อสินค้า</b><div class="small muted">ได้ให้อัตโนมัติเมื่อชำระเงินสำเร็จ · นับหลังหักส่วนลด · ปัดเศษลง</div></div><div class="rate">ทุก ฿<input class="input num" data-rf="perBaht" type="number" min="1" value="' + (f.perBaht || '') + '"' + (f.perBaht ? '' : ' disabled') + '> = 1 สิทธิ์</div></div>' +
      '<div class="rf-src"><label class="switch"><input type="checkbox" data-rfon="ptsPer"' + (f.ptsPer ? ' checked' : '') + '></label><div><b>แลกด้วยพอยท์</b><div class="small muted">ลูกค้ากดแลกเองที่หน้า “สิทธิ์ลุ้นของฉัน” · หักพอยท์ทันที</div></div><div class="rate"><input class="input num" data-rf="ptsPer" type="number" min="1" value="' + (f.ptsPer || '') + '"' + (f.ptsPer ? '' : ' disabled') + '> พอยท์ = 1 สิทธิ์</div></div>' +
      '<div class="rf-src"><span class="chip soft-info sq">ตั้งที่อื่น</span><div><b>โปรโมชั่น · ขั้นแคมเปญ · แลกพอยท์</b><div class="small muted">ไปที่ผลตอบแทนของรายการนั้น เลือก “สิทธิ์ลุ้นรางวัล” แล้วเลือกกิจกรรมนี้ — ไม่ต้องตั้งซ้ำที่นี่</div></div><div class="small" style="text-align:right">' + (src.length ? 'ใช้อยู่ ' + src.length + ' แห่ง' : '<span class="muted">ยังไม่มีใช้</span>') + '</div></div>' +
      (src.length ? '<div class="small muted mt8">' + src.map(E).join(' · ') + '</div>' : '') + '</div></div>' +
      '<div class="card relative"><span class="pin abs">4</span><div class="card-h"><h6>④ รางวัล</h6><a class="btn outlined primary sm" href="03-admin-prizes-budget.html">ตั้งรางวัล →</a></div><div class="card-b">' +
      (f.prizes.length ? '<ul class="rf-pl">' + f.prizes.map(function (z) { return '<li><b>' + E(z.name) + '</b><span class="muted">' + (isA ? 'โอกาส (น้ำหนัก ' + z.weight + ') · มี ' + z.stock + ' ชิ้น' : z.winners + ' ผู้โชคดี') + '</span></li>'; }).join('') + '</ul>' : '<div class="muted small">ยังไม่มีรางวัล</div>') + '</div></div>' +
      '<div class="card primary-top relative"><span class="pin abs">5</span><div class="card-h"><h6>⑤ เปิดใช้งาน</h6><span class="chip ' + (f.active ? 'success' : ready ? 'soft-warning' : 'error') + '">' + (f.active ? 'เปิดอยู่' : ready ? 'พร้อมเปิด' : 'ยังไม่พร้อม') + '</span></div><div class="card-b">' +
      '<div class="check-item"><span class="ci-ic ' + (ok1 ? 'ok' : 'no') + '">' + (ok1 ? '✓' : '✕') + '</span><div><b>มีรางวัลอย่างน้อย 1 รายการ</b></div></div>' +
      '<div class="check-item"><span class="ci-ic ' + (ok2 ? 'ok' : 'no') + '">' + (ok2 ? '✓' : '✕') + '</span><div><b>มีทางได้สิทธิ์อย่างน้อย 1 ทาง</b><div class="small muted">ซื้อสินค้า · แลกพอยท์ · หรือแจกผ่านโปรโมชั่น/แคมเปญ</div></div></div>' +
      '<div class="row between mt16"><span class="small muted">กิจกรรมแสดงให้ลูกค้าเห็นเมื่อ “เปิด” และอยู่ในช่วงวันที่</span><label class="switch"><input type="checkbox" data-rfon="active"' + (f.active ? ' checked' : '') + (ready || f.active ? '' : ' disabled') + '> เปิดกิจกรรม</label></div></div></div>';
    if (!root._rf2) {
      root._rf2 = 1;
      root.addEventListener('input', function (e) { var fk = e.target.getAttribute && e.target.getAttribute('data-rffair'); if (fk) { var cid0 = rfCur(null, 'raffle').id; editRec('raffles', cid0, function (r) { r.fair = r.fair || {}; r.fair[fk] = e.target.value; }); flashSaved(); return; } var t = e.target, k = t.getAttribute('data-rf'); if (!k || t.type === 'checkbox') return; var cid = rfCur(null, 'raffle').id; editRec('raffles', cid, function (r) { r[k] = (k === 'perBaht' || k === 'ptsPer') ? (+t.value || 0) : t.value; }); flashSaved(); });
      root.addEventListener('change', function (e) {
        var t = e.target, cid = rfCur(null, 'raffle').id, m = t.getAttribute('data-rfmode'), on = t.getAttribute('data-rfon');
        var sd = t.getAttribute('data-rfseed'); if (sd) { editRec('raffles', cid, function (r) { r.fair = r.fair || {}; r.fair.seedSrc = sd; }); rerender(); toast('ตั้งที่มา seed เป็น “' + SEEDSRC[sd][0] + '” แล้ว'); return; }
        var sy = t.getAttribute('data-rfsty'); if (sy) { editRec('raffles', cid, function (r) { r.style = sy; }); rerender(); toast('เปลี่ยนภาพเปิดผลเป็น ' + STY[sy][0] + ' แล้ว'); return; }
        if (m) { editRec('raffles', cid, function (r) { if (r.mode === m) return; r.mode = m; if (m === 'B') { r.drawAt = r.drawAt || PMP.addDays(r.end, 5); r.poolOthers = r.poolOthers == null ? 100 : r.poolOthers; r.prizes.forEach(function (z) { z.winners = z.winners || 1; }); } else r.prizes.forEach(function (z) { z.weight = z.weight || 10; z.stock = z.stock || 50; }); }); rerender(); toast('เปลี่ยนรูปแบบเป็น ' + MODE[m][0] + ' แล้ว'); return; }
        if (on) { editRec('raffles', cid, function (r) { if (on === 'active') r.active = t.checked; else r[on] = t.checked ? (on === 'perBaht' ? 1000 : 300) : 0; }); rerender(); return; }
        var k = t.getAttribute('data-rf'); if (k === 'aud' || k === 'speed' || t.type === 'date') { editRec('raffles', cid, function (r) { r[k] = t.value; }); flashSaved(); }
      });
    }
  };

  /* ---- 03 รางวัล (A: โอกาส+จำนวน · B: จำนวนผู้โชคดี) ---- */
  var PZsel = null;
  H['raffle/03-admin-prizes-budget.html'] = function () {
    var cfg = PMP.cfg(), root = $('#screen'), f0 = rfCur(null, 'raffle'); if (!f0) return; var id = f0.id, st = PMP.state();
    pickBar2($('.page-head'), 'livePick', cfg.raffles.map(function (f) { return { id: f.id, label: '[' + f.mode + '] ' + f.name }; }), id, function (v) { U.wr(selKey('raffle'), v); history.replaceState(null, '', location.pathname); PZsel = null; rerender(); }, null);
    var f = recOf('raffles', id), isA = f.mode === 'A', tw = f.prizes.reduce(function (a, z) { return a + (z.weight || 0); }, 0) || 1;
    if (!PZsel || !f.prizes.some(function (z) { return z.id === PZsel; })) PZsel = f.prizes[0] && f.prizes[0].id;
    $('#rfTitle').innerHTML = E(f.name) + ' ' + mchip(f);
    $('#rfHint').textContent = isA ? 'ใส่ “น้ำหนัก” เป็นตัวเลขเปรียบเทียบ (เช่น 50 / 30 / 15 / 5) ระบบคิดโอกาสถูกเป็น % ให้ · ใส่ “จำนวนที่มี” เพื่อจำกัดชิ้นรางวัล หมดแล้วจะไม่ถูกสุ่มอีก' : 'ใส่ “จำนวนผู้โชคดี” (1 คนถูกได้ 1 รางวัลต่อการจับ) ต่อรางวัล — วันจับรางวัลระบบสุ่มจากกองสิทธิ์ ผู้ชนะ 1 คนได้ 1 รางวัล/ครั้งที่ถูกจับ';
    $('#rfPrizes thead').innerHTML = isA ? '<tr><th>ชื่อรางวัล</th><th>ลูกค้าจะได้รับ</th><th class="num">น้ำหนัก</th><th class="num">โอกาสถูก</th><th class="num">จำนวนที่มี</th><th class="num">ถูกไปแล้ว</th><th></th></tr>' : '<tr><th>ชื่อรางวัล</th><th>ลูกค้าจะได้รับ</th><th class="num">จำนวนผู้โชคดี</th><th></th></tr>';
    $('#rfPrizes tbody').innerHTML = f.prizes.map(function (z, i) {
      var items = PMP.rewardsOf('raffle', z.id), used = st.shared.prizeUsed[z.id] || 0;
      return '<tr class="' + (z.id === PZsel ? 'sel' : '') + '" data-rfp="' + z.id + '" style="cursor:pointer"><td><input class="input" data-rfpn="' + i + '" value="' + E(z.name) + '"></td><td class="small">' + E(items.map(function (x) { return PMP.describe(x, cfg); }).join(' + ') || '— ยังไม่ตั้ง') + '</td>' +
        (isA ? '<td class="num"><input class="input w-in num" data-rfpw="' + i + '" value="' + z.weight + '"></td><td class="num odds">' + ((z.weight || 0) / tw * 100).toFixed(1) + '%</td><td class="num"><input class="input w-in num" data-rfps="' + i + '" value="' + z.stock + '"></td><td class="num">' + used + '</td>' : '<td class="num"><input class="input w-in num" data-rfpv="' + i + '" value="' + (z.winners || 1) + '"></td>') +
        '<td><button class="btn text sm grey" data-rfpd="' + i + '">ลบ</button></td></tr>';
    }).join('') + '<tr><td colspan="' + (isA ? 7 : 4) + '"><button class="btn outlined primary sm" data-rfpa="1">＋ เพิ่มรางวัล</button></td></tr>';
    var box = $('#prizeBox'); var z = f.prizes.filter(function (x) { return x.id === PZsel; })[0];
    if (z) { box.setAttribute('data-ref', z.id); box.setAttribute('data-title', 'ลูกค้าจะได้เมื่อถูกรางวัล “' + z.name + '”'); if (PMP.Reward) PMP.Reward.render(box); box.style.display = ''; } else box.style.display = 'none';
    if (!root._rf3) {
      root._rf3 = 1;
      root.addEventListener('input', function (e) { var t = e.target, a, cid = rfCur(null, 'raffle').id; function S(fn) { editRec('raffles', cid, fn); flashSaved(); }
        if ((a = t.getAttribute('data-rfpn')) != null) S(function (r) { r.prizes[+a].name = t.value; });
        if ((a = t.getAttribute('data-rfpw')) != null) S(function (r) { r.prizes[+a].weight = +t.value || 0; });
        if ((a = t.getAttribute('data-rfps')) != null) S(function (r) { r.prizes[+a].stock = +t.value || 0; });
        if ((a = t.getAttribute('data-rfpv')) != null) S(function (r) { r.prizes[+a].winners = Math.max(1, +t.value || 1); }); });
      root.addEventListener('change', function (e) { if (/^data-rfp[wsv]$/.test((e.target.getAttributeNames().filter(function (n) { return /^data-rfp[wsv]$/.test(n); })[0]) || '')) rerender(); });
      root.addEventListener('click', function (e) {
        var cid = rfCur(null, 'raffle').id, d = e.target.closest('[data-rfpd]'), a = e.target.closest('[data-rfpa]'), r = e.target.closest('[data-rfp]');
        if (d) { editRec('raffles', cid, function (x) { x.prizes.splice(+d.getAttribute('data-rfpd'), 1); }); rerender(); return; }
        if (a) { var zid = U.uid('z'), isA2 = recOf('raffles', cid).mode === 'A'; editRec('raffles', cid, function (x) { x.prizes.push(isA2 ? { id: zid, name: 'รางวัลใหม่', weight: 10, stock: 50 } : { id: zid, name: 'รางวัลใหม่', winners: 1 }); }); PMP.saveRewards('raffle', zid, [{ k: 'points', mode: 'fixed', pts: 100 }]); PZsel = zid; rerender(); toast('เพิ่มรางวัลแล้ว — ตั้งสิ่งที่ลูกค้าจะได้ด้านล่าง'); return; }
        if (r && !e.target.closest('input,button')) { PZsel = r.getAttribute('data-rfp'); rerender(); }
      });
    }
  };

  /* ---- ความโปร่งใสการจับรางวัล B: ล็อกกอง → จับด้วย seed → ใครก็ตรวจซ้ำได้ ---- */
  var SEEDSRC = { system: ['ระบบสุ่มให้เอง', 'ตอนกดจับ ระบบสร้าง seed แบบสุ่มเอง · ใช้ง่าย ไม่ต้องกรอกอะไร · ลูกค้าตรวจได้ว่าผลคำนวณถูกต้อง แต่ต้องเชื่อใจว่าระบบไม่เลือก seed ให้เข้าข้างใคร'], public: ['ใช้ค่าสาธารณะ (แนะนำสำหรับรางวัลใหญ่)', 'ตอนจับ แอดมินกรอกค่าที่ใครก็ตรวจได้จากแหล่งภายนอก เช่น เลขรางวัลที่ 1 สลากกินแบ่งรัฐบาล · ค่านั้นออกมาหลังล็อกกอง แอดมินเลือกเองไม่ได้ · น่าเชื่อถือที่สุด'] };
  function fairSrc(f) { return f.fair && f.fair.seedSrc === 'public' ? 'public' : 'system'; }
  function shortRef(c) { c = (c || '').slice(0, 8).toUpperCase(); return c.slice(0, 4) + '-' + c.slice(4); }
  function fairExplainC() {
    return '<div class="fair-ex"><div class="small">เหมือน<b>จับสลากต่อหน้าทุกคน</b> — แต่ตรวจย้อนหลังได้ด้วยตัวเอง:</div>' +
      '<div class="fx-step"><span class="fx-n">1</span><div><b>ปิดรับรายชื่อ</b> — เมื่อหมดเวลารับสิทธิ์ ทีมงานปิดรายชื่อและประกาศ “รหัสอ้างอิง” ให้เห็น <span class="muted">(เหมือนปิดผนึกกล่อง ถ้าใครแอบเพิ่ม/ลบชื่อ รหัสจะเปลี่ยน)</span></div></div>' +
      '<div class="fx-step"><span class="fx-n">2</span><div><b>จับรางวัลด้วยสูตรตายตัว</b> — ไม่มีใครเลือกผู้ชนะด้วยมือ ผลมาจากการคำนวณ · <b>1 คนถูกได้ไม่เกิน 1 รางวัลต่อการจับ</b> (ลงกองหลายใบช่วยเพิ่มโอกาส แต่ไม่ถูกซ้ำ)</div></div>' +
      '<div class="fx-step"><span class="fx-n">3</span><div><b>กด “ตรวจสอบ” ได้ทุกเมื่อ</b> — ระบบจะจับรางวัลซ้ำให้ดูอีกรอบ ถ้าผลต่างจากที่ประกาศแม้แต่คนเดียว จะแจ้งว่า “ไม่ตรง” ทันที</div></div></div>';
  }
  function fairExplain() {
    return '<div class="fair-ex"><div class="fx-step"><span class="fx-n">1</span><div><b>ล็อกกอง</b> — ปิดรายชื่อผู้ร่วมลุ้น แล้วทำ “ลายนิ้วมือ” ของรายชื่อนั้น (รหัสกอง) ประกาศให้ลูกค้าเห็น <span class="muted">เหมือนใส่ลูกบอลรายชื่อลงกล่องแล้วปิดผนึก ถ้าใครแก้รายชื่อแม้ 1 ตัว รหัสจะเปลี่ยนทันที</span></div></div>' +
      '<div class="fx-step"><span class="fx-n">2</span><div><b>จับรางวัล</b> — ใช้ seed (ตัวตั้งต้นสุ่ม) ผสมกับรหัสกอง แล้วคำนวณหาผู้โชคดีทีละรางวัลด้วยสูตรตายตัว <span class="muted">seed เดิม + กองเดิม = ผลเดิมทุกครั้ง ไม่มีใครเลือกผู้ชนะด้วยมือ · <b>1 คนถูกได้ไม่เกิน 1 รางวัลต่อการจับ</b> (ลงกองกี่ใบก็ตาม ใบที่มากขึ้นช่วยเพิ่มโอกาสถูก แต่ไม่ทำให้ถูกซ้ำ)</span></div></div>' +
      '<div class="fx-step"><span class="fx-n">3</span><div><b>ตรวจสอบ</b> — เปิดเผย seed หลังจับ ใครก็กด “ตรวจสอบ” เพื่อคำนวณซ้ำเองได้ ถ้ารหัสกองและผู้โชคดีตรงกับที่ประกาศ แปลว่าไม่มีการแก้ผล</div></div></div>' +
      '<div class="small muted mt8"><b>ปลอดภัยเพราะ:</b> ① แก้รายชื่อกองหลังล็อกไม่ได้ (รหัสเปลี่ยน) ② เลือกผู้ชนะเองไม่ได้ (ผลมาจากสูตร) ③ ตรวจย้อนหลังได้ตลอด · <b>ข้อจำกัด:</b> ถ้า seed มาจากระบบ ลูกค้ายังต้องเชื่อใจว่าระบบไม่เลือก seed เข้าข้างใคร จึงมีตัวเลือก “ค่าสาธารณะ” ให้ใช้สำหรับรางวัลใหญ่</div>';
  }
  function fvOpen(fid) {
    var cust = !!$('.cust-top'), cid = cust ? custId() : null, f = PMP.raffle(fid), v = PMP.verifyDraw(fid, cid), lock = PMP.fairLockOf(fid), res = PMP.drawResult(fid), mod = $('#fvMod');
    if (!mod) { mod = document.createElement('div'); mod.id = 'fvMod'; mod.className = 'modal'; document.body.appendChild(mod); mod.addEventListener('click', function (e) { if (e.target === mod || e.target.closest('[data-fvx]')) mod.classList.remove('on'); }); }
    var steps = v.steps.map(function (x) { var t0 = cust ? x.ct : x.t, d0 = cust ? x.cd : x.d; return '<div class="check-item"><span class="ci-ic ' + (x.ok ? 'ok' : 'no') + '">' + (x.ok ? '✓' : '✕') + '</span><div><b>' + E(t0) + '</b>' + (d0 ? '<div class="small muted">' + E(d0) + '</div>' : '') + '</div></div>'; }).join('');
    var gl = '<div class="small muted mt8"><b>คำศัพท์</b><br>• <b>รายชื่อกอง</b> = รายการ “รหัสลูกค้า:จำนวนใบ” ของทุกคนที่ลงกอง (“other” คือผู้ร่วมรายอื่น)<br>• <b>รหัสกอง (SHA-256)</b> = ลายนิ้วมือของรายชื่อข้างบน ใครก็คำนวณซ้ำได้ ถ้ารายชื่อเปลี่ยนแม้ 1 ตัว รหัสจะต่างทั้งหมด<br>• <b>seed</b> = ค่าตั้งต้นของการสุ่ม เปิดเผยหลังจับ ใช้ค่านี้กับรายชื่อกองเดิมจะได้ผู้ชนะชุดเดิมเสมอ</div>';
    var raw = lock ? '<details class="mt16"><summary class="small"><b>' + (cust ? 'สำหรับผู้ตรวจสอบเชิงเทคนิค (ลูกค้าทั่วไปไม่ต้องดูก็ได้)' : 'ข้อมูลสำหรับตรวจเอง (ใช้เครื่องมืออื่นคำนวณซ้ำได้)') + '</b></summary>' + gl + '<div class="small muted mt8">รายชื่อกอง</div><div class="hash">' + E(lock.canon) + '</div><div class="small muted mt8">รหัสกอง = SHA-256 ของข้อความข้างบน</div><div class="hash">' + E(lock.commit) + '</div>' + (res ? '<div class="small muted mt8">seed' + (res.seedSrc === 'public' ? ' (ค่าสาธารณะ)' : ' (ระบบสุ่ม)') + '</div><div class="hash">' + E(res.seed) + '</div>' : '') + '<div class="small muted mt8">สูตรเลือกผู้ชนะลำดับที่ k (เริ่ม 0): ตำแหน่ง = เลขฐาน 16 จาก 12 ตัวแรกของ SHA-256( “รหัสกอง|seed|k” ) หารเอาเศษด้วยจำนวนใบที่เหลือ → ตัด “ทุกใบของผู้ชนะคนนั้น” ออกจากกอง (1 คนถูกได้ 1 รางวัล) ไล่ตามลำดับรางวัลและจำนวนผู้โชคดี · รายชื่อกองขยายเป็นใบตามลำดับ (เรียงตามรหัสลูกค้า)</div></details>' : '';
    var head = cust ? (v.ok ? (v.pending ? 'รายชื่อกองถูกต้อง — รอจับรางวัล' : 'ตรวจแล้ว ผลการจับรางวัลนี้ไม่ถูกแก้ไข') : v.pending ? 'ยังตรวจผลไม่ได้' : 'พบความไม่ตรงกัน — แจ้งทีมงาน') : (v.ok ? (v.pending ? 'กองล็อกถูกต้อง — รอจับรางวัล' : 'ตรวจผ่านทั้งหมด — ผลไม่ถูกแก้ไข') : v.pending ? 'ยังตรวจผลไม่ได้' : 'พบความไม่ตรงกัน');
    var sub = cust ? 'ระบบเพิ่งจับรางวัลซ้ำจากรายชื่อที่ปิดรับไว้ ไม่ได้แค่แสดงผลที่ประกาศมาให้ดู' : 'ระบบคำนวณซ้ำจากข้อมูลที่ล็อกไว้ ไม่ได้อ่านผลที่ประกาศมาแสดงเฉย ๆ';
    mod.innerHTML = '<div class="dialog md"><div class="dialog-h"><span>ตรวจสอบผลการจับรางวัล · ' + E(f.name) + '</span><button class="x" type="button" data-fvx>✕</button></div><div class="dialog-b"><div class="alert ' + (v.ok ? 'success' : v.pending ? 'info' : 'error') + '"><div><b>' + head + '</b><div class="small">' + sub + '</div></div></div><div class="mt8">' + steps + '</div>' + (lock ? '<div class="small muted mt8">รหัสอ้างอิงผลการจับ <b class="mono">' + shortRef(lock.commit) + '</b> — เก็บไว้เป็นหลักฐาน หรือแจ้งทีมงานเมื่อมีข้อสงสัย</div>' : '') + raw + '</div><div class="dialog-f"><button class="btn contained" type="button" data-fvx>ปิด</button></div></div>'; mod.classList.add('on');
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-fv]'); if (b) fvOpen(b.getAttribute('data-fv')); });

  /* ---- 04 จับรางวัล (เฉพาะกิจกรรม B) — 3 ขั้น: ล็อกกอง → จับ → ตรวจสอบ ---- */
  H['raffle/04-admin-draw-run.html'] = function () {
    var cfg = PMP.cfg(), root = $('#screen'), bs = cfg.raffles.filter(function (f) { return f.mode === 'B'; }), body = $('#rfBody');
    if (!bs.length) { body.innerHTML = '<div class="card"><div class="card-b center muted" style="padding:28px">ยังไม่มีกิจกรรมแบบจับตามรอบ (B) — <a href="01-admin-list.html">สร้างกิจกรรม</a></div></div>'; return; }
    var f = rfCur('B', 'raffleB'); pickBar2($('.page-head'), 'livePick', bs.map(function (x) { return { id: x.id, label: x.name }; }), f.id, function (v) { U.wr(selKey('raffleB'), v); history.replaceState(null, '', location.pathname); rerender(); }, null);
    var res = PMP.drawResult(f.id), st = PMP.state(), lock = PMP.fairLockOf(f.id), live = PMP.fairCommit(f.id), mine = rfPool(f), tot = PMP.poolSize(f.id), late = cfg.now < f.drawAt, src = fairSrc(f);
    var people = Object.keys(st.shared.rafflePool[f.id] || {}).length + Math.round((f.poolOthers || 0) / 8);
    function who(w) { if (w.indexOf('other-') === 0) return '<span class="muted">ผู้ร่วมกิจกรรมรายอื่น (' + E(w) + ')</span>'; var c = PMP.customers.filter(function (x) { return x.id === w; })[0]; return '<b>' + E(c ? c.name : w) + '</b>'; }
    var stepChip = function (ok, wait) { return '<span class="chip ' + (ok ? 'success' : wait ? 'soft-warning' : '') + '">' + (ok ? 'เสร็จแล้ว' : wait ? 'รอทำ' : 'ยังไม่ถึงขั้นนี้') + '</span>'; };
    var s1 = '<div class="card relative"><span class="pin abs">1</span><div class="card-h"><h6>① ล็อกกอง และประกาศรหัส</h6>' + stepChip(!!lock, !lock) + '</div><div class="card-b">' +
      '<div class="small muted mb8">ปิดรับสิทธิ์เข้ากอง แล้วสร้างรหัสกอง (SHA-256 ของรายชื่อ) ให้ลูกค้าเห็นก่อนจับ — หลังล็อกแล้ว แก้รายชื่อไม่ได้</div>' +
      '<div class="small muted">' + (lock ? 'รหัสกอง (ล็อกเมื่อ ' + dmy(lock.at) + ' · ' + lock.total + ' ใบ · ลูกค้าเห็นแล้ว)' : 'รหัสกองตอนนี้ (ตัวอย่าง — ยังเปลี่ยนได้จนกว่าจะล็อก)') + '</div><div class="hash' + (lock ? '' : ' draft') + '">' + E(lock ? lock.commit : live.commit) + '</div>' +
      (lock || res ? '' : '<div class="row mt8"><button class="btn contained" id="rfLock"' + (tot && live.total ? '' : ' disabled') + '>ล็อกกอง & ประกาศรหัส</button><span class="small muted">' + (live.total ? 'กองมี ' + live.total + ' ใบ (ลูกค้าในจำลอง ' + mine + ' + รายอื่น ' + (f.poolOthers || 0) + ')' : 'ยังไม่มีสิทธิ์ในกอง') + '</span></div>') + '</div></div>';
    var s2 = '<div class="card relative"><span class="pin abs">2</span><div class="card-h"><h6>② จับรางวัล</h6>' + stepChip(!!res, !!lock && !res) + '</div><div class="card-b">' +
      '<div class="row between wrap"><div><div class="small muted">ที่มาของ seed (ตั้งที่ <a href="02-admin-editor.html" data-rfsel="' + f.id + '">ตั้งค่ากิจกรรม</a>)</div><b>' + E(SEEDSRC[src][0]) + '</b>' + (src === 'public' && f.fair && f.fair.pubLabel ? '<div class="small">ใช้: ' + E(f.fair.pubLabel) + '</div>' : '') + '</div><div class="small muted">วันประกาศผล ' + dmy(f.drawAt) + (res ? ' · จับแล้ว ' + dmy(res.d) : late ? ' · ยังไม่ถึงวัน' : '') + '</div></div>' +
      (res ? '' : (src === 'public' ? '<div class="field mt8"><label>ค่าสาธารณะที่ใช้เป็น seed *</label><input class="input" id="rfPub" placeholder="' + E((f.fair && f.fair.pubLabel) || 'เช่น 123456') + '"' + (lock ? '' : ' disabled') + '><span class="help">กรอกค่าที่ออกมาแล้วจริงจากแหล่งภายนอก — ลูกค้าจะเห็นค่านี้และตรวจเทียบกับแหล่งนั้นได้</span></div>' : '') + '<div class="row mt8"><button class="btn contained" id="rfDo"' + (lock ? '' : ' disabled') + '>จับรางวัล (ยืนยันแล้วย้อนกลับไม่ได้)</button>' + (lock ? '' : '<span class="small muted">ต้องล็อกกองในขั้น ① ก่อน</span>') + '</div>') + '</div></div>';
    var s3 = '<div class="card relative"><span class="pin abs">3</span><div class="card-h"><h6>③ ผลและการตรวจสอบ</h6>' + stepChip(!!res, false) + '</div><div class="card-b">' +
      (res ? '<div class="small muted mb8">seed ' + (res.seedSrc === 'public' ? '(ค่าสาธารณะ)' : '(ระบบสุ่ม)') + ' เปิดเผยแล้ว · กอง ' + res.total + ' ใบ' + (res.demo ? ' · <span class="chip soft-warning sq">จับด้วยปุ่มเดโม (ให้ลูกค้าจำลองถูกรางวัล)</span>' : '') + '</div><div class="hash">' + E(res.seed) + '</div>' +
      '<div class="table-wrap mt8"><table class="table"><thead><tr><th>รางวัล</th><th>ผู้โชคดี</th></tr></thead><tbody>' + f.prizes.map(function (z) { return '<tr><td><b>' + E(z.name) + '</b></td><td>' + res.winners.filter(function (w) { return w.prizeId === z.id; }).map(function (w) { return '<div>' + who(w.who) + '</div>'; }).join('') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row mt8"><button class="btn outlined primary" data-fv="' + f.id + '">ตรวจสอบผล (คำนวณซ้ำ)</button><span class="small muted">ลูกค้ากดตรวจได้เองที่หน้า “จับตามรอบ”</span></div><div class="small muted mt8">ผู้ชนะที่เป็นลูกค้าในระบบได้รับรางวัลเข้าบัญชี/คิวรับของแล้ว และเห็นผลที่หน้า “จับตามรอบ” ของตน</div>' : '<div class="muted small">ยังไม่ได้จับรางวัล — ผลและปุ่มตรวจสอบจะแสดงที่นี่</div>') + '</div></div>';
    body.innerHTML =
      '<div class="grid g4"><div class="stat"><div class="l">สิทธิ์ทั้งกอง</div><div class="v num">' + tot.toLocaleString() + ' ใบ</div><div class="small muted">ลูกค้าในจำลอง ' + mine + ' · รายอื่น ' + (f.poolOthers || 0) + '</div></div><div class="stat"><div class="l">ผู้ร่วมกิจกรรม</div><div class="v num">' + people + '</div><div class="small muted">ราย</div></div><div class="stat"><div class="l">ผู้โชคดีทั้งหมด</div><div class="v num">' + f.prizes.reduce(function (a, z) { return a + (z.winners || 1); }, 0) + '</div><div class="small muted">' + f.prizes.length + ' รางวัล</div></div><div class="stat"><div class="l">สถานะ</div><div class="v">' + (res ? 'จับแล้ว' : lock ? 'ล็อกกองแล้ว' : 'เปิดรับสิทธิ์') + '</div><div class="small muted">' + E(f.name) + '</div></div></div>' +
      '<div class="alert info"><div><b>ลำดับการจับที่โปร่งใส: ① ล็อกกอง → ② จับรางวัล → ③ ตรวจสอบ</b><div class="small">ทำตามลำดับ ปุ่มของขั้นถัดไปจะเปิดเมื่อขั้นก่อนเสร็จ · ลูกค้าเห็นรหัสกองก่อนจับ และตรวจผลเองได้หลังจับ</div></div></div>' + s1 + s2 + s3 +
      '<div class="card"><div class="card-h"><h6>ระบบนี้ปลอดภัยยังไง (อ่านง่าย)</h6></div><div class="card-b">' + fairExplain() + '</div></div>';
    var bl = $('#rfLock'); if (bl) bl.onclick = function () { var r = PMP.fairLock(f.id); if (r.error) { toast(r.error, true); return; } toast('ล็อกกองแล้ว — ลูกค้าเห็นรหัสกองแล้ว'); rerender(); };
    var b = $('#rfDo'); if (b) b.onclick = function () { var pub = $('#rfPub') ? $('#rfPub').value : ''; if (src === 'public' && !pub.trim()) { toast('กรอกค่าสาธารณะที่ใช้เป็น seed ก่อน', true); return; } if (late && !confirm('ยังไม่ถึงวันประกาศผล (' + dmy(f.drawAt) + ') — จับรางวัลก่อนกำหนด?')) return; if (!confirm('จับรางวัล? ยืนยันแล้วย้อนกลับไม่ได้')) return; var r = PMP.drawB(f.id, null, pub); if (r.error) { toast(r.error, true); return; } toast('จับรางวัลแล้ว — ' + r.winners.length + ' ผู้โชคดี'); rerender(); };
  };

  /* ---- 05 บันทึกการลุ้น ---- */
  H['raffle/05-admin-audit.html'] = function () {
    var st = PMP.state(), cfg = PMP.cfg(), root = $('#screen'), rows = [];
    Object.keys(st.customers).forEach(function (k) { var c = PMP.customers.filter(function (x) { return x.id === k; })[0]; st.customers[k].draws.forEach(function (d) { rows.push({ c: c, d: d }); }); });
    rows.sort(function (a, b) { return a.d.d < b.d.d ? 1 : -1; });
    $('table.table tbody', root).innerHTML = rows.map(function (r, n) {
      var f = cfg.raffles.filter(function (x) { return x.id === r.d.fid || x.name === r.d.f; })[0], m = r.d.mode || (f && f.mode) || 'A';
      return '<tr data-m="' + m + '"><td class="nowrap">' + dmy(r.d.d) + '</td><td><b>' + E(r.c.name) + '</b><div class="small muted">' + r.c.id.toUpperCase() + '</div></td><td>' + E(r.d.f) + '</td><td><span class="mode ' + MODE[m][1] + '">' + m + '</span></td><td><span class="chip success">ถูก</span> ' + E(r.d.prize) + '</td><td class="small">' + E((r.d.out || []).join(', ')) + '</td><td class="mono small">' + (m === 'A' ? 'DR-' + String(4899 - n).padStart(6, '0') : 'B-' + (PMP.drawResult(r.d.fid) ? PMP.drawResult(r.d.fid).commit.slice(0, 10) : '')) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="center muted" style="padding:24px">ยังไม่มีการลุ้น — ลุ้นที่หน้า “ลุ้นทันที” หรือจับรางวัลกิจกรรม B</td></tr>';
    tabFilter($('.table-toolbar .seg', root), $('table.table tbody', root), [{ k: 'ทั้งหมด', f: function () { return true; } }, { k: 'ลุ้นทันที (A)', f: function (r) { return r.getAttribute('data-m') === 'A'; } }, { k: 'จับตามรอบ (B)', f: function (r) { return r.getAttribute('data-m') === 'B'; } }], 'pmpc.live.tab.raffleaudit', $('.table-toolbar input', root));
  };

  /* ---- 06 สิทธิ์ลุ้นของฉัน (แยก A / B ชัดเจน) ---- */
  function rfCard(f, c, st) {
    var n = c.tickets[f.id] || 0, s = PMP.status(f, PMP.cfg().now), cid = custId(), mine = (st.shared.rafflePool[f.id] || {})[cid] || 0, res = PMP.drawResult(f.id), cust0 = PMP.customers.filter(function (x) { return x.id === cid; })[0];
    var aud = f.aud === 'all' || f.aud === cust0.type, how = [];
    if (f.perBaht) how.push('ซื้อครบทุก ' + B(f.perBaht) + ' = 1 สิทธิ์'); if (f.ptsPer) how.push('แลก ' + f.ptsPer + ' พอยท์ = 1 สิทธิ์'); if (rfSources(f).length) how.push('จากโปรโมชั่น/แคมเปญที่ร่วมรายการ');
    var btn = f.mode === 'A' ? '<a class="btn contained' + (n < 1 || s !== 'running' || !aud ? ' disabled' : '') + '" href="07-customer-instant-draw.html?f=' + f.id + '">ลุ้นเลย</a>' : '<a class="btn contained" href="08-customer-scheduled.html?f=' + f.id + '">' + (res ? 'ดูผลการจับรางวัล' : 'ไปลงกองรางวัล') + '</a>';
    var ex = f.ptsPer ? '<button class="btn outlined primary" data-rfx="' + f.id + '"' + (c.points < f.ptsPer || s !== 'running' ? ' disabled' : '') + '>แลก ' + f.ptsPer + ' พอยท์ = 1 สิทธิ์</button>' : '';
    return '<div class="card"><div class="card-b ev-card"><div><div class="tk-big">' + n + '</div><div class="small muted">ใบพร้อมใช้</div></div><div><div class="row wrap"><b style="font-size:16px">' + E(f.name) + '</b>' + (s !== 'running' ? '<span class="chip">' + PMP.statusLabel[s] + '</span>' : '') + (aud ? '' : '<span class="chip soft-warning">ไม่ตรงกลุ่มของคุณ</span>') + '</div><div class="small muted mt8">' + E(f.desc || '') + '</div><div class="small muted mt8">' + dm(f.start) + ' – ' + dm(f.end) + (f.mode === 'B' ? ' · ประกาศผล ' + dm(f.drawAt) : '') + '</div><div class="src-chips mt8">' + how.map(function (h) { return '<span>' + E(h) + '</span>'; }).join('') + '</div>' + (f.mode === 'B' ? '<div class="small mt8">เข้ากองรอจับแล้ว <b>' + mine + '</b> ใบ' + (res ? ' · <span class="chip success">จับรางวัลแล้ว</span>' : '') + '</div>' : '') + '</div><div class="stack s8" style="min-width:190px">' + btn + ex + '</div></div></div>';
  }
  H['raffle/06-customer-tickets.html'] = function () {
    var cfg = PMP.cfg(), c = cs(), st = PMP.state(), A = cfg.raffles.filter(function (f) { return f.mode === 'A'; }), Bs = cfg.raffles.filter(function (f) { return f.mode === 'B'; });
    var ta = A.reduce(function (a, f) { return a + (c.tickets[f.id] || 0); }, 0), tb = Bs.reduce(function (a, f) { return a + (c.tickets[f.id] || 0); }, 0), inPool = Bs.reduce(function (a, f) { return a + (((st.shared.rafflePool[f.id] || {})[custId()]) || 0); }, 0);
    $('#rfBody').innerHTML =
      '<div class="grid g3"><div class="stat"><div class="l"><span class="mode a">A</span> สิทธิ์ลุ้นทันที</div><div class="v num">' + ta + ' ใบ</div><div class="small muted">ใช้แล้วรู้ผลเลย</div></div><div class="stat"><div class="l"><span class="mode b">B</span> สิทธิ์จับตามรอบ</div><div class="v num">' + tb + ' ใบ</div><div class="small muted">ลงกองแล้ว ' + inPool + ' ใบ</div></div><div class="stat"><div class="l">รางวัลที่เคยได้</div><div class="v num">' + (c.draws || []).length + ' ครั้ง</div><div class="small muted"><a href="09-customer-history.html">ดูประวัติ</a></div></div></div>' +
      '<div class="rf-group a"><div class="rf-gh"><span class="mode a">A</span><div><b>ลุ้นทันที</b><div class="small muted">ใช้สิทธิ์ 1 ใบ หมุนวงล้อ รู้ผลทันที</div></div></div><div class="stack">' + (A.map(function (f) { return rfCard(f, c, st); }).join('') || '<div class="muted small">ตอนนี้ยังไม่มีกิจกรรมลุ้นทันที</div>') + '</div></div>' +
      '<div class="rf-group b"><div class="rf-gh"><span class="mode b">B</span><div><b>จับรางวัลตามรอบ</b><div class="small muted">นำสิทธิ์ลงกอง รอประกาศผลตามวันที่กำหนด</div></div></div><div class="stack">' + (Bs.map(function (f) { return rfCard(f, c, st); }).join('') || '<div class="muted small">ตอนนี้ยังไม่มีกิจกรรมจับตามรอบ</div>') + '</div></div>';
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rfx]'); if (b) { var r = PMP.exchangeTickets(custId(), b.getAttribute('data-rfx'), 1); toast(r.error || 'แลกแล้ว ใช้ ' + r.need + ' พอยท์ ได้สิทธิ์ลุ้น 1 ใบ', !!r.error); rerender(); } });

  /* ---- 08 จับตามรอบ (B) ---- */
  H['raffle/08-customer-scheduled.html'] = function () {
    var cfg = PMP.cfg(), bs = cfg.raffles.filter(function (f) { return f.mode === 'B'; }), body = $('#rfBody');
    if (!bs.length) { body.innerHTML = '<div class="card"><div class="card-b center muted" style="padding:28px">ตอนนี้ยังไม่มีกิจกรรมจับรางวัลตามรอบ</div></div>'; return; }
    var f = rfCur('B', 'raffleB'), st = PMP.state(), c = cs(), cid = custId(), pool = st.shared.rafflePool[f.id] || {}, mine = pool[cid] || 0, tot = PMP.poolSize(f.id), res = PMP.drawResult(f.id), n = c.tickets[f.id] || 0, s = PMP.status(f, cfg.now);
    var days = Math.max(0, Math.round((new Date(f.drawAt) - new Date(cfg.now)) / 864e5));
    var mw = res ? res.winners.filter(function (w) { return w.who === cid; }) : [];
    var lk = PMP.fairLockOf(f.id);
    var locked = !!res && mine > 0 && !PMP.revealed(cid, f.id);
    body.innerHTML = (bs.length > 1 ? '<div class="small muted mb8">กิจกรรมจับตามรอบ: ' + bs.map(function (x) { return '<a href="08-customer-scheduled.html?f=' + x.id + '" data-rfsel="' + x.id + '"' + (x.id === f.id ? ' style="font-weight:800"' : '') + '>' + E(x.name) + '</a>'; }).join(' · ') + '</div>' : '') +
      '<div class="hero"><div class="row between wrap"><div><span class="mode b">B</span> จับตามรอบ<h5 style="margin:6px 0">' + E(f.name) + '</h5><div class="small">' + E(f.desc || '') + '</div></div><div class="center"><div class="small">' + (res ? 'ประกาศผลแล้ว' : 'ประกาศผล ' + dm(f.drawAt)) + '</div><div style="font-size:26px;font-weight:800">' + (res ? '✓' : 'อีก ' + days + ' วัน') + '</div></div></div></div>' +
      (locked ? '<div class="card"><div class="card-b center" style="padding:26px"><div style="font-size:34px">🎁</div><h5 style="margin:8px 0">ประกาศผลแล้ว!</h5><div class="small muted mb8">คุณได้ร่วมลุ้นด้วย ' + mine + ' สิทธิ์ — เปิดดูผลของคุณก่อน แล้วจึงดูรายชื่อผู้โชคดีทั้งหมด</div><button class="btn contained lg" type="button" data-rvopen="' + f.id + '">เปิดดูผลของฉัน</button></div></div>' : '') + (locked ? '' : res && mw.length ? '<div class="alert success"><div><div class="a-title">🎉 ยินดีด้วย! คุณถูกรางวัล</div>' + mw.map(function (w) { return E(w.prize); }).join(' · ') + ' — รางวัลเข้าบัญชี/คิวรับของของคุณแล้ว</div></div>' : res ? '<div class="alert info"><div>ประกาศผลแล้ว — รอบนี้คุณไม่ได้รับรางวัล ขอบคุณที่ร่วมสนุก</div></div>' : '') +
      '<div class="grid g2"><div class="card"><div class="card-h"><h6>สิทธิ์ของฉัน</h6><span class="chip soft-info">ในกอง ' + mine + ' ใบ</span></div><div class="card-b">' +
      '<div class="row between"><span>สิทธิ์พร้อมใช้</span><b>' + n + ' ใบ</b></div>' +
      (res ? '<div class="small muted mt8">กิจกรรมนี้จับรางวัลแล้ว — ไม่รับสิทธิ์เพิ่ม</div>' : '<div class="row mt8" style="gap:8px"><button class="btn contained sm" data-rfpool="' + f.id + '|1"' + (n < 1 || s !== 'running' ? ' disabled' : '') + '>ลง 1 สิทธิ์เข้ากอง</button><button class="btn outlined primary sm" data-rfpool="' + f.id + '|' + n + '"' + (n < 1 || s !== 'running' ? ' disabled' : '') + '>ลงทั้งหมด (' + n + ')</button></div><div class="small muted mt8">ลงกองกี่ใบก็ถูกได้ไม่เกิน 1 รางวัลต่อการจับ — ใบที่มากขึ้นช่วยเพิ่มโอกาสถูก · สิทธิ์ที่ลงกองแล้วถอนคืนหรือโอนไม่ได้' + (n < 1 ? ' · ซื้อสินค้าครบทุก ' + B(f.perBaht) + ' เพื่อรับสิทธิ์' : '') + '</div>') + '</div></div>' +
      '<div class="card"><div class="card-h"><h6>ความโปร่งใส — ตรวจเองได้</h6></div><div class="card-b"><div class="grid g2"><div><div class="small muted">สิทธิ์ทั้งกอง</div><div class="winners-n">' + tot.toLocaleString() + ' ใบ</div></div><div><div class="small muted">โอกาสของฉัน</div><div class="winners-n">' + (tot ? (mine / tot * 100).toFixed(2) : 0) + '%</div></div></div>' +
      '<div class="fair-tl mt8"><div class="fx-row"><span class="fx-st ' + (lk ? 'ok' : '') + '">' + (lk ? '✓' : '1') + '</span><div><b>ปิดรับรายชื่อ</b> <span class="small muted">' + (lk ? '— ปิดรับแล้ว ' + dm(lk.at) + ' (' + lk.total + ' ใบ) จะไม่มีใครเพิ่มหรือลบชื่อได้อีก' : '— ยังเปิดรับสิทธิ์ ทีมงานจะปิดรับและประกาศรหัสอ้างอิงก่อนจับ') + '</span>' + (lk ? '<div class="small mt8">รหัสอ้างอิงรายชื่อ: <b class="mono">' + shortRef(lk.commit) + '</b></div>' : '') + '</div></div>' +
      '<div class="fx-row"><span class="fx-st ' + (res ? 'ok' : '') + '">' + (res ? '✓' : '2') + '</span><div><b>จับรางวัล</b> <span class="small muted">— ผู้ชนะมาจากสูตรคำนวณ ไม่มีใครเลือกด้วยมือ · ตัวตั้งต้นสุ่ม: ' + (fairSrc(f) === 'public' ? 'ใช้ค่าสาธารณะที่ทุกคนตรวจได้' + (f.fair && f.fair.pubLabel ? ' (' + E(f.fair.pubLabel) + ')' : '') : 'ระบบสุ่มให้') + '</span></div></div>' +
      '<div class="fx-row"><span class="fx-st ' + (res && !locked ? 'ok' : '') + '">3</span><div><b>ตรวจสอบเอง</b> <span class="small muted">' + (res ? (locked ? '— เปิดดูผลของคุณก่อน แล้วจึงตรวจสอบได้' : '— กดแล้วระบบจะจับรางวัลซ้ำให้ดู เพื่อยืนยันว่าผลไม่ถูกแก้') : '— ตรวจได้หลังจับรางวัล') + '</span>' + (res && !locked ? '<div class="mt8"><button class="btn outlined primary sm" data-fv="' + f.id + '">ตรวจสอบว่าผลไม่ถูกแก้</button></div>' : '') + '</div></div></div>' +
      '<details class="mt8"><summary class="small"><b>ระบบนี้ทำงานยังไง / ทำไมเชื่อได้</b></summary><div class="mt8">' + fairExplainC() + '</div></details></div></div></div>' +
      '<div class="card mt16"><div class="card-h"><h6>รางวัลในกิจกรรมนี้</h6></div><div class="card-b"><div class="grid g3">' + f.prizes.map(function (z) { var ws = res ? res.winners.filter(function (w) { return w.prizeId === z.id; }) : []; return '<div class="prize-card"><div class="pb"><b>' + E(z.name) + '</b><div class="small muted">' + z.winners + ' ผู้โชคดี</div>' + (res && !locked ? '<div class="small mt8">ผู้โชคดี: ' + ws.map(function (w) { return w.who === cid ? '<b style="color:var(--primary-dark)">คุณ</b>' : w.who.indexOf('other-') === 0 ? 'ร้านที่ร่วมรายการ' : E((PMP.customers.filter(function (x) { return x.id === w.who; })[0] || {}).name || w.who); }).join(', ') + '</div>' : '') + '</div></div>'; }).join('') + '</div></div></div>';
    relabelCustomer();
  };
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rfpool]'); if (b) { var d = b.getAttribute('data-rfpool').split('|'), r = PMP.enterPool(custId(), d[0], +d[1]); toast(r.error || 'ลงกองแล้ว ' + d[1] + ' สิทธิ์ (ถอนคืนไม่ได้)', !!r.error); rerender(); } });

  /* ---- 09 ประวัติ ---- */
  H['raffle/09-customer-history.html'] = function () {
    var c = cs();
    $('#rfBody').innerHTML = '<div class="card" style="overflow:hidden"><div class="card-h"><h6>ประวัติการลุ้นและผลรางวัล</h6></div><div class="table-wrap"><table class="table"><thead><tr><th>วันที่</th><th>กิจกรรม</th><th>รูปแบบ</th><th>ผล</th></tr></thead><tbody>' +
      ((c.draws || []).map(function (d, n) { var f = PMP.cfg().raffles.filter(function (x) { return x.id === d.fid; })[0], m = d.mode || (f && f.mode) || 'A'; return '<tr><td class="nowrap">' + dmy(d.d) + '</td><td>' + E(d.f) + '</td><td><span class="mode ' + MODE[m][1] + '">' + m + '</span> ' + MODE[m][0] + '</td><td><span class="chip success">ถูก</span> <b>' + E(d.prize) + '</b><div class="small muted">' + E((d.out || []).join(', ')) + '</div></td></tr>'; }).join('') || '<tr><td colspan="4" class="center muted" style="padding:24px">ยังไม่มีประวัติ — ลุ้นที่ “สิทธิ์ลุ้นของฉัน”</td></tr>') +
      '</tbody></table></div></div><div class="card mt16" style="overflow:hidden"><div class="card-h"><h6>ของรางวัลที่รอรับ</h6></div><div class="table-wrap"><table class="table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>จาก</th><th>สถานะ</th></tr></thead><tbody>' +
      ((c.queue || []).map(function (q) { return '<tr><td>' + E(q.text) + '</td><td>' + q.qty + '</td><td class="small">' + E(q.src) + '</td><td><span class="chip soft-warning">' + E(q.status) + '</span></td></tr>'; }).join('') || '<tr><td colspan="4" class="center muted" style="padding:24px">ไม่มีของรางวัลที่รอรับ</td></tr>') + '</tbody></table></div></div>';
    relabelCustomer();
  };

  /* ================= แจ้งเตือนลูกค้า (ในเว็บเท่านั้น) — admin ตั้งค่า → ลูกค้าเห็นที่กระดิ่ง/ศูนย์แจ้งเตือน/หน้าแรก ================= */
  var NF_TYPE = { points: 'พอยท์', ladder: 'แคมเปญสะสมยอด', claim: 'คำขอรับรางวัล', coupon: 'คูปอง', promo: 'โปรโมชั่น', raffle: 'สุ่มรางวัล' };
  function nfCard(n, withBtn) { return '<div class="nf-it ' + n.level + (n.read ? ' read' : '') + '"><span class="nf-dot"></span><div class="nf-b"><div class="row between wrap"><b>' + E(n.title) + '</b><span class="chip sq ' + ({ error: 'soft-error', warn: 'soft-warning', success: 'soft-success', info: 'soft-info' }[n.level]) + '">' + NF_TYPE[n.type] + '</span></div><div class="small">' + E(n.body) + '</div></div>' + (withBtn ? '<a class="btn outlined sm" href="' + n.href + '" data-nid="' + E(n.id) + '">ดู</a>' : '') + '</div>'; }
  function updateTop() {
    if (!$('.cust-top')) return;
    var cid = custId(), un = PMP.notifications(cid).filter(function (n) { return !n.read; }).length, bl = $('#custBell b'); if (bl) { bl.textContent = un; bl.hidden = !un; }
    var cart = U.rd('pmpc.sim.cart', null) || {}, q = Object.keys(cart).reduce(function (a, k) { return a + (cart[k] || 0); }, 0), cb = $('#custCart b'); if (cb) cb.textContent = q;
  }
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-nid]'); if (a) { PMP.notifRead(custId(), [a.getAttribute('data-nid')]); } });

  H['home/02-admin-notifications.html'] = function () {
    var cfg = PMP.cfg(), N = cfg.notify, root = $('#screen'), me = PMP.notifications(custId());
    function gv(k) { return k.split('.').reduce(function (a, x) { return a[x]; }, N); }
    function sw(k) { return '<label class="switch"><input type="checkbox" data-nf="' + k + '"' + (gv(k) ? ' checked' : '') + '></label>'; }
    function num(k, suf) { return '<span class="rate"><input class="input num" style="width:80px" type="number" min="1" data-nf="' + k + '" value="' + gv(k) + '"> ' + suf + '</span>'; }
    function chk(k, l) { return '<label class="check"><input type="checkbox" data-nf="' + k + '"' + (gv(k) ? ' checked' : '') + '> ' + l + '</label>'; }
    var rows = [
      ['points', 'พอยท์ใกล้หมดอายุ', 'เตือนเมื่อมีพอยท์ที่จะหมดอายุภายในจำนวนวันที่ตั้ง (≤ 7 วันเป็นสีแดง)', num('points.days', 'วันก่อนหมดอายุ'), '“240 พอยท์จะหมดอายุภายใน 20 วัน — ใช้เป็นส่วนลดหรือแลกของรางวัลก่อนหมด”'],
      ['ladder', 'แคมเปญสะสมยอด', 'ความคืบหน้าไปขั้นถัดไป + ปลดล็อกรางวัล + ใกล้สิ้นสุดแคมเปญ', chk('ladder.at80', 'ถึง 80%') + chk('ladder.at95', 'ถึง 95%') + num('ladder.expiryDays', 'วันก่อนแคมเปญสิ้นสุด'), '“เกือบถึงแล้ว! อีกเพียง ฿1,600 ปลดล็อกรางวัลขั้นถัดไป”'],
      ['claim', 'สถานะคำขอรับรางวัล', 'ได้รับคำขอ · อนุมัติ · ปฏิเสธ (พร้อมเหตุผล)', '<span class="small muted">ทุกการเปลี่ยนสถานะ</span>', '“คำขอรับรางวัลถูกปฏิเสธ — เหตุผล: ที่อยู่ไม่ครบ (สิทธิ์ถูกคืนแล้ว)”'],
      ['coupon', 'คูปองใกล้หมดอายุ', 'เตือนเฉพาะคูปองในกระเป๋าที่ยังไม่ได้ใช้', num('coupon.days', 'วันก่อนหมดอายุ'), '“SAVE100 หมดอายุใน 2 วัน”'],
      ['promo', 'โปรโมชั่นใกล้สิ้นสุด', 'เฉพาะโปรที่ลูกค้าอยู่ในกลุ่มเป้าหมาย', num('promo.days', 'วันก่อนสิ้นสุด'), '“โปรเข็มฉีดยา สิ้นสุดใน 3 วัน”'],
      ['raffle', 'สุ่มรางวัล', 'มีสิทธิ์ลุ้นที่ยังไม่ได้ใช้ + ประกาศผลกิจกรรมจับตามรอบ (ถูก/ไม่ถูก)', '<span class="small muted">อัตโนมัติ</span>', '“ยินดีด้วย! คุณถูกรางวัล: iPad Air”']
    ];
    $('#nfBody').innerHTML =
      '<div class="card relative"><span class="pin abs">1</span><div class="card-h"><h6>เรื่องที่แจ้งเตือน</h6><span class="chip soft-info sq">ช่องทางเดียว: แจ้งเตือนในเว็บ (กระดิ่ง + ศูนย์แจ้งเตือน)</span></div><div class="table-wrap"><table class="table"><thead><tr><th style="width:70px">เปิด</th><th>เรื่อง</th><th>ตั้งค่า <span class="pin">2</span></th><th>ข้อความที่ลูกค้าเห็น (ตัวอย่าง) <span class="pin">3</span></th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + sw(r[0] + '.on') + '</td><td><b>' + r[1] + '</b><div class="small muted">' + r[2] + '</div></td><td><div class="row wrap" style="gap:14px">' + r[3] + '</div></td><td class="small muted">' + r[4] + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card relative"><span class="pin abs">4</span><div class="card-h"><h6>ลูกค้าจำลองเห็นอะไรตอนนี้</h6><span class="small muted">' + E(cust().name) + ' · ณ วันที่ ' + dmy(cfg.now) + ' (เปลี่ยนลูกค้า/วันที่ได้ที่แถบ “จำลอง”)</span></div><div class="card-b"><div class="stack s8">' + (me.map(function (n) { return nfCard(n, false); }).join('') || '<div class="muted small">ไม่มีแจ้งเตือน — เปิดเรื่องด้านบนหรือเปลี่ยนลูกค้า/วันที่จำลอง</div>') + '</div><div class="mt16"><a class="btn outlined primary" href="03-customer-notifications.html">เปิดศูนย์แจ้งเตือนฝั่งลูกค้า →</a></div></div></div>';
    if (!root._nf) {
      root._nf = 1;
      root.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-nf'); if (!k) return; var v = e.target.type === 'checkbox' ? e.target.checked : Math.max(1, +e.target.value || 1); setCfg(function (c) { var p = k.split('.'), l = p.pop(); p.reduce(function (a, x) { return a[x]; }, c.notify)[l] = v; }); flashSaved(); rerender(); });
    }
  };

  H['home/03-customer-notifications.html'] = function () {
    var cid = custId(), all = PMP.notifications(cid), tab = U.rd('pmpc.live.tab.nf', 'ทั้งหมด'), ty = U.rd('pmpc.live.nftype', ''), un = all.filter(function (n) { return !n.read; }).length;
    var list = all.filter(function (n) { return (tab === 'ทั้งหมด' || !n.read) && (!ty || n.type === ty); });
    $('#nfBody').innerHTML = '<div class="row between wrap mb16"><div class="seg"><button type="button" data-nft="ทั้งหมด" class="' + (tab === 'ทั้งหมด' ? 'on' : '') + '">ทั้งหมด ' + all.length + '</button><button type="button" data-nft="ยังไม่อ่าน" class="' + (tab !== 'ทั้งหมด' ? 'on' : '') + '">ยังไม่อ่าน ' + un + '</button></div><div class="row"><select class="select" id="nfType" style="width:190px"><option value="">ทุกเรื่อง</option>' + Object.keys(NF_TYPE).map(function (k) { return '<option value="' + k + '"' + (ty === k ? ' selected' : '') + '>' + NF_TYPE[k] + '</option>'; }).join('') + '</select><button class="btn outlined" type="button" id="nfAll"' + (un ? '' : ' disabled') + '>ทำเครื่องหมายอ่านแล้วทั้งหมด</button></div></div>' +
      '<div class="stack s8">' + (list.map(function (n) { return nfCard(n, true); }).join('') || '<div class="card"><div class="card-b center muted" style="padding:28px">' + (all.length ? 'ไม่มีรายการในตัวกรองนี้' : 'ยังไม่มีการแจ้งเตือน') + '</div></div>') + '</div>';
    relabelCustomer(); updateTop();
    var root = $('#screen'); if (!root._nc) { root._nc = 1;
      root.addEventListener('click', function (e) { var t = e.target.closest('[data-nft]'); if (t) { U.wr('pmpc.live.tab.nf', t.getAttribute('data-nft')); rerender(); return; } if (e.target.id === 'nfAll') { PMP.notifRead(custId()); rerender(); toast('อ่านทั้งหมดแล้ว'); } });
      root.addEventListener('change', function (e) { if (e.target.id === 'nfType') { U.wr('pmpc.live.nftype', e.target.value); rerender(); } });
    }
  };
  (function () {
    var hh = H['home/01-customer-home.html'];
    H['home/01-customer-home.html'] = function () {
      hh(); var top = PMP.notifications(custId()).slice(0, 3), box = $('#nfHome'), host = $('.strip');
      if (!box && host) { box = document.createElement('div'); box.id = 'nfHome'; host.insertAdjacentElement('beforebegin', box); }
      if (box) box.innerHTML = top.length ? '<div class="card mb16"><div class="card-h"><h6>แจ้งเตือนสำหรับคุณ</h6><a href="03-customer-notifications.html">ดูทั้งหมด →</a></div><div class="card-b"><div class="stack s8">' + top.map(function (n) { return nfCard(n, true); }).join('') + '</div></div></div>' : '';
    };
  })();

  /* ---- Mode B: ลูกค้าลุ้นเปิดผลของตัวเองก่อน แล้วค่อยเห็นรายชื่อผู้โชคดีทั้งหมด ---- */
  function rvOpen(fid) {
    var f = PMP.raffle(fid), res = PMP.drawResult(fid), cid = custId(); if (!f || !res) return;
    var mod = $('#rfReveal'); if (!mod) { mod = document.createElement('div'); mod.id = 'rfReveal'; mod.className = 'modal'; document.body.appendChild(mod); mod.addEventListener('click', function (e) { if (e.target.closest('[data-rvx]')) { mod.classList.remove('on'); if (mod._done) rerender(); updateTop(); } }); }
    var mine = res.winners.filter(function (w) { return w.who === cid; }), names = res.winners.map(function (w) { return w.who === cid ? 'คุณ?' : w.who.indexOf('other-') === 0 ? 'ร้านที่ร่วมรายการ' : (PMP.customers.filter(function (x) { return x.id === w.who; })[0] || { name: w.who }).name; });
    function shell(b, foot) { mod.innerHTML = '<div class="dialog md"><div class="dialog-h"><span>ประกาศผล · ' + E(f.name) + '</span><button class="x" type="button" data-rvx>✕</button></div><div class="dialog-b"><div class="rv-box">' + b + '</div></div><div class="dialog-f">' + foot + '</div></div>'; mod.classList.add('on'); }
    shell('<div class="rv-t">แอดมินจับรางวัลเสร็จแล้ว</div><div class="rv-big">คุณได้ร่วมลุ้นด้วย ' + (((PMP.state().shared.rafflePool[fid] || {})[cid]) || 0) + ' สิทธิ์</div><div class="rv-roll">🎁 ?</div><div class="small muted mt8">ผลของคุณจะเปิดเป็นคนแรก ก่อนเห็นรายชื่อผู้โชคดีทั้งหมด</div>', '<button class="btn text grey" type="button" data-rvx>ไว้ทีหลัง</button><button class="btn contained lg" type="button" id="rvGo">เปิดดูผลของฉัน</button>');
    $('#rvGo').onclick = function () {
      shell('<div class="rv-t">กำลังเปิดผล…</div><div class="rv-big" id="rvCnt">3</div><div class="rv-roll" id="rvRoll">…</div>', '');
      var n = 0, cnt = 3, tm = setInterval(function () { n++; $('#rvRoll').textContent = names[n % names.length]; if (n % 6 === 0 && cnt > 1) { cnt--; $('#rvCnt').textContent = cnt; } if (n >= 16) { clearInterval(tm); done(); } }, 160);
    };
    function done() {
      PMP.setRevealed(cid, fid); mod._done = 1;
      var body = mine.length ? '<div class="rv-win"><div class="rv-conf">🎉🎊🎉</div><div class="rv-big" style="color:var(--success-darker)">ยินดีด้วย! คุณถูกรางวัล</div>' + mine.map(function (w) { return '<div style="font-size:18px;font-weight:700">' + E(w.prize) + '</div>'; }).join('') + '<div class="small mt8">รางวัลเข้าบัญชี/คิวรับของของคุณแล้ว</div></div>' : '<div class="rv-lose"><div class="rv-big">รอบนี้ยังไม่ใช่ของคุณ</div><div class="small muted">ขอบคุณที่ร่วมสนุก — ติดตามกิจกรรมครั้งต่อไปได้ที่หน้าสุ่มรางวัล</div></div>';
      shell(body, '<button class="btn text grey" type="button" data-rvx>ปิด</button><a class="btn contained" href="../raffle/08-customer-scheduled.html?f=' + fid + '">ดูรายชื่อผู้โชคดีทั้งหมด</a>');
      updateTop();
    }
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rvopen]'); if (b) rvOpen(b.getAttribute('data-rvopen')); });
  function rvCheck() {
    if (!$('.cust-top') || $('#rfReveal.on')) return; var p = PMP.revealPending(custId()); if (!p.length) return;
    var key = 'pmpc.sim.rvshown', shown = U.rd(key, {}), tag = custId() + ':' + p[0].id + ':' + PMP.drawResult(p[0].id).seed; if (shown[tag] && sessionStorage.getItem(tag)) return;
    shown[tag] = 1; U.wr(key, shown); try { sessionStorage.setItem(tag, 1); } catch (e) { } setTimeout(function () { rvOpen(p[0].id); }, 500);
  }

  /* ---------- boot ---------- */
  function boot() {
    try { updateTop(); } catch (e) { }
    try { rvCheck(); } catch (e) { }
    var f = H[KEY]; if (!f) return;
    simCtl(); document.body.setAttribute('data-hydrated', '1'); f();
    var lp = $('.live-panel'); if (lp) lp.parentNode.removeChild(lp);
  }
  window.PMP_LIVE = { H: H, E: E, $: $, $$: $$, dm: dm, dmy: dmy, cust: cust, cs: cs, custId: custId, toast: toast, rerender: rerender, tk: tk, prog: prog, empty: empty, relabel: relabelCustomer, lots: lots, ladderSum: ladderSum, ST: ST };
  window.PMP_LIVE.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 60); }); else setTimeout(boot, 60);
})();
