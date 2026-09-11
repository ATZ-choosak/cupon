/* admin.js — backend settings, fully wired: real input types, live state, live previews
   ค่าที่ตั้งทั้งหมดเก็บลง localStorage ผ่าน shared-state.js (pmpcSaveSettings) —
   เปิด index.html คู่กันไว้อีกแท็บ แก้ตรงนี้แล้วฝั่งลูกค้าจะ sync สดให้เอง (storage event) */

const PRODUCTS = PMPC_PRODUCT_NAMES;
const PRICE_MAP = PMPC_PRICE_MAP;
const CATEGORIES = PMPC_CATEGORIES;
const CATEGORY_ICONS = PMPC_CATEGORY_ICONS;
const BRANDS = PMPC_BRANDS;

const SETTINGS = pmpcLoadSettings();
function persist() { pmpcSaveSettings(SETTINGS); }

function fmt(n) { return Number(n).toLocaleString("th-TH"); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function selectHtml(options, selected) {
  return options.map((o) => `<option value="${escapeHtml(o)}"${o === selected ? " selected" : ""}>${escapeHtml(o)}</option>`).join("");
}

/* reusable removable-chip list, e.g. "สินค้าคู่", "สินค้ายกเว้น", "ลูกค้าบางคน" */
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

/* reusable: "กลุ่มลูกค้าเป้าหมาย" — ทุกคน / บางคน (พิมพ์รายชื่อเพิ่มเอง) */
function renderAudienceField(container, obj, onChange) {
  if (!obj.audienceType) obj.audienceType = "all";
  if (!obj.audienceCustomers) obj.audienceCustomers = [];
  container.innerHTML = "";
  const label = document.createElement("label");
  label.textContent = "กลุ่มลูกค้าเป้าหมาย";
  container.appendChild(label);

  const toggle = document.createElement("div");
  toggle.className = "type-toggle";
  const allBtn = document.createElement("button");
  allBtn.type = "button"; allBtn.className = "type-btn" + (obj.audienceType !== "some" ? " active" : ""); allBtn.textContent = "ลูกค้าทุกคน";
  allBtn.onclick = () => { obj.audienceType = "all"; renderAudienceField(container, obj, onChange); onChange(); };
  const someBtn = document.createElement("button");
  someBtn.type = "button"; someBtn.className = "type-btn" + (obj.audienceType === "some" ? " active" : ""); someBtn.textContent = "ลูกค้าบางคน";
  someBtn.onclick = () => { obj.audienceType = "some"; renderAudienceField(container, obj, onChange); onChange(); };
  toggle.appendChild(allBtn); toggle.appendChild(someBtn);
  container.appendChild(toggle);

  if (obj.audienceType === "some") {
    const chipWrap = document.createElement("div");
    chipWrap.className = "chk-group";
    chipWrap.style.marginTop = "8px";
    renderChipList(chipWrap, obj.audienceCustomers, (idx) => {
      obj.audienceCustomers.splice(idx, 1);
      renderAudienceField(container, obj, onChange);
      onChange();
    });
    container.appendChild(chipWrap);

    const addRow = document.createElement("div");
    addRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    const input = document.createElement("input");
    input.type = "text"; input.placeholder = "ชื่อ/รหัสลูกค้า เช่น ร้านยาสุขภาพดี สาขา 2";
    input.style.cssText = "flex:1;border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:6px 8px;font-size:12px;";
    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.textContent = "+ เพิ่ม";
    addBtn.style.cssText = "border:none;background:var(--a);color:#fff;border-radius:6px;padding:6px 12px;font-size:12px;";
    const doAdd = () => {
      const v = input.value.trim();
      if (!v) return;
      obj.audienceCustomers.push(v);
      input.value = "";
      renderAudienceField(container, obj, onChange);
      onChange();
    };
    addBtn.onclick = doAdd;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
    addRow.appendChild(input); addRow.appendChild(addBtn);
    container.appendChild(addRow);
    const hint = document.createElement("div");
    hint.className = "cond-hint";
    hint.textContent = "พิมพ์ชื่อ/รหัสลูกค้าแล้วกดเพิ่มทีละคน (mockup — ระบบจริงควรค้นหาจากฐานลูกค้า)";
    container.appendChild(hint);
  }
}

/* =========================================================
   1. โปรโมชั่นอัตโนมัติ — ไม่ต้องมีโค้ด รวม 3 กลไกเดิมไว้ setting เดียวกัน เพิ่มได้หลายกฎ
      targetMode="items": เจาะจงสินค้า (โครงจากหน้าตั้งค่า Bundle/ของแถมจริงของ pmpc)
      targetMode="group": ทั้งแบรนด์/หมวดหมู่ + ยอดขั้นต่ำ (เดิมคือ "ส่วนลดท้ายบิล")
      rewardType="discount": ลดราคาเฉพาะยอดของรายการที่เข้าเงื่อนไข (ไม่ใช่ทั้งบิล)
      rewardType="freeship": ฟรีค่าส่งเฉพาะรายการที่เข้าเงื่อนไขกฎนี้ (เดิมคือ "ส่งฟรีไม่ใช่คูปอง")
      กฎ targetMode="group" ที่แย่งกลุ่มสินค้าเดียวกัน ใช้ priority สูงสุดที่ผ่านเกณฑ์ชนะแค่ 1 กฎ ไม่บวกซ้อน
      ส่วนกฎ targetMode="items" ใช้ร่วมกับกฎอื่นได้เสมอ (คนละสินค้ากัน ไม่ชนกัน)
   ========================================================= */
let promotions = SETTINGS.promotions;
const DEMO_CART = ["พาราเซตามอล 500mg", "วิตามินซี 1000mg (Blackmores)", "ยาน้ำแก้ไอ", "เข็มฉีดยา (กล่อง)"];
const DEMO_BRAND_OF = { "พาราเซตามอล 500mg": "Generic", "วิตามินซี 1000mg (Blackmores)": "Blackmores", "ยาน้ำแก้ไอ": "Generic", "เข็มฉีดยา (กล่อง)": "Generic" };
const DEMO_CATEGORY_OF = { "พาราเซตามอล 500mg": "หมวดยาสามัญประจำบ้าน", "วิตามินซี 1000mg (Blackmores)": "หมวดวิตามิน/อาหารเสริม", "ยาน้ำแก้ไอ": "หมวดยาสามัญประจำบ้าน", "เข็มฉีดยา (กล่อง)": "หมวดเวชภัณฑ์" };

function promoPreviewCalc(promo) {
  let base = 0;
  const lines = [];
  if (promo.targetMode === "items") {
    promo.requiredItems.forEach((item) => {
      if (item.matchAnyUnit) { lines.push({ label: "สินค้าใดก็ได้ 1 รายการ (ไม่จำกัดเฉพาะเจาะจง)", price: null }); return; }
      const name = item.choices[0];
      if (!name) { lines.push({ label: "(ยังไม่เลือกสินค้า)", price: null }); return; }
      const qty = promo.conditionType === "QUANTITY" ? (item.requiredQuantity || 1) : 1;
      const price = (PRICE_MAP[name] || 0) * qty;
      base += price;
      const altNote = item.choices.length > 1 ? ` (หรืออีก ${item.choices.length - 1} ตัวเลือก)` : "";
      lines.push({ label: name + (qty > 1 ? ` × ${qty}` : "") + altNote, price });
    });
  } else {
    const matcher = promo.groupTargetType === "brand" ? (p) => DEMO_BRAND_OF[p] === promo.groupTarget : (p) => DEMO_CATEGORY_OF[p] === promo.groupTarget;
    const matched = DEMO_CART.filter(matcher);
    if (matched.length === 0) lines.push({ label: `(ไม่มีสินค้ากลุ่ม "${promo.groupTarget}" ในตะกร้าตัวอย่าง)`, price: null });
    matched.forEach((p) => { base += PRICE_MAP[p]; lines.push({ label: p, price: PRICE_MAP[p] }); });
  }
  const minSpend = promo.targetMode === "group" ? (promo.groupMinSpend || 0) : (promo.conditionType === "TOTAL_AMOUNT" ? (promo.totalAmount || 0) : 0);
  const qualifies = base >= minSpend;
  if (promo.rewardType === "freeship") return { lines, base, off: 0, result: base, qualifies, freeship: true };
  let off = qualifies ? (promo.discountType === "percent" ? Math.round(base * (promo.discountValue / 100)) : promo.discountValue) : 0;
  if (promo.discountType === "percent" && promo.maxDiscountCap) off = Math.min(off, promo.maxDiscountCap);
  off = Math.min(off, base);
  return { lines, base, off, result: Math.max(0, base - off), qualifies, freeship: false };
}

function buildRequiredItemsEditor(promo, onChange) {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "10px";
  wrap.innerHTML = `<label style="font-size:11px;color:var(--ink-faint);font-family:'IBM Plex Mono',monospace;display:block;margin-bottom:6px">รายการสินค้าที่ต้องซื้อ (เพิ่มได้หลายรายการ แต่ละรายการเลือกได้หลายตัวเลือก)</label>`;
  promo.requiredItems.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "m-card";
    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">รายการที่ ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { promo.requiredItems.splice(idx, 1); onChange(); };
    head.appendChild(del);
    card.appendChild(head);

    if (promo.conditionType === "QUANTITY") {
      const qField = document.createElement("div");
      qField.className = "field"; qField.style.cssText = "margin-bottom:8px;max-width:200px";
      qField.innerHTML = `<label>จำนวนที่ต้องซื้อ</label>`;
      const qInput = document.createElement("input");
      qInput.type = "number"; qInput.min = 1; qInput.value = item.requiredQuantity;
      qInput.onchange = () => { item.requiredQuantity = Math.max(1, Number(qInput.value) || 1); onChange(); };
      qField.appendChild(qInput);
      card.appendChild(qField);
    } else {
      const mField = document.createElement("div");
      mField.className = "field"; mField.style.marginBottom = "8px";
      const pill = document.createElement("label");
      pill.className = "chk-pill";
      const chk = document.createElement("input");
      chk.type = "checkbox"; chk.checked = item.matchAnyUnit;
      chk.onchange = () => { item.matchAnyUnit = chk.checked; onChange(); };
      pill.appendChild(chk);
      pill.appendChild(document.createTextNode("จับคู่สินค้าใดก็ได้ (ไม่ระบุเจาะจง) — ใช้ยอดรวมของรายการนี้แทน"));
      mField.appendChild(pill);
      card.appendChild(mField);
    }

    if (!(promo.conditionType === "TOTAL_AMOUNT" && item.matchAnyUnit)) {
      const cField = document.createElement("div");
      cField.className = "field"; cField.style.marginBottom = "4px";
      cField.innerHTML = `<label>สินค้าที่นับเข้าเงื่อนไข (เลือกได้หลายตัวเลือก — อันใดอันหนึ่งก็ได้)</label>`;
      const chipWrap = document.createElement("div");
      chipWrap.className = "chk-group";
      renderChipList(chipWrap, item.choices, (cidx) => { item.choices.splice(cidx, 1); onChange(); });
      cField.appendChild(chipWrap);
      const addRow = document.createElement("div");
      addRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
      const sel = document.createElement("select");
      sel.style.cssText = "flex:1";
      sel.innerHTML = selectHtml(PRODUCTS.filter((p) => !item.choices.includes(p)), null);
      const addBtn = document.createElement("button");
      addBtn.type = "button"; addBtn.className = "fb-add"; addBtn.style.cssText = "width:auto;padding:0 12px";
      addBtn.textContent = "+";
      addBtn.onclick = () => { if (sel.value) { item.choices.push(sel.value); onChange(); } };
      addRow.appendChild(sel); addRow.appendChild(addBtn);
      cField.appendChild(addRow);
      card.appendChild(cField);
    }
    wrap.appendChild(card);
  });
  const addBtn = document.createElement("button");
  addBtn.className = "add-btn"; addBtn.type = "button"; addBtn.style.marginTop = "8px";
  addBtn.textContent = "+ เพิ่มรายการสินค้า";
  addBtn.onclick = () => { promo.requiredItems.push({ requiredQuantity: 1, matchAnyUnit: false, choices: [] }); onChange(); };
  wrap.appendChild(addBtn);
  return wrap;
}

