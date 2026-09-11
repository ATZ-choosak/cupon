/* shared-state.js — single source of truth for product catalog + every setting object.
   Loaded by admin.html (writes) and index.html (reads) so the realistic customer
   simulation always reflects whatever the admin settings page currently has set.
   No backend here — this is a static prototype, so "shared" means localStorage.
   Open admin.html and index.html in two tabs: admin edits sync to shop live via
   the storage event (see shop.js). */

const PMPC_PRODUCTS = [
  { name: "พาราเซตามอล 500mg", price: 60, brand: "Generic", category: "หมวดยาสามัญประจำบ้าน" },
  { name: "วิตามินซี 1000mg (Blackmores)", price: 250, brand: "Blackmores", category: "หมวดวิตามิน/อาหารเสริม" },
  { name: "น้ำมันปลา Omega-3 (Blackmores)", price: 450, brand: "Blackmores", category: "หมวดวิตามิน/อาหารเสริม" },
  { name: "แคลเซียม+ดี (Blackmores)", price: 380, brand: "Blackmores", category: "หมวดวิตามิน/อาหารเสริม" },
  { name: "หน้ากากอนามัย (กล่อง)", price: 120, brand: "Generic", category: "หมวดเวชภัณฑ์" },
  { name: "เจลล้างมือ", price: 85, brand: "Generic", category: "หมวดเวชภัณฑ์" },
  { name: "ยาน้ำแก้ไอ", price: 180, brand: "Generic", category: "หมวดยาสามัญประจำบ้าน" },
  { name: "เข็มฉีดยา (กล่อง)", price: 90, brand: "Generic", category: "หมวดเวชภัณฑ์" },
  { name: "นมผงสูตร 3 ตรา A", price: 690, brand: "ตรา A", category: "หมวดแม่และเด็ก" },
  { name: "ขวดนม PP 240ml", price: 200, brand: "ตรา A", category: "หมวดแม่และเด็ก" },
];
const PMPC_PRODUCT_NAMES = PMPC_PRODUCTS.map((p) => p.name);
const PMPC_PRICE_MAP = {};
const PMPC_BRAND_OF = {};
const PMPC_CATEGORY_OF = {};
PMPC_PRODUCTS.forEach((p) => { PMPC_PRICE_MAP[p.name] = p.price; PMPC_BRAND_OF[p.name] = p.brand; PMPC_CATEGORY_OF[p.name] = p.category; });

const PMPC_CATEGORIES = ["หมวดยาสามัญประจำบ้าน", "หมวดวิตามิน/อาหารเสริม", "หมวดเวชภัณฑ์", "หมวดแม่และเด็ก"];
const PMPC_CATEGORY_ICONS = { "หมวดยาสามัญประจำบ้าน": "💊", "หมวดวิตามิน/อาหารเสริม": "🧴", "หมวดเวชภัณฑ์": "🩹", "หมวดแม่และเด็ก": "🍼" };
const PMPC_BRANDS = ["Blackmores", "Generic", "ตรา A"];

