/* admin.js — backend settings, fully wired: real input types, live state, live previews */

const PRODUCTS = [
  "พาราเซตามอล 500mg", "วิตามินซี 1000mg (Blackmores)", "น้ำมันปลา Omega-3 (Blackmores)",
  "แคลเซียม+ดี (Blackmores)", "หน้ากากอนามัย (กล่อง)", "เจลล้างมือ",
  "ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)", "นมผงสูตร 3 ตรา A", "ขวดนม PP 240ml",
];
const PRICE_MAP = {
  "พาราเซตามอล 500mg": 60, "วิตามินซี 1000mg (Blackmores)": 250, "น้ำมันปลา Omega-3 (Blackmores)": 450,
  "แคลเซียม+ดี (Blackmores)": 380, "หน้ากากอนามัย (กล่อง)": 120, "เจลล้างมือ": 85,
  "ยาน้ำแก้ไอ": 180, "เข็มฉีดยา (กล่อง)": 90, "นมผงสูตร 3 ตรา A": 690, "ขวดนม PP 240ml": 200,
};
const CATEGORIES = ["หมวดยาสามัญประจำบ้าน", "หมวดวิตามิน/อาหารเสริม", "หมวดเวชภัณฑ์", "หมวดแม่และเด็ก"];
const CATEGORY_ICONS = { "หมวดยาสามัญประจำบ้าน": "💊", "หมวดวิตามิน/อาหารเสริม": "🧴", "หมวดเวชภัณฑ์": "🩹", "หมวดแม่และเด็ก": "🍼" };
const BRANDS = ["Blackmores", "Generic", "ตรา A"];