function renderPromotionPreview(promo) {
  const { lines, base, off, result, qualifies, freeship } = promoPreviewCalc(promo);
  const wrap = document.createElement("div");
  wrap.style.marginTop = "14px";
  wrap.innerHTML = `<div class="preview-label">มุมมองลูกค้า (สด)</div>`;
  const frame = document.createElement("div");
  frame.className = "preview-frame"; frame.style.cssText = "flex-direction:column;gap:0;align-items:stretch";
  const list = document.createElement("div");
  lines.forEach((l) => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `<span>${escapeHtml(l.label)}</span><span class="num">${l.price === null ? "—" : "฿" + fmt(l.price)}</span>`;
    list.appendChild(row);
  });
  frame.appendChild(list);
  const strip = document.createElement("div");
  strip.className = "result-strip"; strip.style.marginTop = "12px";
  strip.textContent = freeship
    ? (qualifies ? `ยอดรายการที่เข้าเงื่อนไข ฿${fmt(base)} → ฟรีค่าส่งเฉพาะรายการนี้` : `ยอดรายการที่เข้าเงื่อนไข ฿${fmt(base)} — ยังไม่ถึงเกณฑ์ฟรีค่าส่ง`)
    : (qualifies && off > 0 ? `ยอดรายการที่เข้าเงื่อนไข ฿${fmt(base)} → ลด ฿${fmt(off)} → จ่ายเฉพาะส่วนนี้ ฿${fmt(result)}` : `ยอดรายการที่เข้าเงื่อนไข ฿${fmt(base)} (ยังไม่เข้าเงื่อนไข/ยังไม่ได้ตั้งส่วนลด)`);
  frame.appendChild(strip);
  const note = document.createElement("div");
  note.className = "cond-hint";
  note.textContent = freeship
    ? "ฟรีค่าส่งนี้คิดเฉพาะรายการที่อยู่ในเงื่อนไขด้านบนเท่านั้น ไม่ใช่ทั้งบิล"
    : "ส่วนลดนี้คิดเฉพาะยอดของรายการที่อยู่ในเงื่อนไขด้านบนเท่านั้น ไม่ใช่ทั้งบิล";
  frame.appendChild(note);
  wrap.appendChild(frame);
  return wrap;
}

