/* จำลองส่วนลดต่อบิล (ระบบ A) — vanilla JS, ไม่ต้อง build ไม่ต้องมี server */

const FLAT_SHIP = 45; // ค่าส่งมาตรฐานเมื่อไม่มีคูปองส่งฟรี (สูตรจำลอง)

function seedCatalog() {
  return [
    { id: "p1", name: "พาราเซตามอล 500mg", price: 60, brand: "Generic", ship: "ok", shipFee: 0 },
    { id: "p2", name: "วิตามินซี 1000mg (Blackmores)", price: 250, brand: "Blackmores", ship: "ok", shipFee: 0 },
    { id: "p3", name: "น้ำมันปลา Omega-3 (Blackmores)", price: 450, brand: "Blackmores", ship: "ok", shipFee: 0 },
    { id: "p4", name: "แคลเซียม+ดี (Blackmores)", price: 380, brand: "Blackmores", ship: "ok", shipFee: 0 },
    { id: "p5", name: "หน้ากากอนามัย (กล่อง)", price: 120, brand: "Generic", ship: "ok", shipFee: 0 },
    { id: "p6", name: "เจลล้างมือ", price: 85, brand: "Generic", ship: "ok", shipFee: 0 },
    { id: "p7", name: "ยาน้ำแก้ไอ", price: 180, brand: "Generic", ship: "x", shipFee: 25 },
    { id: "p8", name: "เข็มฉีดยา (กล่อง)", price: 90, brand: "Generic", ship: "x", shipFee: 20 },
  ];
}
function currentBrands() { return [...new Set(catalog.map((p) => p.brand).filter(Boolean))]; }

function seedAutoRule() {
  return { enabled: true, brand: "Blackmores", minSpend: 1000, discountAmount: 100 };
}
function seedCoupons() {
  return [
    { id: "c1", code: "FREESHIP", label: "ส่งฟรีทั้งบิล (มีข้อยกเว้น)", type: "freeship", minSpend: 0, discountAmount: 0, collectible: true, quotaTotal: 500, quotaClaimed: 320, held: false },
    { id: "c2", code: "WELCOME300", label: "ลด 300 เมื่อซื้อครบ 5,000", type: "cart_discount", minSpend: 5000, discountAmount: 300, collectible: false, quotaTotal: 9999, quotaClaimed: 0, held: false },
  ];
}

let catalog = seedCatalog();
let cart = {};              // productId -> qty
let autoRule = seedAutoRule();
let coupons = seedCoupons();
let appliedCouponId = null;
let codeMsgState = null;    // {type:'ok'|'err', text}

