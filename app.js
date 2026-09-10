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
      combinable: true,
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
      combinable: true,
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
      conditionType: "raffle",
      winnersCount: 3,
      drawDate: "2026-12-31",
      combinable: true,
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
      combinable: true,
      requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
    },
  ];
}

let milestones = seedMilestones();
let currentAmount = 0;
let claimedIds = new Set();      // milestone id -> ปลดล็อกและกดขอรับแล้ว (ของลูกค้าจำลองรายนี้)
let wonIds = new Set();          // milestone id (raffle) -> ลูกค้าจำลองถูกจับรางวัลแล้ว รอกรอกฟอร์มรับสิทธิ์
function seedQuotaClaimed() { return { m4: 43 }; } // m4 = "คนแรกที่ถึงเกณฑ์" ตัวอย่าง เริ่มมีคนอื่นถึงแล้ว 43 คน
let quotaClaimed = seedQuotaClaimed();  // milestone id -> จำนวนสิทธิ์ที่ถูกใช้ไปแล้ว (รวมทุกคน, จำลอง)
function seedRaffleEntrants() { return { m3: 7 }; } // m3 = "สุ่มจับรางวัล" ตัวอย่าง เริ่มมีคนอื่นเข้าร่วมแล้ว 7 คน
let raffleEntrants = seedRaffleEntrants(); // milestone id -> จำนวนคนอื่นที่เข้าร่วมลุ้น (ไม่รวมลูกค้าจำลองนี้)
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
  if (m.conditionType === "raffle") return wonIds.has(m.id) ? "won" : "entered";
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
    const condIcon = m.conditionType === "first_n" ? "🏁" : m.conditionType === "raffle" ? "🎰" : "";
    mark.title = m.name + (condIcon ? " (" + (m.conditionType === "first_n" ? "คนแรกที่ถึงเกณฑ์" : "สุ่มจับรางวัล") + ")" : "");
    mark.textContent = st === "claimed" ? "✓" : st === "won" ? "🎉" : st === "full" ? "✕" : (st === "unlocked" || st === "entered") ? (condIcon || "!") : "";
    marksEl.appendChild(mark);

    const lbl = document.createElement("div");
    lbl.className = "mark-label";
    lbl.style.left = left + "%";
    lbl.innerHTML = "฿" + fmt(m.requiredAmount) + "<b>" + escapeHtml(m.name) + (condIcon ? " " + condIcon : "") + "</b>";
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
    const isRaffle = m.conditionType === "raffle";
    const card = document.createElement("div");
    card.className = "reward-card" + (st === "locked" ? " locked" : "");

    const icon = m.type === "catalog" ? "🎁" : "🎫";
    const badgeText = { locked: "ล็อกอยู่", unlocked: "ปลดล็อกแล้ว", entered: "เข้าร่วมลุ้นรางวัลแล้ว", won: "🎉 คุณคือผู้โชคดี!", full: "หมดสิทธิ์แล้ว", claimed: "ขอรับสิทธิ์แล้ว" }[st];
    const condLabel = isRace ? `🏁 คนแรก ${m.quotaTotal} คนที่ถึง ฿${fmt(m.requiredAmount)}`
      : isRaffle ? `🎰 สุ่ม ${m.winnersCount || 1} รางวัล จากผู้ถึง ฿${fmt(m.requiredAmount)}`
      : `เกณฑ์ ฿${fmt(m.requiredAmount)}`;
    const metaRight = isRaffle
      ? `เข้าร่วมลุ้นแล้ว ${(raffleEntrants[m.id] || 0) + (st === "locked" ? 0 : 1)} คน`
      : `เหลือ ${remaining}/${m.quotaTotal} สิทธิ์`;

    card.innerHTML = `
      <div class="icon">${icon}</div>
      <div class="r-name">${escapeHtml(m.name)}</div>
      <div class="r-detail">${escapeHtml(m.type === "catalog" ? "สินค้าจากเว็บ" : (m.detail || "ของพิเศษนอกระบบ"))}</div>
      <div class="r-meta"><span>${condLabel}</span><span>${metaRight}</span></div>
      <span class="status-badge ${st}">${badgeText}</span>
    `;

    if (st === "unlocked" || st === "won") {
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
    } else if (st === "entered") {
      const p = document.createElement("div");
      p.className = "r-detail";
      p.textContent = "รอถึงวันประกาศผล " + (m.drawDate || "") + " — แอดมินจับรางวัลผ่านวงล้อด้านล่างของหน้า";
      card.appendChild(p);
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
    if (isRaffle && (st === "entered" || st === "locked")) {
      const entrantBtn = document.createElement("button");
      entrantBtn.className = "claim-btn ghost";
      entrantBtn.type = "button";
      entrantBtn.textContent = "+ จำลองคนอื่นเข้าร่วมลุ้นเพิ่ม 1 คน";
      entrantBtn.onclick = () => { raffleEntrants[m.id] = (raffleEntrants[m.id] || 0) + 1; renderRewardCards(); renderWheelMilestoneSelect(); };
      card.appendChild(entrantBtn);
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

    // condition type: per-customer ladder vs first-N-to-reach race vs raffle
    const condField = document.createElement("div");
    condField.className = "field";
    condField.style.marginBottom = "8px";
    condField.innerHTML = `<label>เงื่อนไขปลดล็อก</label>`;
    const condToggle = document.createElement("div");
    condToggle.className = "type-toggle";
    [["amount", "🪜 ขั้นบันได (การันตี)"], ["first_n", "🏁 คนแรกที่ถึงเกณฑ์"], ["raffle", "🎰 สุ่มจับรางวัล"]].forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "type-btn" + (m.conditionType === val ? " active" : "");
      b.textContent = label;
      b.onclick = () => {
        m.conditionType = val;
        if (val === "raffle" && !m.winnersCount) { m.winnersCount = 3; m.drawDate = m.drawDate || "2026-12-31"; }
        renderAll(); renderWheelMilestoneSelect();
      };
      condToggle.appendChild(b);
    });
    condField.appendChild(condToggle);
    if (m.conditionType === "first_n") {
      const hint = document.createElement("div");
      hint.style.cssText = "font-size:11px;color:var(--ink-faint);margin-top:5px;";
      hint.textContent = "ลูกค้าต้องถึงยอดเกณฑ์นี้ และยังต้องเหลือโควตา (ด้านล่าง) ถึงจะได้สิทธิ์ — คนอื่นแย่งโควตาไปก่อนได้ — แสดง \"เหลือ X/Y สิทธิ์\" กับลูกค้าตรงๆ ได้เพราะโปร่งใสอยู่แล้ว";
      condField.appendChild(hint);
    } else if (m.conditionType === "raffle") {
      const hint = document.createElement("div");
      hint.style.cssText = "font-size:11px;color:var(--ink-faint);margin-top:5px;";
      hint.innerHTML = `<b>ไม่แสดง</b> "เหลือกี่สิทธิ์" กับลูกค้า — ถึงยอดแค่ได้สิทธิ์ "เข้าร่วมลุ้น" ไม่การันตี ผู้โชคดีตัดสินด้วยวงล้อสุ่มท้ายหน้าวันประกาศผลเท่านั้น`;
      condField.appendChild(hint);
    }
    card.appendChild(condField);

    // row: amount + name
    const row1 = document.createElement("div");
    row1.className = "field-row";
    row1.innerHTML = `
      <div class="field"><label>${m.conditionType === "first_n" ? "ยอดเกณฑ์ต่อคน (บาท)" : m.conditionType === "raffle" ? "ยอดเกณฑ์เพื่อรับสิทธิ์ลุ้น (บาท)" : "ยอดเกณฑ์สะสม (บาท)"}</label></div>
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

    // quota / raffle-specific
    if (m.conditionType === "raffle") {
      const rRow = document.createElement("div");
      rRow.className = "field-row";
      rRow.innerHTML = `<div class="field"><label>จำนวนผู้โชคดีที่จะสุ่ม</label></div><div class="field"><label>วันที่ประกาศผล</label></div>`;
      const winInput = document.createElement("input");
      winInput.type = "number"; winInput.min = 1; winInput.value = m.winnersCount || 1;
      winInput.onchange = () => { m.winnersCount = Math.max(1, Number(winInput.value) || 1); renderRewardCards(); };
      rRow.children[0].appendChild(winInput);
      const dateInput = document.createElement("input");
      dateInput.type = "date"; dateInput.value = m.drawDate || "";
      dateInput.onchange = () => { m.drawDate = dateInput.value; renderRewardCards(); };
      rRow.children[1].appendChild(dateInput);
      card.appendChild(rRow);
    } else {
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
    }

    card.appendChild(buildFieldEditor(m.requiredFields, renderAll));

    const combField = document.createElement("div");
    combField.className = "field";
    combField.innerHTML = `<label>ใช้ร่วมกับโปรโมชั่น/คูปองอื่นพร้อมกันได้ไหม</label>`;
    const combToggle = document.createElement("div");
    combToggle.className = "type-toggle";
    const yesBtn = document.createElement("button");
    yesBtn.type = "button"; yesBtn.className = "type-btn" + (m.combinable !== false ? " active" : ""); yesBtn.textContent = "ใช้ร่วมกันได้";
    yesBtn.onclick = () => { m.combinable = true; renderMilestoneEditor(); };
    const noBtn = document.createElement("button");
    noBtn.type = "button"; noBtn.className = "type-btn" + (m.combinable === false ? " active" : ""); noBtn.textContent = "นับเฉพาะยอดซื้อเดี่ยวๆ";
    noBtn.onclick = () => { m.combinable = false; renderMilestoneEditor(); };
    combToggle.appendChild(yesBtn); combToggle.appendChild(noBtn);
    combField.appendChild(combToggle);
    card.appendChild(combField);

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

/* ---------------- raffle spin wheel ---------------- */

const RAFFLE_ENTRANT_POOL = [
  "ร้านยาสุขภาพดี สาขา 2", "ร้านยา รุ่งเรืองเภสัช", "คลินิกหมอสมชาย", "ร้านยาดีดี ฟาร์มาซี",
  "ร้านยา บ้านหมอ", "ตัวแทนจำหน่าย เชียงใหม่", "ร้านยาชุมชนพลัส", "เภสัชกรออนไลน์ 24",
];
const WHEEL_COLORS = ["#0E5C52", "#4FC2AC", "#A8722C", "#E2AC5C", "#154B3F", "#B8894A", "#0A4038", "#D9A25C", "#6E8F86"];
let wheelRotation = 0;
let wheelSpinning = false;

function raffleMilestones() { return milestones.filter((m) => m.conditionType === "raffle"); }

function currentWheelEntrants() {
  const sel = document.getElementById("wheelMilestoneSelect");
  const m = raffleMilestones().find((x) => x.name === (sel && sel.value));
  if (!m) return { milestone: null, names: [] };
  const others = raffleEntrants[m.id] || 0;
  const names = RAFFLE_ENTRANT_POOL.slice(0, Math.max(1, Math.min(others, RAFFLE_ENTRANT_POOL.length)));
  const youEntered = status(m) === "entered" || status(m) === "won";
  if (youEntered) names.push("คุณ (ลูกค้าจำลอง)");
  return { milestone: m, names: names.length ? names : ["(ยังไม่มีผู้เข้าร่วม)"] };
}

function renderWheelMilestoneSelect() {
  const sel = document.getElementById("wheelMilestoneSelect");
  if (!sel) return;
  const raffles = raffleMilestones();
  const wrap = document.getElementById("wheelSection");
  if (raffles.length === 0) {
    if (wrap) wrap.hidden = true;
    return;
  }
  if (wrap) wrap.hidden = false;
  const prev = sel.value;
  sel.innerHTML = raffles.map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("");
  if (raffles.some((m) => m.name === prev)) sel.value = prev;
  renderWheelDisc();
}

function renderWheelDisc() {
  const disc = document.getElementById("wheelDisc");
  if (!disc) return;
  const { names } = currentWheelEntrants();
  const n = names.length;
  const seg = 360 / n;
  disc.style.background = "conic-gradient(" + names.map((_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(",") + ")";
  const legend = document.getElementById("wheelLegend");
  legend.innerHTML = "";
  names.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "wl-item";
    row.innerHTML = `<span class="wl-dot" style="background:${WHEEL_COLORS[i % WHEEL_COLORS.length]}"></span>${escapeHtml(name)}`;
    legend.appendChild(row);
  });
  document.getElementById("wheelResult").className = "wheel-result empty";
  document.getElementById("wheelResult").textContent = "ยังไม่ได้จับรางวัล";
}

function spinWheel() {
  if (wheelSpinning) return;
  const { milestone, names } = currentWheelEntrants();
  if (!milestone || names[0] === "(ยังไม่มีผู้เข้าร่วม)") return;
  wheelSpinning = true;
  const btn = document.getElementById("wheelSpinBtn");
  const result = document.getElementById("wheelResult");
  btn.disabled = true;
  result.className = "wheel-result empty";
  result.textContent = "กำลังหมุน...";

  const n = names.length;
  const seg = 360 / n;
  const winnerIdx = Math.floor(Math.random() * n);
  const segCenter = winnerIdx * seg + seg / 2;
  const delta = 6 * 360 + (360 - segCenter) - (wheelRotation % 360);
  wheelRotation += delta;
  const disc = document.getElementById("wheelDisc");
  disc.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    wheelSpinning = false;
    btn.disabled = false;
    const winnerName = names[winnerIdx];
    result.className = "wheel-result";
    result.textContent = "🎉 ผู้โชคดีคือ " + winnerName;
    if (winnerName === "คุณ (ลูกค้าจำลอง)") {
      wonIds.add(milestone.id);
      renderRewardCards();
      renderLadder();
    }
  }, 4300);
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
      ${q.conditionType === "raffle" ? `<div class="q-detail" style="color:var(--ink-faint)">🎰 ผู้โชคดีจากการจับรางวัล</div>` : ""}
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
  renderWheelMilestoneSelect();
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
    combinable: true,
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
  document.getElementById("wheelMilestoneSelect").onchange = renderWheelDisc;
  document.getElementById("wheelSpinBtn").onclick = spinWheel;
  document.getElementById("resetBtn").onclick = () => {
    milestones = seedMilestones();
    claimedIds = new Set();
    wonIds = new Set();
    quotaClaimed = seedQuotaClaimed();
    raffleEntrants = seedRaffleEntrants();
    wheelRotation = 0;
    queue = [];
    seq = 0;
    openClaimFormId = null;
    setAmount(0);
    renderAll();
  };
}

boot();
