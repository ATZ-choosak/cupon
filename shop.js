/* shop.js — realistic single-page storefront: one customer browses, buys, earns points,
   climbs the campaign ladder — every rule (combo/flash/bill-discount/freeship/coupons/points/
   milestones) is read live from SETTINGS (shared-state.js), which is exactly what
   admin.html writes to localStorage. No separate "system A/B" simulators anymore —
   this page IS the realistic simulation, settings-driven end to end. */

const FLAT_SHIP = 45;          // ค่าส่งมาตรฐานเมื่อไม่เข้าเงื่อนไขส่งฟรี
const SHIP_EXEMPT_RATE = 0.10; // สูตรจำลองค่าส่งต่อชิ้นของกลุ่มยกเว้น (10% ของราคา)
const CUSTOMER_KEY = "pmpc_shop_customer_v1";
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MFIELD_HTML_TYPE = { TEXT: "text", TEL: "tel", NUMBER: "number", DATE: "date" };

let SETTINGS = pmpcLoadSettings();
let cart = {};              // productName -> qty
let appliedCoupon = null;   // {kind:'online'} | {kind:'wallet', key}
let codeMsgState = null;    // {type:'ok'|'err', text}
let openClaimFormId = null; // milestone id ที่กางฟอร์มขอรับอยู่
let checkoutMsg = "";

function fmt(n) { n = Number(n); return Number.isFinite(n) ? n.toLocaleString("th-TH") : "0"; }
function num(n, fallback) { n = Number(n); return Number.isFinite(n) ? n : (fallback || 0); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function customerName() { return (document.getElementById("personaNameInput").value || "").trim() || "ลูกค้าทั่วไป"; }
function inAudience(obj, name) { return !obj || obj.audienceType !== "some" || (obj.audienceCustomers || []).includes(name); }
function computeOff(discountType, discountValue, base, maxCap) {
  base = num(base);
  discountValue = num(discountValue);
  let off = discountType === "percent" ? Math.round(base * (discountValue / 100)) : discountValue;
  if (discountType === "percent" && maxCap) off = Math.min(off, num(maxCap, Infinity));
  return Math.max(0, Math.min(off, base));
}

/* ---------------- customer (this browser's demo persona) ---------------- */

function defaultCustomer() {
  return {
    points: 0,
    lifetimeSpend: 0,        // ยอดสะสมสำหรับแคมเปญขั้นบันได — บวกอย่างเดียว ไม่ลดจากการแปลงพอยท์
    convertibleBalance: 0,   // ยอดที่ยังไม่ได้แปลงเป็นพอยท์ — ลูกค้ากดแปลงเองเมื่อไหร่ก็ได้ แยกจากยอดสะสมแคมเปญ
    ordersCount: 0,
    cart: {},
    claimedMilestoneIds: [],
    promoClaimsCount: {},   // promoId -> ใช้โปรโมชั่นนี้ไปกี่ครั้งแล้ว (สำหรับ promo.quotaPerCustomer)
    collectedCoupons: [],   // {key, name, discountType, discountValue, maxDiscountCap, excluded, minSpend, expiresLabel}
    couponUsage: {},        // CODE -> ใช้ไปกี่ครั้งแล้ว (ของคนนี้)
    monthlyClaimedByCoupon: {}, // couponId -> "2026-09" ที่กดรับรอบล่าสุดแล้ว (สำหรับ distributionMode=auto_monthly)
    myClaims: [],           // {seq, milestoneName, rewardType, fields}
  };
}
let customer = loadCustomer();

function loadCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return defaultCustomer();
    const c = Object.assign(defaultCustomer(), JSON.parse(raw));
    // กันพัง: เผื่อค่าตัวเลขเพี้ยนมาจากรอบก่อน (เช่น NaN ตอนคำนวณ) ไม่ให้ค้างเป็น NaN ถาวร
    c.points = num(c.points);
    c.lifetimeSpend = num(c.lifetimeSpend);
    c.convertibleBalance = num(c.convertibleBalance);
    c.ordersCount = num(c.ordersCount);
    if (!c.promoClaimsCount || typeof c.promoClaimsCount !== "object") c.promoClaimsCount = {};
    return c;
  } catch (e) { return defaultCustomer(); }
}
function saveCustomer() {
  try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer)); } catch (e) {}
}
function persistSettings() { pmpcSaveSettings(SETTINGS); }

/* ---------------- cart ---------------- */

function setQty(name, qty) {
  qty = Math.max(0, qty);
  if (qty === 0) delete cart[name];
  else cart[name] = qty;
  saveCartToCustomer();
  renderAll();
}
function changeQty(name, delta) { setQty(name, (cart[name] || 0) + delta); }
function saveCartToCustomer() { customer.cart = cart; saveCustomer(); }

/* ---------------- calculation pipeline: flash -> promotions -> coupon -> shipping -> points ---------------- */

// โปรโมชั่นอัตโนมัติ (ไม่ต้องมีโค้ด) — รวม "ซื้อคู่สินค้าเฉพาะเจาะจง" + "ส่วนลดท้ายบิลแบรนด์/หมวด" +
// "ส่งฟรีแบบไม่ใช่คูปอง" ไว้ setting เดียวกัน (ดู shared-state.js: SETTINGS.promotions)
function promoQuotaOk(promo) {
  return !(promo.quotaPerCustomer && (customer.promoClaimsCount[promo.id] || 0) >= promo.quotaPerCustomer);
}

