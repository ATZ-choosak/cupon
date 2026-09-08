/* จำลองการตั้งค่ารางวัลขั้นบันได (ระบบ B) — vanilla JS, ไม่ต้อง build ไม่ต้องมี server */

const SLIDER_MAX = 1200000;

const CATALOG_ITEMS = [
  "เครื่องวัดความดันโลหิตดิจิทัล",
  "เครื่องพ่นยาละอองพกพา",
  "เซ็ตกระเป๋ายาเดินทางพรีเมียม",
  "เครื่องวัดออกซิเจนปลายนิ้ว",
];

const FIELD_TYPES = ["TEXT", "TEL", "NUMBER", "DATE", "SELECT"];

const PRESETS = [
  { label: "0", value: 0 },
  { label: "41,000", value: 41000 },
  { label: "105,200 (ผ่านขั้น 1)", value: 105200 },
  { label: "430,200 (ใกล้ขั้น 2)", value: 430200 },
  { label: "505,200 (ผ่านขั้น 2)", value: 505200 },
  { label: "1,050,000 (ผ่านขั้น 3)", value: 1050000 },
];

function seedMilestones() {
  return [
    {
      id: "m1",
      requiredAmount: 100000,
      name: "เครื่องวัดความดันโลหิตดิจิทัล",
      type: "catalog",
      catalogItem: "เครื่องวัดความดันโลหิตดิจิทัล",
      detail: "",
      quotaTotal: 50,
      conditionType: "amount",
      requiredFields: [
        { label: "ที่อยู่จัดส่ง", type: "TEXT" },
        { label: "เบอร์ติดต่อ", type: "TEL" },
      ],
    },
    {
      id: "m2",
      requiredAmount: 500000,
      name: "ทริปสัมมนาเภสัชกรต่างประเทศ 3 วัน 2 คืน",
      type: "experience",
      catalogItem: "",
      detail: "รวมตั๋วเครื่องบิน ที่พัก และค่าลงทะเบียนสัมมนา",
      quotaTotal: 5,
      conditionType: "amount",
      requiredFields: [
        { label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" },
        { label: "เบอร์ติดต่อ", type: "TEL" },
        { label: "วันที่สะดวกเดินทาง", type: "DATE" },
      ],
    },
    {
      id: "m3",
      requiredAmount: 1000000,
      name: "ตั๋วเครื่องบินไป-กลับต่างประเทศ 1 ที่นั่ง",
      type: "experience",
      catalogItem: "",
      detail: "เลือกปลายทางได้ตามเงื่อนไขสายการบินคู่สัญญา",
      quotaTotal: 3,
      conditionType: "amount",
      requiredFields: [
        { label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" },
        { label: "เลขหนังสือเดินทาง", type: "NUMBER" },
        { label: "ปลายทางที่ต้องการ", type: "SELECT", options: ["ญี่ปุ่น", "เกาหลีใต้", "ไต้หวัน"] },
        { label: "เบอร์ติดต่อ", type: "TEL" },
      ],
    },
    {
      id: "m4",
      requiredAmount: 50000,
      name: "ของรางวัลพิเศษรุ่นลิมิเต็ด",
      type: "catalog",
      catalogItem: CATALOG_ITEMS[1],
      detail: "",
      quotaTotal: 100,
      conditionType: "first_n",
      requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
    },
  ];
}

let milestones = seedMilestones();
let currentAmount = 0;
let claimedIds = new Set();      // milestone id -> ปลดล็อกและกดขอรับแล้ว (ของลูกค้าจำลองรายนี้)
function seedQuotaClaimed() { return { m4: 43 }; } // m4 = "คนแรกที่ถึงเกณฑ์" ตัวอย่าง เริ่มมีคนอื่นถึงแล้ว 43 คน
let quotaClaimed = seedQuotaClaimed();  // milestone id -> จำนวนสิทธิ์ที่ถูกใช้ไปแล้ว (รวมทุกคน, จำลอง)
let openClaimFormId = null;      // milestone id ที่กำลังกางฟอร์มขอรับอยู่
let queue = [];                  // รายการคำขอ {id, seq, milestoneName, type, fields, time}
let seq = 0;

function fmt(n) { return Number(n).toLocaleString("th-TH"); }
function uid() { return "m_" + Math.random().toString(36).slice(2, 9); }

/* ---------------- amount control ---------------- */

function setAmount(v) {
  v = Math.max(0, Math.min(SLIDER_MAX, Math.round(v)));
  currentAmount = v;
  document.getElementById("amountSlider").value = v;
  document.getElementById("amountNumber").value = v;
  document.getElementById("amountDisplay").textContent = fmt(v);
  const pct = SLIDER_MAX ? Math.round((v / SLIDER_MAX) * 100) : 0;
  document.getElementById("amountPct").textContent = "  (" + pct + "% ของสเกล)";
  renderLadder();
  renderRewardCards();
}

function renderPresets() {
  const el = document.getElementById("presets");
  el.innerHTML = "";
  PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "preset-btn";
    b.textContent = "฿" + p.label;
    b.onclick = () => setAmount(p.value);
    el.appendChild(b);
  });
}