function renderPromotions() {
  const el = document.getElementById("promotionsList");
  el.innerHTML = "";
  promotions.forEach((promo, idx) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">โปรที่ ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { promotions.splice(idx, 1); renderPromotions(); };
    head.appendChild(del);
    card.appendChild(head);

    const nameRow = document.createElement("div");
    nameRow.className = "field-row single";
    nameRow.innerHTML = `<div class="field"><label>ชื่อโปรโมชั่น</label></div>`;
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = promo.name;
    nameInput.oninput = () => { promo.name = nameInput.value; };
    nameRow.children[0].appendChild(nameInput);
    card.appendChild(nameRow);

    const condRow = document.createElement("div");
    condRow.className = "field-row single";
    condRow.innerHTML = `<div class="field"><label>เงื่อนไข (ข้อความอธิบายให้ลูกค้าเห็น)</label></div>`;
    const condTa = document.createElement("textarea");
    condTa.rows = 2; condTa.value = promo.condition;
    condTa.oninput = () => { promo.condition = condTa.value; };
    condRow.children[0].appendChild(condTa);
    card.appendChild(condRow);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>จำกัดจำนวนต่อคน (เว้นว่าง = ไม่จำกัด)</label></div><div class="field"><label>สถานะ</label></div>`;
    const quotaInput = document.createElement("input");
    quotaInput.type = "number"; quotaInput.min = 1; quotaInput.value = promo.quotaPerCustomer ?? "";
    quotaInput.oninput = () => { promo.quotaPerCustomer = quotaInput.value === "" ? null : Number(quotaInput.value); };
    row1.children[0].appendChild(quotaInput);
    const activeToggle = document.createElement("div");
    activeToggle.className = "type-toggle";
    const onBtn = document.createElement("button");
    onBtn.type = "button"; onBtn.className = "type-btn" + (promo.active ? " active" : ""); onBtn.textContent = "เปิดใช้งาน";
    onBtn.onclick = () => { promo.active = true; renderPromotions(); };
    const offBtn = document.createElement("button");
    offBtn.type = "button"; offBtn.className = "type-btn" + (!promo.active ? " active" : ""); offBtn.textContent = "ปิด";
    offBtn.onclick = () => { promo.active = false; renderPromotions(); };
    activeToggle.appendChild(onBtn); activeToggle.appendChild(offBtn);
    row1.children[1].appendChild(activeToggle);
    card.appendChild(row1);

    const tmField = document.createElement("div");
    tmField.className = "field"; tmField.style.marginBottom = "8px";
    tmField.innerHTML = `<label>เป้าหมาย</label>`;
    const tmToggle = document.createElement("div");
    tmToggle.className = "type-toggle";
    const itemsBtn = document.createElement("button");
    itemsBtn.type = "button"; itemsBtn.className = "type-btn" + (promo.targetMode === "items" ? " active" : ""); itemsBtn.textContent = "เจาะจงสินค้า";
    itemsBtn.onclick = () => { promo.targetMode = "items"; renderPromotions(); };
    const groupBtn = document.createElement("button");
    groupBtn.type = "button"; groupBtn.className = "type-btn" + (promo.targetMode === "group" ? " active" : ""); groupBtn.textContent = "แบรนด์/หมวดหมู่";
    groupBtn.onclick = () => { promo.targetMode = "group"; renderPromotions(); };
    tmToggle.appendChild(itemsBtn); tmToggle.appendChild(groupBtn);
    tmField.appendChild(tmToggle);
    card.appendChild(tmField);

    if (promo.targetMode === "items") {
      const ctField = document.createElement("div");
      ctField.className = "field"; ctField.style.marginBottom = "8px";
      ctField.innerHTML = `<label>ประเภทเงื่อนไข</label>`;
      const ctToggle = document.createElement("div");
      ctToggle.className = "type-toggle";
      const qBtn = document.createElement("button");
      qBtn.type = "button"; qBtn.className = "type-btn" + (promo.conditionType === "QUANTITY" ? " active" : ""); qBtn.textContent = "ตามจำนวนชิ้น";
      qBtn.onclick = () => { promo.conditionType = "QUANTITY"; renderPromotions(); };
      const taBtn = document.createElement("button");
      taBtn.type = "button"; taBtn.className = "type-btn" + (promo.conditionType === "TOTAL_AMOUNT" ? " active" : ""); taBtn.textContent = "ตามยอดรวม";
      taBtn.onclick = () => { promo.conditionType = "TOTAL_AMOUNT"; renderPromotions(); };
      ctToggle.appendChild(qBtn); ctToggle.appendChild(taBtn);
      ctField.appendChild(ctToggle);
      card.appendChild(ctField);

      if (promo.conditionType === "TOTAL_AMOUNT") {
        const taRow = document.createElement("div");
        taRow.className = "field-row single";
        taRow.innerHTML = `<div class="field"><label>ยอดรวมที่ต้องซื้อ (บาท)</label></div>`;
        const taInput = document.createElement("input");
        taInput.type = "number"; taInput.min = 0; taInput.value = promo.totalAmount || 0;
        taInput.oninput = () => { promo.totalAmount = Number(taInput.value) || 0; renderPromotions(); };
        taRow.children[0].appendChild(taInput);
        card.appendChild(taRow);
      }

      const stField = document.createElement("div");
      stField.className = "field"; stField.style.marginBottom = "8px";
      stField.innerHTML = `<label>บังคับหน่วยสินค้าให้ตรงเป๊ะ (strictUnit)</label>`;
      const stToggle = document.createElement("div");
      stToggle.className = "type-toggle";
      const stOn = document.createElement("button");
      stOn.type = "button"; stOn.className = "type-btn" + (promo.strictUnit ? " active" : ""); stOn.textContent = "เปิด";
      stOn.onclick = () => { promo.strictUnit = true; renderPromotions(); };
      const stOff = document.createElement("button");
      stOff.type = "button"; stOff.className = "type-btn" + (!promo.strictUnit ? " active" : ""); stOff.textContent = "ปิด";
      stOff.onclick = () => { promo.strictUnit = false; renderPromotions(); };
      stToggle.appendChild(stOn); stToggle.appendChild(stOff);
      stField.appendChild(stToggle);
      const stHint = document.createElement("div");
      stHint.className = "cond-hint";
      stHint.textContent = "เปิดไว้ถ้าไม่อยากให้ระบบแปลงหน่วยสินค้าอัตโนมัติ (เช่น กล่อง↔แผง) ตอนเช็คเงื่อนไข";
      stField.appendChild(stHint);
      card.appendChild(stField);

      card.appendChild(buildRequiredItemsEditor(promo, renderPromotions));
    } else {
      const gtRow = document.createElement("div");
      gtRow.className = "field-row";
      gtRow.innerHTML = `<div class="field"><label>ประเภทเป้าหมาย</label></div><div class="field"><label>เป้าหมาย</label></div>`;
      const gtSel = document.createElement("select");
      gtSel.innerHTML = `<option value="brand"${promo.groupTargetType === "brand" ? " selected" : ""}>แบรนด์</option><option value="category"${promo.groupTargetType === "category" ? " selected" : ""}>หมวดหมู่</option>`;
      gtSel.onchange = () => { promo.groupTargetType = gtSel.value; promo.groupTarget = (gtSel.value === "brand" ? BRANDS : CATEGORIES)[0]; renderPromotions(); };
      gtRow.children[0].appendChild(gtSel);
      const targetSel = document.createElement("select");
      targetSel.innerHTML = selectHtml(promo.groupTargetType === "brand" ? BRANDS : CATEGORIES, promo.groupTarget);
      targetSel.onchange = () => { promo.groupTarget = targetSel.value; renderPromotions(); };
      gtRow.children[1].appendChild(targetSel);
      card.appendChild(gtRow);

      const msRow = document.createElement("div");
      msRow.className = "field-row";
      msRow.innerHTML = `<div class="field"><label>ยอดขั้นต่ำ (บาท)</label></div><div class="field"><label>Priority (ชนกันแล้วเลขสูงชนะ)</label></div>`;
      const msInput = document.createElement("input");
      msInput.type = "number"; msInput.min = 0; msInput.value = promo.groupMinSpend;
      msInput.oninput = () => { promo.groupMinSpend = Number(msInput.value) || 0; };
      msRow.children[0].appendChild(msInput);
      const prInput = document.createElement("input");
      prInput.type = "number"; prInput.min = 0; prInput.value = promo.priority;
      prInput.oninput = () => { promo.priority = Number(prInput.value) || 0; };
      msRow.children[1].appendChild(prInput);
      card.appendChild(msRow);
      const grpHint = document.createElement("div");
      grpHint.className = "cond-hint";
      grpHint.textContent = "โปรแบบ \"แบรนด์/หมวดหมู่\" ที่แย่งกลุ่มสินค้าเดียวกันจะให้ priority สูงสุดที่ผ่านเกณฑ์ชนะแค่ 1 อัน ไม่บวกซ้อนกัน — ส่วนแบบ \"เจาะจงสินค้า\" ใช้ร่วมกับโปรอื่นได้เสมอ";
      card.appendChild(grpHint);
    }

    const rtField = document.createElement("div");
    rtField.className = "field"; rtField.style.cssText = "margin:14px 0 8px";
    rtField.innerHTML = `<label>ผลตอบแทน</label>`;
    const rtToggle = document.createElement("div");
    rtToggle.className = "type-toggle";
    const discBtn = document.createElement("button");
    discBtn.type = "button"; discBtn.className = "type-btn" + (promo.rewardType === "discount" ? " active" : ""); discBtn.textContent = "ส่วนลด";
    discBtn.onclick = () => { promo.rewardType = "discount"; renderPromotions(); };
    const shipBtn = document.createElement("button");
    shipBtn.type = "button"; shipBtn.className = "type-btn" + (promo.rewardType === "freeship" ? " active" : ""); shipBtn.textContent = "ฟรีค่าส่ง";
    shipBtn.onclick = () => { promo.rewardType = "freeship"; renderPromotions(); };
    rtToggle.appendChild(discBtn); rtToggle.appendChild(shipBtn);
    rtField.appendChild(rtToggle);
    card.appendChild(rtField);

    if (promo.rewardType === "discount") {
      const dtField = document.createElement("div");
      dtField.className = "field"; dtField.style.marginBottom = "8px";
      dtField.innerHTML = `<label>ประเภทส่วนลด</label>`;
      const dtToggle = document.createElement("div");
      dtToggle.className = "type-toggle";
      const fixedBtn = document.createElement("button");
      fixedBtn.type = "button"; fixedBtn.className = "type-btn" + (promo.discountType === "fixed" ? " active" : ""); fixedBtn.textContent = "ลดราคาคงที่ (บาท)";
      fixedBtn.onclick = () => { promo.discountType = "fixed"; renderPromotions(); };
      const pctBtn = document.createElement("button");
      pctBtn.type = "button"; pctBtn.className = "type-btn" + (promo.discountType === "percent" ? " active" : ""); pctBtn.textContent = "ลดเป็นเปอร์เซ็นต์ (%)";
      pctBtn.onclick = () => { promo.discountType = "percent"; renderPromotions(); };
      dtToggle.appendChild(fixedBtn); dtToggle.appendChild(pctBtn);
      dtField.appendChild(dtToggle);
      card.appendChild(dtField);

      const valRow = document.createElement("div");
      valRow.className = "field-row";
      valRow.innerHTML = `<div class="field"><label>มูลค่าส่วนลด</label></div>` + (promo.discountType === "percent" ? `<div class="field"><label>ลดสูงสุดไม่เกิน (บาท, เว้นว่าง = ไม่จำกัด)</label></div>` : `<div></div>`);
      const valInput = document.createElement("input");
      valInput.type = "number"; valInput.min = 0; valInput.value = promo.discountValue;
      valInput.oninput = () => { promo.discountValue = Number(valInput.value) || 0; renderPromotions(); };
      valRow.children[0].appendChild(valInput);
      if (promo.discountType === "percent") {
        const capInput = document.createElement("input");
        capInput.type = "number"; capInput.min = 0; capInput.value = promo.maxDiscountCap ?? "";
        capInput.oninput = () => { promo.maxDiscountCap = capInput.value === "" ? null : Number(capInput.value); renderPromotions(); };
        valRow.children[1].appendChild(capInput);
      }
      card.appendChild(valRow);
    } else {
      const shipHint = document.createElement("div");
      shipHint.className = "cond-hint";
      shipHint.textContent = "ฟรีค่าส่งเฉพาะรายการที่เข้าเงื่อนไขโปรนี้เท่านั้น ไม่ใช่ทั้งบิล — สินค้าอื่นในตะกร้ายังคิดค่าส่งปกติ";
      card.appendChild(shipHint);
    }

    const dateRow = document.createElement("div");
    dateRow.className = "field-row";
    dateRow.innerHTML = `<div class="field"><label>เริ่มวันที่</label></div><div class="field"><label>ถึงวันที่ (เว้นว่าง = ไม่มีกำหนด)</label></div>`;
    const startInput = document.createElement("input");
    startInput.type = "date"; startInput.value = promo.startDate;
    startInput.onchange = () => { promo.startDate = startInput.value; };
    dateRow.children[0].appendChild(startInput);
    const endInput = document.createElement("input");
    endInput.type = "date"; endInput.value = promo.endDate;
    endInput.onchange = () => { promo.endDate = endInput.value; };
    dateRow.children[1].appendChild(endInput);
    card.appendChild(dateRow);

    const audField = document.createElement("div");
    audField.className = "field"; audField.style.marginTop = "10px";
    card.appendChild(audField);
    renderAudienceField(audField, promo, () => {});

    card.appendChild(renderPromotionPreview(promo));

    el.appendChild(card);
  });
}

function addPromotion() {
  promotions.push({
    id: "promo_" + Math.random().toString(36).slice(2, 8),
    name: "โปรโมชั่นใหม่", description: "", condition: "",
    active: true, quotaPerCustomer: null, strictUnit: false, startDate: "", endDate: "",
    targetMode: "group",
    conditionType: "QUANTITY", requiredItems: [], totalAmount: null,
    groupTargetType: "brand", groupTarget: BRANDS[0], groupMinSpend: 500, priority: 0,
    rewardType: "discount", discountType: "fixed", discountValue: 50, maxDiscountCap: null,
    audienceType: "all", audienceCustomers: [],
  });
  renderPromotions();
}

function bootPromotions() {
  document.getElementById("addPromotionBtn").addEventListener("click", addPromotion);
  renderPromotions();
}

/* =========================================================
   2. ลดกลุ่มสินค้าตามวัน (flash / campaign day)
   ========================================================= */
const flashSale = SETTINGS.flashSale;

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
  document.getElementById("flashActiveNote").textContent = flashSale.active
    ? "สถานะ (จำลอง): กำลังอยู่ในช่วงเวลาโปร — ลูกค้าเห็นราคานี้ตอนนี้"
    : "สถานะ (จำลอง): นอกช่วงเวลาโปร — ราคากลับปกติ";
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
  wireToggle(document.getElementById("flashActiveToggle"), (pick) => { flashSale.active = pick === "on"; renderFlash(); });

  document.getElementById("flashAddPercent").value = 20;
  document.getElementById("flashAddBtn").addEventListener("click", () => {
    const cat = document.getElementById("flashAddCategory").value;
    const pct = Number(document.getElementById("flashAddPercent").value) || 0;
    if (!cat) return;
    flashSale.groups.push({ target: cat, percent: pct });
    renderFlash();
  });

  renderAudienceField(document.getElementById("flashAudienceField"), flashSale, () => {});
  renderFlash();
}


/* =========================================================
   4. คูปองกระดาษ — สร้างได้หลายชุดพร้อมกัน (self-contained, ไม่ผูกกับ SETTINGS)
   ========================================================= */
let paperCoupons = [
  { id: "pc1", code: "ABC100", qty: 1000, discountAmount: 50, minSpend: 300, expiry: "2026-12-31" },
];
let paperClaims = [
  { shop: "ร้านยาสุขภาพดี สาขา 2", code: "ABC100", stubs: 47, status: "pending" },
  { shop: "ตัวแทนจำหน่าย เชียงใหม่", code: "ABC100", stubs: 112, status: "paid" },
  { shop: "ร้านยาสุขภาพดี สาขา 5", code: "ABC100", stubs: 30, status: "paid" },
];

function renderPaperCoupons() {
  const tbody = document.getElementById("paperCouponsBody");
  tbody.innerHTML = "";
  paperCoupons.forEach((pc, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${escapeHtml(pc.code)}</td>
      <td class="mono">${fmt(pc.qty)} ใบ</td>
      <td class="mono">฿${fmt(pc.discountAmount)}</td>
      <td class="mono">฿${fmt(pc.minSpend)}</td>
      <td class="mono">${escapeHtml(pc.expiry)}</td>
      <td></td>
    `;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { paperCoupons.splice(idx, 1); renderPaperCoupons(); };
    tr.children[5].appendChild(del);
    tbody.appendChild(tr);
  });

  const preview = paperCoupons[paperCoupons.length - 1];
  document.getElementById("pcCode").textContent = preview ? preview.code : "—";
  document.getElementById("pcValue").textContent = preview ? "ลด ฿" + fmt(preview.discountAmount) : "—";
  document.getElementById("pcMinSpendText").textContent = preview ? "เมื่อซื้อสินค้าครบ ฿" + fmt(preview.minSpend) : "";
  document.getElementById("pcExpiryText").textContent = preview ? "ใช้ได้ถึง " + preview.expiry : "";

  document.getElementById("paperAddCode").innerHTML = selectHtml(paperCoupons.map((p) => p.code), null);

  renderPaperClaims();
}