function fmt(n) { return Number(n).toLocaleString("th-TH"); }
function uid() { return "c_" + Math.random().toString(36).slice(2, 9); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function product(id) { return catalog.find((p) => p.id === id); }

/* ---------------- cart ---------------- */

function setQty(id, qty) {
  qty = Math.max(0, qty);
  if (qty === 0) delete cart[id];
  else cart[id] = qty;
  renderAll();
}
function changeQty(id, delta) { setQty(id, (cart[id] || 0) + delta); }

function cartLines() {
  return Object.entries(cart).map(([id, qty]) => ({ p: product(id), qty }));
}

function renderCatalog() {
  const el = document.getElementById("catalogGrid");
  el.innerHTML = "";
  if (catalog.length === 0) { el.innerHTML = `<div class="cart-empty">ยังไม่มีสินค้าในระบบ — เพิ่มได้จากแผงแอดมินด้านล่าง</div>`; return; }
  catalog.forEach((p) => {
    const qty = cart[p.id] || 0;
    const card = document.createElement("div");
    card.className = "cat-item";
    card.innerHTML = `
      <div class="c-name">${escapeHtml(p.name)}</div>
      <div class="c-tags">
        <span class="tag-pill">${escapeHtml(p.brand)}</span>
        <span class="tag-pill ${p.ship === "ok" ? "ship-ok" : "ship-x"}">${p.ship === "ok" ? "🟢 ฟรีค่าส่งได้" : "🔴 ยกเว้น"}</span>
      </div>
      <div class="c-bottom">
        <span class="c-price num">฿${fmt(p.price)}</span>
      </div>
    `;
    const stepper = document.createElement("div");
    stepper.className = "qty-stepper";
    const minus = document.createElement("button");
    minus.type = "button"; minus.textContent = "–";
    minus.onclick = () => changeQty(p.id, -1);
    const qn = document.createElement("span");
    qn.className = "qn num"; qn.textContent = qty;
    const plus = document.createElement("button");
    plus.type = "button"; plus.textContent = "+";
    plus.onclick = () => changeQty(p.id, 1);
    stepper.appendChild(minus); stepper.appendChild(qn); stepper.appendChild(plus);
    card.querySelector(".c-bottom").appendChild(stepper);
    el.appendChild(card);
  });
}

function renderCart() {
  const sub = document.getElementById("cartSub");
  const linesEl = document.getElementById("cartLines");
  const lines = cartLines();
  linesEl.innerHTML = "";
  if (lines.length === 0) {
    sub.textContent = "ยังไม่มีสินค้าในตะกร้า";
    linesEl.innerHTML = `<div class="cart-empty">หยิบสินค้าจากด้านซ้ายเพื่อเริ่มจำลอง</div>`;
    return;
  }
  sub.textContent = lines.length + " รายการในตะกร้า";
  lines.forEach(({ p, qty }) => {
    const row = document.createElement("div");
    row.className = "cart-line";
    row.innerHTML = `
      <span class="cl-name">${escapeHtml(p.name)} × ${qty}<small>${p.ship === "ok" ? "เข้าเงื่อนไขฟรีค่าส่ง" : "ยกเว้นฟรีค่าส่ง"}</small></span>
      <span class="num">฿${fmt(p.price * qty)}</span>
    `;
    linesEl.appendChild(row);
  });
}

/* ---------------- calculation ---------------- */

function calc() {
  const lines = cartLines();
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);

  const brandTotal = lines
    .filter((l) => l.p.brand === autoRule.brand)
    .reduce((s, l) => s + l.p.price * l.qty, 0);
  const autoQualifies = autoRule.enabled && brandTotal >= autoRule.minSpend && autoRule.minSpend > 0;
  const autoDiscount = autoQualifies ? Math.min(autoRule.discountAmount, subtotal) : 0;
  const afterAuto = subtotal - autoDiscount;

  const applied = coupons.find((c) => c.id === appliedCouponId) || null;
  let couponDiscount = 0;
  let freeshipActive = false;
  let couponQualifies = true;

  if (applied) {
    couponQualifies = afterAuto >= applied.minSpend;
    if (applied.type === "cart_discount" && couponQualifies) {
      couponDiscount = Math.min(applied.discountAmount, afterAuto);
    }
    if (applied.type === "freeship" && couponQualifies) {
      freeshipActive = true;
    }
  }

  const afterCoupon = afterAuto - couponDiscount;

  const excludedLines = lines.filter((l) => l.p.ship === "x");
  const excludedFee = excludedLines.reduce((s, l) => s + (l.p.shipFee || 0) * l.qty, 0);
  let shippingFee = 0;
  if (lines.length > 0) shippingFee = freeshipActive ? excludedFee : FLAT_SHIP;

  const total = afterCoupon + shippingFee;

  return { subtotal, brandTotal, autoQualifies, autoDiscount, afterAuto, applied, couponQualifies, couponDiscount, freeshipActive, excludedLines, excludedFee, shippingFee, total, lines };
}