/* ---------------- ladder ---------------- */

function status(m) {
  const reached = currentAmount >= m.requiredAmount;
  if (claimedIds.has(m.id)) return "claimed";
  if (!reached) return "locked";
  const remaining = m.quotaTotal - (quotaClaimed[m.id] || 0);
  if (remaining <= 0) return "full";
  return "unlocked";
}

function renderLadder() {
  const fill = document.getElementById("ladderFill");
  const pct = Math.min(100, (currentAmount / SLIDER_MAX) * 100);
  fill.style.width = pct + "%";

  const marksEl = document.getElementById("ladderMarks");
  marksEl.innerHTML = "";
  const sorted = [...milestones].sort((a, b) => a.requiredAmount - b.requiredAmount);
  sorted.forEach((m) => {
    const left = Math.min(100, (m.requiredAmount / SLIDER_MAX) * 100);
    const st = status(m);
    const mark = document.createElement("div");
    mark.className = "mark " + st;
    mark.style.left = left + "%";
    mark.title = m.name + (m.conditionType === "first_n" ? " (คนแรกที่ถึงเกณฑ์)" : "");
    mark.textContent = st === "claimed" ? "✓" : st === "full" ? "✕" : st === "unlocked" ? (m.conditionType === "first_n" ? "🏁" : "!") : "";
    marksEl.appendChild(mark);

    const lbl = document.createElement("div");
    lbl.className = "mark-label";
    lbl.style.left = left + "%";
    lbl.innerHTML = "฿" + fmt(m.requiredAmount) + "<b>" + escapeHtml(m.name) + (m.conditionType === "first_n" ? " 🏁" : "") + "</b>";
    marksEl.appendChild(lbl);
  });
}

