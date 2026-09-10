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
const AUDIENCE_OPTIONS = ["ลูกค้าทุกคน", "เฉพาะสมาชิกพิเศษ", "เฉพาะลูกค้าที่เคยซื้อมาก่อน"];

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
  maxDiscountCap: null,
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

  document.getElementById("comboCapField").hidden = combo.discountType !== "percent";

  const base = comboBase();
  let off = combo.discountType === "percent" ? Math.round(base * (combo.discountValue / 100)) : combo.discountValue;
  if (combo.discountType === "percent" && combo.maxDiscountCap) off = Math.min(off, combo.maxDiscountCap);
  const result = Math.max(0, base - off);

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
  const capInput = document.getElementById("comboMaxCap");
  capInput.oninput = (e) => { combo.maxDiscountCap = e.target.value === "" ? null : Number(e.target.value); renderCombo(); };

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
let billRules = [
  { targetType: "brand", target: "Blackmores", minSpend: 1000, discountType: "fixed", discountValue: 100, maxCap: null, priority: 10 },
];
const freeShip = { mode: "exclude", list: ["ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"], minSpend: 0, active: true };
const DEMO_CART = ["พาราเซตามอล 500mg", "วิตามินซี 1000mg (Blackmores)", "ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"];
const DEMO_BRAND_OF = { "พาราเซตามอล 500mg": "Generic", "วิตามินซี 1000mg (Blackmores)": "Blackmores", "ยาน้ำแก้ไอ": "Generic", "เข็มฉีดยา (กล่อง)": "Generic" };
const DEMO_CATEGORY_OF = { "พาราเซตามอล 500mg": "หมวดยาสามัญประจำบ้าน", "วิตามินซี 1000mg (Blackmores)": "หมวดวิตามิน/อาหารเสริม", "ยาน้ำแก้ไอ": "หมวดยาสามัญประจำบ้าน", "เข็มฉีดยา (กล่อง)": "หมวดเวชภัณฑ์" };

function ruleGroupTotal(rule) {
  const matcher = rule.targetType === "brand" ? (p) => DEMO_BRAND_OF[p] === rule.target : (p) => DEMO_CATEGORY_OF[p] === rule.target;
  return DEMO_CART.filter(matcher).reduce((s, p) => s + PRICE_MAP[p], 0);
}
function ruleDiscountAmount(rule, groupTotal) {
  let off = rule.discountType === "percent" ? Math.round(groupTotal * (rule.discountValue / 100)) : rule.discountValue;
  if (rule.discountType === "percent" && rule.maxCap) off = Math.min(off, rule.maxCap);
  return off;
}

function renderBillRules() {
  const tbody = document.getElementById("billRulesBody");
  tbody.innerHTML = "";
  billRules.forEach((rule, idx) => {
    const groupTotal = ruleGroupTotal(rule);
    const discLabel = rule.discountType === "percent" ? `${rule.discountValue}%${rule.maxCap ? " (สูงสุด ฿" + fmt(rule.maxCap) + ")" : ""}` : `฿${fmt(rule.discountValue)}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rule.targetType === "brand" ? "แบรนด์" : "หมวด"}: ${escapeHtml(rule.target)}</td>
      <td class="mono">฿${fmt(rule.minSpend)}</td>
      <td class="mono">${discLabel}</td>
      <td class="mono">${rule.priority}</td>
      <td></td>
    `;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { billRules.splice(idx, 1); renderBillFreeShip(); };
    tr.children[4].appendChild(del);
    tbody.appendChild(tr);
  });

  const typeSel = document.getElementById("billAddTargetType");
  const targetSel = document.getElementById("billAddTarget");
  targetSel.innerHTML = selectHtml(typeSel.value === "brand" ? BRANDS : CATEGORIES, null);
}