function renderBreakdown() {
  const r = calc();
  const el = document.getElementById("breakdown");
  el.innerHTML = "";

  const row = (label, val, opts = {}) => {
    const d = document.createElement("div");
    d.className = "b-row" + (opts.deduct ? " deduct" : "") + (opts.total ? " total" : "");
    d.innerHTML = `<span class="b-label">${label}</span><span class="b-val num">${val}</span>`;
    el.appendChild(d);
  };

  row("ยอดสินค้ารวม", "฿" + fmt(r.subtotal));

  if (r.autoQualifies) {
    row(`ส่วนลดอัตโนมัติ<small>ซื้อ ${escapeHtml(autoRule.brand)} ครบ ฿${fmt(autoRule.minSpend)} แล้ว (฿${fmt(r.brandTotal)})</small>`, "−฿" + fmt(r.autoDiscount), { deduct: true });
  } else if (autoRule.enabled) {
    row(`ส่วนลดอัตโนมัติ<small>ซื้อ ${escapeHtml(autoRule.brand)} ยังไม่ถึง ฿${fmt(autoRule.minSpend)} (ตอนนี้ ฿${fmt(r.brandTotal)})</small>`, "฿0");
  }

  if (r.applied) {
    if (!r.couponQualifies) {
      row(`คูปอง ${escapeHtml(r.applied.code)}<small>ยอดยังไม่ถึงขั้นต่ำ ฿${fmt(r.applied.minSpend)}</small>`, "ยังไม่ใช้", {});
    } else if (r.applied.type === "cart_discount") {
      row(`คูปอง ${escapeHtml(r.applied.code)}<small>${escapeHtml(r.applied.label)}</small>`, "−฿" + fmt(r.couponDiscount), { deduct: true });
    } else {
      row(`คูปอง ${escapeHtml(r.applied.code)}<small>ฟรีค่าส่งกลุ่มเข้าเงื่อนไข</small>`, "ใช้งานอยู่", { deduct: true });
    }
  }

  const shipNote = r.freeshipActive
    ? (r.excludedLines.length ? `<small>คิดเฉพาะกลุ่มยกเว้น ${r.excludedLines.length} รายการ</small>` : "<small>ตะกร้ามีแต่กลุ่มฟรีค่าส่ง</small>")
    : (r.lines.length ? "<small>อัตรามาตรฐาน (ไม่มีคูปองส่งฟรี)</small>" : "");
  row("ค่าส่ง" + shipNote, r.lines.length ? "฿" + fmt(r.shippingFee) : "—");

  row("ยอดสุทธิที่ต้องจ่าย", "฿" + fmt(r.total), { total: true });

  renderWallet(r);
}

/* ---------------- coupons: code entry + wallet ---------------- */

function applyByCode() {
  const input = document.getElementById("codeInput");
  const code = input.value.trim().toUpperCase();
  const found = coupons.find((c) => c.code.toUpperCase() === code);
  if (!code) { codeMsgState = null; renderCodeMsg(); return; }
  if (!found) { codeMsgState = { type: "err", text: "ไม่พบโค้ดนี้ หรือหมดอายุแล้ว" }; renderCodeMsg(); return; }
  appliedCouponId = found.id;
  codeMsgState = { type: "ok", text: `ใช้คูปอง "${found.code}" แล้ว` };
  input.value = "";
  renderAll();
}

function collectCoupon(id) {
  const c = coupons.find((x) => x.id === id);
  if (!c || c.held || c.quotaClaimed >= c.quotaTotal) return;
  c.held = true;
  c.quotaClaimed += 1;
  renderAll();
}
function useFromWallet(id) { appliedCouponId = id; renderAll(); }
function removeApplied() { appliedCouponId = null; renderAll(); }

function ticketMarkup(c, mode) {
  // mode: 'available' | 'held'
  const remaining = Math.max(0, c.quotaTotal - c.quotaClaimed);
  const pct = c.quotaTotal ? Math.min(100, (c.quotaClaimed / c.quotaTotal) * 100) : 0;
  const wrap = document.createElement("div");
  wrap.className = "ticket" + (mode === "held" ? " collected" : "");
  wrap.innerHTML = `
    <span class="notch top"></span><span class="notch bottom"></span>
    <div class="main">
      <div class="t-title">${escapeHtml(c.label)}</div>
      <div class="t-desc">${c.type === "freeship" ? "ฟรีค่าส่งเฉพาะกลุ่มเข้าเงื่อนไข" : `ลด ฿${fmt(c.discountAmount)} เมื่อซื้อครบ ฿${fmt(c.minSpend)}`}</div>
      <div class="t-progress"><i style="width:${pct}%"></i></div>
      <div class="t-qty">เก็บไปแล้ว ${c.quotaClaimed} / ${c.quotaTotal} สิทธิ์</div>
    </div>
    <div class="stub"></div>
  `;
  const stub = wrap.querySelector(".stub");
  if (mode === "available") {
    stub.innerHTML = `<span class="t-code">${escapeHtml(c.code)}</span>`;
    const btn = document.createElement("button");
    btn.className = "t-btn"; btn.type = "button";
    btn.textContent = remaining > 0 ? "เก็บคูปอง" : "หมดสิทธิ์";
    btn.disabled = remaining <= 0;
    if (remaining <= 0) btn.style.opacity = ".5";
    btn.onclick = () => collectCoupon(c.id);
    stub.appendChild(btn);
  } else {
    stub.innerHTML = `<span class="t-got">✓ เก็บแล้ว</span>`;
    const btn = document.createElement("button");
    btn.className = "t-btn"; btn.type = "button";
    btn.textContent = appliedCouponId === c.id ? "กำลังใช้" : "ใช้คูปองนี้";
    btn.style.background = appliedCouponId === c.id ? "var(--ink-faint)" : "var(--a)";
    btn.onclick = () => useFromWallet(c.id);
    stub.appendChild(btn);
  }
  return wrap;
}