function pmpcDefaultSettings() {
  return {
    // โปรโมชั่นอัตโนมัติ (ไม่ต้องมีโค้ด) — รวม "ซื้อคู่สินค้าเฉพาะเจาะจง" + "ส่วนลดท้ายบิลตามแบรนด์/หมวด" +
    // "ส่งฟรีแบบไม่ใช่คูปอง" ไว้ใน setting เดียวกัน ต่างกันแค่ targetMode (เจาะจงสินค้า/แบรนด์-หมวด) และ
    // rewardType (ส่วนลด/ส่งฟรี) — ของแต่ละกฎ เพิ่มได้หลายกฎพร้อมกัน
    // targetMode="items": เลือกสินค้าเฉพาะเจาะจง (โครงจากหน้าตั้งค่า Bundle/ของแถมจริงของ pmpc)
    // targetMode="group": เลือกทั้งแบรนด์/หมวดหมู่ + ยอดขั้นต่ำ (แบบเดิมของ "ส่วนลดท้ายบิล") — กฎ targetMode="group"
    //   ที่แย่งกลุ่มสินค้าเดียวกันจะให้ "priority" สูงสุดที่ผ่านเกณฑ์ชนะแค่ 1 กฎ (ไม่บวกซ้อน) เหมือนเดิม
    //   ส่วน targetMode="items" ใช้ร่วมกับกฎอื่นได้เสมอ (คนละสินค้ากัน ไม่ชนกัน)
    // rewardType="freeship": ฟรีค่าส่งเฉพาะรายการที่เข้าเงื่อนไขกฎนี้เท่านั้น ไม่ใช่ทั้งบิล
    promotions: [
      {
        id: "promo1",
        name: "ซื้อคู่นมผง + ขวดนม คุ้มกว่า",
        description: "",
        condition: "ซื้อสินค้าตามรายการที่กำหนดครบเงื่อนไข รับส่วนลดทันทีเฉพาะยอดของรายการนี้",
        active: true,
        quotaPerCustomer: null,
        strictUnit: false,
        startDate: "2026-10-01",
        endDate: "",
        targetMode: "items", // items | group
        conditionType: "QUANTITY", // QUANTITY | TOTAL_AMOUNT (ใช้เมื่อ targetMode="items")
        requiredItems: [
          { requiredQuantity: 1, matchAnyUnit: false, choices: ["นมผงสูตร 3 ตรา A"] },
          { requiredQuantity: 1, matchAnyUnit: false, choices: ["ขวดนม PP 240ml"] },
        ],
        totalAmount: null,
        groupTargetType: "brand", groupTarget: "Blackmores", groupMinSpend: 1000, priority: 0, // ใช้เมื่อ targetMode="group"
        rewardType: "discount", // discount | freeship
        discountType: "fixed",
        discountValue: 100,
        maxDiscountCap: null,
        audienceType: "all",
        audienceCustomers: [],
      },
      {
        id: "promo2",
        name: "ซื้อ Blackmores ครบ ฿1,000 ลดทันที",
        description: "",
        condition: "ซื้อสินค้าแบรนด์ Blackmores ครบยอดที่กำหนด รับส่วนลดทันทีเฉพาะยอดของแบรนด์นี้",
        active: true,
        quotaPerCustomer: null,
        strictUnit: false,
        startDate: "",
        endDate: "",
        targetMode: "group",
        conditionType: "QUANTITY", requiredItems: [], totalAmount: null,
        groupTargetType: "brand", groupTarget: "Blackmores", groupMinSpend: 1000, priority: 10,
        rewardType: "discount",
        discountType: "fixed",
        discountValue: 100,
        maxDiscountCap: null,
        audienceType: "all",
        audienceCustomers: [],
      },
      {
        id: "promo3",
        name: "ซื้อยาสามัญประจำบ้านครบ ฿300 ฟรีค่าส่งกลุ่มนี้",
        description: "",
        condition: "ซื้อสินค้าหมวดยาสามัญประจำบ้านครบยอดที่กำหนด ฟรีค่าส่งเฉพาะสินค้ากลุ่มนี้ (ไม่ใช่ทั้งบิล)",
        active: true,
        quotaPerCustomer: null,
        strictUnit: false,
        startDate: "",
        endDate: "",
        targetMode: "group",
        conditionType: "QUANTITY", requiredItems: [], totalAmount: null,
        groupTargetType: "category", groupTarget: "หมวดยาสามัญประจำบ้าน", groupMinSpend: 300, priority: 5,
        rewardType: "freeship",
        discountType: "fixed",
        discountValue: 0,
        maxDiscountCap: null,
        audienceType: "all",
        audienceCustomers: [],
      },
    ],
    flashSale: {
      name: "9.9 MEGA SALE",
      start: "2026-09-09T00:00",
      end: "2026-09-09T23:59",
      recurring: "yearly",
      active: true, // demo override — real datetime-window check is brittle for a live client demo
      groups: [
        { target: "หมวดยาสามัญประจำบ้าน", percent: 50 },
        { target: "หมวดวิตามิน/อาหารเสริม", percent: 30 },
        { target: "หมวดเวชภัณฑ์", percent: 70 },
      ],
      audienceType: "all",
      audienceCustomers: [],
    },
    // หลายโค้ดพร้อมกันได้ — แต่ละใบตั้งเงื่อนไขอิสระจากกัน
    onlineCoupons: [
      { id: "onl1", code: "SAVE100", minSpend: 500, discountAmount: 100, excluded: [], totalLimit: null, perCustomerLimit: 1, startDate: "2026-09-01", endDate: "2026-09-30", audienceType: "all", audienceCustomers: [], usedTotal: 2 },
    ],
    // หลายใบพร้อมกันได้ — เช่น ใบนึงให้ "กดเก็บเอง" อีกใบให้ "แจกอัตโนมัติทุกเดือน"
    collectibleCoupons: [
      {
        id: "col1",
        name: "ส่งฟรีทั้งบิล ไม่มีขั้นต่ำ",
        discountType: "freeship", // freeship | fixed | percent
        discountValue: 0,
        maxDiscountCap: null,
        excluded: [],
        minSpend: 0,
        quotaTotal: 500,
        quotaClaimed: 320,
        perCustomerLimit: 1,
        distributionMode: "manual", // manual (กดรับเอง) | auto_monthly (แจกอัตโนมัติทุกเดือน)
        collectStart: "2026-09-01",
        collectEnd: "2026-09-15",
        expiryMode: "fixed",
        expiryDate: "2026-09-30",
        expiryDays: 14,
        dayOfMonth: 1,
        audienceType: "all",
        audienceCustomers: [],
      },
      {
        id: "col2",
        name: "ลด 15% สูงสุด ฿100",
        discountType: "percent",
        discountValue: 15,
        maxDiscountCap: 100,
        excluded: [],
        minSpend: 500,
        quotaTotal: null,
        quotaClaimed: 0,
        perCustomerLimit: 1,
        distributionMode: "auto_monthly",
        collectStart: "2026-09-01",
        collectEnd: "2026-09-15",
        expiryMode: "fixed",
        expiryDate: "2026-09-30",
        expiryDays: 14,
        dayOfMonth: 1,
        audienceType: "all",
        audienceCustomers: [],
      },
    ],
    pointSettings: { spendPer: 100, pointsPer: 10, rounding: "floor" },
    redeemCatalog: [
      // "คูปอง"/"เครดิต" แลกแล้วได้คูปองจริงเข้ากระเป๋าทันที ใช้ได้เลยที่หน้าจำลอง (ไม่ต้องรอใคร)
      { name: "คูปองลด ฿50", type: "คูปอง", cost: 500, quota: null, active: true, discountType: "fixed", discountValue: 50, maxDiscountCap: null },
      { name: "คูปองส่งฟรี", type: "คูปอง", cost: 300, quota: null, active: true, discountType: "freeship", discountValue: 0, maxDiscountCap: null },
      // "สินค้า" เป็นของจริงที่ต้องแพ็ก/จัดส่ง แลกแล้วเข้าคิวเดียวกับคำขอรับรางวัลแคมเปญ ให้ทีมหลังบ้านดำเนินการต่อ
      { name: "ของแถมพรีเมียม", type: "สินค้า", cost: 1200, quota: 50, active: true },
      { name: "เครดิตเงินคืน ฿100", type: "เครดิต", cost: 1000, quota: null, active: false, discountType: "fixed", discountValue: 100, maxDiscountCap: null },
    ],
    milestones: [
      {
        id: "cm1", name: "เครื่องวัดความดันโลหิตดิจิทัล", requiredAmount: 100000,
        quotaTotal: 50, quotaClaimed: 12,
        rewardType: "catalog", catalogItem: PMPC_PRODUCT_NAMES[0], detail: "",
        requiredFields: [{ label: "ที่อยู่จัดส่ง", type: "TEXT" }],
      },
      {
        id: "cm2", name: "ทริปสัมมนาเภสัชกรต่างประเทศ 3 วัน 2 คืน", requiredAmount: 500000,
        quotaTotal: 20, quotaClaimed: 3,
        rewardType: "experience", catalogItem: "", detail: "รวมตั๋วเครื่องบิน ที่พัก และค่าลงทะเบียนสัมมนา",
        requiredFields: [{ label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" }, { label: "เบอร์ติดต่อ", type: "TEL" }],
      },
      {
        id: "cm3", name: "ตั๋วเครื่องบินไป-กลับต่างประเทศ 1 ที่นั่ง", requiredAmount: 1000000,
        quotaTotal: null, quotaClaimed: 0, // ไม่ตั้งโควตา — ใครถึงยอดกดรับสิทธิ์ได้เลย ทีมงานคัดเลือก/จับรางวัลกันเองนอกระบบภายหลัง
        rewardType: "experience", catalogItem: "",
        detail: "จำนวนจำกัด ทีมงานจะติดต่อคัดเลือกผู้โชคดีและแจ้งรายละเอียดการเดินทางภายหลัง",
        requiredFields: [{ label: "ชื่อผู้เดินทางตามพาสปอร์ต", type: "TEXT" }, { label: "เบอร์ติดต่อ", type: "TEL" }],
      },
    ],
  };
}

const PMPC_SETTINGS_KEY = "pmpc_settings_v1";

// Object.assign(def, parsed) เป็น shallow merge ระดับบนสุดเท่านั้น — ถ้า parsed มี array/object
// key เดิมอยู่แล้ว (เช่น redeemCatalog) มันจะทับด้วยของเก่าทั้งก้อน ทำให้ field ที่เพิ่มเข้ามาทีหลัง
// (เช่น discountType/discountValue ของแต่ละรายการ, flashSale.active) หายไปเงียบๆ ในเบราว์เซอร์ที่เคย
// เซฟค่าไว้ก่อนหน้านี้ — ฟังก์ชันนี้ไล่เติม field ที่ขาดกลับเข้าไปให้ ไม่แตะ field ที่ผู้ใช้ตั้งไว้แล้ว
function pmpcMigrateSettings(s) {
  if (s.flashSale && s.flashSale.active === undefined) s.flashSale.active = true;
  // เทียบชื่อกับ default ตัวจริงเพื่อดึงค่าที่ถูกต้องกลับมา (ไม่ใช่เดา 0 มั่วๆ)
  // discountValue=0 ของคูปอง fixed/percent ไม่มีความหมายทางธุรกิจเลย (คูปองลด ฿0 ไม่มีจริง) — ถือว่าเป็นรอย
  // บั๊กจาก migrate รุ่นก่อนหน้าที่เคยเขียนทับเป็น 0 ไปแล้วจริงๆ (ไม่ใช่แค่ "หายไป") เลยซ่อมแม้ field จะมีอยู่แล้วก็ตาม
  const defRedeem = pmpcDefaultSettings().redeemCatalog;
  (s.redeemCatalog || []).forEach((it) => {
    if (it.type === "สินค้า") return;
    const match = defRedeem.find((d) => d.name === it.name);
    if (it.discountType === undefined) it.discountType = match ? match.discountType : (it.name && it.name.includes("ส่งฟรี") ? "freeship" : "fixed");
    if (it.maxDiscountCap === undefined) it.maxDiscountCap = match ? match.maxDiscountCap : null;
    if (it.discountType !== "freeship" && (it.discountValue === undefined || it.discountValue === 0) && match && match.discountValue) {
      it.discountValue = match.discountValue;
    } else if (it.discountValue === undefined) {
      it.discountValue = 0;
    }
  });
  return s;
}

function pmpcLoadSettings() {
  const def = pmpcDefaultSettings();
  try {
    const raw = localStorage.getItem(PMPC_SETTINGS_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw);
    return pmpcMigrateSettings(Object.assign(def, parsed));
  } catch (e) {
    return def;
  }
}

function pmpcSaveSettings(state) {
  try { localStorage.setItem(PMPC_SETTINGS_KEY, JSON.stringify(state)); } catch (e) {}
}

function pmpcResetSettings() {
  try { localStorage.removeItem(PMPC_SETTINGS_KEY); } catch (e) {}
}