function renderBillFreeShip() {
  renderBillRules();

  freeShip.list = freeShip.list || [];
  const label = freeShip.mode === "exclude" ? "สินค้ายกเว้น (ไม่ฟรีค่าส่ง ต้องคิดค่าส่งเสมอ)" : "สินค้าที่เข้าเงื่อนไข (ฟรีค่าส่งเฉพาะรายการนี้เท่านั้น)";
  document.getElementById("freeShipListLabel").textContent = label;
  const excludedContainer = document.getElementById("freeShipExcludedList");
  renderChipList(excludedContainer, freeShip.list, (idx) => { freeShip.list.splice(idx, 1); renderBillFreeShip(); });
  document.getElementById("freeShipAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !freeShip.list.includes(p)), null);

  // preview: split demo cart live by current mode + list
  const inList = (p) => freeShip.list.includes(p);
  const freeGroup = DEMO_CART.filter((p) => (freeShip.mode === "exclude" ? !inList(p) : inList(p)));
  const chargeGroup = DEMO_CART.filter((p) => (freeShip.mode === "exclude" ? inList(p) : !inList(p)));
  document.getElementById("previewFreeGroup").innerHTML = freeGroup.map((p) => `<div class="item"><span>${escapeHtml(p)}</span><span class="num">฿${fmt(PRICE_MAP[p])}</span></div>`).join("") || `<div class="item" style="color:var(--ink-faint)">(ไม่มี)</div>`;
  document.getElementById("previewChargeGroup").innerHTML = chargeGroup.map((p) => `<div class="item"><span>${escapeHtml(p)}</span><span class="num">฿${fmt(PRICE_MAP[p])}</span></div>`).join("") || `<div class="item" style="color:var(--ink-faint)">(ไม่มี)</div>`;

  const eligible = billRules.filter((r) => ruleGroupTotal(r) >= r.minSpend).sort((a, b) => b.priority - a.priority);
  const winner = eligible[0];
  document.getElementById("previewBillBadge").textContent = winner
    ? `🏷️ เข้าเงื่อนไข "${winner.targetType === "brand" ? "แบรนด์" : "หมวด"} ${winner.target}" ลดทันที ${winner.discountType === "percent" ? winner.discountValue + "%" : "฿" + fmt(winner.discountValue)}${eligible.length > 1 ? " (ชนะกติกาอื่นด้วย priority)" : ""}`
    : "🏷️ ยังไม่มีกติกาไหนถึงเกณฑ์ในตะกร้านี้";

  document.getElementById("previewShipBadge").textContent = freeShip.active
    ? (chargeGroup.length ? `🚚 ฟรีค่าส่งกลุ่มที่เข้าเงื่อนไข — คิดค่าส่งเฉพาะ ${chargeGroup.length} รายการ` : `🚚 ฟรีค่าส่งทั้งบิล ไม่มีรายการต้องคิดค่าส่งในตะกร้านี้`)
    : "🚚 ปิดใช้งานอยู่";
}

function bootBillFreeShip() {
  const typeSel = document.getElementById("billAddTargetType");
  typeSel.onchange = () => renderBillRules();
  document.getElementById("billAddDiscountType").value = "fixed";
  document.getElementById("billAddBtn").addEventListener("click", () => {
    const targetType = typeSel.value;
    const target = document.getElementById("billAddTarget").value;
    const minSpend = Number(document.getElementById("billAddMinSpend").value) || 0;
    const discountType = document.getElementById("billAddDiscountType").value;
    const discountValue = Number(document.getElementById("billAddValue").value) || 0;
    const maxCap = document.getElementById("billAddCap").value === "" ? null : Number(document.getElementById("billAddCap").value);
    const priority = Number(document.getElementById("billAddPriority").value) || 0;
    if (!target || discountValue <= 0) return;
    billRules.push({ targetType, target, minSpend, discountType, discountValue, maxCap, priority });
    renderBillFreeShip();
  });

  wireAddRow(document.getElementById("freeShipAddSelect"), document.getElementById("freeShipAddBtn"), (v) => {
    freeShip.list.push(v);
    renderBillFreeShip();
  });
  const shipMinInput = document.getElementById("freeShipMinSpend");
  shipMinInput.oninput = (e) => { freeShip.minSpend = Number(e.target.value) || 0; };
  wireToggle(document.getElementById("freeShipActiveToggle"), (pick) => { freeShip.active = pick === "on"; renderBillFreeShip(); });
  wireToggle(document.getElementById("freeShipModeToggle"), (pick) => { freeShip.mode = pick; renderBillFreeShip(); });

  renderBillFreeShip();
}

/* =========================================================
   4. คูปองกระดาษ (self-contained)
   ========================================================= */
const paperCoupon = { code: "ABC100", qty: 1000, discountAmount: 50, minSpend: 300, expiry: "2026-12-31", combinable: false };
let paperClaims = [
  { shop: "ร้านยาสุขภาพดี สาขา 2", stubs: 47, status: "pending" },
  { shop: "ตัวแทนจำหน่าย เชียงใหม่", stubs: 112, status: "paid" },
  { shop: "ร้านยาสุขภาพดี สาขา 5", stubs: 30, status: "paid" },
];

function renderPaperCoupon() {
  document.getElementById("pcCode").textContent = paperCoupon.code;
  document.getElementById("pcValue").textContent = "ลด ฿" + fmt(paperCoupon.discountAmount);
  document.getElementById("pcMinSpendText").textContent = "เมื่อซื้อสินค้าครบ ฿" + fmt(paperCoupon.minSpend);
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
  document.getElementById("genMinSpend").value = paperCoupon.minSpend;
  document.getElementById("genExpiry").value = paperCoupon.expiry;

  document.getElementById("genBtn").addEventListener("click", () => {
    paperCoupon.code = (document.getElementById("genCode").value.trim() || "ABC100").toUpperCase();
    paperCoupon.qty = Number(document.getElementById("genQty").value) || 0;
    paperCoupon.discountAmount = Number(document.getElementById("genDiscount").value) || 0;
    paperCoupon.minSpend = Number(document.getElementById("genMinSpend").value) || 0;
    paperCoupon.expiry = document.getElementById("genExpiry").value || paperCoupon.expiry;
    renderPaperCoupon();
  });
  wireToggle(document.getElementById("paperCombinableToggle"), (pick) => { paperCoupon.combinable = pick === "yes"; });

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
const onlineCoupon = { code: "SAVE100", minSpend: 500, discountAmount: 100, excluded: [], totalLimit: null, perCustomerLimit: 1, startDate: "2026-09-01", endDate: "2026-09-30", combinable: false };
let onlineLog = [
  { time: "09:14", customer: "ร้านยา A", order: "#A1502", verdict: "ok", note: "ใช้ครั้งที่ 1" },
  { time: "09:20", customer: "ร้านยา B", order: "#A1503", verdict: "ok", note: "ใช้ครั้งที่ 1" },
];
let onlineOrderSeq = 1503;

function usageCountFor(customer) {
  return onlineLog.filter((l) => l.customer === customer && l.verdict === "ok").length;
}

function totalUsedCount() {
  return onlineLog.filter((l) => l.verdict === "ok").length;
}

function renderOnlineCoupon() {
  const excludedContainer = document.getElementById("onlineExcludedList");
  renderChipList(excludedContainer, onlineCoupon.excluded, (idx) => { onlineCoupon.excluded.splice(idx, 1); renderOnlineCoupon(); });
  document.getElementById("onlineExcludedAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !onlineCoupon.excluded.includes(p)), null);

  const used = totalUsedCount();
  document.getElementById("onlineUsageSummary").textContent = onlineCoupon.totalLimit
    ? `ใช้ไปแล้ว ${fmt(used)} / ${fmt(onlineCoupon.totalLimit)} ครั้ง (รวมทุกคน)`
    : `ใช้ไปแล้ว ${fmt(used)} ครั้ง (ไม่จำกัดจำนวนครั้งรวม)`;

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
  document.getElementById("onlineTotalLimit").oninput = (e) => { onlineCoupon.totalLimit = e.target.value === "" ? null : Number(e.target.value); renderOnlineCoupon(); };
  const perLimitInput = document.getElementById("onlinePerCustomerLimit");
  perLimitInput.value = onlineCoupon.perCustomerLimit;
  perLimitInput.oninput = (e) => { onlineCoupon.perCustomerLimit = Number(e.target.value) || 1; };
  document.getElementById("onlineStart").value = onlineCoupon.startDate;
  document.getElementById("onlineStart").onchange = (e) => { onlineCoupon.startDate = e.target.value; };
  document.getElementById("onlineEnd").value = onlineCoupon.endDate;
  document.getElementById("onlineEnd").onchange = (e) => { onlineCoupon.endDate = e.target.value; };
  wireToggle(document.getElementById("onlineCombinableToggle"), (pick) => { onlineCoupon.combinable = pick === "yes"; });

  wireAddRow(document.getElementById("onlineExcludedAddSelect"), document.getElementById("onlineExcludedAddBtn"), (v) => {
    onlineCoupon.excluded.push(v);
    renderOnlineCoupon();
  });

  document.getElementById("onlineTrySubmit").addEventListener("click", () => {
    const customer = document.getElementById("onlineTryCustomer").value.trim();
    if (!customer) return;
    onlineOrderSeq += 1;
    const used = usageCountFor(customer);
    const totalUsed = totalUsedCount();
    const now = new Date();
    const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    if (onlineCoupon.totalLimit && totalUsed >= onlineCoupon.totalLimit) {
      onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, verdict: "blocked", note: `โค้ดหมดโควตารวมแล้ว (${onlineCoupon.totalLimit} ครั้ง)` });
    } else if (used >= onlineCoupon.perCustomerLimit) {
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
  maxDiscountCap: null,
  excluded: [],
  minSpend: 0,
  quotaTotal: 500,
  perCustomerLimit: 1,
  combinable: true,
  collectStart: "2026-09-01",
  collectEnd: "2026-09-15",
  expiryMode: "fixed",
  expiryDate: "2026-09-30",
  expiryDays: 14,
};

function renderWallet() {
  document.getElementById("walletValueField").hidden = walletCoupon.discountType === "freeship";
  document.getElementById("walletCapField").hidden = walletCoupon.discountType !== "percent";
  document.getElementById("walletTicketTitle").textContent = walletCoupon.name;
  const capText = walletCoupon.discountType === "percent" && walletCoupon.maxDiscountCap ? ` (สูงสุด ฿${fmt(walletCoupon.maxDiscountCap)})` : "";
  const desc = walletCoupon.discountType === "freeship"
    ? "ฟรีค่าส่งเฉพาะกลุ่มเข้าเงื่อนไข (มีข้อยกเว้น)"
    : `ลด ${walletCoupon.discountType === "percent" ? walletCoupon.discountValue + "%" + capText : "฿" + fmt(walletCoupon.discountValue)} เมื่อซื้อครบ ฿${fmt(walletCoupon.minSpend)}`;
  document.getElementById("walletTicketDesc").textContent = desc;

  const excludedContainer = document.getElementById("walletExcludedList");
  if (excludedContainer) {
    renderChipList(excludedContainer, walletCoupon.excluded, (idx) => { walletCoupon.excluded.splice(idx, 1); renderWallet(); });
    document.getElementById("walletExcludedAddSelect").innerHTML = selectHtml(PRODUCTS.filter((p) => !walletCoupon.excluded.includes(p)), null);
  }
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
  document.getElementById("walletDiscountValue").oninput = (e) => { walletCoupon.discountValue = Number(e.target.value) || 0; renderWallet(); };
  document.getElementById("walletMaxCap").oninput = (e) => { walletCoupon.maxDiscountCap = e.target.value === "" ? null : Number(e.target.value); renderWallet(); };
  wireAddRow(document.getElementById("walletExcludedAddSelect"), document.getElementById("walletExcludedAddBtn"), (v) => {
    walletCoupon.excluded.push(v);
    renderWallet();
  });

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
  wireToggle(document.getElementById("walletCombinableToggle"), (pick) => { walletCoupon.combinable = pick === "yes"; });

  renderWallet();
}

/* =========================================================
   7. คูปองรายเดือน
   ========================================================= */
const monthlyCoupon = { name: "สิทธิ์ส่งฟรีประจำเดือน", dayOfMonth: 1, audience: "สมาชิกพิเศษเท่านั้น", discountType: "freeship", discountValue: 0, minSpend: 0, combinable: true };

function renderMonthlyPreview() {
  const desc = monthlyCoupon.discountType === "freeship"
    ? "ส่งฟรีทั้งบิล"
    : `ลด ${monthlyCoupon.discountType === "percent" ? monthlyCoupon.discountValue + "%" : "฿" + fmt(monthlyCoupon.discountValue)}${monthlyCoupon.minSpend ? " เมื่อซื้อครบ ฿" + fmt(monthlyCoupon.minSpend) : ""}`;
  document.getElementById("monthlyPreviewDesc").textContent = `รอบนี้ให้: ${desc} · ออกทุกวันที่ ${monthlyCoupon.dayOfMonth}`;
  document.getElementById("monthlyValueField").hidden = monthlyCoupon.discountType === "freeship";
}

function bootMonthly() {
  document.getElementById("monthlyName").value = monthlyCoupon.name;
  document.getElementById("monthlyName").oninput = (e) => { monthlyCoupon.name = e.target.value; renderMonthlyPreview(); };

  const daySel = document.getElementById("monthlyDay");
  daySel.innerHTML = Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}"${d === monthlyCoupon.dayOfMonth ? " selected" : ""}>วันที่ ${d}</option>`).join("");
  daySel.onchange = (e) => { monthlyCoupon.dayOfMonth = Number(e.target.value); renderMonthlyPreview(); };

  const audSel = document.getElementById("monthlyAudience");
  audSel.innerHTML = selectHtml(["ทุกคน", "สมาชิกพิเศษเท่านั้น", "เฉพาะที่เคยซื้อเดือนก่อน"], monthlyCoupon.audience);
  audSel.onchange = (e) => { monthlyCoupon.audience = e.target.value; };

  wireToggle(document.getElementById("monthlyDiscountType"), (pick) => { monthlyCoupon.discountType = pick; renderMonthlyPreview(); });
  document.getElementById("monthlyDiscountValue").oninput = (e) => { monthlyCoupon.discountValue = Number(e.target.value) || 0; renderMonthlyPreview(); };
  document.getElementById("monthlyMinSpend").oninput = (e) => { monthlyCoupon.minSpend = Number(e.target.value) || 0; renderMonthlyPreview(); };
  wireToggle(document.getElementById("monthlyCombinableToggle"), (pick) => { monthlyCoupon.combinable = pick === "yes"; });
  renderMonthlyPreview();

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
const pointSettings = { spendPer: 100, pointsPer: 10, rounding: "floor" };
let redeemCatalog = [
  { name: "คูปองลด ฿50", type: "คูปอง", cost: 500, quota: null, active: true },
  { name: "คูปองส่งฟรี", type: "คูปอง", cost: 300, quota: null, active: true },
  { name: "ของแถมพรีเมียม", type: "สินค้า", cost: 1200, quota: 50, active: true },
  { name: "เครดิตเงินคืน ฿100", type: "เครดิต", cost: 1000, quota: null, active: false },
];

function renderPointRate() {
  const roundLabel = pointSettings.rounding === "floor" ? "ปัดเศษที่เหลือทิ้ง" : "ปัดพอยท์ใกล้เคียง";
  document.getElementById("pointRatePreview").textContent = `ทุกยอดซื้อ ฿${fmt(pointSettings.spendPer)} ได้ ${fmt(pointSettings.pointsPer)} พอยท์ · ยอดที่ไม่ลงตัว ${roundLabel} — เช่น ซื้อ ฿${fmt(pointSettings.spendPer * 1.5)} ได้ ${pointSettings.rounding === "floor" ? fmt(pointSettings.pointsPer) : fmt(Math.round(pointSettings.pointsPer * 1.5))} พอยท์`;
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
  wireToggle(document.getElementById("pointRoundingToggle"), (pick) => { pointSettings.rounding = pick; renderPointRate(); });
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
   9. แคมเปญ — รายการขั้นรางวัล เลือกเงื่อนไขปลดล็อกได้ 3 แบบต่อขั้น
   ========================================================= */
const MFIELD_TYPES = ["TEXT", "TEL", "NUMBER", "DATE", "SELECT"];

function seedMilestones() {
  return [
    {
      id: "cm1", name: "เครื่องวัดความดันโลหิตดิจิทัล", requiredAmount: 100000,
      conditionType: "amount", quotaTotal: 50,
      rewardType: "catalog", catalogItem: PRODUCTS[0], detail: "",
      combinable: true,
      requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
    },
    {
      id: "cm2", name: "ทริปสัมมนาเภสัชกรต่างประเทศ 3 วัน 2 คืน", requiredAmount: 500000,
      conditionType: "first_n", quotaTotal: 20,
      rewardType: "experience", catalogItem: "", detail: "รวมตั๋วเครื่องบิน ที่พัก และค่าลงทะเบียนสัมมนา",
      combinable: true,
      requiredFields: [{ label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" }, { label: "เบอร์ติดต่อ", type: "TEL" }],
    },
    {
      id: "cm3", name: "ตั๋วเครื่องบินไป-กลับต่างประเทศ 1 ที่นั่ง", requiredAmount: 1000000,
      conditionType: "raffle", winnersCount: 3, drawDate: "2026-12-31",
      rewardType: "experience", catalogItem: "", detail: "เลือกปลายทางได้ตามเงื่อนไขสายการบินคู่สัญญา",
      combinable: true,
      requiredFields: [{ label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" }, { label: "เลขหนังสือเดินทาง", type: "NUMBER" }],
    },
  ];
}
let milestones = seedMilestones();

function buildMilestoneFieldEditor(fields, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<label>ข้อมูลที่ต้องขอเพิ่มตอนลูกค้ากดรับสิทธิ์</label>`;
  const grp = document.createElement("div");
  grp.className = "chk-group";
  fields.forEach((f, idx) => {
    const pill = document.createElement("span");
    pill.className = "chk-pill";
    pill.innerHTML = `<b style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--ink-faint)">${f.type}</b> ${escapeHtml(f.label)}`;
    const rm = document.createElement("button");
    rm.type = "button"; rm.textContent = "×";
    rm.style.cssText = "border:none;background:transparent;color:var(--risk-ink);font-size:13px;line-height:1;padding:0;margin-left:2px;cursor:pointer;";
    rm.onclick = () => { fields.splice(idx, 1); onChange(); };
    pill.appendChild(rm);
    grp.appendChild(pill);
  });
  wrap.appendChild(grp);

  const addRow = document.createElement("div");
  addRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
  const typeSel = document.createElement("select");
  typeSel.style.cssText = "border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:6px 7px;font-size:11.5px;font-family:'IBM Plex Mono',monospace;flex:none;";
  MFIELD_TYPES.forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t; typeSel.appendChild(o); });
  const labelInput = document.createElement("input");
  labelInput.type = "text"; labelInput.placeholder = "ชื่อฟิลด์ เช่น เบอร์ติดต่อ";
  labelInput.style.cssText = "flex:1;min-width:0;border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:6px 8px;font-size:12px;";
  const addBtn = document.createElement("button");
  addBtn.type = "button"; addBtn.textContent = "+ เพิ่ม";
  addBtn.style.cssText = "border:none;background:var(--a);color:#fff;border-radius:6px;padding:6px 12px;font-size:12px;flex:none;";
  addBtn.onclick = () => {
    const label = labelInput.value.trim();
    if (!label) return;
    const field = { label, type: typeSel.value };
    if (typeSel.value === "SELECT") field.options = ["ตัวเลือก 1", "ตัวเลือก 2"];
    fields.push(field);
    onChange();
  };
  addRow.appendChild(typeSel); addRow.appendChild(labelInput); addRow.appendChild(addBtn);
  wrap.appendChild(addRow);
  return wrap;
}

function renderMilestones() {
  const el = document.getElementById("milestonesList");
  el.innerHTML = "";
  const sorted = [...milestones].sort((a, b) => a.requiredAmount - b.requiredAmount);

  sorted.forEach((m, idx) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">ขั้นที่ ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { milestones = milestones.filter((x) => x.id !== m.id); renderMilestones(); renderWheelMilestoneSelect(); };
    head.appendChild(del);
    card.appendChild(head);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>ยอดเกณฑ์ (บาท)</label></div><div class="field"><label>ชื่อรางวัล</label></div>`;
    const amtInput = document.createElement("input");
    amtInput.type = "number"; amtInput.value = m.requiredAmount; amtInput.step = 1000;
    amtInput.onchange = () => { m.requiredAmount = Number(amtInput.value) || 0; renderMilestones(); };
    row1.children[0].appendChild(amtInput);
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = m.name;
    nameInput.onchange = () => { m.name = nameInput.value; renderMilestones(); renderWheelMilestoneSelect(); };
    row1.children[1].appendChild(nameInput);
    card.appendChild(row1);

    // condition type — the 3-way rethink
    const condField = document.createElement("div");
    condField.className = "field"; condField.style.marginBottom = "8px";
    condField.innerHTML = `<label>เงื่อนไขปลดล็อก</label>`;
    const condToggle = document.createElement("div");
    condToggle.className = "type-toggle";
    [["amount", "🪜 ขั้นบันได (การันตี)"], ["first_n", "🏁 คนแรกที่ถึงเกณฑ์"], ["raffle", "🎰 สุ่มจับรางวัล"]].forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "type-btn" + (m.conditionType === val ? " active" : ""); b.textContent = label;
      b.onclick = () => {
        m.conditionType = val;
        if (val !== "raffle" && !m.quotaTotal) m.quotaTotal = 50;
        if (val === "raffle" && !m.winnersCount) { m.winnersCount = 3; m.drawDate = m.drawDate || "2026-12-31"; }
        renderMilestones(); renderWheelMilestoneSelect();
      };
      condToggle.appendChild(b);
    });
    condField.appendChild(condToggle);
    card.appendChild(condField);

    if (m.conditionType === "amount") {
      const hint = document.createElement("div");
      hint.className = "cond-hint";
      hint.textContent = "ลูกค้าทุกคนที่ถึงยอดได้รับสิทธิ์แน่นอน — จำนวนสิทธิ์ด้านล่างเป็นแค่เพดานความปลอดภัย";
      card.appendChild(hint);
      const qField = document.createElement("div");
      qField.className = "field"; qField.style.cssText = "margin-bottom:8px;max-width:220px";
      qField.innerHTML = `<label>จำนวนสิทธิ์ทั้งหมด</label>`;
      const qInput = document.createElement("input");
      qInput.type = "number"; qInput.min = 1; qInput.value = m.quotaTotal || 50;
      qInput.onchange = () => { m.quotaTotal = Math.max(1, Number(qInput.value) || 1); };
      qField.appendChild(qInput);
      card.appendChild(qField);
    } else if (m.conditionType === "first_n") {
      const qField = document.createElement("div");
      qField.className = "field"; qField.style.cssText = "margin-bottom:8px;max-width:260px";
      qField.innerHTML = `<label>จำนวนคนแรกที่รับสิทธิ์ได้</label>`;
      const qInput = document.createElement("input");
      qInput.type = "number"; qInput.min = 1; qInput.value = m.quotaTotal || 20;
      qInput.onchange = () => { m.quotaTotal = Math.max(1, Number(qInput.value) || 1); };
      qField.appendChild(qInput);
      card.appendChild(qField);
      const hint = document.createElement("div");
      hint.className = "cond-hint";
      hint.textContent = "แสดง \"เหลือ X/Y สิทธิ์\" กับลูกค้าตรงๆ ได้ เพราะเป็นกติกาที่โปร่งใสอยู่แล้ว";
      card.appendChild(hint);
    } else {
      const row = document.createElement("div");
      row.className = "field-row";
      row.innerHTML = `<div class="field"><label>จำนวนผู้โชคดีที่จะสุ่ม</label></div><div class="field"><label>วันที่ประกาศผล</label></div>`;
      const winInput = document.createElement("input");
      winInput.type = "number"; winInput.min = 1; winInput.value = m.winnersCount || 3;
      winInput.onchange = () => { m.winnersCount = Math.max(1, Number(winInput.value) || 1); };
      row.children[0].appendChild(winInput);
      const dateInput = document.createElement("input");
      dateInput.type = "date"; dateInput.value = m.drawDate || "";
      dateInput.onchange = () => { m.drawDate = dateInput.value; };
      row.children[1].appendChild(dateInput);
      card.appendChild(row);
      const hint = document.createElement("div");
      hint.className = "cond-hint";
      hint.innerHTML = `<b>ไม่แสดง</b> "เหลือกี่สิทธิ์" กับลูกค้า — แสดงแค่ "เข้าร่วมลุ้นแล้ว N คน" แทน ผู้โชคดีตัดสินด้วยการจับรางวัลวันที่ประกาศผลเท่านั้น`;
      card.appendChild(hint);
    }

    // reward type
    const typeField = document.createElement("div");
    typeField.className = "field"; typeField.style.marginBottom = "8px";
    typeField.innerHTML = `<label>ประเภทรางวัล</label>`;
    const toggle = document.createElement("div");
    toggle.className = "type-toggle";
    const catalogBtn = document.createElement("button");
    catalogBtn.type = "button"; catalogBtn.className = "type-btn" + (m.rewardType === "catalog" ? " active" : ""); catalogBtn.textContent = "🎁 สินค้าจากเว็บ";
    catalogBtn.onclick = () => { m.rewardType = "catalog"; if (!m.catalogItem) m.catalogItem = PRODUCTS[0]; renderMilestones(); };
    const expBtn = document.createElement("button");
    expBtn.type = "button"; expBtn.className = "type-btn" + (m.rewardType === "experience" ? " active" : ""); expBtn.textContent = "🎫 ของพิเศษนอกระบบ";
    expBtn.onclick = () => { m.rewardType = "experience"; renderMilestones(); };
    toggle.appendChild(catalogBtn); toggle.appendChild(expBtn);
    typeField.appendChild(toggle);
    card.appendChild(typeField);

    if (m.rewardType === "catalog") {
      const f = document.createElement("div");
      f.className = "field"; f.style.marginBottom = "8px";
      f.innerHTML = `<label>เลือกสินค้าในเว็บ</label>`;
      const sel = document.createElement("select");
      sel.innerHTML = selectHtml(PRODUCTS, m.catalogItem);
      sel.onchange = () => { m.catalogItem = sel.value; m.name = sel.value; renderMilestones(); renderWheelMilestoneSelect(); };
      f.appendChild(sel);
      card.appendChild(f);
    } else {
      const f = document.createElement("div");
      f.className = "field"; f.style.marginBottom = "8px";
      f.innerHTML = `<label>รายละเอียดของรางวัล</label>`;
      const ta = document.createElement("textarea");
      ta.value = m.detail;
      ta.oninput = () => { m.detail = ta.value; };
      f.appendChild(ta);
      card.appendChild(f);
    }

    card.appendChild(buildMilestoneFieldEditor(m.requiredFields, renderMilestones));

    // combinability
    const combField = document.createElement("div");
    combField.className = "field";
    combField.innerHTML = `<label>ใช้ร่วมกับโปรโมชั่น/คูปองอื่นพร้อมกันได้ไหม</label>`;
    const combToggle = document.createElement("div");
    combToggle.className = "type-toggle";
    const yesBtn = document.createElement("button");
    yesBtn.type = "button"; yesBtn.className = "type-btn" + (m.combinable ? " active" : ""); yesBtn.textContent = "ใช้ร่วมกันได้";
    yesBtn.onclick = () => { m.combinable = true; renderMilestones(); };
    const noBtn = document.createElement("button");
    noBtn.type = "button"; noBtn.className = "type-btn" + (!m.combinable ? " active" : ""); noBtn.textContent = "นับเฉพาะยอดซื้อเดี่ยวๆ";
    noBtn.onclick = () => { m.combinable = false; renderMilestones(); };
    combToggle.appendChild(yesBtn); combToggle.appendChild(noBtn);
    combField.appendChild(combToggle);
    card.appendChild(combField);

    el.appendChild(card);
  });
}

function addMilestone() {
  milestones.push({
    id: "cm_" + Math.random().toString(36).slice(2, 8),
    name: "รางวัลใหม่", requiredAmount: 50000,
    conditionType: "amount", quotaTotal: 50,
    rewardType: "catalog", catalogItem: PRODUCTS[0], detail: "",
    combinable: true,
    requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
  });
  renderMilestones();
  renderWheelMilestoneSelect();
}

function bootCondition() {
  renderMilestones();
  document.getElementById("addMilestoneBtn").addEventListener("click", addMilestone);
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

function renderWheelMilestoneSelect() {
  const sel = document.getElementById("wheelMilestoneSelect");
  if (!sel) return;
  const raffles = milestones.filter((m) => m.conditionType === "raffle");
  if (raffles.length === 0) {
    sel.innerHTML = `<option value="">— ไม่มีขั้นแบบสุ่มจับรางวัลตอนนี้ —</option>`;
    document.getElementById("wheelHub").textContent = "🎁";
    return;
  }
  sel.innerHTML = selectHtml(raffles.map((m) => m.name), null);
  document.getElementById("wheelHub").textContent = "🎁";
}

function bootWheel() {
  const disc = document.getElementById("wheelDisc");
  const legend = document.getElementById("wheelLegend");
  const btn = document.getElementById("wheelSpinBtn");
  const result = document.getElementById("wheelResult");
  if (!disc) return;

  renderWheelMilestoneSelect();
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

function bootAudienceSelects() {
  document.querySelectorAll(".audience-select").forEach((sel) => {
    sel.innerHTML = selectHtml(AUDIENCE_OPTIONS, "ลูกค้าทุกคน");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bootAudienceSelects();
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