/* ---------------- reward cards (customer view) ---------------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderRewardCards() {
  const row = document.getElementById("rewardRow");
  row.innerHTML = "";
  const sorted = [...milestones].sort((a, b) => a.requiredAmount - b.requiredAmount);

  sorted.forEach((m) => {
    const st = status(m);
    const claimedCount = quotaClaimed[m.id] || 0;
    const remaining = Math.max(0, m.quotaTotal - claimedCount);

    const isRace = m.conditionType === "first_n";
    const card = document.createElement("div");
    card.className = "reward-card" + (st === "locked" ? " locked" : "");

    const icon = m.type === "catalog" ? "🎁" : "🎫";
    const badgeText = { locked: "ล็อกอยู่", unlocked: "ปลดล็อกแล้ว", full: "หมดสิทธิ์แล้ว", claimed: "ขอรับสิทธิ์แล้ว" }[st];
    const condLabel = isRace ? `🏁 คนแรก ${m.quotaTotal} คนที่ถึง ฿${fmt(m.requiredAmount)}` : `เกณฑ์ ฿${fmt(m.requiredAmount)}`;

    card.innerHTML = `
      <div class="icon">${icon}</div>
      <div class="r-name">${escapeHtml(m.name)}</div>
      <div class="r-detail">${escapeHtml(m.type === "catalog" ? "สินค้าจากเว็บ" : (m.detail || "ของพิเศษนอกระบบ"))}</div>
      <div class="r-meta"><span>${condLabel}</span><span>เหลือ ${remaining}/${m.quotaTotal} สิทธิ์</span></div>
      <span class="status-badge ${st}">${badgeText}</span>
    `;

    if (st === "unlocked") {
      const btn = document.createElement("button");
      btn.className = "claim-btn";
      btn.type = "button";
      btn.textContent = "ขอรับสิทธิ์";
      btn.onclick = () => {
        openClaimFormId = openClaimFormId === m.id ? null : m.id;
        renderRewardCards();
      };
      card.appendChild(btn);

      if (openClaimFormId === m.id) {
        card.appendChild(buildClaimForm(m));
      }
    } else if (st === "full") {
      const p = document.createElement("div");
      p.className = "r-detail";
      p.style.color = "var(--risk-ink)";
      p.textContent = isRace ? "คนอื่นถึงเกณฑ์ครบโควตาไปก่อนแล้ว" : "สิทธิ์เต็มแล้ว — ต้องกำหนดของรางวัลรองรับเพิ่ม";
      card.appendChild(p);
    }

    if (isRace && remaining > 0 && st !== "claimed") {
      const raceBtn = document.createElement("button");
      raceBtn.className = "claim-btn ghost";
      raceBtn.type = "button";
      raceBtn.textContent = "+ จำลองคนอื่นถึงเกณฑ์ก่อน 1 คน";
      raceBtn.onclick = () => simulateOtherClaim(m.id);
      card.appendChild(raceBtn);
    }

    row.appendChild(card);
  });
}

function buildClaimForm(m) {
  const wrap = document.createElement("div");
  wrap.className = "claim-form";

  const fieldsToAsk = m.type === "catalog"
    ? (m.requiredFields.length ? m.requiredFields : [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }])
    : m.requiredFields;
  const inputs = {};

  const HTML_TYPE = { TEXT: "text", TEL: "tel", NUMBER: "number", DATE: "date" };

  fieldsToAsk.forEach((f) => {
    const label = document.createElement("label");
    label.textContent = f.label;
    let input;
    if (f.type === "SELECT") {
      input = document.createElement("select");
      (f.options || []).forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input");
      input.type = HTML_TYPE[f.type] || "text";
      input.placeholder = "กรอก" + f.label;
    }
    inputs[f.label] = input;
    wrap.appendChild(label);
    wrap.appendChild(input);
  });

  const submit = document.createElement("button");
  submit.className = "submit-btn";
  submit.type = "button";
  submit.textContent = "ส่งคำขอรับสิทธิ์";
  submit.onclick = () => {
    const values = {};
    fieldsToAsk.forEach((f) => (values[f.label] = inputs[f.label].value.trim() || "(ไม่กรอก)"));
    claimedIds.add(m.id);
    quotaClaimed[m.id] = (quotaClaimed[m.id] || 0) + 1;
    seq += 1;
    queue.unshift({
      seq,
      milestoneName: m.name,
      type: m.type,
      fields: values,
      conditionType: m.conditionType,
    });
    openClaimFormId = null;
    renderRewardCards();
    renderLadder();
    renderQueue();
  };
  wrap.appendChild(submit);
  return wrap;
}

/* ---------------- admin editor ---------------- */