function groupTargetTotal(promo, lines) {
  const matcher = promo.groupTargetType === "brand" ? (l) => l.brand === promo.groupTarget : (l) => l.category === promo.groupTarget;
  return lines.filter(matcher).reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

// targetMode="items" เพียวๆ — ตรวจว่าสินค้าที่ตั้งไว้ครบเงื่อนไขไหม คืน matchedNames + off (ถ้าเป็น reward ส่วนลด)
function computeItemPromoMatch(promo, lines) {
  if (!promoQuotaOk(promo) || (promo.requiredItems || []).length === 0) return null;
  let base = 0;
  let satisfied = true;
  const matchedNames = [];
  promo.requiredItems.forEach((item) => {
    if (promo.conditionType === "QUANTITY") {
      const need = item.requiredQuantity || 1;
      let have = 0, unitP = 0, matched = false;
      (item.choices || []).forEach((n) => {
        const l = lines.find((x) => x.name === n);
        if (l) { have += l.qty; unitP = l.unitPrice; matched = true; matchedNames.push(n); }
      });
      if (!matched || have < need) { satisfied = false; return; }
      base += unitP * need;
    } else if (item.matchAnyUnit) {
      base += lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
      lines.forEach((l) => matchedNames.push(l.name));
    } else {
      let have = 0, matched = false;
      (item.choices || []).forEach((n) => {
        const l = lines.find((x) => x.name === n);
        if (l) { have += l.unitPrice * l.qty; matched = true; matchedNames.push(n); }
      });
      if (!matched) { satisfied = false; return; }
      base += have;
    }
  });
  if (promo.conditionType === "TOTAL_AMOUNT" && base < (promo.totalAmount || 0)) satisfied = false;
  if (!satisfied) return null;

  if (promo.rewardType === "freeship") return { base, off: 0, matchedNames };
  let off = promo.discountType === "percent" ? Math.round(base * ((promo.discountValue || 0) / 100)) : (promo.discountValue || 0);
  if (promo.discountType === "percent" && promo.maxDiscountCap) off = Math.min(off, promo.maxDiscountCap);
  off = Math.min(off, base);
  return { base, off, matchedNames };
}

// คำนวณโปรทั้งหมดที่เข้าเงื่อนไขในตะกร้านี้ — คืนส่วนลดรวม + รายการสินค้าที่ได้ฟรีค่าส่ง (เฉพาะที่เข้าเงื่อนไขเท่านั้น ไม่ใช่ทั้งบิล)
function computePromotions(lines, name) {
  const active = SETTINGS.promotions.filter((p) => p.active && inAudience(p, name));
  const itemPromos = active.filter((p) => p.targetMode === "items");
  const groupPromos = active.filter((p) => p.targetMode === "group");

  let discountOff = 0;
  const discountBreakdown = []; // [{name, off}]
  const shipExemptNames = new Set();
  const appliedPromoIds = [];

  itemPromos.forEach((promo) => {
    const m = computeItemPromoMatch(promo, lines);
    if (!m) return;
    appliedPromoIds.push(promo.id);
    if (promo.rewardType === "freeship") {
      m.matchedNames.forEach((n) => shipExemptNames.add(n));
    } else if (m.off > 0) {
      discountOff += m.off;
      discountBreakdown.push({ name: promo.name, off: m.off });
    }
  });

  // กฎแบบแบรนด์/หมวด แย่งกันเองเป็นคนละสนาม: ฝั่งส่วนลดแข่งกันเอง ฝั่งฟรีค่าส่งแข่งกันเอง — ชนะได้ฝั่งละ 1 กฎ ไม่บวกซ้อน
  const qualifyGroup = (rewardType) => groupPromos
    .filter((p) => p.rewardType === rewardType && promoQuotaOk(p))
    .map((p) => ({ promo: p, groupTotal: groupTargetTotal(p, lines) }))
    .filter(({ promo, groupTotal }) => groupTotal >= (promo.groupMinSpend || 0))
    .sort((a, b) => b.promo.priority - a.promo.priority);

  const discWinner = qualifyGroup("discount")[0];
  if (discWinner) {
    const off = computeOff(discWinner.promo.discountType, discWinner.promo.discountValue, discWinner.groupTotal, discWinner.promo.maxDiscountCap);
    if (off > 0) {
      discountOff += off;
      discountBreakdown.push({ name: discWinner.promo.name, off });
      appliedPromoIds.push(discWinner.promo.id);
    }
  }

  const shipWinner = qualifyGroup("freeship")[0];
  if (shipWinner) {
    lines.filter((l) => (shipWinner.promo.groupTargetType === "brand" ? l.brand : l.category) === shipWinner.promo.groupTarget)
      .forEach((l) => shipExemptNames.add(l.name));
    appliedPromoIds.push(shipWinner.promo.id);
  }

  return { discountOff, discountBreakdown, shipExemptNames, appliedPromoIds };
}

function findOnlineCouponByCode(code) {
  return SETTINGS.onlineCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

function normalizeCouponSpec(kind, key) {
  if (kind === "online") {
    const c = SETTINGS.onlineCoupons.find((x) => x.id === key);
    if (!c) return null;
    return { code: c.code, discountType: "fixed", discountValue: c.discountAmount, maxDiscountCap: null,
      minSpend: c.minSpend, excluded: c.excluded, audienceType: c.audienceType, audienceCustomers: c.audienceCustomers,
      totalLimit: c.totalLimit, usedTotal: c.usedTotal || 0, perCustomerLimit: c.perCustomerLimit };
  }
  const held = customer.collectedCoupons.find((x) => x.key === key);
  if (!held) return null;
  return { code: held.key, discountType: held.discountType, discountValue: held.discountValue, maxDiscountCap: held.maxDiscountCap,
    minSpend: held.minSpend, excluded: held.excluded, audienceType: "all", audienceCustomers: [],
    totalLimit: null, usedTotal: 0, perCustomerLimit: 1 };
}

function evaluateCoupon(spec, name, baseAmount, lines) {
  if (!spec) return { ok: false, reason: "ไม่พบคูปองนี้" };
  if (!inAudience(spec, name)) return { ok: false, reason: "บัญชีนี้ไม่อยู่ในกลุ่มเป้าหมายของคูปองนี้" };
  if (baseAmount < spec.minSpend) return { ok: false, reason: `ยอดยังไม่ถึงขั้นต่ำ ฿${fmt(spec.minSpend)}` };
  if (spec.totalLimit && spec.usedTotal >= spec.totalLimit) return { ok: false, reason: `โค้ดหมดโควตารวมแล้ว (${fmt(spec.totalLimit)} ครั้ง)` };
  const usedByMe = customer.couponUsage[spec.code.toUpperCase()] || 0;
  if (spec.perCustomerLimit && usedByMe >= spec.perCustomerLimit) return { ok: false, reason: `บัญชีนี้ใช้โค้ดนี้ครบโควตาแล้ว (${spec.perCustomerLimit} ครั้ง)` };
  const excludedTotal = lines.filter((l) => (spec.excluded || []).includes(l.name)).reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const base = Math.max(0, baseAmount - excludedTotal);
  if (spec.discountType === "freeship") return { ok: true, discount: 0, freeship: true };
  return { ok: true, discount: computeOff(spec.discountType || "fixed", spec.discountValue, base, spec.maxDiscountCap) };
}

function computePoints(amount) {
  const ps = SETTINGS.pointSettings;
  const raw = (num(amount) / num(ps.spendPer, 1)) * num(ps.pointsPer);
  return Math.max(0, ps.rounding === "floor" ? Math.floor(raw) : Math.round(raw));
}

function computeCart() {
  const name = customerName();
  const rawLines = Object.entries(cart).filter(([, q]) => q > 0).map(([pname, qty]) => {
    const p = PMPC_PRODUCTS.find((x) => x.name === pname);
    return { name: pname, qty, brand: p.brand, category: p.category, basePrice: p.price };
  });

  const flash = SETTINGS.flashSale;
  const flashOn = flash.active && inAudience(flash, name);
  const lines = rawLines.map((l) => {
    const grp = flashOn ? flash.groups.find((g) => g.target === l.category) : null;
    const unitPrice = grp ? Math.round(l.basePrice * (1 - grp.percent / 100)) : l.basePrice;
    return { ...l, unitPrice, flashPercent: grp ? grp.percent : 0 };
  });
  const subtotalRaw = rawLines.reduce((s, l) => s + l.basePrice * l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const flashSavings = subtotalRaw - subtotal;

  const promoResult = computePromotions(lines, name);
  const afterBill = subtotal - promoResult.discountOff;

  let couponResult = null;
  if (appliedCoupon) {
    const spec = normalizeCouponSpec(appliedCoupon.kind, appliedCoupon.key);
    couponResult = evaluateCoupon(spec, name, afterBill, lines);
    couponResult.spec = spec;
  }
  const couponDiscount = couponResult && couponResult.ok ? (couponResult.discount || 0) : 0;
  const couponFreeship = !!(couponResult && couponResult.ok && couponResult.freeship);
  const afterCoupon = afterBill - couponDiscount;

  // ค่าส่ง: จ่ายเต็มอัตราเป็นค่าเริ่มต้นเสมอ — ฟรีค่าส่งต้อง "ได้มา" จากโปร/คูปองที่เข้าเงื่อนไขเท่านั้น ไม่ใช่ฟรีอัตโนมัติตั้งแต่ใส่ตะกร้า
  const shipExemptLines = lines.filter((l) => promoResult.shipExemptNames.has(l.name));
  const shipChargeLines = lines.filter((l) => !promoResult.shipExemptNames.has(l.name));
  const freeshipActive = couponFreeship || promoResult.shipExemptNames.size > 0;
  let shippingFee = 0;
  if (lines.length > 0) {
    shippingFee = couponFreeship ? 0 : shipChargeLines.reduce((s, l) => s + Math.round(l.unitPrice * SHIP_EXEMPT_RATE) * l.qty, 0);
    if (!freeshipActive) shippingFee = FLAT_SHIP;
  }

  const total = afterCoupon + shippingFee;
  const pointsEarned = computePoints(afterCoupon);

  return { name, lines, subtotalRaw, subtotal, flashOn, flashSavings, promoResult, afterBill,
    couponResult, couponDiscount, afterCoupon, freeshipActive, couponFreeship, shipExemptLines, shipChargeLines, shippingFee, total, pointsEarned };
}

/* ---------------- render: flash banner ---------------- */

function renderFlashBanner(r) {
  const el = document.getElementById("flashBanner");
  const flash = SETTINGS.flashSale;
  if (!flash.active || !inAudience(flash, r.name) || flash.groups.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <div class="flash-hero">
      <div class="fh-top">
        <div class="ft">${escapeHtml(flash.name)}</div>
        <div class="fs">กำลังลดราคาอยู่ตอนนี้ — สินค้ากลุ่มด้านล่างราคาปรับสดในตะกร้า</div>
      </div>
      <div class="flash-cats">${flash.groups.map((g) => `
        <div class="fc"><div class="fc-icon">${PMPC_CATEGORY_ICONS[g.target] || "🏷️"}</div><div class="fc-name">${escapeHtml(g.target.replace("หมวด", ""))}</div><div class="fc-off">-${g.percent}%</div></div>
      `).join("")}</div>
    </div>
  `;
}

/* ---------------- render: combo widgets (one per item-mode discount promotion) ---------------- */

function renderComboWidget(r) {
  const el = document.getElementById("comboWidget");
  el.innerHTML = "";
  const promos = SETTINGS.promotions.filter((p) => p.active && p.targetMode === "items" && p.rewardType === "discount" && inAudience(p, r.name) && (p.requiredItems || []).length > 0);

  promos.forEach((promo) => {
    const slots = promo.requiredItems.map((item) => {
      const repName = item.choices && item.choices[0];
      if (!repName) return null;
      const inCart = (cart[repName] || 0) >= (item.requiredQuantity || 1);
      return { repName, need: item.requiredQuantity || 1, inCart };
    }).filter(Boolean);
    if (slots.length === 0) return;

    const match = computeItemPromoMatch(promo, r.lines);
    const discLabel = promo.discountType === "percent" ? `${promo.discountValue}%` : `฿${fmt(promo.discountValue)}`;
    const wrap = document.createElement("div");
    wrap.className = "combo-widget";
    wrap.innerHTML = `<div class="cw-head">🔗 ${escapeHtml(promo.name)} — ลด${discLabel}เฉพาะรายการนี้</div>`;
    const body = document.createElement("div");
    body.className = "cw-body";
    slots.forEach((s, idx) => {
      if (idx > 0) { const plus = document.createElement("span"); plus.className = "cw-plus"; plus.textContent = "+"; body.appendChild(plus); }
      const item = document.createElement("div");
      item.className = "cw-item" + (s.inCart ? "" : " cw-off");
      item.innerHTML = `<div class="ci-img"><span class="ci-chk" style="opacity:${s.inCart ? 1 : 0}">✓</span></div><div class="ci-name">${escapeHtml(s.repName)}${s.need > 1 ? " × " + s.need : ""}</div>`;
      item.onclick = () => setQty(s.repName, s.inCart ? 0 : s.need);
      body.appendChild(item);
    });
    const eq = document.createElement("span"); eq.className = "cw-eq"; eq.textContent = "=";
    body.appendChild(eq);
    const priceBox = document.createElement("div");
    priceBox.className = "cw-price";
    if (match) {
      priceBox.innerHTML = `<div class="cw-old">฿${fmt(match.base)}</div><div class="cw-new">฿${fmt(match.base - match.off)}</div>`;
    } else {
      priceBox.innerHTML = `<div class="cw-new" style="color:var(--ink-faint);font-size:13px">หยิบให้ครบเพื่อรับส่วนลด</div>`;
    }
    body.appendChild(priceBox);
    wrap.appendChild(body);
    const foot = document.createElement("div");
    foot.className = "cw-foot";
    const btn = document.createElement("button");
    btn.className = "cw-btn"; btn.type = "button";
    btn.textContent = match ? `เข้าเงื่อนไขแล้ว — ประหยัด ฿${fmt(match.off)}` : "หยิบสินค้าคู่นี้ลงตะกร้า";
    btn.onclick = () => slots.forEach((s) => setQty(s.repName, s.need));
    foot.appendChild(btn);
    wrap.appendChild(foot);
    el.appendChild(wrap);
  });
}

/* ---------------- render: catalog ---------------- */

function renderCatalog(r) {
  const el = document.getElementById("catalogByCategory");
  el.innerHTML = "";
  PMPC_CATEGORIES.forEach((cat) => {
    const items = PMPC_PRODUCTS.filter((p) => p.category === cat);
    if (items.length === 0) return;
    const section = document.createElement("div");
    section.className = "cat-section";
    section.innerHTML = `<div class="cat-section-head">${PMPC_CATEGORY_ICONS[cat] || "🏷️"} ${escapeHtml(cat)}</div>`;
    const grid = document.createElement("div");
    grid.className = "catalog-grid";
    items.forEach((p) => {
      const qty = cart[p.name] || 0;
      const line = r.lines.find((l) => l.name === p.name);
      const unitPrice = line ? line.unitPrice : (r.flashOn && SETTINGS.flashSale.groups.find((g) => g.target === p.category)
        ? Math.round(p.price * (1 - SETTINGS.flashSale.groups.find((g) => g.target === p.category).percent / 100)) : p.price);
      const isFlash = unitPrice < p.price;
      // สถานะค่าส่ง "ได้มา" จากโปร/คูปองที่เข้าเงื่อนไขจริงในตะกร้าตอนนี้เท่านั้น ไม่ใช่ตั้งไว้ล่วงหน้าเป็นสมบัติของสินค้า
      const shipTag = !line
        ? `<span class="tag-pill">🚚 ค่าส่งตามเงื่อนไขโปร</span>`
        : r.promoResult.shipExemptNames.has(p.name)
          ? `<span class="tag-pill ship-ok">🟢 ฟรีค่าส่งอยู่ตอนนี้</span>`
          : `<span class="tag-pill ship-x">🔴 คิดค่าส่งปกติ</span>`;
      const card = document.createElement("div");
      card.className = "cat-item";
      card.innerHTML = `
        <div class="c-name">${escapeHtml(p.name)}</div>
        <div class="c-tags">
          <span class="tag-pill">${escapeHtml(p.brand)}</span>
          <span class="tag-pill">${escapeHtml(p.category.replace("หมวด", ""))}</span>
          ${shipTag}
        </div>
        <div class="c-bottom">
          <span class="c-price num">${isFlash ? `<span class="strike">฿${fmt(p.price)}</span>` : ""}฿${fmt(unitPrice)}</span>
        </div>
      `;
      const stepper = document.createElement("div");
      stepper.className = "qty-stepper";
      const minus = document.createElement("button"); minus.type = "button"; minus.textContent = "–"; minus.onclick = () => changeQty(p.name, -1);
      const qn = document.createElement("span"); qn.className = "qn num"; qn.textContent = qty;
      const plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.onclick = () => changeQty(p.name, 1);
      stepper.appendChild(minus); stepper.appendChild(qn); stepper.appendChild(plus);
      card.querySelector(".c-bottom").appendChild(stepper);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    el.appendChild(section);
  });
}

/* ---------------- render: cart + breakdown ---------------- */

function renderCartLines(r) {
  const sub = document.getElementById("cartSub");
  const el = document.getElementById("cartLines");
  el.innerHTML = "";
  if (r.lines.length === 0) {
    sub.textContent = "ยังไม่มีสินค้าในตะกร้า";
    el.innerHTML = `<div class="cart-empty">หยิบสินค้าจากด้านซ้ายเพื่อเริ่มจำลอง</div>`;
    return;
  }
  sub.textContent = r.lines.length + " รายการในตะกร้า";
  r.lines.forEach((l) => {
    const row = document.createElement("div");
    row.className = "cart-line";
    row.innerHTML = `<span class="cl-name">${escapeHtml(l.name)} × ${l.qty}${l.flashPercent ? `<small>Flash Sale -${l.flashPercent}%</small>` : ""}</span><span class="num">฿${fmt(l.unitPrice * l.qty)}</span>`;
    el.appendChild(row);
  });
}

function renderBreakdown(r) {
  const el = document.getElementById("cartBreakdown");
  el.innerHTML = "";
  if (r.lines.length === 0) return;
  const row = (label, val, opts = {}) => {
    const d = document.createElement("div");
    d.className = "b-row" + (opts.deduct ? " deduct" : "") + (opts.total ? " total" : "");
    d.innerHTML = `<span class="b-label">${label}</span><span class="b-val num">${val}</span>`;
    el.appendChild(d);
  };
  row("ยอดสินค้า (ราคาตั้ง)", "฿" + fmt(r.subtotalRaw));
  if (r.flashSavings > 0) row("Flash Sale<small>ลดราคาสินค้าอัตโนมัติตามกลุ่ม</small>", "−฿" + fmt(r.flashSavings), { deduct: true });
  r.promoResult.discountBreakdown.forEach((d) => {
    row(`${escapeHtml(d.name)}<small>เฉพาะยอดของรายการที่เข้าเงื่อนไข</small>`, "−฿" + fmt(d.off), { deduct: true });
  });
  if (r.couponResult) {
    if (!r.couponResult.ok) {
      row(`คูปอง<small>${escapeHtml(r.couponResult.reason)}</small>`, "ไม่ใช้งาน");
    } else if (r.couponFreeship) {
      row(`คูปอง ${escapeHtml(r.couponResult.spec.code)}<small>สิทธิ์ส่งฟรี</small>`, "ใช้งานอยู่", { deduct: true });
    } else {
      row(`คูปอง ${escapeHtml(r.couponResult.spec.code)}`, "−฿" + fmt(r.couponDiscount), { deduct: true });
    }
  }
  const shipNote = r.freeshipActive
    ? (r.shipChargeLines.length ? `<small>ฟรีค่าส่งเฉพาะรายการที่เข้าเงื่อนไขโปร/คูปอง — คิดค่าส่งอีก ${r.shipChargeLines.length} รายการที่เหลือ</small>` : "<small>ตะกร้ามีแต่กลุ่มที่ได้ฟรีค่าส่ง</small>")
    : "<small>ยังไม่เข้าเงื่อนไขฟรีค่าส่งใดๆ</small>";
  row("ค่าส่ง" + shipNote, "฿" + fmt(r.shippingFee));
  row("ยอดสุทธิที่ต้องจ่าย", "฿" + fmt(r.total), { total: true });
  const ptRow = document.createElement("div");
  ptRow.className = "cond-hint";
  ptRow.style.marginTop = "4px";
  ptRow.textContent = `ยอดนี้จะเข้ายอดสะสมแคมเปญ + เข้าคิวรอแปลงพอยท์ (แปลงได้ประมาณ ${fmt(r.pointsEarned)} พอยท์ เมื่อกดแปลงเอง)`;
  el.appendChild(ptRow);
}

/* ---------------- coupons: online code + wallet ---------------- */

function activeCouponLabel() {
  if (!appliedCoupon) return "";
  if (appliedCoupon.kind === "online") {
    const oc = SETTINGS.onlineCoupons.find((c) => c.id === appliedCoupon.key);
    return oc ? oc.code : "คูปองนี้";
  }
  const held = customer.collectedCoupons.find((c) => c.key === appliedCoupon.key);
  return held ? held.name : "คูปองนี้";
}

// เช็คว่าโค้ดที่พิมพ์ใช้ได้ไหม โดย "ไม่" apply จริง — ไว้โชว์ผลให้เห็นก่อนกดยืนยัน
function validateOnlineCode(code) {
  if (!code) return null;
  const oc = findOnlineCouponByCode(code);
  if (!oc) return { ok: false, reason: "ไม่พบโค้ดนี้ หรือหมดอายุแล้ว" };
  const r = computeCart();
  return evaluateCoupon(normalizeCouponSpec("online", oc.id), r.name, r.afterBill, r.lines);
}

function applyByCode() {
  const input = document.getElementById("codeInput");
  const code = input.value.trim().toUpperCase();
  if (!code) { codeMsgState = null; renderAll(); return; }
  if (appliedCoupon) {
    codeMsgState = { type: "err", text: `ตอนนี้ใช้คูปอง "${activeCouponLabel()}" อยู่ — กด "เอาออก" ที่ช่องด้านบนก่อน ถึงจะใช้โค้ดนี้ได้` };
    renderAll();
    return;
  }
  const result = validateOnlineCode(code);
  if (!result || !result.ok) {
    codeMsgState = { type: "err", text: (result && result.reason) || "ไม่พบโค้ดนี้ หรือหมดอายุแล้ว" };
    renderAll();
    return;
  }
  const oc = findOnlineCouponByCode(code);
  appliedCoupon = { kind: "online", key: oc.id };
  codeMsgState = { type: "ok", text: `ใช้คูปอง "${code}" แล้ว` };
  input.value = "";
  renderAll();
  closeCouponModal();
}
function useWalletCoupon(key) {
  if (appliedCoupon && !(appliedCoupon.kind === "wallet" && appliedCoupon.key === key)) return; // ต้องเอาอันเดิมออกก่อน ปุ่มถูก disable ไว้แล้ว
  appliedCoupon = { kind: "wallet", key };
  codeMsgState = null;
  renderAll();
  closeCouponModal();
}
function removeApplied() { appliedCoupon = null; codeMsgState = null; renderAll(); }

function renderActiveCouponSlot(r) {
  const el = document.getElementById("activeCouponSlot");
  if (!appliedCoupon) {
    el.innerHTML = `<div class="coupon-slot empty"><span>ยังไม่ได้ใช้คูปอง — กด "เลือก/เปลี่ยนคูปอง" ด้านล่าง</span></div>`;
    return;
  }
  const slot = document.createElement("div");
  const ok = r.couponResult && r.couponResult.ok;
  slot.className = "coupon-slot " + (ok ? "active" : "warn");
  const label = activeCouponLabel();
  const desc = ok
    ? (r.couponFreeship ? "สิทธิ์ส่งฟรี" : `ลด ฿${fmt(r.couponDiscount)} จากยอดสุทธิ`)
    : `ยังใช้ไม่ได้ตอนนี้ — ${r.couponResult ? r.couponResult.reason : "เงื่อนไขไม่ครบ"}`;
  slot.innerHTML = `<div><div class="cs-name">${escapeHtml(label)}</div><div class="cs-desc">${escapeHtml(desc)}</div></div>`;
  const rm = document.createElement("button");
  rm.type = "button"; rm.className = "cs-remove"; rm.textContent = "เอาออก";
  rm.onclick = removeApplied;
  slot.appendChild(rm);
  el.innerHTML = "";
  el.appendChild(slot);
}

function renderCodeMsg() {
  const el = document.getElementById("codeMsg");
  if (!codeMsgState) { el.textContent = ""; el.className = "code-msg"; return; }
  el.textContent = codeMsgState.text;
  el.className = "code-msg " + codeMsgState.type;
}

/* ---------------- collectible coupon offer + wallet ---------------- */

function collectibleDescText(c) {
  const cap = c.discountType === "percent" && c.maxDiscountCap ? ` (สูงสุด ฿${fmt(c.maxDiscountCap)})` : "";
  return c.discountType === "freeship" ? "ฟรีค่าส่งเฉพาะกลุ่มเข้าเงื่อนไข" : `ลด ${c.discountType === "percent" ? c.discountValue + "%" + cap : "฿" + fmt(c.discountValue)} เมื่อซื้อครบ ฿${fmt(c.minSpend)}`;
}

function renderCollectOffer(r) {
  const el = document.getElementById("collectOfferWrap");
  el.innerHTML = "";
  const offers = SETTINGS.collectibleCoupons.filter((c) => inAudience(c, r.name));
  if (offers.length === 0) return;

  const monthly = offers.filter((c) => c.distributionMode === "auto_monthly");
  const manual = offers.filter((c) => c.distributionMode !== "auto_monthly");

  if (monthly.length > 0) {
    const now = new Date();
    const key = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const wrap = document.createElement("div");
    wrap.innerHTML = `<h3 style="font-size:13px;margin-bottom:6px">สิทธิ์ประจำเดือน ${THAI_MONTHS[now.getMonth()]}</h3>`;
    const strip = document.createElement("div");
    strip.className = "month-strip";
    monthly.forEach((c) => {
      const already = customer.monthlyClaimedByCoupon[c.id] === key;
      const cell = document.createElement("div");
      cell.className = "month-cell" + (already ? " got" : " now");
      cell.title = c.name;
      cell.style.cursor = already ? "default" : "pointer";
      cell.innerHTML = `<div class="mc-m">${escapeHtml(c.name)}</div><div class="mc-icon">${already ? "✅" : "🎁"}</div><div class="mc-s">${already ? "รับแล้ว" : "กดรับ"}</div>`;
      if (!already) cell.onclick = () => {
        customer.monthlyClaimedByCoupon[c.id] = key;
        customer.collectedCoupons.push({ key: "MONTHLY-" + c.id + "-" + key, name: c.name, discountType: c.discountType, discountValue: c.discountValue, maxDiscountCap: c.maxDiscountCap, excluded: c.excluded, minSpend: c.minSpend, expiresLabel: "ใช้ได้ถึงสิ้นเดือนนี้" });
        saveCustomer();
        renderAll();
      };
      strip.appendChild(cell);
    });
    wrap.appendChild(strip);
    el.appendChild(wrap);
  }

  if (manual.length > 0) {
    const wrap = document.createElement("div");
    wrap.style.marginTop = monthly.length > 0 ? "14px" : "0";
    wrap.innerHTML = `<h3 style="font-size:13px;margin-bottom:6px">คูปองให้เก็บล่วงหน้า</h3>`;
    const row = document.createElement("div");
    row.className = "ticket-row";
    manual.forEach((c) => {
      const remaining = c.quotaTotal ? Math.max(0, c.quotaTotal - (c.quotaClaimed || 0)) : Infinity;
      const prefix = "COLLECT-" + c.id + "-";
      const alreadyHeld = customer.collectedCoupons.filter((x) => x.key.indexOf(prefix) === 0).length;
      const canCollect = remaining > 0 && (!c.perCustomerLimit || alreadyHeld < c.perCustomerLimit);
      row.appendChild(ticketMarkup({
        title: c.name, desc: collectibleDescText(c),
        qtyText: (c.quotaTotal ? fmt(remaining) + "/" + fmt(c.quotaTotal) + " สิทธิ์เหลือ" : "ไม่จำกัดสิทธิ์"),
        pct: c.quotaTotal ? Math.min(100, ((c.quotaClaimed || 0) / c.quotaTotal) * 100) : 0,
        btnText: canCollect ? "เก็บ" : (remaining <= 0 ? "หมดสิทธิ์" : "เก็บครบโควตาแล้ว"),
        btnDisabled: !canCollect,
        onClick: () => {
          c.quotaClaimed = (c.quotaClaimed || 0) + 1;
          persistSettings();
          customer.collectedCoupons.push({ key: prefix + Date.now(), name: c.name, discountType: c.discountType, discountValue: c.discountValue, maxDiscountCap: c.maxDiscountCap, excluded: c.excluded, minSpend: c.minSpend, expiresLabel: c.expiryMode === "fixed" ? "ใช้ได้ถึง " + c.expiryDate : "ใช้ได้ " + c.expiryDays + " วันหลังเก็บ" });
          saveCustomer();
          renderAll();
        },
      }));
    });
    wrap.appendChild(row);
    el.appendChild(wrap);
  }
}

function ticketMarkup({ title, desc, qtyText, pct, btnText, btnDisabled, onClick, got, onRemove }) {
  const wrap = document.createElement("div");
  wrap.className = "ticket" + (got ? " collected" : "");
  wrap.innerHTML = `
    <span class="notch top"></span><span class="notch bottom"></span>
    <div class="main">
      <div class="t-title">${escapeHtml(title)}</div>
      <div class="t-desc">${escapeHtml(desc)}</div>
      ${pct !== undefined ? `<div class="t-progress"><i style="width:${pct}%"></i></div>` : ""}
      <div class="t-qty">${escapeHtml(qtyText)}</div>
    </div>
    <div class="stub"></div>
  `;
  const stub = wrap.querySelector(".stub");
  const btn = document.createElement("button");
  btn.className = "t-btn"; btn.type = "button"; btn.textContent = btnText;
  btn.disabled = !!btnDisabled;
  if (btnDisabled) btn.style.opacity = ".5";
  btn.onclick = onClick;
  stub.appendChild(btn);
  if (onRemove) {
    const rm = document.createElement("button");
    rm.type = "button"; rm.className = "t-btn";
    rm.style.cssText = "background:transparent;color:var(--risk-ink);text-decoration:underline;font-size:11px;padding:2px 0;";
    rm.textContent = "ทิ้งใบนี้";
    rm.onclick = onRemove;
    stub.appendChild(rm);
  }
  return wrap;
}

function renderWallet() {
  const wrap = document.getElementById("walletWrap");
  wrap.innerHTML = "";
  if (customer.collectedCoupons.length === 0) return;
  wrap.innerHTML = `<h3 style="font-size:13px;margin-bottom:6px">กระเป๋าคูปองของฉัน</h3>`;
  const row = document.createElement("div");
  row.className = "ticket-row";
  customer.collectedCoupons.forEach((c) => {
    const isActive = appliedCoupon && appliedCoupon.kind === "wallet" && appliedCoupon.key === c.key;
    const blockedByOther = appliedCoupon && !isActive;
    row.appendChild(ticketMarkup({
      title: c.name, desc: collectibleDescText(c), qtyText: c.expiresLabel, got: true,
      btnText: isActive ? "กำลังใช้" : (blockedByOther ? "เอาคูปองปัจจุบันออกก่อน" : "ใช้คูปองนี้"),
      btnDisabled: isActive || blockedByOther,
      onClick: () => useWalletCoupon(c.key),
      onRemove: () => {
        if (isActive) appliedCoupon = null;
        customer.collectedCoupons = customer.collectedCoupons.filter((x) => x.key !== c.key);
        saveCustomer();
        renderAll();
      },
    }));
  });
  wrap.appendChild(row);
}

/* ---------------- checkout ---------------- */

function checkout() {
  const r = computeCart();
  if (r.lines.length === 0) return;

  r.promoResult.appliedPromoIds.forEach((id) => { customer.promoClaimsCount[id] = (customer.promoClaimsCount[id] || 0) + 1; });
  if (appliedCoupon && r.couponResult && r.couponResult.ok) {
    const code = r.couponResult.spec.code.toUpperCase();
    customer.couponUsage[code] = (customer.couponUsage[code] || 0) + 1;
    if (appliedCoupon.kind === "online") {
      const oc = SETTINGS.onlineCoupons.find((c) => c.id === appliedCoupon.key);
      if (oc) { oc.usedTotal = (oc.usedTotal || 0) + 1; persistSettings(); }
    }
    if (appliedCoupon.kind === "wallet") customer.collectedCoupons = customer.collectedCoupons.filter((c) => c.key !== appliedCoupon.key);
  }
  // ยอดสะสมแคมเปญ (lifetimeSpend) บวกทันทีเสมอ ไม่เกี่ยวกับพอยท์เลย — ตัวขับเคลื่อนขั้นบันไดคือยอดซื้อจริง ไม่ใช่พอยท์
  customer.lifetimeSpend = num(customer.lifetimeSpend) + num(r.afterCoupon);
  // ไม่แปลงเป็นพอยท์ให้อัตโนมัติ — พักไว้ที่ "ยอดรอแปลงเป็นพอยท์" ให้ลูกค้ากดแปลงเองด้านล่าง
  customer.convertibleBalance = num(customer.convertibleBalance) + num(r.afterCoupon);
  customer.ordersCount += 1;

  cart = {};
  appliedCoupon = null;
  codeMsgState = null;
  checkoutMsg = `✓ ชำระเงินสำเร็จ — ยอดจ่าย ฿${fmt(r.total)} · ยอดสะสมแคมเปญรวม ฿${fmt(customer.lifetimeSpend)} · มี ฿${fmt(customer.convertibleBalance)} รอแปลงเป็นพอยท์`;
  saveCartToCustomer();
  saveCustomer();
  renderAll();
}

/* ---------------- demo shortcuts: fill cart to a scenario in one click ---------------- */

// หยิบสินค้าให้พอดีเข้าเงื่อนไขส่วนลดท้ายบิลกติกาแรก (ไม่ต้องชำระเงิน เห็นผลในตะกร้าทันที)
function presetBillDiscount() {
  const promo = SETTINGS.promotions.find((p) => p.active && p.targetMode === "group");
  if (!promo) { checkoutMsg = "ยังไม่มีโปรแบบแบรนด์/หมวดหมู่ให้ลอง — ไปตั้งที่หน้าแอดมินก่อน"; renderAll(); return; }
  const matcher = promo.groupTargetType === "brand" ? (p) => p.brand === promo.groupTarget : (p) => p.category === promo.groupTarget;
  const candidates = PMPC_PRODUCTS.filter(matcher).sort((a, b) => b.price - a.price);
  if (candidates.length === 0) { checkoutMsg = `ไม่มีสินค้ากลุ่ม "${promo.groupTarget}" ในแคตตาล็อกให้ลอง`; renderAll(); return; }
  const p = candidates[0];
  const qty = Math.max(1, Math.ceil((promo.groupMinSpend || 1) / p.price)) + 1; // +1 กันเผื่อปัดเศษ
  cart[p.name] = Math.max(cart[p.name] || 0, qty);
  saveCartToCustomer();
  const what = promo.rewardType === "freeship" ? "ฟรีค่าส่งเฉพาะกลุ่มนี้" : "ส่วนลดท้ายบิล";
  checkoutMsg = `✓ หยิบ "${p.name}" × ${qty} ให้แล้ว — เลื่อนไปดูยอดสรุปฝั่งขวา จะเห็น "${what}" ขึ้นเอง`;
  renderAll();
}

// ซื้อครบยอดของขั้นแคมเปญถัดไปที่ยังไม่ปลดล็อก แล้วจ่ายเงินให้เลย เพื่อให้เห็นการ์ดปลดล็อกทันที
function presetUnlockMilestone() {
  const target = [...SETTINGS.milestones].sort((a, b) => a.requiredAmount - b.requiredAmount).find((m) => customer.lifetimeSpend < m.requiredAmount);
  if (!target) { checkoutMsg = "ยอดสะสมของลูกค้าคนนี้ถึงทุกขั้นอยู่แล้ว — เลื่อนลงไปกด \"ขอรับสิทธิ์\" ได้เลย"; renderAll(); return; }
  const p = [...PMPC_PRODUCTS].sort((a, b) => b.price - a.price)[0]; // ใช้สินค้าราคาสูงสุด ลดจำนวนชิ้นที่ต้องหยิบ
  cart = {};
  let guard = 0;
  while (guard < 30) {
    const need = target.requiredAmount - customer.lifetimeSpend;
    const r = computeCart();
    if (r.afterCoupon >= need) break;
    const addQty = Math.max(1, Math.ceil((need - r.afterCoupon) / p.price));
    cart[p.name] = (cart[p.name] || 0) + addQty;
    guard++;
  }
  checkout(); // checkout() เซฟ/เรนเดอร์ให้เองแล้ว แค่เปลี่ยนข้อความให้เจาะจงขั้นที่ปลดล็อก
  checkoutMsg = `✓ จำลองซื้อครบขั้น "${target.name}" แล้ว — เลื่อนลงไปดูการ์ดรางวัลด้านล่าง ปลดล็อกให้กดขอรับสิทธิ์ได้เลย`;
  renderAll();
}

// เติมพอยท์ให้ตรงๆ ไม่ต้องผ่านตะกร้า/แปลงเอง สำหรับลองปุ่มแลกของอย่างเดียว
function presetGrantPoints() {
  customer.points = num(customer.points) + 2000;
  saveCustomer();
  checkoutMsg = "✓ เติมพอยท์ให้ 2,000 พอยท์ (จำลอง) — เลื่อนลงไปลองกดแลกของรางวัลได้เลย";
  renderAll();
}

/* ---------------- campaign ladder + claim ---------------- */

function remainingOf(m) { return m.quotaTotal ? Math.max(0, m.quotaTotal - (m.quotaClaimed || 0)) : Infinity; }
function status(m) {
  if (customer.claimedMilestoneIds.includes(m.id)) return "claimed";
  if (customer.lifetimeSpend < m.requiredAmount) return "locked";
  if (remainingOf(m) <= 0) return "full";
  return "unlocked";
}

function renderLadder() {
  const milestones = SETTINGS.milestones;
  const max = Math.max(1, ...milestones.map((m) => m.requiredAmount)) * 1.15;
  document.getElementById("lifetimeSpendDisplay").textContent = fmt(customer.lifetimeSpend);
  const pct = Math.min(100, (customer.lifetimeSpend / max) * 100);
  document.getElementById("ladderFill").style.width = pct + "%";

  const marksEl = document.getElementById("ladderMarks");
  marksEl.innerHTML = "";
  [...milestones].sort((a, b) => a.requiredAmount - b.requiredAmount).forEach((m) => {
    const left = Math.min(100, (m.requiredAmount / max) * 100);
    const st = status(m);
    const mark = document.createElement("div");
    mark.className = "mark " + st;
    mark.style.left = left + "%";
    mark.title = m.name;
    mark.textContent = st === "claimed" ? "✓" : st === "full" ? "✕" : st === "unlocked" ? "!" : "";
    marksEl.appendChild(mark);
    const lbl = document.createElement("div");
    lbl.className = "mark-label";
    lbl.style.left = left + "%";
    lbl.innerHTML = "฿" + fmt(m.requiredAmount) + "<b>" + escapeHtml(m.name) + "</b>";
    marksEl.appendChild(lbl);
  });
}

function buildClaimForm(m) {
  const wrap = document.createElement("div");
  wrap.className = "claim-form";
  const inputs = {};
  m.requiredFields.forEach((f) => {
    const label = document.createElement("label"); label.textContent = f.label;
    let input;
    if (f.type === "SELECT") {
      input = document.createElement("select");
      (f.options || []).forEach((o) => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; input.appendChild(opt); });
    } else {
      input = document.createElement("input");
      input.type = MFIELD_HTML_TYPE[f.type] || "text";
      input.placeholder = "กรอก" + f.label;
    }
    inputs[f.label] = input;
    wrap.appendChild(label); wrap.appendChild(input);
  });
  const submit = document.createElement("button");
  submit.className = "submit-btn"; submit.type = "button"; submit.textContent = "ส่งคำขอรับสิทธิ์";
  submit.onclick = () => {
    const values = {};
    m.requiredFields.forEach((f) => (values[f.label] = inputs[f.label].value.trim() || "(ไม่กรอก)"));
    customer.claimedMilestoneIds.push(m.id);
    m.quotaClaimed = (m.quotaClaimed || 0) + 1;
    persistSettings();
    customer.myClaims.unshift({ seq: customer.myClaims.length + 1, milestoneName: m.name, rewardType: m.rewardType, fields: values });
    openClaimFormId = null;
    saveCustomer();
    renderAll();
  };
  wrap.appendChild(submit);
  return wrap;
}

function renderRewardCards() {
  const row = document.getElementById("rewardRow");
  row.innerHTML = "";
  [...SETTINGS.milestones].sort((a, b) => a.requiredAmount - b.requiredAmount).forEach((m) => {
    const st = status(m);
    const remaining = remainingOf(m);
    const card = document.createElement("div");
    card.className = "reward-card" + (st === "locked" ? " locked" : "");
    const icon = m.rewardType === "catalog" ? "🎁" : "🎫";
    const badgeText = { locked: "ล็อกอยู่", unlocked: "ปลดล็อกแล้ว", full: "หมดสิทธิ์แล้ว", claimed: "ขอรับสิทธิ์แล้ว" }[st];
    const metaRight = m.quotaTotal ? `เหลือ ${Math.max(0, remaining)}/${m.quotaTotal} สิทธิ์` : "ไม่จำกัดสิทธิ์";
    card.innerHTML = `
      <div class="icon">${icon}</div>
      <div class="r-name">${escapeHtml(m.name)}</div>
      <div class="r-detail">${escapeHtml(m.rewardType === "catalog" ? "สินค้าจากเว็บ" : (m.detail || "ของพิเศษนอกระบบ"))}</div>
      <div class="r-meta"><span>เกณฑ์ ฿${fmt(m.requiredAmount)}</span><span>${metaRight}</span></div>
      <span class="status-badge ${st}">${badgeText}</span>
    `;
    if (st === "unlocked") {
      const btn = document.createElement("button");
      btn.className = "claim-btn"; btn.type = "button"; btn.textContent = "ขอรับสิทธิ์";
      btn.onclick = () => { openClaimFormId = openClaimFormId === m.id ? null : m.id; renderRewardCards(); };
      card.appendChild(btn);
      if (openClaimFormId === m.id) card.appendChild(buildClaimForm(m));
    } else if (st === "full") {
      const p = document.createElement("div");
      p.className = "r-detail"; p.style.color = "var(--risk-ink)"; p.textContent = "สิทธิ์เต็มแล้ว";
      card.appendChild(p);
    }
    row.appendChild(card);
  });
}

function renderMyClaims() {
  const el = document.getElementById("myClaimsList");
  el.innerHTML = "";
  if (customer.myClaims.length === 0) { el.innerHTML = `<div class="queue-empty">ยังไม่มีคำขอรับของ (จากแคมเปญหรือแลกพอยท์)</div>`; return; }
  customer.myClaims.forEach((q) => {
    const item = document.createElement("div");
    item.className = "q-item";
    const fieldsHtml = Object.entries(q.fields).map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`).join(" · ");
    item.innerHTML = `
      <div class="q-top"><span>${escapeHtml(q.milestoneName)}</span><span class="q-time">คำขอที่ ${q.seq}</span></div>
      <div class="q-detail">${q.rewardType === "catalog" ? "🎁 สินค้าเว็บ — เข้าคิวแพ็ก/จัดส่งได้ทันที" : "🎫 ของนอกระบบ — ต้องมีคนติดต่อกลับดำเนินการ"}</div>
      <div class="q-detail" style="margin-top:4px">${fieldsHtml}</div>
    `;
    el.appendChild(item);
  });
}

/* ---------------- points + redeem ---------------- */

// แปลงยอดที่รอไว้ (convertibleBalance) เป็นพอยท์ทั้งหมด — ลูกค้ากดเอง ไม่ auto ตอนชำระเงิน
// ยอดสะสมแคมเปญ (lifetimeSpend) ไม่เกี่ยวกับตรงนี้เลย ไม่ถูกหัก/แตะต้องไม่ว่ากรณีไหน
function convertToPoints() {
  const pending = num(customer.convertibleBalance);
  if (pending <= 0) return;
  const earned = computePoints(pending);
  customer.points = num(customer.points) + earned;
  customer.convertibleBalance = 0;
  saveCustomer();
  checkoutMsg = `✓ แปลง ฿${fmt(pending)} เป็น ${fmt(earned)} พอยท์แล้ว`;
  renderAll();
}

function renderConvertBox() {
  const el = document.getElementById("convertBox");
  const pending = num(customer.convertibleBalance);
  const wouldEarn = computePoints(pending);
  el.innerHTML = "";
  const box = document.createElement("div");
  box.className = "convert-box";
  box.innerHTML = `<div><div class="cv-label">ยอดรอแปลงเป็นพอยท์</div><div class="cv-amt">฿${fmt(pending)}<small>→ ${fmt(wouldEarn)} พอยท์</small></div></div>`;
  const btn = document.createElement("button");
  btn.type = "button"; btn.textContent = "แปลงเป็นพอยท์";
  btn.disabled = pending <= 0;
  btn.onclick = convertToPoints;
  box.appendChild(btn);
  el.appendChild(box);
}

// แลกพอยท์: "คูปอง"/"เครดิต" ได้คูปองจริงเข้ากระเป๋าทันที ใช้ได้เลยไม่ต้องรอใคร
// "สินค้า" เป็นของจริงต้องแพ็ก/จัดส่ง เข้าคิวเดียวกับคำขอรับรางวัลแคมเปญ ให้ทีมหลังบ้านดำเนินการต่อ
function redeemItem(item) {
  if (customer.points < item.cost) return;
  customer.points -= item.cost;
  if (item.type === "สินค้า") {
    customer.myClaims.unshift({
      seq: customer.myClaims.length + 1,
      milestoneName: item.name,
      rewardType: "catalog",
      fields: { "แลกด้วยพอยท์": fmt(item.cost) + " พอยท์" },
    });
    checkoutMsg = `✓ แลก "${item.name}" แล้ว — เข้าคิวให้ทีมแพ็ก/จัดส่งแล้ว ดูได้ที่ "ประวัติคำขอรับของ" ด้านล่าง`;
  } else {
    customer.collectedCoupons.push({
      key: "REDEEM-" + Date.now(),
      name: item.name,
      discountType: item.discountType || "fixed",
      discountValue: item.discountValue || 0,
      maxDiscountCap: item.maxDiscountCap || null,
      excluded: [],
      minSpend: 0,
      expiresLabel: "แลกจากพอยท์ — ไม่มีวันหมดอายุ",
    });
    checkoutMsg = `✓ แลก "${item.name}" แล้ว — ได้คูปองเข้ากระเป๋าทันที เลื่อนขึ้นไปกด "ใช้คูปองนี้" ได้เลย`;
  }
  saveCustomer();
  renderAll();
}

function renderPoints() {
  document.getElementById("pointBalance").textContent = fmt(customer.points);
  const ps = SETTINGS.pointSettings;
  document.getElementById("pointRateNote").textContent = `ทุกยอดซื้อ ฿${fmt(ps.spendPer)} ได้ ${fmt(ps.pointsPer)} พอยท์ (แปลงเองได้ทุกเมื่อ)`;
  document.getElementById("statOrders").textContent = fmt(customer.ordersCount);
  document.getElementById("statSpend").textContent = "฿" + fmt(customer.lifetimeSpend);
  renderConvertBox();

  const grid = document.getElementById("redeemGrid");
  grid.innerHTML = "";
  SETTINGS.redeemCatalog.filter((it) => it.active).forEach((item) => {
    const div = document.createElement("div");
    div.className = "redeem-item";
    div.innerHTML = `<div class="ri-icon">${item.type === "คูปอง" ? "🎟️" : item.type === "เครดิต" ? "💳" : "🎁"}</div><div class="ri-name">${escapeHtml(item.name)}</div><div class="ri-cost">${fmt(item.cost)} พอยท์</div>`;
    const btn = document.createElement("button");
    btn.className = "redeem-btn"; btn.type = "button";
    const canRedeem = customer.points >= item.cost;
    btn.textContent = canRedeem ? "แลกเลย" : "พอยท์ไม่พอ";
    if (!canRedeem) btn.disabled = true, btn.style.opacity = ".55";
    btn.onclick = () => redeemItem(item);
    div.appendChild(btn);
    grid.appendChild(div);
  });
}

/* ---------------- boot / render all ---------------- */

function renderAll() {
  SETTINGS = pmpcLoadSettings(); // อ่านสดทุกครั้งเผื่อแก้จากแท็บ admin มา
  const r = computeCart();
  document.getElementById("checkoutBtn").disabled = r.lines.length === 0;
  document.getElementById("checkoutMsg").textContent = checkoutMsg;
  document.getElementById("checkoutMsg").className = "checkout-msg" + (checkoutMsg ? " ok" : "");

  renderFlashBanner(r);
  renderComboWidget(r);
  renderCatalog(r);
  renderCartLines(r);
  renderBreakdown(r);
  renderCodeMsg();
  renderActiveCouponSlot(r);
  renderCollectOffer(r);
  renderWallet();
  renderLadder();
  renderRewardCards();
  renderMyClaims();
  renderPoints();
}

/* ---------------- coupon picker modal ---------------- */

function openCouponModal() { document.getElementById("couponModal").hidden = false; }
function closeCouponModal() { document.getElementById("couponModal").hidden = true; }

function boot() {
  cart = customer.cart || {};
  document.getElementById("personaNameInput").addEventListener("change", renderAll);
  document.getElementById("codeApplyBtn").addEventListener("click", applyByCode);
  document.getElementById("codeInput").addEventListener("keydown", (e) => { if (e.key === "Enter") applyByCode(); });
  // เช็คโค้ดให้ดูก่อนตั้งแต่พิมพ์ ไม่ต้องรอกด "ใช้โค้ด" ถึงจะรู้ว่าใช้ได้ไหม
  document.getElementById("codeInput").addEventListener("blur", () => {
    const code = document.getElementById("codeInput").value.trim().toUpperCase();
    if (!code) { codeMsgState = null; renderCodeMsg(); return; }
    if (appliedCoupon) { renderCodeMsg(); return; } // ปล่อยให้กด "ใช้โค้ด" เป็นคนอธิบายเหตุผลตอนนั้น
    const result = validateOnlineCode(code);
    codeMsgState = (result && result.ok)
      ? { type: "ok", text: "โค้ดนี้ใช้ได้ — กด \"ใช้โค้ด\" เพื่อยืนยัน" }
      : { type: "err", text: (result && result.reason) || "ไม่พบโค้ดนี้ หรือหมดอายุแล้ว" };
    renderCodeMsg();
  });
  document.getElementById("openCouponModalBtn").addEventListener("click", openCouponModal);
  document.getElementById("closeCouponModalBtn").addEventListener("click", closeCouponModal);
  document.getElementById("couponModal").addEventListener("click", (e) => { if (e.target.id === "couponModal") closeCouponModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !document.getElementById("couponModal").hidden) closeCouponModal(); });

  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("presetBillBtn").addEventListener("click", presetBillDiscount);
  document.getElementById("presetMilestoneBtn").addEventListener("click", presetUnlockMilestone);
  document.getElementById("presetPointsBtn").addEventListener("click", presetGrantPoints);
  document.getElementById("resetCustomerBtn").addEventListener("click", () => {
    if (!confirm("ล้างตะกร้า/แต้ม/ประวัติของลูกค้าจำลองคนนี้ทั้งหมด?")) return;
    customer = defaultCustomer();
    cart = {};
    appliedCoupon = null;
    codeMsgState = null;
    checkoutMsg = "";
    saveCustomer();
    renderAll();
  });

  // ฟัง localStorage เพื่อ sync สดกับแท็บ admin.html (แก้ค่าที่นั่น กลับมาที่นี่เห็นผลทันที)
  window.addEventListener("storage", (e) => {
    if (e.key === PMPC_SETTINGS_KEY) {
      const note = document.getElementById("syncNote");
      note.textContent = "◉ sync ค่าล่าสุดจากแอดมินแล้ว";
      renderAll();
      setTimeout(() => { note.textContent = ""; }, 2500);
    }
  });

  renderAll();
}

boot();
