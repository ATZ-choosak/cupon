/* จำลองการตั้งค่ารางวัลขั้นบันได (ระบบ B) — vanilla JS, ไม่ต้อง build ไม่ต้องมี server */

const SLIDER_MAX = 1200000;

const CATALOG_ITEMS = [
  "เครื่องวัดความดันโลหิตดิจิทัล",
  "เครื่องพ่นยาละอองพกพา",
  "เซ็ตกระเป๋ายาเดินทางพรีเมียม",
  "เครื่องวัดออกซิเจนปลายนิ้ว",
];

const FIELD_OPTIONS = [
  "ที่อยู่จัดส่ง",
  "เบอร์ติดต่อ",
  "ชื่อผู้เดินทางตามพาสปอร์ต",
  "เลขหนังสือเดินทาง",
  "วันที่สะดวกเดินทาง",
  "ปลายทางที่ต้องการ",
];

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
      requiredFields: ["ที่อยู่จัดส่ง", "เบอร์ติดต่อ"],
    },
    {
      id: "m2",
      requiredAmount: 500000,
      name: "ทริปสัมมนาเภสัชกรต่างประเทศ 3 วัน 2 คืน",
      type: "experience",
      catalogItem: "",
      detail: "รวมตั๋วเครื่องบิน ที่พัก และค่าลงทะเบียนสัมมนา",
      quotaTotal: 5,
      requiredFields: ["ชื่อผู้เดินทางตามพาสปอร์ต", "เบอร์ติดต่อ", "วันที่สะดวกเดินทาง"],
    },
    {
      id: "m3",
      requiredAmount: 1000000,
      name: "ตั๋วเครื่องบินไป-กลับต่างประเทศ 1 ที่นั่ง",
      type: "experience",
      catalogItem: "",
      detail: "เลือกปลายทางได้ตามเงื่อนไขสายการบินคู่สัญญา",
      quotaTotal: 3,
      requiredFields: ["ชื่อผู้เดินทางตามพาสปอร์ต", "เลขหนังสือเดินทาง", "ปลายทางที่ต้องการ", "เบอร์ติดต่อ"],
    },
  ];
}

let milestones = seedMilestones();
let currentAmount = 0;
let claimedIds = new Set();      // milestone id -> ปลดล็อกและกดขอรับแล้ว (ของลูกค้าจำลองรายนี้)
let quotaClaimed = {};           // milestone id -> จำนวนสิทธิ์ที่ถูกใช้ไปแล้ว (รวมทุกคน, จำลอง)
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
  const unlocked = currentAmount >= m.requiredAmount;
  if (unlocked && claimedIds.has(m.id)) return "claimed";
  if (unlocked) return "unlocked";
  return "locked";
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
    const mark = document.createElement("div");
    mark.className = "mark " + status(m);
    mark.style.left = left + "%";
    mark.title = m.name;
    mark.textContent = status(m) === "claimed" ? "✓" : status(m) === "unlocked" ? "!" : "";
    marksEl.appendChild(mark);

    const lbl = document.createElement("div");
    lbl.className = "mark-label";
    lbl.style.left = left + "%";
    lbl.innerHTML = "฿" + fmt(m.requiredAmount) + "<b>" + escapeHtml(m.name) + "</b>";
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

    const card = document.createElement("div");
    card.className = "reward-card" + (st === "locked" ? " locked" : "");

    const icon = m.type === "catalog" ? "🎁" : "🎫";
    const badgeText = st === "locked" ? "ล็อกอยู่" : st === "unlocked" ? "ปลดล็อกแล้ว" : "ขอรับสิทธิ์แล้ว";

    card.innerHTML = `
      <div class="icon">${icon}</div>
      <div class="r-name">${escapeHtml(m.name)}</div>
      <div class="r-detail">${escapeHtml(m.type === "catalog" ? "สินค้าจากเว็บ" : (m.detail || "ของพิเศษนอกระบบ"))}</div>
      <div class="r-meta"><span>เกณฑ์ ฿${fmt(m.requiredAmount)}</span><span>เหลือ ${remaining}/${m.quotaTotal} สิทธิ์</span></div>
      <span class="status-badge ${st}">${badgeText}</span>
    `;

    if (st === "unlocked" && remaining > 0) {
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
    } else if (st === "unlocked" && remaining <= 0) {
      const p = document.createElement("div");
      p.className = "r-detail";
      p.style.color = "var(--risk-ink)";
      p.textContent = "สิทธิ์เต็มแล้ว — ต้องกำหนดของรางวัลรองรับเพิ่ม";
      card.appendChild(p);
    }

    row.appendChild(card);
  });
}

function buildClaimForm(m) {
  const wrap = document.createElement("div");
  wrap.className = "claim-form";

  const fieldsToAsk = m.type === "catalog" ? (m.requiredFields.length ? m.requiredFields : ["ที่อยู่จัดส่ง"]) : m.requiredFields;
  const inputs = {};

  fieldsToAsk.forEach((f) => {
    const label = document.createElement("label");
    label.textContent = f;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "กรอก" + f;
    inputs[f] = input;
    wrap.appendChild(label);
    wrap.appendChild(input);
  });

  const submit = document.createElement("button");
  submit.className = "submit-btn";
  submit.type = "button";
  submit.textContent = "ส่งคำขอรับสิทธิ์";
  submit.onclick = () => {
    const values = {};
    fieldsToAsk.forEach((f) => (values[f] = inputs[f].value.trim() || "(ไม่กรอก)"));
    claimedIds.add(m.id);
    quotaClaimed[m.id] = (quotaClaimed[m.id] || 0) + 1;
    seq += 1;
    queue.unshift({
      seq,
      milestoneName: m.name,
      type: m.type,
      fields: values,
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

    // row: amount + name
    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `
      <div class="field"><label>ยอดเกณฑ์ (บาท)</label></div>
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
    qField.innerHTML = `<label>จำนวนสิทธิ์ทั้งหมด</label>`;
    const qInput = document.createElement("input");
    qInput.type = "number";
    qInput.min = 1;
    qInput.value = m.quotaTotal;
    qInput.onchange = () => { m.quotaTotal = Math.max(1, Number(qInput.value) || 1); renderRewardCards(); };
    qField.appendChild(qInput);
    card.appendChild(qField);

    // required fields checklist
    const cf = document.createElement("div");
    cf.className = "field";
    cf.innerHTML = `<label>ข้อมูลที่ต้องขอเพิ่มตอนลูกค้าขอรับสิทธิ์</label>`;
    const grp = document.createElement("div");
    grp.className = "chk-group";
    FIELD_OPTIONS.forEach((opt) => {
      const pill = document.createElement("label");
      pill.className = "chk-pill";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = m.requiredFields.includes(opt);
      chk.onchange = () => {
        if (chk.checked) { if (!m.requiredFields.includes(opt)) m.requiredFields.push(opt); }
        else { m.requiredFields = m.requiredFields.filter((x) => x !== opt); }
      };
      pill.appendChild(chk);
      pill.appendChild(document.createTextNode(opt));
      grp.appendChild(pill);
    });
    cf.appendChild(grp);
    card.appendChild(cf);

    el.appendChild(card);
  });
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
    requiredFields: ["ที่อยู่จัดส่ง"],
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
    quotaClaimed = {};
    queue = [];
    seq = 0;
    openClaimFormId = null;
    setAmount(0);
    renderAll();
  };
}

boot();