function renderPaperClaims() {
  const wrap = document.getElementById("paperClaimsBody");
  wrap.innerHTML = "";
  paperClaims.forEach((c, idx) => {
    const pc = paperCoupons.find((p) => p.code === c.code);
    const value = c.stubs * (pc ? pc.discountAmount : 0);
    const row = document.createElement("div");
    row.className = "cq-row";
    row.innerHTML = `<span>${escapeHtml(c.shop)}</span><span class="mono">${escapeHtml(c.code)}</span><span class="num">${c.stubs} ใบ</span><span class="num">฿${fmt(value)}</span>`;
    if (c.status === "pending") {
      const btn = document.createElement("button");
      btn.className = "cq-status pending"; btn.type = "button"; btn.textContent = "รอตรวจนับ";
      btn.onclick = () => { c.status = "paid"; renderPaperClaims(); };
      row.appendChild(btn);
    } else {
      const span = document.createElement("span");
      span.className = "cq-status paid"; span.textContent = "จ่ายเงินแล้ว";
      row.appendChild(span);
    }
    wrap.appendChild(row);
  });
}

function bootPaperCoupon() {
  document.getElementById("genQty").value = 1000;
  document.getElementById("genDiscount").value = 50;
  document.getElementById("genMinSpend").value = 300;
  document.getElementById("genExpiry").value = "2026-12-31";

  document.getElementById("genBtn").addEventListener("click", () => {
    const code = (document.getElementById("genCode").value.trim() || "CODE" + (paperCoupons.length + 1)).toUpperCase();
    const qty = Number(document.getElementById("genQty").value) || 0;
    const discountAmount = Number(document.getElementById("genDiscount").value) || 0;
    const minSpend = Number(document.getElementById("genMinSpend").value) || 0;
    const expiry = document.getElementById("genExpiry").value || "2026-12-31";
    paperCoupons.push({ id: "pc_" + Math.random().toString(36).slice(2, 8), code, qty, discountAmount, minSpend, expiry });
    document.getElementById("genOut").innerHTML = `สร้างแล้ว: โค้ด ${escapeHtml(code)} × ${fmt(qty)} ใบ<br>สถานะ: พร้อมส่งไฟล์พิมพ์`;
    document.getElementById("genCode").value = "";
    renderPaperCoupons();
  });

  document.getElementById("paperAddBtn").addEventListener("click", () => {
    const shop = document.getElementById("paperAddShop").value.trim();
    const code = document.getElementById("paperAddCode").value;
    const stubs = Number(document.getElementById("paperAddStubs").value) || 0;
    if (!shop || !code || stubs <= 0) return;
    paperClaims.unshift({ shop, code, stubs, status: "pending" });
    document.getElementById("paperAddShop").value = "";
    document.getElementById("paperAddStubs").value = "";
    renderPaperClaims();
  });

  renderPaperCoupons();
}