function fmt(n) { return Number(n).toLocaleString("th-TH"); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function selectHtml(options, selected) {
  return options.map((o) => `<option value="${escapeHtml(o)}"${o === selected ? " selected" : ""}>${escapeHtml(o)}</option>`).join("");
}

/* reusable removable-chip list, e.g. "สินค้าคู่", "สินค้ายกเว้น" */
function renderChipList(container, items, onRemove) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<span style="font-size:12px;color:var(--ink-faint)">ไม่มี</span>`;
    return;
  }
  items.forEach((item, idx) => {
    const pill = document.createElement("span");
    pill.className = "chk-pill";
    pill.textContent = item;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "×";
    rm.style.cssText = "border:none;background:transparent;color:var(--risk-ink);font-size:13px;line-height:1;padding:0;margin-left:6px;cursor:pointer;";
    rm.onclick = () => onRemove(idx);
    pill.appendChild(rm);
    container.appendChild(pill);
  });
}

function wireAddRow(selectEl, btnEl, onAdd) {
  btnEl.addEventListener("click", () => {
    if (!selectEl.value) return;
    onAdd(selectEl.value);
  });
}

/* generic: any .type-toggle button (with or without data-pick) swaps "active" among siblings */
function wireToggle(groupEl, onPick) {
  groupEl.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      groupEl.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (onPick) onPick(btn.dataset.pick || btn.textContent.trim());
    });
  });
}
function activePick(groupEl) {
  const btn = groupEl.querySelector(".type-btn.active");
  return btn ? btn.dataset.pick : null;
}

/* =========================================================
   1. ซื้อคู่สินค้าที่เข้ากัน (cross-sell, ต่อยอด Bundle)
   ========================================================= */
const combo = {
  name: "ซื้อคู่นมผง + ขวดนม คุ้มกว่า",
  mainProduct: "นมผงสูตร 3 ตรา A",
  pairProducts: ["ขวดนม PP 240ml"],
  discountType: "fixed",
  discountValue: 100,
  perCustomerLimit: null,
  priority: 5,
  active: true,
  startDate: "2026-10-01",
  endDate: "",
};

function comboBase() {
  return (PRICE_MAP[combo.mainProduct] || 0) + combo.pairProducts.reduce((s, p) => s + (PRICE_MAP[p] || 0), 0);
}

function renderCombo() {
  document.getElementById("comboMainSelect").innerHTML = selectHtml(PRODUCTS, combo.mainProduct);
  const addSel = document.getElementById("comboPairAddSelect");
  addSel.innerHTML = selectHtml(PRODUCTS.filter((p) => p !== combo.mainProduct && !combo.pairProducts.includes(p)), null);
  renderChipList(document.getElementById("comboPairList"), combo.pairProducts, (idx) => {
    combo.pairProducts.splice(idx, 1);
    renderCombo();
  });

  const base = comboBase();
  const result = combo.discountType === "percent"
    ? Math.round(base * (1 - combo.discountValue / 100))
    : Math.max(0, base - combo.discountValue);

  document.getElementById("comboPreviewMain").textContent = combo.mainProduct;
  document.getElementById("comboPreviewPairs").textContent = combo.pairProducts.length ? combo.pairProducts.join(" + ") : "(ยังไม่เลือกสินค้าคู่)";
  document.getElementById("comboPreviewOld").textContent = "฿" + fmt(base);
  document.getElementById("comboPreviewNew").textContent = "฿" + fmt(result);
  document.getElementById("comboPreviewSave").textContent = combo.pairProducts.length ? "ประหยัด ฿" + fmt(base - result) : "";
}

function bootCombo() {
  document.getElementById("comboName").value = combo.name;
  document.getElementById("comboName").oninput = (e) => { combo.name = e.target.value; };

  document.getElementById("comboMainSelect").onchange = (e) => {
    combo.mainProduct = e.target.value;
    combo.pairProducts = combo.pairProducts.filter((p) => p !== combo.mainProduct);
    renderCombo();
  };
  wireAddRow(document.getElementById("comboPairAddSelect"), document.getElementById("comboPairAddBtn"), (v) => {
    combo.pairProducts.push(v);
    renderCombo();
  });

  wireToggle(document.getElementById("comboDiscountType"), (pick) => { combo.discountType = pick; renderCombo(); });
  const valInput = document.getElementById("comboDiscountValue");
  valInput.value = combo.discountValue;
  valInput.oninput = (e) => { combo.discountValue = Number(e.target.value) || 0; renderCombo(); };

  const limitInput = document.getElementById("comboPerCustomerLimit");
  limitInput.oninput = (e) => { combo.perCustomerLimit = e.target.value === "" ? null : Number(e.target.value); };

  const prioInput = document.getElementById("comboPriority");
  prioInput.value = combo.priority;
  prioInput.oninput = (e) => { combo.priority = Number(e.target.value) || 0; };

  wireToggle(document.getElementById("comboActiveToggle"), (pick) => { combo.active = pick === "on"; });

  document.getElementById("comboStart").value = combo.startDate;
  document.getElementById("comboStart").onchange = (e) => { combo.startDate = e.target.value; };
  document.getElementById("comboEnd").onchange = (e) => { combo.endDate = e.target.value; };

  renderCombo();
}

/* =========================================================
   2. ลดกลุ่มสินค้าตามวัน (flash / campaign day)
   ========================================================= */
const flashSale = {
  name: "9.9 MEGA SALE",
  start: "2026-09-09T00:00",
  end: "2026-09-09T23:59",
  recurring: "yearly",
  groups: [
    { target: "หมวดยาสามัญประจำบ้าน", percent: 50 },
    { target: "หมวดวิตามิน/อาหารเสริม", percent: 30 },
    { target: "หมวดเวชภัณฑ์", percent: 70 },
  ],
};

function renderFlash() {
  const tbody = document.getElementById("flashGroupsBody");
  tbody.innerHTML = "";
  flashSale.groups.forEach((g, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(g.target)}</td><td class="mono">-${g.percent}%</td><td></td>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { flashSale.groups.splice(idx, 1); renderFlash(); };
    tr.children[2].appendChild(del);
    tbody.appendChild(tr);
  });

  const addSel = document.getElementById("flashAddCategory");
  addSel.innerHTML = selectHtml(CATEGORIES.filter((c) => !flashSale.groups.some((g) => g.target === c)), null);

  document.getElementById("flashPreviewTitle").textContent = flashSale.name;
  const catsEl = document.getElementById("flashPreviewCats");
  catsEl.innerHTML = "";
  flashSale.groups.forEach((g) => {
    const div = document.createElement("div");
    div.className = "fc";
    div.innerHTML = `<div class="fc-icon">${CATEGORY_ICONS[g.target] || "🏷️"}</div><div class="fc-name">${escapeHtml(g.target.replace("หมวด", ""))}</div><div class="fc-off">-${g.percent}%</div>`;
    catsEl.appendChild(div);
  });
}

function bootFlash() {
  document.getElementById("flashName").value = flashSale.name;
  document.getElementById("flashName").oninput = (e) => { flashSale.name = e.target.value; renderFlash(); };
  document.getElementById("flashStart").value = flashSale.start;
  document.getElementById("flashStart").onchange = (e) => { flashSale.start = e.target.value; };
  document.getElementById("flashEnd").value = flashSale.end;
  document.getElementById("flashEnd").onchange = (e) => { flashSale.end = e.target.value; };
  wireToggle(document.getElementById("flashRecurringToggle"), (pick) => { flashSale.recurring = pick; });

  document.getElementById("flashAddPercent").value = 20;
  document.getElementById("flashAddBtn").addEventListener("click", () => {
    const cat = document.getElementById("flashAddCategory").value;
    const pct = Number(document.getElementById("flashAddPercent").value) || 0;
    if (!cat) return;
    flashSale.groups.push({ target: cat, percent: pct });
    renderFlash();
  });

  renderFlash();
}

/* =========================================================
   3. ส่วนลดท้ายบิล / ส่งฟรีกลุ่มนี้ (self-contained, ไม่ต้องออกไปหน้าอื่น)
   ========================================================= */
const billDiscount = { brand: "Blackmores", minSpend: 1000, discountAmount: 100, active: true };
const freeShip = { excluded: ["ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"], minSpend: 0, active: true };
const DEMO_CART = ["พาราเซตามอล 500mg", "วิตามินซี 1000mg (Blackmores)", "ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"];
const DEMO_BRAND_OF = { "พาราเซตามอล 500mg": "Generic", "วิตามินซี 1000mg (Blackmores)": "Blackmores", "ยาน้ำแก้ไอ": "Generic", "เข็มฉีดยา (กล่อง)": "Generic" };

function renderBillFreeShip() {
  document.getElementById("billBrandSelect").innerHTML = selectHtml(BRANDS, billDiscount.brand);

  const excludedContainer = document.getElementById("freeShipExcludedList");
  renderChipList(excludedContainer, freeShip.excluded, (idx) => { freeShip.excluded.splice(idx, 1); renderBillFreeShip(); });
  document.getElementById("freeShipAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !freeShip.excluded.includes(p)), null);

  // preview: split demo cart live by current freeShip.excluded list
  const freeGroup = DEMO_CART.filter((p) => !freeShip.excluded.includes(p));
  const chargeGroup = DEMO_CART.filter((p) => freeShip.excluded.includes(p));
  document.getElementById("previewFreeGroup").innerHTML = freeGroup.map((p) => `<div class="item"><span>${escapeHtml(p)}</span><span class="num">฿${fmt(PRICE_MAP[p])}</span></div>`).join("") || `<div class="item" style="color:var(--ink-faint)">(ไม่มี)</div>`;
  document.getElementById("previewChargeGroup").innerHTML = chargeGroup.map((p) => `<div class="item"><span>${escapeHtml(p)}</span><span class="num">฿${fmt(PRICE_MAP[p])}</span></div>`).join("") || `<div class="item" style="color:var(--ink-faint)">(ไม่มี)</div>`;

  const brandTotal = DEMO_CART.filter((p) => DEMO_BRAND_OF[p] === billDiscount.brand).reduce((s, p) => s + PRICE_MAP[p], 0);
  const qualifies = billDiscount.active && brandTotal >= billDiscount.minSpend;
  document.getElementById("previewBillBadge").textContent = qualifies
    ? `🏷️ ซื้อ ${billDiscount.brand} ครบ ฿${fmt(billDiscount.minSpend)} ลดทันที ฿${fmt(billDiscount.discountAmount)}`
    : `🏷️ ซื้อ ${billDiscount.brand} ยังไม่ถึง ฿${fmt(billDiscount.minSpend)} (ตอนนี้ ฿${fmt(brandTotal)})`;

  document.getElementById("previewShipBadge").textContent = freeShip.active
    ? (chargeGroup.length ? `🚚 ฟรีค่าส่งกลุ่มที่เข้าเงื่อนไข — คิดค่าส่งเฉพาะ ${chargeGroup.length} รายการที่ยกเว้น` : `🚚 ฟรีค่าส่งทั้งบิล ไม่มีสินค้ายกเว้นในตะกร้านี้`)
    : "🚚 ปิดใช้งานอยู่";
}

function bootBillFreeShip() {
  document.getElementById("billBrandSelect").onchange = (e) => { billDiscount.brand = e.target.value; renderBillFreeShip(); };
  const minSpendInput = document.getElementById("billMinSpend");
  minSpendInput.value = billDiscount.minSpend;
  minSpendInput.oninput = (e) => { billDiscount.minSpend = Number(e.target.value) || 0; renderBillFreeShip(); };
  const discInput = document.getElementById("billDiscountAmount");
  discInput.value = billDiscount.discountAmount;
  discInput.oninput = (e) => { billDiscount.discountAmount = Number(e.target.value) || 0; renderBillFreeShip(); };
  wireToggle(document.getElementById("billActiveToggle"), (pick) => { billDiscount.active = pick === "on"; renderBillFreeShip(); });

  wireAddRow(document.getElementById("freeShipAddSelect"), document.getElementById("freeShipAddBtn"), (v) => {
    freeShip.excluded.push(v);
    renderBillFreeShip();
  });
  const shipMinInput = document.getElementById("freeShipMinSpend");
  shipMinInput.oninput = (e) => { freeShip.minSpend = Number(e.target.value) || 0; };
  wireToggle(document.getElementById("freeShipActiveToggle"), (pick) => { freeShip.active = pick === "on"; renderBillFreeShip(); });

  renderBillFreeShip();
}

/* =========================================================
   4. คูปองกระดาษ (self-contained)
   ========================================================= */
const paperCoupon = { code: "ABC100", qty: 1000, discountAmount: 50, expiry: "2026-12-31" };
let paperClaims = [
  { shop: "ร้านยาสุขภาพดี สาขา 2", stubs: 47, status: "pending" },
  { shop: "ตัวแทนจำหน่าย เชียงใหม่", stubs: 112, status: "paid" },
  { shop: "ร้านยาสุขภาพดี สาขา 5", stubs: 30, status: "paid" },
];

function renderPaperCoupon() {
  document.getElementById("pcCode").textContent = paperCoupon.code;
  document.getElementById("pcValue").textContent = "ลด ฿" + fmt(paperCoupon.discountAmount);
  document.getElementById("pcExpiryText").textContent = "ใช้ได้ถึง " + paperCoupon.expiry;
  document.getElementById("genOut").innerHTML = `สร้างแล้ว: โค้ด ${escapeHtml(paperCoupon.code)} × ${fmt(paperCoupon.qty)} ใบ<br>สถานะ: พร้อมส่งไฟล์พิมพ์`;

  const tbody = document.getElementById("paperClaimsBody");
  tbody.innerHTML = "";
  paperClaims.forEach((c, idx) => {
    const tr = document.createElement("tr");
    const value = c.stubs * paperCoupon.discountAmount;
    tr.innerHTML = `<td>${escapeHtml(c.shop)}</td><td class="mono">${escapeHtml(paperCoupon.code)}</td><td class="num">${c.stubs} ใบ</td><td class="num">฿${fmt(value)}</td><td></td>`;
    if (c.status === "pending") {
      const btn = document.createElement("button");
      btn.className = "cq-status pending"; btn.type = "button"; btn.textContent = "รอตรวจนับ";
      btn.onclick = () => { c.status = "paid"; renderPaperCoupon(); };
      tr.children[4].appendChild(btn);
    } else {
      tr.children[4].innerHTML = `<span class="cq-status paid">จ่ายเงินแล้ว</span>`;
    }
    tbody.appendChild(tr);
  });
}

function bootPaperCoupon() {
  document.getElementById("genCode").value = paperCoupon.code;
  document.getElementById("genQty").value = paperCoupon.qty;
  document.getElementById("genDiscount").value = paperCoupon.discountAmount;
  document.getElementById("genExpiry").value = paperCoupon.expiry;

  document.getElementById("genBtn").addEventListener("click", () => {
    paperCoupon.code = (document.getElementById("genCode").value.trim() || "ABC100").toUpperCase();
    paperCoupon.qty = Number(document.getElementById("genQty").value) || 0;
    paperCoupon.discountAmount = Number(document.getElementById("genDiscount").value) || 0;
    paperCoupon.expiry = document.getElementById("genExpiry").value || paperCoupon.expiry;
    renderPaperCoupon();
  });

  document.getElementById("paperAddBtn").addEventListener("click", () => {
    const shop = document.getElementById("paperAddShop").value.trim();
    const stubs = Number(document.getElementById("paperAddStubs").value) || 0;
    if (!shop || stubs <= 0) return;
    paperClaims.unshift({ shop, stubs, status: "pending" });
    document.getElementById("paperAddShop").value = "";
    document.getElementById("paperAddStubs").value = "";
    renderPaperCoupon();
  });

  renderPaperCoupon();
}

/* =========================================================
   5. คูปองออนไลน์ (ไม่ unique) — ทดลองใช้โค้ดจริงกับ log
   ========================================================= */
const onlineCoupon = { code: "SAVE100", minSpend: 500, discountAmount: 100, excluded: [], totalLimit: null, perCustomerLimit: 1 };
let onlineLog = [
  { time: "09:14", customer: "ร้านยา A", order: "#A1502", verdict: "ok", note: "ใช้ครั้งที่ 1" },
  { time: "09:20", customer: "ร้านยา B", order: "#A1503", verdict: "ok", note: "ใช้ครั้งที่ 1" },
];
let onlineOrderSeq = 1503;

function usageCountFor(customer) {
  return onlineLog.filter((l) => l.customer === customer && l.verdict === "ok").length;
}

function renderOnlineCoupon() {
  const excludedContainer = document.getElementById("onlineExcludedList");
  renderChipList(excludedContainer, onlineCoupon.excluded, (idx) => { onlineCoupon.excluded.splice(idx, 1); renderOnlineCoupon(); });
  document.getElementById("onlineExcludedAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !onlineCoupon.excluded.includes(p)), null);

  const tbody = document.getElementById("onlineLogBody");
  tbody.innerHTML = "";
  onlineLog.forEach((l) => {
    const tr = document.createElement("tr");
    if (l.verdict === "blocked") tr.className = "blocked";
    tr.innerHTML = `<td>${escapeHtml(l.time)}</td><td>${escapeHtml(l.customer)}</td><td class="mono">${escapeHtml(l.order)}</td><td><span class="log-verdict ${l.verdict === "ok" ? "ok" : "blocked"}">${l.verdict === "ok" ? "ผ่าน — " : "บล็อก — "}${escapeHtml(l.note)}</span></td>`;
    tbody.appendChild(tr);
  });
}

function bootOnlineCoupon() {
  document.getElementById("onlineCode").value = onlineCoupon.code;
  document.getElementById("onlineCode").onchange = (e) => { onlineCoupon.code = e.target.value.toUpperCase(); };
  document.getElementById("onlineMinSpend").value = onlineCoupon.minSpend;
  document.getElementById("onlineMinSpend").oninput = (e) => { onlineCoupon.minSpend = Number(e.target.value) || 0; };
  document.getElementById("onlineDiscount").value = onlineCoupon.discountAmount;
  document.getElementById("onlineDiscount").oninput = (e) => { onlineCoupon.discountAmount = Number(e.target.value) || 0; };
  document.getElementById("onlineTotalLimit").oninput = (e) => { onlineCoupon.totalLimit = e.target.value === "" ? null : Number(e.target.value); };
  const perLimitInput = document.getElementById("onlinePerCustomerLimit");
  perLimitInput.value = onlineCoupon.perCustomerLimit;
  perLimitInput.oninput = (e) => { onlineCoupon.perCustomerLimit = Number(e.target.value) || 1; };

  wireAddRow(document.getElementById("onlineExcludedAddSelect"), document.getElementById("onlineExcludedAddBtn"), (v) => {
    onlineCoupon.excluded.push(v);
    renderOnlineCoupon();
  });

  document.getElementById("onlineTrySubmit").addEventListener("click", () => {
    const customer = document.getElementById("onlineTryCustomer").value.trim();
    if (!customer) return;
    onlineOrderSeq += 1;
    const used = usageCountFor(customer);
    const now = new Date();
    const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    if (used >= onlineCoupon.perCustomerLimit) {
      onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, verdict: "blocked", note: `เกินโควตาต่อคน (${onlineCoupon.perCustomerLimit})` });
    } else {
      onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, verdict: "ok", note: `ใช้ครั้งที่ ${used + 1}` });
    }
    renderOnlineCoupon();
  });

  renderOnlineCoupon();
}

/* =========================================================
   6. คูปองเก็บล่วงหน้า
   ========================================================= */
const walletCoupon = {
  name: "ส่งฟรีทั้งบิล ไม่มีขั้นต่ำ",
  discountType: "freeship",
  discountValue: 0,
  minSpend: 0,
  quotaTotal: 500,
  perCustomerLimit: 1,
  collectStart: "2026-09-01",
  collectEnd: "2026-09-15",
  expiryMode: "fixed",
  expiryDate: "2026-09-30",
  expiryDays: 14,
};

function renderWallet() {
  document.getElementById("walletTicketTitle").textContent = walletCoupon.name;
  const desc = walletCoupon.discountType === "freeship"
    ? "ฟรีค่าส่งเฉพาะกลุ่มเข้าเงื่อนไข (มีข้อยกเว้น)"
    : `ลด ${walletCoupon.discountType === "percent" ? walletCoupon.discountValue + "%" : "฿" + fmt(walletCoupon.discountValue)} เมื่อซื้อครบ ฿${fmt(walletCoupon.minSpend)}`;
  document.getElementById("walletTicketDesc").textContent = desc;
  const quotaText = (walletCoupon.quotaTotal ? fmt(walletCoupon.quotaTotal) : "ไม่จำกัด") + " สิทธิ์" + (walletCoupon.perCustomerLimit ? " · คนละ " + walletCoupon.perCustomerLimit + " ใบ" : "");
  document.getElementById("walletTicketQty").textContent = quotaText;
  document.getElementById("walletTicketExpiry").textContent = walletCoupon.expiryMode === "fixed"
    ? "ใช้ได้ถึง " + walletCoupon.expiryDate
    : "ใช้ได้ " + walletCoupon.expiryDays + " วันหลังเก็บ";
}

function bootWallet() {
  document.getElementById("walletName").value = walletCoupon.name;
  document.getElementById("walletName").oninput = (e) => { walletCoupon.name = e.target.value; renderWallet(); };

  wireToggle(document.getElementById("walletDiscountType"), (pick) => { walletCoupon.discountType = pick; renderWallet(); });
  document.getElementById("walletMinSpend").oninput = (e) => { walletCoupon.minSpend = Number(e.target.value) || 0; renderWallet(); };

  const quotaInput = document.getElementById("walletQuotaTotal");
  quotaInput.value = walletCoupon.quotaTotal;
  quotaInput.oninput = (e) => { walletCoupon.quotaTotal = e.target.value === "" ? null : Number(e.target.value); renderWallet(); };
  const perInput = document.getElementById("walletPerCustomerLimit");
  perInput.value = walletCoupon.perCustomerLimit;
  perInput.oninput = (e) => { walletCoupon.perCustomerLimit = e.target.value === "" ? null : Number(e.target.value); renderWallet(); };

  document.getElementById("walletCollectStart").value = walletCoupon.collectStart;
  document.getElementById("walletCollectStart").onchange = (e) => { walletCoupon.collectStart = e.target.value; };
  document.getElementById("walletCollectEnd").value = walletCoupon.collectEnd;
  document.getElementById("walletCollectEnd").onchange = (e) => { walletCoupon.collectEnd = e.target.value; };

  const fixedField = document.getElementById("walletExpiryFixedField");
  const relField = document.getElementById("walletExpiryRelField");
  wireToggle(document.getElementById("walletExpiryModeToggle"), (pick) => {
    walletCoupon.expiryMode = pick;
    fixedField.hidden = pick !== "fixed";
    relField.hidden = pick !== "relative";
    renderWallet();
  });
  document.getElementById("walletExpiryDate").value = walletCoupon.expiryDate;
  document.getElementById("walletExpiryDate").onchange = (e) => { walletCoupon.expiryDate = e.target.value; renderWallet(); };
  document.getElementById("walletExpiryDays").value = walletCoupon.expiryDays;
  document.getElementById("walletExpiryDays").oninput = (e) => { walletCoupon.expiryDays = Number(e.target.value) || 1; renderWallet(); };

  renderWallet();
}

/* =========================================================
   7. คูปองรายเดือน
   ========================================================= */
const monthlyCoupon = { name: "สิทธิ์ส่งฟรีประจำเดือน", dayOfMonth: 1, audience: "สมาชิกพิเศษเท่านั้น" };

function bootMonthly() {
  document.getElementById("monthlyName").value = monthlyCoupon.name;
  document.getElementById("monthlyName").oninput = (e) => { monthlyCoupon.name = e.target.value; };

  const daySel = document.getElementById("monthlyDay");
  daySel.innerHTML = Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}"${d === monthlyCoupon.dayOfMonth ? " selected" : ""}>วันที่ ${d}</option>`).join("");
  daySel.onchange = (e) => { monthlyCoupon.dayOfMonth = Number(e.target.value); };

  const audSel = document.getElementById("monthlyAudience");
  audSel.innerHTML = selectHtml(["ทุกคน", "สมาชิกพิเศษเท่านั้น", "เฉพาะที่เคยซื้อเดือนก่อน"], monthlyCoupon.audience);
  audSel.onchange = (e) => { monthlyCoupon.audience = e.target.value; };

  const nowCell = document.getElementById("monthNow");
  nowCell.addEventListener("click", () => {
    if (nowCell.classList.contains("got")) return;
    nowCell.classList.remove("now");
    nowCell.classList.add("got");
    nowCell.innerHTML = '<div class="mc-m">ก.ย.</div><div class="mc-icon">✅</div><div class="mc-s">ใช้แล้ว</div>';
  });
}

