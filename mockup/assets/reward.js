/* Reward component — ONE editor for every module (promotion · coupon · points catalog · campaign tier · raffle prize).
   Replaces the old standalone "ชุดของรางวัล" admin page: each owner keeps its own reward group, tagged with the module that owns it.
   Usage:  <div data-rwd data-module="promotion" data-ref="p5" data-kinds="gift,disc,ship,points,coupon,credit,entitle,offpos" data-title="ผลตอบแทน"></div>
   Needs pmp-core.js. Items persist to localStorage 'pmpc.rwd.<module>.<ref>' (same keys the simulator reads). */
(function () {
  var PMP = window.PMP, U = PMP.util;
  var ALL = ['gift', 'disc', 'ship', 'points', 'coupon', 'credit', 'entitle', 'offpos'];
  var HINT = {
    gift: 'เลือกสินค้าในระบบ + จำนวน', disc: 'บาท หรือ % พร้อมเพดาน', ship: 'ไม่มีฟิลด์เพิ่ม',
    points: 'กำหนดจำนวนพอยท์ที่ได้คืน', coupon: 'เลือกจากคูปองที่มีอยู่ในระบบ', credit: 'ออกโดยระบบ เข้ากระเป๋าเครดิต',
    entitle: 'สิทธิ์ลุ้นในกิจกรรมสุ่มรางวัล (โหมด A วงล้อ / โหมด B จับตามรอบ)', offpos: 'ระบุเป็นข้อความว่าเป็นของชิ้นไหน'
  };
  var MODNAME = { promotion: 'โปรโมชั่น', coupon: 'คูปอง', points: 'พอยท์ (แคตตาล็อกแลก)', campaign: 'แคมเปญ', raffle: 'สุ่มรางวัล', starterkit: 'เซตร้านยาเปิดใหม่' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label) + '</option>'; }

  function itemHtml(it, i) {
    var cfg = PMP.cfg(), h = '<div class="rwd-item" data-i="' + i + '"><div class="rwd-h"><span class="chip soft-primary sq">' + PMP.kindLabel[it.k] + '</span><span class="rwd-hint">' + HINT[it.k] + '</span><button type="button" class="x-btn" data-rwd-del="' + i + '" title="ลบ">−</button></div><div class="rwd-f">';
    function f(label, ctl, cls) { return '<label class="rwd-fld ' + (cls || '') + '"><span>' + label + '</span>' + ctl + '</label>'; }
    function inp(key, type, val, extra) { return '<input class="input" data-f="' + key + '" type="' + (type || 'text') + '" value="' + esc(val) + '" ' + (extra || '') + '>'; }
    if (it.k === 'gift') {
      h += f('สินค้าที่แถม', '<select class="select" data-f="sku">' + PMP.products.map(function (p) { return opt(p.sku, p.sku + ' · ' + p.name, it.sku); }).join('') + '</select>', 'w2') + f('จำนวน', inp('qty', 'number', it.qty || 1, 'min="1"'));
    } else if (it.k === 'disc') {
      h += f('ชนิดส่วนลด', '<select class="select" data-f="mode">' + opt('baht', 'ลดเป็นบาท (฿)', it.mode) + opt('pct', 'ลดเป็นเปอร์เซ็นต์ (%)', it.mode) + '</select>') +
        f(it.mode === 'pct' ? 'ส่วนลด (%)' : 'ส่วนลด (บาท)', inp('value', 'number', it.value || 0, 'min="0"')) +
        (it.mode === 'pct' ? f('ลดสูงสุดไม่เกิน (฿) · 0 = ไม่จำกัด', inp('cap', 'number', it.cap || 0, 'min="0"')) : '');
    } else if (it.k === 'points') {
      h += f('จำนวนพอยท์ที่ได้คืน', inp('pts', 'number', it.pts || 0, 'min="1"'));
    } else if (it.k === 'coupon') {
      h += f('คูปองในระบบ', '<select class="select" data-f="couponId">' + cfg.coupons.map(function (k) { return opt(k.id, k.code + ' · ' + k.name, it.couponId); }).join('') + '</select>', 'w2') + f('จำนวนใบ', inp('qty', 'number', it.qty || 1, 'min="1"'));
    } else if (it.k === 'credit') {
      h += f('เครดิตเงินคืน (฿)', inp('amount', 'number', it.amount || 0, 'min="1"')) + f('หมดอายุภายใน (วัน) · 0 = ไม่หมด', inp('expiryDays', 'number', it.expiryDays || 0, 'min="0"'));
    } else if (it.k === 'entitle') {
      h += f('กิจกรรมสุ่มรางวัล', '<select class="select" data-f="activityId">' + cfg.raffles.map(function (r) { return opt(r.id, r.name + ' (โหมด ' + r.mode + ')', it.activityId); }).join('') + '</select>', 'w2') + f('จำนวนสิทธิ์', inp('tickets', 'number', it.tickets || 1, 'min="1"'));
    } else if (it.k === 'offpos') {
      h += f('ของรางวัล (ข้อความ)', inp('text', 'text', it.text || '', 'placeholder="เช่น กระเป๋าผ้า Pharmaplex"'), 'w2') + f('จำนวน', inp('qty', 'number', it.qty || 1, 'min="1"'));
    } else h += '<div class="rwd-note">ฟรีค่าจัดส่งเฉพาะบิลที่ใช้โปรนี้ — ไม่มีฟิลด์เพิ่ม</div>';
    return h + '</div></div>';
  }
  function emptyItem(k) {
    var cfg = PMP.cfg();
    return { gift: { k: 'gift', sku: 'BT-PP01', qty: 1 }, disc: { k: 'disc', mode: 'pct', value: 10, cap: 0 }, ship: { k: 'ship' }, points: { k: 'points', pts: 100 },
      coupon: { k: 'coupon', couponId: cfg.coupons[0].id, qty: 1 }, credit: { k: 'credit', amount: 100, expiryDays: 90 }, entitle: { k: 'entitle', activityId: cfg.raffles[0].id, tickets: 1 }, offpos: { k: 'offpos', text: '', qty: 1 } }[k];
  }
  function ownerOf(el) { return { module: el.getAttribute('data-module'), ref: el.getAttribute('data-ref') }; }
  function itemsOf(el) { var o = ownerOf(el); return PMP.rewardsOf(o.module, o.ref); }
  function summary(items) { return items.length ? items.map(function (i) { return PMP.describe(i); }).join(' + ') : 'ยังไม่มีผลตอบแทน — เพิ่มอย่างน้อย 1 รายการ'; }
  function renderInto(el) {
    var o = ownerOf(el), items = itemsOf(el), kinds = (el.getAttribute('data-kinds') || ALL.join(',')).split(',');
    var title = el.getAttribute('data-title') || 'ผลตอบแทน';
    var html = '<div class="rwd"><div class="rwd-top"><b>' + esc(title) + '</b><span class="chip outline sq" title="flag source_module ในฐานข้อมูล">ของโมดูล: ' + (MODNAME[o.module] || o.module) + '</span><span class="rwd-saved"></span></div>' +
      '<div class="rwd-list">' + (items.length ? items.map(itemHtml).join('') : '<div class="rwd-empty">ยังไม่มีผลตอบแทน</div>') + '</div>' +
      '<div class="rwd-add"><span>＋ เพิ่ม:</span>' + kinds.map(function (k) { return '<button type="button" class="btn outlined sm" data-rwd-add="' + k + '">' + PMP.kindLabel[k] + '</button>'; }).join('') + '</div>' +
      '<div class="rwd-sum"><b>สรุปผลตอบแทน:</b> <span class="rwd-sum-t">' + esc(summary(items)) + '</span></div>' +
      '<details class="rwd-json"><summary>ดูโครงสร้างข้อมูลที่เก็บ (reward_group)</summary><pre></pre></details></div>';
    el.innerHTML = html; refresh(el);
  }
  function refresh(el) {
    var o = ownerOf(el), items = itemsOf(el);
    var s = el.querySelector('.rwd-sum-t'); if (s) s.textContent = summary(items);
    var pre = el.querySelector('.rwd-json pre'); if (pre) pre.textContent = JSON.stringify({ source_module: o.module, owner_ref: o.ref, items: items }, null, 1);
  }
  function save(el, items) {
    var o = ownerOf(el); PMP.saveRewards(o.module, o.ref, items); refresh(el);
    var sv = el.querySelector('.rwd-saved'); if (sv) { sv.textContent = '✓ บันทึกแล้ว'; clearTimeout(sv._t); sv._t = setTimeout(function () { sv.textContent = ''; }, 1400); }
    document.dispatchEvent(new CustomEvent('rwd:change', { detail: { module: o.module, ref: o.ref } }));
  }
  function initAll() { Array.prototype.forEach.call(document.querySelectorAll('[data-rwd]'), renderInto); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-rwd-add]'), d = e.target.closest && e.target.closest('[data-rwd-del]');
    if (!a && !d) return;
    var el = e.target.closest('[data-rwd]'), items = itemsOf(el);
    if (a) items.push(emptyItem(a.getAttribute('data-rwd-add')));
    else items.splice(+d.getAttribute('data-rwd-del'), 1);
    var o = ownerOf(el); PMP.saveRewards(o.module, o.ref, items); renderInto(el); save(el, items);
  });
  function onEdit(e) {
    var t = e.target; if (!t.getAttribute || !t.getAttribute('data-f')) return;
    var el = t.closest('[data-rwd]'); if (!el) return;
    var row = t.closest('.rwd-item'), i = +row.getAttribute('data-i'), items = itemsOf(el), key = t.getAttribute('data-f');
    var v = t.type === 'number' ? Number(t.value) : t.value; items[i][key] = v;
    save(el, items);
    if (e.type === 'change' && key === 'mode') renderInto(el);
  }
  document.addEventListener('input', onEdit); document.addEventListener('change', onEdit);
  PMP.Reward = { init: initAll, render: renderInto };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(initAll, 0); }); else setTimeout(initAll, 0);
})();