function renderWallet() {
  const heldEl = document.getElementById("walletHeld");
  const availEl = document.getElementById("walletAvailable");
  heldEl.innerHTML = ""; availEl.innerHTML = "";

  const held = coupons.filter((c) => c.held);
  const available = coupons.filter((c) => c.collectible && !c.held);

  if (held.length === 0) heldEl.innerHTML = `<div class="cart-empty">ยังไม่ได้เก็บคูปองไว้</div>`;
  held.forEach((c) => heldEl.appendChild(ticketMarkup(c, "held")));

  if (available.length === 0) availEl.innerHTML = `<div class="cart-empty">ไม่มีคูปองให้เก็บตอนนี้</div>`;
  available.forEach((c) => availEl.appendChild(ticketMarkup(c, "available")));

  const bannerEl = document.getElementById("appliedBanner");
  const applied = coupons.find((c) => c.id === appliedCouponId);
  bannerEl.innerHTML = "";
  if (applied) {
    const b = document.createElement("div");
    b.className = "applied-banner";
    b.innerHTML = `<span>กำลังใช้: <b>${escapeHtml(applied.code)}</b> — ${escapeHtml(applied.label)}</span>`;
    const rm = document.createElement("button");
    rm.type = "button"; rm.textContent = "เอาออก";
    rm.onclick = removeApplied;
    b.appendChild(rm);
    bannerEl.appendChild(b);
  }
}

function renderCodeMsg() {
  const el = document.getElementById("codeMsg");
  if (!codeMsgState) { el.textContent = ""; el.className = "code-msg"; return; }
  el.textContent = codeMsgState.text;
  el.className = "code-msg " + codeMsgState.type;
}

/* ---------------- admin: catalog (products) ---------------- */