function renderMilestoneEditor() {
  const el = document.getElementById("milestoneEditor");
  el.innerHTML = "";
  const sorted = [...milestones].sort((a, b) => a.requiredAmount - b.requiredAmount);

  sorted.forEach((m, idx) => {
    const card = document.createElement("div");
    card.className = "m-card";

    const head = document.createElement("div");
    head.className = "m-card-head";
    head.innerHTML = `<span class="idx">ขั้น ${idx + 1}</span>`;
    const del = document.createElement("button");
    del.className = "del-btn";
    del.type = "button";
    del.textContent = "ลบ";
    del.onclick = () => {
      milestones = milestones.filter((x) => x.id !== m.id);
      claimedIds.delete(m.id);
      renderAll();
    };
    head.appendChild(del);
    card.appendChild(head);

    // condition type: per-customer ladder vs first-N-to-reach race
    const condField = document.createElement("div");
    condField.className = "field";
    condField.style.marginBottom = "8px";
    condField.innerHTML = `<label>เงื่อนไขปลดล็อก</label>`;
    const condToggle = document.createElement("div");
    condToggle.className = "type-toggle";
    const amountBtn = document.createElement("button");
    amountBtn.type = "button";
    amountBtn.className = "type-btn" + (m.conditionType !== "first_n" ? " active" : "");
    amountBtn.textContent = "🪜 ขั้นบันได (ต่อคน)";
    amountBtn.onclick = () => { m.conditionType = "amount"; renderAll(); };
    const raceCondBtn = document.createElement("button");
    raceCondBtn.type = "button";
    raceCondBtn.className = "type-btn" + (m.conditionType === "first_n" ? " active" : "");
    raceCondBtn.textContent = "🏁 คนแรกที่ถึงเกณฑ์";
    raceCondBtn.onclick = () => { m.conditionType = "first_n"; renderAll(); };
    condToggle.appendChild(amountBtn);
    condToggle.appendChild(raceCondBtn);
    condField.appendChild(condToggle);
    if (m.conditionType === "first_n") {
      const hint = document.createElement("div");
      hint.style.cssText = "font-size:11px;color:var(--ink-faint);margin-top:5px;";
      hint.textContent = "ลูกค้าต้องถึงยอดเกณฑ์นี้ และยังต้องเหลือโควตา (ด้านล่าง) ถึงจะได้สิทธิ์ — คนอื่นแย่งโควตาไปก่อนได้";
      condField.appendChild(hint);
    }
    card.appendChild(condField);

    // row: amount + name
    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `
      <div class="field"><label>${m.conditionType === "first_n" ? "ยอดเกณฑ์ต่อคน (บาท)" : "ยอดเกณฑ์สะสม (บาท)"}</label></div>
      <div class="field"><label>ชื่อรางวัล</label></div>
    `;
    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.value = m.requiredAmount;
    amountInput.step = 1000;
    amountInput.onchange = () => { m.requiredAmount = Number(amountInput.value) || 0; renderAll(); };
    row1.children[0].appendChild(amountInput);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = m.name;
    nameInput.oninput = () => { m.name = nameInput.value; renderLadder(); renderRewardCards(); };
    row1.children[1].appendChild(nameInput);
    card.appendChild(row1);

    // type toggle
    const typeField = document.createElement("div");
    typeField.className = "field";
    typeField.style.marginBottom = "8px";
    typeField.innerHTML = `<label>ประเภทรางวัล</label>`;
    const toggle = document.createElement("div");
    toggle.className = "type-toggle";
    const catalogBtn = document.createElement("button");
    catalogBtn.type = "button";
    catalogBtn.className = "type-btn" + (m.type === "catalog" ? " active" : "");
    catalogBtn.textContent = "🎁 สินค้าจากเว็บ";
    catalogBtn.onclick = () => { m.type = "catalog"; if (!m.catalogItem) m.catalogItem = CATALOG_ITEMS[0]; renderAll(); };
    const expBtn = document.createElement("button");
    expBtn.type = "button";
    expBtn.className = "type-btn" + (m.type === "experience" ? " active" : "");
    expBtn.textContent = "🎫 ของพิเศษนอกระบบ";
    expBtn.onclick = () => { m.type = "experience"; renderAll(); };
    toggle.appendChild(catalogBtn);
    toggle.appendChild(expBtn);
    typeField.appendChild(toggle);
    card.appendChild(typeField);

    // type-specific
    if (m.type === "catalog") {
      const f = document.createElement("div");
      f.className = "field";
      f.style.marginBottom = "8px";
      f.innerHTML = `<label>เลือกสินค้าในเว็บ</label>`;
      const sel = document.createElement("select");
      CATALOG_ITEMS.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it;
        opt.textContent = it;
        if (it === m.catalogItem) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.onchange = () => { m.catalogItem = sel.value; m.name = sel.value; renderAll(); };
      f.appendChild(sel);
      card.appendChild(f);
    } else {
      const f = document.createElement("div");
      f.className = "field";
      f.style.marginBottom = "8px";
      f.innerHTML = `<label>รายละเอียดของรางวัล</label>`;
      const ta = document.createElement("textarea");
      ta.value = m.detail;
      ta.oninput = () => { m.detail = ta.value; renderRewardCards(); };
      f.appendChild(ta);
      card.appendChild(f);
    }

    // quota
    const qField = document.createElement("div");
    qField.className = "field";
    qField.style.marginBottom = "8px";
    qField.style.maxWidth = "160px";
    qField.innerHTML = `<label>${m.conditionType === "first_n" ? "จำนวนคนแรกที่รับสิทธิ์ได้ (โควตาแข่งขัน)" : "จำนวนสิทธิ์ทั้งหมด"}</label>`;
    const qInput = document.createElement("input");
    qInput.type = "number";
    qInput.min = 1;
    qInput.value = m.quotaTotal;
    qInput.onchange = () => { m.quotaTotal = Math.max(1, Number(qInput.value) || 1); renderRewardCards(); };
    qField.appendChild(qInput);
    card.appendChild(qField);

    card.appendChild(buildFieldEditor(m.requiredFields, renderAll));

    el.appendChild(card);
  });
}

/* reusable: builds the "ข้อมูลที่ต้องขอเพิ่ม" editor (chip list + add row)
   used by both the ladder milestone editor and the race campaign editor */
