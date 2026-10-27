/* Simulator shared UI: header (nav · simulated date · customer · reset), toast, tiny helpers. Needs pmp-core.js */
(function (g) {
  var PMP = g.PMP, U = PMP.util;
  var SIM = g.SIM = {};
  SIM.custId = function () { return U.rd('pmpc.sim.cust', 'c-b2b'); };
  SIM.setCust = function (id) { U.wr('pmpc.sim.cust', id); };
  SIM.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  SIM.toast = function (msg, err) {
    var t = document.getElementById('simToast');
    if (!t) { t = document.createElement('div'); t.id = 'simToast'; t.className = 'sim-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'sim-toast on' + (err ? ' err' : '');
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = 'sim-toast' + (err ? ' err' : ''); }, 3200);
  };
  var NAV = [['00-flow.html', 'ภาพรวม', 'flow'], ['01-config.html', '① ตั้งค่า (แอดมิน)', 'config'], ['02-cart.html', '② ตะกร้า / ชำระเงิน (ลูกค้า)', 'cart'], ['03-state.html', '③ สิทธิ์ & ผลลัพธ์ของลูกค้า', 'state']];
  SIM.mount = function (active, onChange) {
    var cfg = PMP.cfg(), cust = SIM.custId();
    SIM.embed = /[?&]embed=1/.test(location.search);
    if (SIM.embed) document.body.classList.add('embed');
    var h = '<div class="sim-head"><div class="bar"><div class="ttl"><i>⚙</i>จำลองระบบครบวงจร</div><div class="sim-nav">' +
      NAV.map(function (n) { return '<a href="' + n[0] + '" class="' + (n[2] === active ? 'on' : '') + '">' + n[1] + '</a>'; }).join('') +
      '</div><div class="sim-ctl"><span>ลูกค้า</span><select class="select" id="simCust">' + PMP.customers.map(function (c) { return '<option value="' + c.id + '"' + (c.id === cust ? ' selected' : '') + '>' + c.name + ' · ' + c.tag + '</option>'; }).join('') +
      '</select><span>วันที่จำลอง</span><input class="input" id="simNow" type="date" value="' + cfg.now + '"><button class="btn outlined sm" id="simReset" type="button">รีเซ็ตทั้งหมด</button><a class="btn text sm grey" href="../index.html">◀ Mockup hub</a></div></div></div>';
    var scr = document.getElementById('screen'); scr.insertAdjacentHTML('afterbegin', h);
    if (SIM.embed) { var bd = document.querySelector('.demo-bar'); if (bd) bd.style.display = 'none'; }
    document.getElementById('simCust').onchange = function () { SIM.setCust(this.value); onChange && onChange('cust'); };
    document.getElementById('simNow').onchange = function () { var c = PMP.cfg(); c.now = this.value || c.now; PMP.saveCfg(c); onChange && onChange('now'); };
    document.getElementById('simReset').onclick = function () { if (confirm('รีเซ็ตข้อมูลจำลองทั้งหมด (ตั้งค่า ผลตอบแทน สถานะลูกค้า ตะกร้า) กลับเป็นค่าเริ่มต้น?')) { PMP.resetAll(); try { localStorage.removeItem('pmpc.sim.cart'); localStorage.removeItem('pmpc.sim.sel'); } catch (e) {} location.reload(); } };
  };
  SIM.onReady = function (fn) { function go() { setTimeout(fn, 30); } if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); };
  SIM.cust = function () { return PMP.customers.filter(function (c) { return c.id === SIM.custId(); })[0]; };
})(window);