function renderCatalogEditor() {
  const el = document.getElementById("catalogEditor");
  el.innerHTML = "";
  catalog.forEach((p) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">${escapeHtml(p.id)}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => {
      catalog = catalog.filter((x) => x.id !== p.id);
      delete cart[p.id];
      renderAll();
    };
    head.appendChild(del);
    card.appendChild(head);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>ชื่อสินค้า</label></div><div class="field"><label>แบรนด์</label></div>`;
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = p.name;
    nameInput.onchange = () => { p.name = nameInput.value.trim() || "สินค้าใหม่"; renderAll(); };
    row1.children[0].appendChild(nameInput);
    const brandInput = document.createElement("input");
    brandInput.type = "text"; brandInput.value = p.brand;
    brandInput.onchange = () => { p.brand = brandInput.value.trim() || "Generic"; renderAll(); };
    row1.children[1].appendChild(brandInput);
    card.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "field-row";
    row2.innerHTML = `<div class="field"><label>ราคา (บาท)</label></div><div class="field"><label>กลุ่มค่าส่ง</label></div>`;
    const priceInput = document.createElement("input");
    priceInput.type = "number"; priceInput.value = p.price; priceInput.min = 0; priceInput.step = 5;
    priceInput.onchange = () => { p.price = Math.max(0, Number(priceInput.value) || 0); renderAll(); };
    row2.children[0].appendChild(priceInput);

    const toggle = document.createElement("div");
    toggle.className = "type-toggle";
    const okBtn = document.createElement("button");
    okBtn.type = "button"; okBtn.className = "type-btn" + (p.ship === "ok" ? " active" : ""); okBtn.textContent = "🟢 ฟรีค่าส่งได้";
    okBtn.onclick = () => { p.ship = "ok"; renderAll(); };
    const xBtn = document.createElement("button");
    xBtn.type = "button"; xBtn.className = "type-btn" + (p.ship === "x" ? " active" : ""); xBtn.textContent = "🔴 ยกเว้น";
    xBtn.onclick = () => { p.ship = "x"; renderAll(); };
    toggle.appendChild(okBtn); toggle.appendChild(xBtn);
    row2.children[1].appendChild(toggle);
    card.appendChild(row2);

    if (p.ship === "x") {
      const feeRow = document.createElement("div");
      feeRow.className = "field-row single";
      feeRow.innerHTML = `<div class="field"><label>ค่าส่งของชิ้นนี้เมื่อคิดแบบแยกกลุ่ม (บาท/ชิ้น)</label></div>`;
      const feeInput = document.createElement("input");
      feeInput.type = "number"; feeInput.value = p.shipFee || 0; feeInput.min = 0; feeInput.step = 5;
      feeInput.onchange = () => { p.shipFee = Math.max(0, Number(feeInput.value) || 0); renderAll(); };
      feeRow.children[0].appendChild(feeInput);
      card.appendChild(feeRow);
    }

    el.appendChild(card);
  });
}

function addProduct() {
  catalog.push({ id: uid(), name: "สินค้าใหม่", price: 100, brand: "Generic", ship: "ok", shipFee: 0 });
  renderAll();
}

/* ---------------- admin: auto-discount rule ---------------- */

function renderAutoRuleEditor() {
  const el = document.getElementById("autoRuleEditor");
  el.innerHTML = "";
  const card = document.createElement("div");
  card.className = "m-card";

  const row1 = document.createElement("div");
  row1.className = "field-row";
  row1.innerHTML = `<div class="field"><label>แบรนด์เป้าหมาย</label></div><div class="field"><label>เปิดใช้งาน</label></div>`;
  const sel = document.createElement("select");
  currentBrands().forEach((b) => {
    const o = document.createElement("option");
    o.value = b; o.textContent = b; if (b === autoRule.brand) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => { autoRule.brand = sel.value; renderAll(); };
  row1.children[0].appendChild(sel);

  const toggle = document.createElement("div");
  toggle.className = "type-toggle";
  const onBtn = document.createElement("button");
  onBtn.type = "button"; onBtn.className = "type-btn" + (autoRule.enabled ? " active" : ""); onBtn.textContent = "เปิด";
  onBtn.onclick = () => { autoRule.enabled = true; renderAll(); };
  const offBtn = document.createElement("button");
  offBtn.type = "button"; offBtn.className = "type-btn" + (!autoRule.enabled ? " active" : ""); offBtn.textContent = "ปิด";
  offBtn.onclick = () => { autoRule.enabled = false; renderAll(); };
  toggle.appendChild(onBtn); toggle.appendChild(offBtn);
  row1.children[1].appendChild(toggle);
  card.appendChild(row1);

  const row2 = document.createElement("div");
  row2.className = "field-row";
  row2.innerHTML = `<div class="field"><label>ยอดขั้นต่ำ (บาท)</label></div><div class="field"><label>ส่วนลด (บาท)</label></div>`;
  const minInput = document.createElement("input");
  minInput.type = "number"; minInput.value = autoRule.minSpend; minInput.step = 100;
  minInput.onchange = () => { autoRule.minSpend = Number(minInput.value) || 0; renderAll(); };
  row2.children[0].appendChild(minInput);
  const discInput = document.createElement("input");
  discInput.type = "number"; discInput.value = autoRule.discountAmount; discInput.step = 10;
  discInput.onchange = () => { autoRule.discountAmount = Number(discInput.value) || 0; renderAll(); };
  row2.children[1].appendChild(discInput);
  card.appendChild(row2);

  el.appendChild(card);
}

/* ---------------- admin: coupon editor ---------------- */

function renderCouponEditor() {
  const el = document.getElementById("couponEditor");
  el.innerHTML = "";
  coupons.forEach((c) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">${escapeHtml(c.code)}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => {
      coupons = coupons.filter((x) => x.id !== c.id);
      if (appliedCouponId === c.id) appliedCouponId = null;
      renderAll();
    };
    head.appendChild(del);
    card.appendChild(head);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>โค้ด</label></div><div class="field"><label>ชื่อที่ลูกค้าเห็น</label></div>`;
    const codeInput = document.createElement("input");
    codeInput.type = "text"; codeInput.value = c.code;
    codeInput.onchange = () => { c.code = codeInput.value.toUpperCase(); renderAll(); };
    row1.children[0].appendChild(codeInput);
    const labelInput = document.createElement("input");
    labelInput.type = "text"; labelInput.value = c.label;
    labelInput.oninput = () => { c.label = labelInput.value; renderWallet(); renderBreakdown(); };
    row1.children[1].appendChild(labelInput);
    card.appendChild(row1);

    const typeField = document.createElement("div");
    typeField.className = "field"; typeField.style.marginBottom = "8px";
    typeField.innerHTML = `<label>ประเภท</label>`;
    const toggle = document.createElement("div");
    toggle.className = "type-toggle";
    const fsBtn = document.createElement("button");
    fsBtn.type = "button"; fsBtn.className = "type-btn" + (c.type === "freeship" ? " active" : ""); fsBtn.textContent = "ส่งฟรี";
    fsBtn.onclick = () => { c.type = "freeship"; renderAll(); };
    const cdBtn = document.createElement("button");
    cdBtn.type = "button"; cdBtn.className = "type-btn" + (c.type === "cart_discount" ? " active" : ""); cdBtn.textContent = "ลดยอดบิล";
    cdBtn.onclick = () => { c.type = "cart_discount"; renderAll(); };
    toggle.appendChild(fsBtn); toggle.appendChild(cdBtn);
    typeField.appendChild(toggle);
    card.appendChild(typeField);

    const row2 = document.createElement("div");
    row2.className = "field-row";
    row2.innerHTML = `<div class="field"><label>ยอดขั้นต่ำ (บาท)</label></div><div class="field"><label>${c.type === "cart_discount" ? "ส่วนลด (บาท)" : "จำนวนสิทธิ์ทั้งหมด"}</label></div>`;
    const minInput = document.createElement("input");
    minInput.type = "number"; minInput.value = c.minSpend; minInput.step = 100;
    minInput.onchange = () => { c.minSpend = Number(minInput.value) || 0; renderAll(); };
    row2.children[0].appendChild(minInput);
    const secondInput = document.createElement("input");
    secondInput.type = "number"; secondInput.step = c.type === "cart_discount" ? 10 : 1;
    secondInput.value = c.type === "cart_discount" ? c.discountAmount : c.quotaTotal;
    secondInput.onchange = () => {
      if (c.type === "cart_discount") c.discountAmount = Number(secondInput.value) || 0;
      else c.quotaTotal = Math.max(c.quotaClaimed, Number(secondInput.value) || 0);
      renderAll();
    };
    row2.children[1].appendChild(secondInput);
    card.appendChild(row2);

    const collField = document.createElement("div");
    collField.className = "field";
    const pill = document.createElement("label");
    pill.className = "chk-pill";
    const chk = document.createElement("input");
    chk.type = "checkbox"; chk.checked = c.collectible;
    chk.onchange = () => { c.collectible = chk.checked; renderAll(); };
    pill.appendChild(chk);
    pill.appendChild(document.createTextNode("ให้เก็บล่วงหน้าได้ (แบบ Shopee) — ถ้าปิด ลูกค้าต้องพิมพ์โค้ดเอง"));
    collField.appendChild(pill);
    card.appendChild(collField);

    if (c.collectible) {
      const qRow = document.createElement("div");
      qRow.className = "field-row single";
      qRow.innerHTML = `<div class="field"><label>จำนวนสิทธิ์ทั้งหมด</label></div>`;
      const qInput = document.createElement("input");
      qInput.type = "number"; qInput.value = c.quotaTotal; qInput.min = c.quotaClaimed;
      qInput.onchange = () => { c.quotaTotal = Math.max(c.quotaClaimed, Number(qInput.value) || 0); renderAll(); };
      qRow.children[0].appendChild(qInput);
      card.appendChild(qRow);
    }

    el.appendChild(card);
  });
}

function addCoupon() {
  coupons.push({
    id: uid(), code: "NEWCODE" + (coupons.length + 1), label: "คูปองใหม่",
    type: "cart_discount", minSpend: 500, discountAmount: 50,
    collectible: false, quotaTotal: 100, quotaClaimed: 0, held: false,
  });
  renderAll();
}

/* ---------------- boot ---------------- */

function renderAll() {
  renderCatalog();
  renderCart();
  renderBreakdown();
  renderCodeMsg();
  renderCatalogEditor();
  renderAutoRuleEditor();
  renderCouponEditor();
}

function boot() {
  renderAll();
  document.getElementById("codeApplyBtn").onclick = applyByCode;
  document.getElementById("codeInput").addEventListener("keydown", (e) => { if (e.key === "Enter") applyByCode(); });
  document.getElementById("addProductBtn").onclick = addProduct;
  document.getElementById("addCouponBtn").onclick = addCoupon;
  document.getElementById("resetBtn").onclick = () => {
    catalog = seedCatalog();
    cart = {};
    autoRule = seedAutoRule();
    coupons = seedCoupons();
    appliedCouponId = null;
    codeMsgState = null;
    renderAll();
  };
}

boot();