/* =========================================================
   5. คูปองออนไลน์ (ไม่ unique) — สร้างได้หลายโค้ดพร้อมกัน, ทดลองใช้โค้ดจริงกับ log
   ========================================================= */
let onlineCoupons = SETTINGS.onlineCoupons;
let onlineLog = [
  { time: "09:14", customer: "ร้านยา A", order: "#A1502", code: "SAVE100", verdict: "ok", note: "ใช้ครั้งที่ 1" },
  { time: "09:20", customer: "ร้านยา B", order: "#A1503", code: "SAVE100", verdict: "ok", note: "ใช้ครั้งที่ 1" },
];
let onlineOrderSeq = 1503;

function usageCountFor(customer, code) {
  return onlineLog.filter((l) => l.customer === customer && l.code === code && l.verdict === "ok").length;
}
function totalUsedCount(code) {
  return onlineLog.filter((l) => l.code === code && l.verdict === "ok").length;
}

function renderOnlineCoupons() {
  const el = document.getElementById("onlineCouponsList");
  el.innerHTML = "";
  onlineCoupons.forEach((oc, idx) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">โค้ดที่ ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { onlineCoupons.splice(idx, 1); renderOnlineCoupons(); };
    head.appendChild(del);
    card.appendChild(head);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>โค้ด (พิมพ์เองได้ ไม่บังคับ unique)</label></div><div class="field"><label>ยอดขั้นต่ำ (บาท)</label></div>`;
    const codeInput = document.createElement("input");
    codeInput.type = "text"; codeInput.value = oc.code;
    codeInput.onchange = () => { oc.code = codeInput.value.trim().toUpperCase() || oc.code; renderOnlineCoupons(); };
    row1.children[0].appendChild(codeInput);
    const minInput = document.createElement("input");
    minInput.type = "number"; minInput.value = oc.minSpend; minInput.min = 0;
    minInput.oninput = () => { oc.minSpend = Number(minInput.value) || 0; };
    row1.children[1].appendChild(minInput);
    card.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "field-row";
    row2.innerHTML = `<div class="field"><label>ส่วนลด (บาท)</label></div><div class="field"><label>จำกัดจำนวนครั้งใช้ทั้งหมด (เว้นว่าง = ไม่จำกัด)</label></div>`;
    const discInput = document.createElement("input");
    discInput.type = "number"; discInput.value = oc.discountAmount; discInput.min = 0;
    discInput.oninput = () => { oc.discountAmount = Number(discInput.value) || 0; };
    row2.children[0].appendChild(discInput);
    const totalInput = document.createElement("input");
    totalInput.type = "number"; totalInput.value = oc.totalLimit ?? ""; totalInput.min = 1;
    totalInput.oninput = () => { oc.totalLimit = totalInput.value === "" ? null : Number(totalInput.value); renderOnlineUsageSummary(); };
    row2.children[1].appendChild(totalInput);
    card.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "field-row";
    row3.innerHTML = `<div class="field"><label>จำกัดจำนวนครั้งต่อคน</label></div><div class="field"><label>เริ่มใช้ได้</label></div>`;
    const perInput = document.createElement("input");
    perInput.type = "number"; perInput.value = oc.perCustomerLimit; perInput.min = 1;
    perInput.oninput = () => { oc.perCustomerLimit = Number(perInput.value) || 1; };
    row3.children[0].appendChild(perInput);
    const startInput = document.createElement("input");
    startInput.type = "date"; startInput.value = oc.startDate;
    startInput.onchange = () => { oc.startDate = startInput.value; };
    row3.children[1].appendChild(startInput);
    card.appendChild(row3);

    const row4 = document.createElement("div");
    row4.className = "field-row single";
    row4.innerHTML = `<div class="field"><label>ใช้ได้ถึง</label></div>`;
    const endInput = document.createElement("input");
    endInput.type = "date"; endInput.value = oc.endDate;
    endInput.onchange = () => { oc.endDate = endInput.value; };
    row4.children[0].appendChild(endInput);
    card.appendChild(row4);

    const exField = document.createElement("div");
    exField.className = "field"; exField.style.marginTop = "6px";
    exField.innerHTML = `<label>ยกเว้นสินค้า</label>`;
    const exChip = document.createElement("div");
    exChip.className = "chk-group";
    renderChipList(exChip, oc.excluded, (i) => { oc.excluded.splice(i, 1); renderOnlineCoupons(); });
    exField.appendChild(exChip);
    const exAddRow = document.createElement("div");
    exAddRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    const exSel = document.createElement("select");
    exSel.style.flex = "1";
    exSel.innerHTML = selectHtml(PRODUCTS.filter((p) => !oc.excluded.includes(p)), null);
    const exBtn = document.createElement("button");
    exBtn.type = "button"; exBtn.className = "fb-add"; exBtn.style.cssText = "width:auto;padding:0 12px"; exBtn.textContent = "+";
    exBtn.onclick = () => { if (exSel.value) { oc.excluded.push(exSel.value); renderOnlineCoupons(); } };
    exAddRow.appendChild(exSel); exAddRow.appendChild(exBtn);
    exField.appendChild(exAddRow);
    card.appendChild(exField);

    const audField = document.createElement("div");
    audField.className = "field"; audField.style.marginTop = "10px";
    card.appendChild(audField);
    renderAudienceField(audField, oc, () => {});

    el.appendChild(card);
  });

  const trySel = document.getElementById("onlineTryCode");
  if (trySel) trySel.innerHTML = selectHtml(onlineCoupons.map((c) => c.code), null);

  renderOnlineUsageSummary();
  renderOnlineLog();
}

function addOnlineCoupon() {
  onlineCoupons.push({
    id: "onl_" + Math.random().toString(36).slice(2, 8),
    code: "NEWCODE" + (onlineCoupons.length + 1), minSpend: 500, discountAmount: 50, excluded: [],
    totalLimit: null, perCustomerLimit: 1, startDate: "", endDate: "", audienceType: "all", audienceCustomers: [], usedTotal: 0,
  });
  renderOnlineCoupons();
}

function renderOnlineUsageSummary() {
  const el = document.getElementById("onlineUsageSummary");
  if (onlineCoupons.length === 0) { el.textContent = "ยังไม่มีโค้ดออนไลน์ — เพิ่มด้านบนก่อน"; return; }
  el.innerHTML = onlineCoupons.map((oc) => {
    const used = totalUsedCount(oc.code);
    return `<b class="mono">${escapeHtml(oc.code)}</b>: ใช้ไปแล้ว ${fmt(used)}${oc.totalLimit ? " / " + fmt(oc.totalLimit) : ""} ครั้ง (รวมทุกคน)`;
  }).join("<br>");
}

function renderOnlineLog() {
  const tbody = document.getElementById("onlineLogBody");
  tbody.innerHTML = "";
  onlineLog.forEach((l) => {
    const tr = document.createElement("tr");
    if (l.verdict === "blocked") tr.className = "blocked";
    tr.innerHTML = `<td>${escapeHtml(l.time)}</td><td>${escapeHtml(l.customer)}</td><td class="mono">${escapeHtml(l.code)}</td><td class="mono">${escapeHtml(l.order)}</td><td><span class="log-verdict ${l.verdict === "ok" ? "ok" : "blocked"}">${l.verdict === "ok" ? "ผ่าน — " : "บล็อก — "}${escapeHtml(l.note)}</span></td>`;
    tbody.appendChild(tr);
  });
}

function bootOnlineCoupon() {
  document.getElementById("addOnlineCouponBtn").addEventListener("click", addOnlineCoupon);

  document.getElementById("onlineTrySubmit").addEventListener("click", () => {
    const customer = document.getElementById("onlineTryCustomer").value.trim();
    const code = (document.getElementById("onlineTryCode").value || "").toUpperCase();
    if (!customer || !code) return;
    const oc = onlineCoupons.find((c) => c.code.toUpperCase() === code);
    onlineOrderSeq += 1;
    const now = new Date();
    const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    if (!oc) {
      onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, code, verdict: "blocked", note: "ไม่พบโค้ดนี้" });
    } else {
      const used = usageCountFor(customer, oc.code);
      const totalUsed = totalUsedCount(oc.code);
      if (oc.totalLimit && totalUsed >= oc.totalLimit) {
        onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, code: oc.code, verdict: "blocked", note: `โค้ดหมดโควตารวมแล้ว (${oc.totalLimit} ครั้ง)` });
      } else if (used >= oc.perCustomerLimit) {
        onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, code: oc.code, verdict: "blocked", note: `เกินโควตาต่อคน (${oc.perCustomerLimit})` });
      } else {
        onlineLog.unshift({ time, customer, order: "#A" + onlineOrderSeq, code: oc.code, verdict: "ok", note: `ใช้ครั้งที่ ${used + 1}` });
      }
    }
    renderOnlineUsageSummary();
    renderOnlineLog();
  });

  renderOnlineCoupons();
}

/* =========================================================
   6. คูปองเก็บล่วงหน้า / แจกอัตโนมัติทุกเดือน — สร้างได้หลายใบพร้อมกัน
      แต่ละใบเลือกรูปแบบการแจกอิสระจากกัน (กดรับเอง หรือแจกอัตโนมัติทุกเดือน)
   ========================================================= */
let collectibleCoupons = SETTINGS.collectibleCoupons;

function collectibleDescText(c) {
  const cap = c.discountType === "percent" && c.maxDiscountCap ? ` (สูงสุด ฿${fmt(c.maxDiscountCap)})` : "";
  return c.discountType === "freeship"
    ? "ฟรีค่าส่งเฉพาะกลุ่มเข้าเงื่อนไข (มีข้อยกเว้น)"
    : `ลด ${c.discountType === "percent" ? c.discountValue + "%" + cap : "฿" + fmt(c.discountValue)} เมื่อซื้อครบ ฿${fmt(c.minSpend)}`;
}

function renderCollectibleCoupons() {
  const el = document.getElementById("collectibleCouponsList");
  el.innerHTML = "";
  collectibleCoupons.forEach((cc, idx) => {
    const isAuto = cc.distributionMode === "auto_monthly";
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">ใบที่ ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { collectibleCoupons.splice(idx, 1); renderCollectibleCoupons(); };
    head.appendChild(del);
    card.appendChild(head);

    const distField = document.createElement("div");
    distField.className = "field"; distField.style.marginBottom = "8px";
    distField.innerHTML = `<label>รูปแบบการแจก</label>`;
    const distToggle = document.createElement("div");
    distToggle.className = "type-toggle";
    const manualBtn = document.createElement("button");
    manualBtn.type = "button"; manualBtn.className = "type-btn" + (!isAuto ? " active" : ""); manualBtn.textContent = "เปิดให้กดรับเอง";
    manualBtn.onclick = () => { cc.distributionMode = "manual"; renderCollectibleCoupons(); };
    const autoBtn = document.createElement("button");
    autoBtn.type = "button"; autoBtn.className = "type-btn" + (isAuto ? " active" : ""); autoBtn.textContent = "แจกอัตโนมัติทุกเดือน";
    autoBtn.onclick = () => { cc.distributionMode = "auto_monthly"; renderCollectibleCoupons(); };
    distToggle.appendChild(manualBtn); distToggle.appendChild(autoBtn);
    distField.appendChild(distToggle);
    card.appendChild(distField);

    const nameRow = document.createElement("div");
    nameRow.className = "field-row single";
    nameRow.innerHTML = `<div class="field"><label>ชื่อคูปอง/สิทธิ์</label></div>`;
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = cc.name;
    nameInput.oninput = () => { cc.name = nameInput.value; };
    nameRow.children[0].appendChild(nameInput);
    card.appendChild(nameRow);

    const dtField = document.createElement("div");
    dtField.className = "field"; dtField.style.marginBottom = "8px";
    dtField.innerHTML = `<label>ประเภทส่วนลด</label>`;
    const dtToggle = document.createElement("div");
    dtToggle.className = "type-toggle";
    [["freeship", "ส่งฟรี"], ["fixed", "ลดราคาคงที่"], ["percent", "ลดเปอร์เซ็นต์"]].forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "type-btn" + (cc.discountType === val ? " active" : ""); b.textContent = label;
      b.onclick = () => { cc.discountType = val; renderCollectibleCoupons(); };
      dtToggle.appendChild(b);
    });
    dtField.appendChild(dtToggle);
    card.appendChild(dtField);

    if (cc.discountType !== "freeship") {
      const valRow = document.createElement("div");
      valRow.className = "field-row";
      valRow.innerHTML = `<div class="field"><label>มูลค่าส่วนลด</label></div>` + (cc.discountType === "percent" ? `<div class="field"><label>ลดสูงสุดไม่เกิน (บาท)</label></div>` : `<div></div>`);
      const valInput = document.createElement("input");
      valInput.type = "number"; valInput.value = cc.discountValue; valInput.min = 0;
      valInput.oninput = () => { cc.discountValue = Number(valInput.value) || 0; };
      valRow.children[0].appendChild(valInput);
      if (cc.discountType === "percent") {
        const capInput = document.createElement("input");
        capInput.type = "number"; capInput.value = cc.maxDiscountCap ?? ""; capInput.min = 0;
        capInput.oninput = () => { cc.maxDiscountCap = capInput.value === "" ? null : Number(capInput.value); };
        valRow.children[1].appendChild(capInput);
      }
      card.appendChild(valRow);
    }

    const minRow = document.createElement("div");
    minRow.className = "field-row single";
    minRow.innerHTML = `<div class="field"><label>ยอดขั้นต่ำ (บาท)</label></div>`;
    const minInput = document.createElement("input");
    minInput.type = "number"; minInput.value = cc.minSpend; minInput.min = 0;
    minInput.oninput = () => { cc.minSpend = Number(minInput.value) || 0; };
    minRow.children[0].appendChild(minInput);
    card.appendChild(minRow);

    const exField = document.createElement("div");
    exField.className = "field"; exField.style.marginBottom = "8px";
    exField.innerHTML = `<label>ยกเว้นสินค้า</label>`;
    const exChip = document.createElement("div");
    exChip.className = "chk-group";
    renderChipList(exChip, cc.excluded, (i) => { cc.excluded.splice(i, 1); renderCollectibleCoupons(); });
    exField.appendChild(exChip);
    const exAddRow = document.createElement("div");
    exAddRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
    const exSel = document.createElement("select");
    exSel.style.flex = "1";
    exSel.innerHTML = selectHtml(PRODUCTS.filter((p) => !cc.excluded.includes(p)), null);
    const exBtn = document.createElement("button");
    exBtn.type = "button"; exBtn.className = "fb-add"; exBtn.style.cssText = "width:auto;padding:0 12px"; exBtn.textContent = "+";
    exBtn.onclick = () => { if (exSel.value) { cc.excluded.push(exSel.value); renderCollectibleCoupons(); } };
    exAddRow.appendChild(exSel); exAddRow.appendChild(exBtn);
    exField.appendChild(exAddRow);
    card.appendChild(exField);

    const qRow = document.createElement("div");
    qRow.className = "field-row";
    qRow.innerHTML = `<div class="field"><label>จำนวนสิทธิ์ทั้งหมด (เว้นว่าง = ไม่จำกัด)</label></div><div class="field"><label>จำกัดต่อคน (เว้นว่าง = ไม่จำกัด)</label></div>`;
    const quotaInput = document.createElement("input");
    quotaInput.type = "number"; quotaInput.value = cc.quotaTotal ?? ""; quotaInput.min = 1;
    quotaInput.oninput = () => { cc.quotaTotal = quotaInput.value === "" ? null : Number(quotaInput.value); };
    qRow.children[0].appendChild(quotaInput);
    const perInput = document.createElement("input");
    perInput.type = "number"; perInput.value = cc.perCustomerLimit ?? ""; perInput.min = 1;
    perInput.oninput = () => { cc.perCustomerLimit = perInput.value === "" ? null : Number(perInput.value); };
    qRow.children[1].appendChild(perInput);
    card.appendChild(qRow);

    if (!isAuto) {
      const dateRow = document.createElement("div");
      dateRow.className = "field-row";
      dateRow.innerHTML = `<div class="field"><label>เริ่มเก็บได้</label></div><div class="field"><label>เก็บได้ถึง</label></div>`;
      const csInput = document.createElement("input");
      csInput.type = "date"; csInput.value = cc.collectStart;
      csInput.onchange = () => { cc.collectStart = csInput.value; };
      dateRow.children[0].appendChild(csInput);
      const ceInput = document.createElement("input");
      ceInput.type = "date"; ceInput.value = cc.collectEnd;
      ceInput.onchange = () => { cc.collectEnd = ceInput.value; };
      dateRow.children[1].appendChild(ceInput);
      card.appendChild(dateRow);

      const expField = document.createElement("div");
      expField.className = "field"; expField.style.marginBottom = "8px";
      expField.innerHTML = `<label>การหมดอายุ</label>`;
      const expToggle = document.createElement("div");
      expToggle.className = "type-toggle";
      const fixedBtn = document.createElement("button");
      fixedBtn.type = "button"; fixedBtn.className = "type-btn" + (cc.expiryMode === "fixed" ? " active" : ""); fixedBtn.textContent = "วันที่ตายตัว";
      fixedBtn.onclick = () => { cc.expiryMode = "fixed"; renderCollectibleCoupons(); };
      const relBtn = document.createElement("button");
      relBtn.type = "button"; relBtn.className = "type-btn" + (cc.expiryMode === "relative" ? " active" : ""); relBtn.textContent = "นับจากวันเก็บ (กี่วัน)";
      relBtn.onclick = () => { cc.expiryMode = "relative"; renderCollectibleCoupons(); };
      expToggle.appendChild(fixedBtn); expToggle.appendChild(relBtn);
      expField.appendChild(expToggle);
      card.appendChild(expField);

      if (cc.expiryMode === "fixed") {
        const edRow = document.createElement("div");
        edRow.className = "field-row single";
        edRow.innerHTML = `<div class="field"><label>วันหมดอายุ</label></div>`;
        const edInput = document.createElement("input");
        edInput.type = "date"; edInput.value = cc.expiryDate;
        edInput.onchange = () => { cc.expiryDate = edInput.value; renderCollectibleCoupons(); };
        edRow.children[0].appendChild(edInput);
        card.appendChild(edRow);
      } else {
        const eDaysRow = document.createElement("div");
        eDaysRow.className = "field-row single";
        eDaysRow.innerHTML = `<div class="field"><label>จำนวนวันหลังเก็บ</label></div>`;
        const eDaysInput = document.createElement("input");
        eDaysInput.type = "number"; eDaysInput.value = cc.expiryDays; eDaysInput.min = 1;
        eDaysInput.oninput = () => { cc.expiryDays = Number(eDaysInput.value) || 1; renderCollectibleCoupons(); };
        eDaysRow.children[0].appendChild(eDaysInput);
        card.appendChild(eDaysRow);
      }
      const hint = document.createElement("div");
      hint.className = "cond-hint";
      hint.textContent = "วันที่ตายตัวเหมาะกับแคมเปญช่วงเวลาจำกัด — นับจากวันเก็บเหมาะกับให้ลูกค้าใช้เมื่อไหร่ก็ได้ ไม่ผูกปฏิทิน";
      card.appendChild(hint);
    } else {
      const dayRow = document.createElement("div");
      dayRow.className = "field-row single";
      dayRow.innerHTML = `<div class="field"><label>วันที่ออกสิทธิ์ในแต่ละเดือน</label></div>`;
      const daySel = document.createElement("select");
      daySel.innerHTML = Array.from({ length: 28 }, (_, i) => i + 1).map((d) => `<option value="${d}"${d === cc.dayOfMonth ? " selected" : ""}>วันที่ ${d}</option>`).join("");
      daySel.onchange = () => { cc.dayOfMonth = Number(daySel.value); };
      dayRow.children[0].appendChild(daySel);
      card.appendChild(dayRow);
      const hint = document.createElement("div");
      hint.className = "cond-hint";
      hint.textContent = "หมดอายุล็อกไว้ที่ \"สิ้นเดือนเดียวกันเสมอ\" ไม่ให้ตั้งเอง กันลูกค้ากักตุนสิทธิ์ข้ามเดือน";
      card.appendChild(hint);
    }

    const audField = document.createElement("div");
    audField.className = "field"; audField.style.marginTop = "10px";
    card.appendChild(audField);
    renderAudienceField(audField, cc, () => {});

    const previewWrap = document.createElement("div");
    previewWrap.style.marginTop = "14px";
    previewWrap.innerHTML = `<div class="preview-label">มุมมองลูกค้า (สด)</div>`;
    const qtyText = (cc.quotaTotal ? fmt(cc.quotaTotal) : "ไม่จำกัด") + " สิทธิ์" + (cc.perCustomerLimit ? " · คนละ " + cc.perCustomerLimit + " ใบ" : "");
    const expText = isAuto ? "หมดอายุสิ้นเดือนเดียวกันเสมอ" : (cc.expiryMode === "fixed" ? "ใช้ได้ถึง " + cc.expiryDate : "ใช้ได้ " + cc.expiryDays + " วันหลังเก็บ");
    const ticket = document.createElement("div");
    ticket.className = "ticket";
    ticket.innerHTML = `
      <span class="notch top"></span><span class="notch bottom"></span>
      <div class="main">
        <div class="t-title">${escapeHtml(cc.name)}</div>
        <div class="t-desc">${escapeHtml(collectibleDescText(cc))}</div>
        <div class="t-qty" style="margin-top:8px">${escapeHtml(qtyText)}</div>
      </div>
      <div class="stub"><span class="t-btn" style="background:var(--a);color:#fff;border-radius:20px;padding:6px 12px">เก็บ</span><span class="t-exp" style="margin-top:6px">${escapeHtml(expText)}</span></div>
    `;
    previewWrap.appendChild(ticket);
    if (isAuto) {
      const monthPreview = document.createElement("div");
      monthPreview.className = "month-strip"; monthPreview.style.marginTop = "10px";
      monthPreview.innerHTML = `<div class="month-cell now"><div class="mc-m">เดือนนี้</div><div class="mc-icon">🎁</div><div class="mc-s">ออกอัตโนมัติ</div></div>`;
      previewWrap.appendChild(monthPreview);
    }
    card.appendChild(previewWrap);

    el.appendChild(card);
  });
}

function addCollectibleCoupon() {
  collectibleCoupons.push({
    id: "col_" + Math.random().toString(36).slice(2, 8),
    name: "คูปองใหม่", discountType: "fixed", discountValue: 50, maxDiscountCap: null,
    excluded: [], minSpend: 0, quotaTotal: 100, quotaClaimed: 0, perCustomerLimit: 1,
    distributionMode: "manual", collectStart: "", collectEnd: "", expiryMode: "fixed", expiryDate: "", expiryDays: 14,
    dayOfMonth: 1, audienceType: "all", audienceCustomers: [],
  });
  renderCollectibleCoupons();
}

function bootCollectible() {
  document.getElementById("addCollectibleCouponBtn").addEventListener("click", addCollectibleCoupon);
  renderCollectibleCoupons();
}

/* =========================================================
   7. ระบบสะสมพอยท์
   ========================================================= */
const pointSettings = SETTINGS.pointSettings;
let redeemCatalog = SETTINGS.redeemCatalog;

function renderPointRate() {
  const roundLabel = pointSettings.rounding === "floor" ? "ปัดเศษที่เหลือทิ้ง" : "ปัดพอยท์ใกล้เคียง";
  document.getElementById("pointRatePreview").textContent = `ทุกยอดซื้อ ฿${fmt(pointSettings.spendPer)} ได้ ${fmt(pointSettings.pointsPer)} พอยท์ · ยอดที่ไม่ลงตัว ${roundLabel} — เช่น ซื้อ ฿${fmt(pointSettings.spendPer * 1.5)} ได้ ${pointSettings.rounding === "floor" ? fmt(pointSettings.pointsPer) : fmt(Math.round(pointSettings.pointsPer * 1.5))} พอยท์`;
}

function redeemRewardText(item) {
  if (item.type === "สินค้า") return "ของจริง — เข้าคิวจัดส่ง";
  if (item.discountType === "freeship") return "คูปองส่งฟรี (ทันที)";
  if (item.discountType === "percent") return `คูปองลด ${item.discountValue || 0}%${item.maxDiscountCap ? " (สูงสุด ฿" + fmt(item.maxDiscountCap) + ")" : ""} (ทันที)`;
  return `คูปองลด ฿${fmt(item.discountValue || 0)} (ทันที)`;
}

function renderRedeemCatalog() {
  const tbody = document.getElementById("redeemCatalogBody");
  tbody.innerHTML = "";
  redeemCatalog.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>${escapeHtml(redeemRewardText(item))}</td>
      <td class="mono">${fmt(item.cost)}</td>
      <td class="mono">${item.quota ? fmt(item.quota) : "ไม่จำกัด"}</td>
      <td></td><td></td>
    `;
    const statusBtn = document.createElement("button");
    statusBtn.className = "log-verdict " + (item.active ? "ok" : "blocked");
    statusBtn.style.cssText = "border:none;cursor:pointer;";
    statusBtn.textContent = item.active ? "เปิดใช้งาน" : "ปิดชั่วคราว";
    statusBtn.onclick = () => { item.active = !item.active; renderRedeemCatalog(); };
    tr.children[5].appendChild(statusBtn);

    const del = document.createElement("button");
    del.className = "del-btn"; del.type = "button"; del.textContent = "ลบ";
    del.onclick = () => { redeemCatalog.splice(idx, 1); renderRedeemCatalog(); };
    tr.children[6].appendChild(del);

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

  const redeemTypeSel = document.getElementById("redeemAddType");
  const redeemDiscTypeSel = document.getElementById("redeemAddDiscountType");
  const redeemDiscValInput = document.getElementById("redeemAddDiscountValue");
  const syncRedeemDiscountFields = () => {
    const isPhysical = redeemTypeSel.value === "สินค้า";
    redeemDiscTypeSel.hidden = isPhysical;
    redeemDiscValInput.hidden = isPhysical || redeemDiscTypeSel.value === "freeship";
  };
  redeemTypeSel.onchange = syncRedeemDiscountFields;
  redeemDiscTypeSel.onchange = syncRedeemDiscountFields;
  syncRedeemDiscountFields();

  document.getElementById("redeemAddBtn").addEventListener("click", () => {
    const name = document.getElementById("redeemAddName").value.trim();
    const type = redeemTypeSel.value;
    const cost = Number(document.getElementById("redeemAddCost").value) || 0;
    const quotaRaw = document.getElementById("redeemAddQuota").value;
    if (!name || cost <= 0) return;
    const item = { name, type, cost, quota: quotaRaw === "" ? null : Number(quotaRaw), active: true };
    if (type !== "สินค้า") {
      item.discountType = redeemDiscTypeSel.value;
      item.discountValue = item.discountType === "freeship" ? 0 : (Number(redeemDiscValInput.value) || 0);
      item.maxDiscountCap = null;
    }
    redeemCatalog.push(item);
    document.getElementById("redeemAddName").value = "";
    document.getElementById("redeemAddCost").value = "";
    document.getElementById("redeemAddQuota").value = "";
    redeemDiscValInput.value = "";
    renderRedeemCatalog();
  });

  renderRedeemCatalog();
}

/* =========================================================
   8. แคมเปญ — ขั้นบันไดล้วน ไม่มีเงื่อนไขปลดล็อกแยก
      "คนแรกถึงเกณฑ์" = ตั้งโควตาน้อย, "สุ่มจับรางวัล" = ไม่ตั้งโควตา + รางวัลนอกระบบ
      ทั้งสองแบบคือ milestone ปกติ ต่างกันแค่ค่าที่แอดมินตั้งเอง ไม่ใช่ mechanic แยก
   ========================================================= */
const MFIELD_TYPES = ["TEXT", "TEL", "NUMBER", "DATE", "SELECT"];

let milestones = SETTINGS.milestones;
let claimedDemo = {}; // milestone id -> จำนวนที่ถูกกดรับไปแล้ว (จำลอง, สำหรับปุ่ม "จำลองคนอื่นรับไปก่อน")

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
    del.onclick = () => { const i = milestones.findIndex((x) => x.id === m.id); if (i >= 0) milestones.splice(i, 1); renderMilestones(); };
    head.appendChild(del);
    card.appendChild(head);

    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `<div class="field"><label>ยอดเกณฑ์สะสม (บาท)</label></div><div class="field"><label>ชื่อรางวัล</label></div>`;
    const amtInput = document.createElement("input");
    amtInput.type = "number"; amtInput.value = m.requiredAmount; amtInput.step = 1000;
    amtInput.onchange = () => { m.requiredAmount = Number(amtInput.value) || 0; renderMilestones(); };
    row1.children[0].appendChild(amtInput);
    const nameInput = document.createElement("input");
    nameInput.type = "text"; nameInput.value = m.name;
    nameInput.onchange = () => { m.name = nameInput.value; renderMilestones(); };
    row1.children[1].appendChild(nameInput);
    card.appendChild(row1);

    const qField = document.createElement("div");
    qField.className = "field"; qField.style.cssText = "margin-bottom:8px;max-width:280px";
    qField.innerHTML = `<label>จำนวนสิทธิ์ทั้งหมด (เว้นว่าง = ไม่จำกัด)</label>`;
    const qInput = document.createElement("input");
    qInput.type = "number"; qInput.min = 1; qInput.value = m.quotaTotal ?? "";
    qInput.placeholder = "ไม่จำกัด";
    qInput.onchange = () => { m.quotaTotal = qInput.value === "" ? null : Math.max(1, Number(qInput.value) || 1); renderMilestones(); };
    qField.appendChild(qInput);
    card.appendChild(qField);
    const hint = document.createElement("div");
    hint.className = "cond-hint";
    hint.textContent = m.quotaTotal
      ? `ตั้งจำนวนน้อย = ลูกค้าจะแข่งกันแบบใครถึงก่อนได้ก่อน (ระบบโชว์ "เหลือ X/${m.quotaTotal} สิทธิ์" ให้ลูกค้าเห็นเอง)`
      : "ไม่จำกัดสิทธิ์ — ทุกคนที่ถึงยอดกดรับได้เสมอ (เหมาะกับของที่ต้องคัดเลือก/จับรางวัลกันเองนอกระบบภายหลัง เช่นตั๋วเครื่องบิน)";
    card.appendChild(hint);

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
      sel.onchange = () => { m.catalogItem = sel.value; m.name = sel.value; renderMilestones(); };
      f.appendChild(sel);
      card.appendChild(f);
    } else {
      const f = document.createElement("div");
      f.className = "field"; f.style.marginBottom = "8px";
      f.innerHTML = `<label>รายละเอียดของรางวัล (แอดมินพิมพ์เอง)</label>`;
      const ta = document.createElement("textarea");
      ta.value = m.detail;
      ta.oninput = () => { m.detail = ta.value; };
      f.appendChild(ta);
      card.appendChild(f);
    }

    card.appendChild(buildMilestoneFieldEditor(m.requiredFields, renderMilestones));

    // demo: มุมมองลูกค้าสั้นๆ + ปุ่มจำลองคนอื่นรับไปก่อน (ใช้ได้กับทุกขั้นที่มีโควตา)
    const claimed = claimedDemo[m.id] || 0;
    const remaining = m.quotaTotal ? Math.max(0, m.quotaTotal - claimed) : null;
    const demoRow = document.createElement("div");
    demoRow.className = "cond-hint";
    demoRow.style.marginTop = "6px";
    demoRow.textContent = remaining === null ? "มุมมองลูกค้า: ไม่จำกัดสิทธิ์ (จำลองไม่ต้องมีคนแย่ง)" : `มุมมองลูกค้า: เหลือ ${remaining}/${m.quotaTotal} สิทธิ์`;
    card.appendChild(demoRow);
    if (m.quotaTotal) {
      const simBtn = document.createElement("button");
      simBtn.type = "button"; simBtn.className = "fb-add"; simBtn.style.marginTop = "6px";
      simBtn.textContent = "+ จำลองคนอื่นรับไปก่อน 1 คน";
      simBtn.disabled = remaining <= 0;
      simBtn.onclick = () => { claimedDemo[m.id] = (claimedDemo[m.id] || 0) + 1; renderMilestones(); };
      card.appendChild(simBtn);
    }

    el.appendChild(card);
  });
}

function addMilestone() {
  milestones.push({
    id: "cm_" + Math.random().toString(36).slice(2, 8),
    name: "รางวัลใหม่", requiredAmount: 50000,
    quotaTotal: 50,
    rewardType: "catalog", catalogItem: PRODUCTS[0], detail: "",
    requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
  });
  renderMilestones();
}

function bootCondition() {
  renderMilestones();
  document.getElementById("addMilestoneBtn").addEventListener("click", addMilestone);
}

function bootResetButton() {
  const btn = document.getElementById("resetSettingsBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    pmpcResetSettings();
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bootPromotions();
  bootFlash();
  bootPaperCoupon();
  bootOnlineCoupon();
  bootCollectible();
  bootPoint();
  bootCondition();
  bootResetButton();

  // ค่าที่ตั้งทุกจุด (promotions/flashSale/onlineCoupons/collectibleCoupons/pointSettings/redeemCatalog/milestones)
  // เซฟลง localStorage เป็นระยะ ให้ index.html อ่านไปใช้ได้เสมอ ไม่ต้องดักทุก handler ทีละจุด
  setInterval(persist, 1000);
  window.addEventListener("beforeunload", persist);
});