/* =========================================================
   8. ระบบสะสมพอยท์
   ========================================================= */
const pointSettings = { spendPer: 100, pointsPer: 10 };
let redeemCatalog = [
  { name: "คูปองลด ฿50", type: "คูปอง", cost: 500, quota: null, active: true },
  { name: "คูปองส่งฟรี", type: "คูปอง", cost: 300, quota: null, active: true },
  { name: "ของแถมพรีเมียม", type: "สินค้า", cost: 1200, quota: 50, active: true },
  { name: "เครดิตเงินคืน ฿100", type: "เครดิต", cost: 1000, quota: null, active: false },
];

function renderPointRate() {
  document.getElementById("pointRatePreview").textContent = `ทุกยอดซื้อ ฿${fmt(pointSettings.spendPer)} ได้ ${fmt(pointSettings.pointsPer)} พอยท์`;
}

function renderRedeemCatalog() {
  const tbody = document.getElementById("redeemCatalogBody");
  tbody.innerHTML = "";
  redeemCatalog.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td class="mono">${fmt(item.cost)}</td>
      <td class="mono">${item.quota ? fmt(item.quota) : "ไม่จำกัด"}</td>
      <td></td><td></td>
    `;
    const statusBtn = document.createElement("button");
    statusBtn.className = "log-verdict " + (item.active ? "ok" : "blocked");
    statusBtn.style.cssText = "border:none;cursor:pointer;";
    statusBtn.textContent = item.active ? "เปิดใช้งาน" : "ปิดชั่วคราว";
    statusBtn.onclick = () => { item.active = !item.active; renderRedeemCatalog(); };
    tr.children[4].appendChild(statusBtn);

    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { redeemCatalog.splice(idx, 1); renderRedeemCatalog(); };
    tr.children[5].appendChild(del);

    tbody.appendChild(tr);
  });
}

function bootPoint() {
  const spendInput = document.getElementById("pointSpendPer");
  spendInput.value = pointSettings.spendPer;
  spendInput.oninput = (e) => { pointSettings.spendPer = Number(e.target.value) || 1; renderPointRate(); };
  const ptsInput = document.getElementById("pointPointsPer");
  ptsInput.value = pointSettings.pointsPer;
  ptsInput.oninput = (e) => { pointSettings.pointsPer = Number(e.target.value) || 0; renderPointRate(); };
  renderPointRate();

  let excludedPoint = ["ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"];
  function renderExcludedPoint() {
    renderChipList(document.getElementById("pointExcludedList"), excludedPoint, (idx) => { excludedPoint.splice(idx, 1); renderExcludedPoint(); });
    document.getElementById("pointExcludedAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !excludedPoint.includes(p)), null);
  }
  wireAddRow(document.getElementById("pointExcludedAddSelect"), document.getElementById("pointExcludedAddBtn"), (v) => {
    excludedPoint.push(v);
    renderExcludedPoint();
  });
  renderExcludedPoint();

  document.getElementById("redeemAddBtn").addEventListener("click", () => {
    const name = document.getElementById("redeemAddName").value.trim();
    const type = document.getElementById("redeemAddType").value;
    const cost = Number(document.getElementById("redeemAddCost").value) || 0;
    const quotaRaw = document.getElementById("redeemAddQuota").value;
    if (!name || cost <= 0) return;
    redeemCatalog.push({ name, type, cost, quota: quotaRaw === "" ? null : Number(quotaRaw), active: true });
    document.getElementById("redeemAddName").value = "";
    document.getElementById("redeemAddCost").value = "";
    document.getElementById("redeemAddQuota").value = "";
    renderRedeemCatalog();
  });

  renderRedeemCatalog();
}

/* =========================================================
   9. แคมเปญ — เงื่อนไขปลดล็อก 3 แบบ
   ========================================================= */
function bootCondition() {
  const group = document.getElementById("condTypeToggle");
  const panels = {
    amount: document.getElementById("condPanelAmount"),
    first_n: document.getElementById("condPanelFirstN"),
    raffle: document.getElementById("condPanelRaffle"),
  };
  wireToggle(group, (pick) => {
    Object.entries(panels).forEach(([k, el]) => { if (el) el.hidden = k !== pick; });
  });
  // default shown state already set via `hidden` attributes in the HTML (raffle visible)
}

/* =========================================================
   10. วงล้อสุ่ม
   ========================================================= */
const RAFFLE_ENTRANTS = [
  "ร้านยาสุขภาพดี สาขา 2", "ร้านยา รุ่งเรืองเภสัช", "คลินิกหมอสมชาย", "ร้านยาดีดี ฟาร์มาซี",
  "ร้านยา บ้านหมอ", "ตัวแทนจำหน่าย เชียงใหม่", "ร้านยาชุมชนพลัส", "เภสัชกรออนไลน์ 24",
];
const WHEEL_COLORS = ["#0E5C52", "#4FC2AC", "#A8722C", "#E2AC5C", "#154B3F", "#B8894A", "#0A4038", "#D9A25C"];
let wheelRotation = 0;
let wheelSpinning = false;

function buildWheelGradient(n) {
  const seg = 360 / n;
  const stops = [];
  for (let i = 0; i < n; i++) stops.push(`${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`);
  return `conic-gradient(${stops.join(",")})`;
}

function bootWheel() {
  const disc = document.getElementById("wheelDisc");
  const legend = document.getElementById("wheelLegend");
  const btn = document.getElementById("wheelSpinBtn");
  const result = document.getElementById("wheelResult");
  if (!disc) return;

  const n = RAFFLE_ENTRANTS.length;
  disc.style.background = buildWheelGradient(n);
  legend.innerHTML = "";
  RAFFLE_ENTRANTS.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "wl-item";
    row.innerHTML = `<span class="wl-dot" style="background:${WHEEL_COLORS[i % WHEEL_COLORS.length]}"></span>${escapeHtml(name)}`;
    legend.appendChild(row);
  });

  btn.addEventListener("click", () => {
    if (wheelSpinning) return;
    wheelSpinning = true;
    btn.disabled = true;
    result.className = "wheel-result empty";
    result.textContent = "กำลังหมุน...";

    const seg = 360 / n;
    const winnerIdx = Math.floor(Math.random() * n);
    const segCenter = winnerIdx * seg + seg / 2;
    const extraSpins = 6 * 360;
    const targetWithinTurn = 360 - segCenter;
    const delta = extraSpins + targetWithinTurn - (wheelRotation % 360);
    wheelRotation += delta;
    disc.style.transform = `rotate(${wheelRotation}deg)`;

    setTimeout(() => {
      wheelSpinning = false;
      btn.disabled = false;
      result.className = "wheel-result";
      result.textContent = "🎉 ผู้โชคดีคือ " + RAFFLE_ENTRANTS[winnerIdx];
    }, 4300);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bootCombo();
  bootFlash();
  bootBillFreeShip();
  bootPaperCoupon();
  bootOnlineCoupon();
  bootWallet();
  bootMonthly();
  bootPoint();
  bootCondition();
  bootWheel();
});