function buildFieldEditor(fields, onChange) {
  const cf = document.createElement("div");
  cf.className = "field";
  cf.innerHTML = `<label>ข้อมูลที่ต้องขอเพิ่มตอนลูกค้าขอรับสิทธิ์</label>`;

  const grp = document.createElement("div");
  grp.className = "chk-group";
  fields.forEach((f, idx) => {
    const pill = document.createElement("span");
    pill.className = "chk-pill";
    pill.innerHTML = `<b style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--ink-faint)">${f.type}</b> ${escapeHtml(f.label)}`;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "×";
    rm.style.cssText = "border:none;background:transparent;color:var(--risk-ink);font-size:13px;line-height:1;padding:0;margin-left:2px;cursor:pointer;";
    rm.onclick = () => { fields.splice(idx, 1); onChange(); };
    pill.appendChild(rm);
    grp.appendChild(pill);
  });
  cf.appendChild(grp);

  const addRow = document.createElement("div");
  addRow.style.cssText = "display:flex;gap:6px;margin-top:8px;";
  const typeSel = document.createElement("select");
  typeSel.style.cssText = "border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:6px 7px;font-size:11.5px;font-family:'IBM Plex Mono',monospace;flex:none;";
  FIELD_TYPES.forEach((t) => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    typeSel.appendChild(o);
  });
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "ชื่อฟิลด์ เช่น เบอร์ติดต่อ";
  labelInput.style.cssText = "flex:1;min-width:0;border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:6px 8px;font-size:12px;";
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+ เพิ่ม";
  addBtn.style.cssText = "border:none;background:var(--a);color:#fff;border-radius:6px;padding:6px 12px;font-size:12px;flex:none;";
  addBtn.onclick = () => {
    const label = labelInput.value.trim();
    if (!label) return;
    const field = { label, type: typeSel.value };
    if (typeSel.value === "SELECT") field.options = ["ตัวเลือก 1", "ตัวเลือก 2"];
    fields.push(field);
    onChange();
  };
  addRow.appendChild(typeSel);
  addRow.appendChild(labelInput);
  addRow.appendChild(addBtn);
  cf.appendChild(addRow);

  return cf;
}

/* ---------------- "first N to reach" quota consumed by other customers ---------------- */

function simulateOtherClaim(id) {
  const m = milestones.find((x) => x.id === id);
  if (!m) return;
  const claimed = quotaClaimed[id] || 0;
  if (claimed >= m.quotaTotal) return;
  quotaClaimed[id] = claimed + 1;
  renderAll();
}

/* ---------------- fulfillment queue (admin/ops view) ---------------- */

function renderQueue() {
  const el = document.getElementById("queueList");
  el.innerHTML = "";
  if (queue.length === 0) {
    el.innerHTML = `<div class="queue-empty">ยังไม่มีคำขอรับรางวัลเข้ามา</div>`;
    return;
  }
  queue.forEach((q) => {
    const item = document.createElement("div");
    item.className = "q-item";
    const fieldsHtml = Object.entries(q.fields)
      .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
      .join(" · ");
    item.innerHTML = `
      <div class="q-top"><span>${escapeHtml(q.milestoneName)}</span><span class="q-time">คำขอที่ ${q.seq}</span></div>
      ${q.conditionType === "first_n" ? `<div class="q-detail" style="color:var(--ink-faint)">🏁 คนแรกที่ถึงเกณฑ์</div>` : ""}
      <div class="q-detail">${q.type === "catalog" ? "🎁 สินค้าเว็บ — เข้าคิวแพ็ก/จัดส่งได้ทันที" : "🎫 ของนอกระบบ — ต้องมีคนติดต่อกลับดำเนินการ"}</div>
      <div class="q-detail" style="margin-top:4px">${fieldsHtml}</div>
    `;
    el.appendChild(item);
  });
}

/* ---------------- wire up + boot ---------------- */

function renderAll() {
  renderLadder();
  renderRewardCards();
  renderMilestoneEditor();
  renderQueue();
}

function addMilestone() {
  milestones.push({
    id: uid(),
    requiredAmount: 50000,
    name: "รางวัลใหม่",
    type: "catalog",
    catalogItem: CATALOG_ITEMS[0],
    detail: "",
    quotaTotal: 10,
    requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
    conditionType: "amount",
  });
  renderAll();
}

function boot() {
  renderPresets();
  setAmount(0);
  renderAll();

  document.getElementById("amountSlider").oninput = (e) => setAmount(Number(e.target.value));
  document.getElementById("amountNumber").onchange = (e) => setAmount(Number(e.target.value));
  document.getElementById("addMilestoneBtn").onclick = addMilestone;
  document.getElementById("resetBtn").onclick = () => {
    milestones = seedMilestones();
    claimedIds = new Set();
    quotaClaimed = seedQuotaClaimed();
    queue = [];
    seq = 0;
    openClaimFormId = null;
    setAmount(0);
    renderAll();
  };
}

boot();
