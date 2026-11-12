/* PMP core — shared state + pricing engine for the mockup (runs in the browser, state in localStorage).
   Mirrors what the real services will do:  PromotionService.evaluate · CouponService.validate · PointsService.earn/redeem ·
   CampaignService.ladder · RaffleService.issue/draw · RewardService.grant (one component for every module).
   Everything the admin pages save (reward groups) and everything the simulator config saves lives under 'pmpc.*' keys. */
(function (g) {
  var PMP = g.PMP = g.PMP || {};
  var LS = null;
  try { LS = g.localStorage; LS.setItem('pmpc.t', '1'); LS.removeItem('pmpc.t'); } catch (e) { LS = null; }
  var mem = {};
  function rd(k, d) { try { var v = LS ? LS.getItem(k) : mem[k]; return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function wr(k, v) { var s = JSON.stringify(v); try { if (LS) LS.setItem(k, s); else mem[k] = s; } catch (e) { mem[k] = s; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function baht(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 7); }
  PMP.util = { rd: rd, wr: wr, clone: clone, baht: baht, uid: uid };

  /* ---------------- catalog (read-only reference data) ---------------- */
  PMP.products = [
    { sku: 'BM-VC500', name: 'Blackmores Vitamin C 500 mg - ขวด', unit: 'ขวด', price: 420, brand: 'Blackmores', cat: 'วิตามิน', pts: 4, base: 'BM-VC500', factor: 1 },
    { sku: 'BM-VC500B', name: 'Blackmores Vitamin C 500 mg - กล่อง (6 ขวด)', unit: 'กล่อง', price: 2400, brand: 'Blackmores', cat: 'วิตามิน', pts: 24, base: 'BM-VC500', factor: 6 },
    { sku: 'BM-PG', name: 'Blackmores Pregnancy Gold - ขวด', unit: 'ขวด', price: 590, brand: 'Blackmores', cat: 'วิตามิน', pts: 5, base: 'BM-PG', factor: 1 },
    { sku: 'DX-MP1', name: 'Dumex Mamil Gold 1 800 g - กระป๋อง', unit: 'กระป๋อง', price: 650, brand: 'Dumex', cat: 'นมผง', pts: 0, base: 'DX-MP1', factor: 1 },
    { sku: 'PP-DM', name: 'Pampers ผ้าอ้อม M 64 ชิ้น - แพ็ก', unit: 'แพ็ก', price: 520, brand: 'Pampers', cat: 'ผ้าอ้อม', pts: 5, base: 'PP-DM', factor: 1 },
    { sku: 'PAR-500', name: 'พาราเซตามอล 500 mg - แผง (10 เม็ด)', unit: 'แผง', price: 12, brand: 'Sara', cat: 'ยาสามัญประจำบ้าน', pts: 0, base: 'PAR-500', factor: 1 },
    { sku: 'SY-3ML', name: 'เข็มฉีดยา 3 ml - กล่อง (100 ชิ้น)', unit: 'กล่อง', price: 180, brand: 'Nipro', cat: 'เวชภัณฑ์', pts: 2, base: 'SY-3ML', factor: 1 },
    { sku: 'BT-PP01', name: 'ขวดนม PP 240 ml - ชิ้น', unit: 'ชิ้น', price: 45, brand: 'Pigeon', cat: 'ของใช้เด็ก', pts: 0, base: 'BT-PP01', factor: 1 }
  ];
  PMP.customers = [
    { id: 'c-b2b', name: 'ร้านยา ทดสอบ จำกัด', type: 'B2B', tag: 'B2B · สั่งมาแล้ว 12 ครั้ง' },
    { id: 'c-new', name: 'ร้านยาเปิดใหม่ (ยังไม่เคยสั่ง)', type: 'B2B', tag: 'B2B · ลูกค้าใหม่ 0 ครั้ง' },
    { id: 'c-b2c', name: 'คุณสมชาย ใจดี', type: 'B2C', tag: 'B2C · สั่งมาแล้ว 3 ครั้ง' }
  ];
  PMP.stores = [
    { id: 's1', name: 'ร้านยาสุขใจ สาขาลาดพร้าว' }, { id: 's2', name: 'ร้านยาสุขใจ สาขาบางนา' }, { id: 's3', name: 'ร้านยาเภสัชกรเมือง' },
    { id: 's4', name: 'ร้านยาชุมชนคลองหลวง' }, { id: 's5', name: 'Pharmaplex สาขาโคราช' },
    { id: 'x1', name: 'ร้านไอศกรีมสุขใจ (พาร์ทเนอร์)', kind: 'ext', cat: 'ร้านไอศกรีม', contact: 'คุณมานี 081-234-5678', branches: 'สาขาสยาม · สาขาลาดพร้าว · สาขาเมกาบางนา' },
    { id: 'x2', name: 'คาเฟ่ลมโชย (พาร์ทเนอร์)', kind: 'ext', cat: 'คาเฟ่/เครื่องดื่ม', contact: 'คุณพิม 089-111-2222', branches: 'สาขาอารีย์ · สาขาทองหล่อ' }
  ];
  PMP.stores.forEach(function (x) { if (!x.kind) x.kind = 'sys'; });
  /* every place that can redeem a paper coupon: registered stores (in-system) + partner organisations outside the system (cfg.partners adds more) */
  PMP.partners = function () { return PMP.stores.concat((PMP.cfg().partners) || []); };
  PMP.partner = function (id) { return PMP.partners().filter(function (x) { return x.id === id; })[0] || { id: id, name: id, kind: 'ext' }; };
  PMP.product = function (sku) { return PMP.products.filter(function (p) { return p.sku === sku; })[0]; };

  /* ---------------- configuration (editable in simulator/01-config) ---------------- */
  function seedCfg() {
    return {
      now: '2026-10-27',
      stock: {},
      csets: [{ id: 'cs1', name: 'ร้านยา VIP ปี 2569', members: ['c-b2b'], extra: 37, note: 'ลูกค้ายอดซื้อสูง' }, { id: 'cs2', name: 'ลูกค้าติดตามหนี้', members: ['c-b2c'], extra: 5, note: '' }],
      flash: [{ id: 'fl1', name: 'Flash Sale 10.27', start: '2026-10-27', end: '2026-10-27', active: true, quota: 50, used: 12, rules: [{ ps: 'ps1', pct: 20 }, { ps: 'ps2', pct: 15 }] }],
      paper: [
        { id: 'pp1', benefit: 'discount', item: '', settle: 'pay', cost: 0, serial: { on: false, prefix: '', from: 1, to: 0 }, code: 'OCT50', name: 'คูปองกระดาษ ลด ฿50 งานสัมมนา ต.ค.', value: 50, min: 500, issued: 2000, maxPerStore: 0, stores: { mode: 'pick', ids: ['s1', 's2', 's3'] }, active: true, payDays: 30, back: 'ใช้ได้เฉพาะหน้าร้านที่ร่วมรายการ ไม่ใช้ร่วมโปรอื่น' },
        { id: 'pp2', benefit: 'discount', item: '', settle: 'pay', cost: 0, serial: { on: false, prefix: '', from: 1, to: 0 }, code: 'NOV80', name: 'คูปองกระดาษ ลด ฿80 บูท พ.ย.', value: 80, min: 800, issued: 1000, maxPerStore: 0, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, back: 'ใช้ได้ทุกร้านที่ลงทะเบียน' },
        { id: 'pp3', benefit: 'item', item: 'ไอศกรีมวานิลลา 1 ถ้วย', settle: 'pay', cost: 25, serial: { on: false, prefix: '', from: 1, to: 0 }, code: 'ICE1', name: 'คูปองไอศกรีมฟรี 1 ถ้วย (พาร์ทเนอร์)', value: 0, min: 0, issued: 1000, maxPerStore: 0, stores: { mode: 'pick', ids: ['x1'] }, active: true, payDays: 30, back: 'แลกไอศกรีมวานิลลา 1 ถ้วยฟรี ที่ร้านไอศกรีมสุขใจ ทุกสาขา · 1 ใบ/ถ้วย · ไม่แลกเป็นเงินสด' }],
      kits: [
        { id: 'kt1', name: 'ชุดร้านยาเปิดใหม่ S', disc: 5, aud: 'B2B', items: [{ sku: 'PAR-500', qty: 50, min: 20, req: true }, { sku: 'SY-3ML', qty: 10, min: 5, req: true }, { sku: 'BM-VC500', qty: 6, min: 0, req: false }, { sku: 'PP-DM', qty: 4, min: 0, req: false }] },
        { id: 'kt2', name: 'ชุดร้านยาเปิดใหม่ L', disc: 8, aud: 'B2B', items: [{ sku: 'PAR-500', qty: 100, min: 50, req: true }, { sku: 'SY-3ML', qty: 30, min: 10, req: true }, { sku: 'BM-VC500B', qty: 2, min: 0, req: false }, { sku: 'DX-MP1', qty: 6, min: 0, req: false }] }],
      shipping: { fee: 80, freeOver: 1500 },
      pay: { ptBaht: 1, maxPct: 20, enabled: true },
      psets: [
        { id: 'ps1', name: 'Blackmores (ยกเว้น Pregnancy Gold)', brands: ['Blackmores'], cats: [], skus: [], exclude: ['BM-PG'] },
        { id: 'ps2', name: 'นมผงทุกตรา', brands: [], cats: ['นมผง'], skus: [], exclude: [] },
        { id: 'ps3', name: 'สินค้าหนัก (ไม่ร่วมส่งฟรี)', brands: [], cats: [], skus: ['DX-MP1', 'PP-DM'], exclude: [] }
      ],
      promos: [
        { id: 'p1', name: 'ซื้อ Blackmores ครบ ฿1,000 ลด 5%', kind: 'cond', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 100, used: 37, perCust: 2,
          aud: 'all', ctype: 'amt', min: 1000, scope: { mode: 'pset', ref: 'ps1' }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true },
        { id: 'p5', name: 'ซื้อ Vitamin C ครบ 3 ขวด ลด 10%', kind: 'cond', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 50, used: 27, perCust: 2,
          aud: 'all', ctype: 'qty', min: 3, scope: { mode: 'skus', ref: ['BM-VC500', 'BM-VC500B'] }, strict: false, stackPromo: false, stackCoupon: true, stackPoints: false },
        { id: 'p7', name: 'ซื้อนมผง Dumex ครบ 2 กระป๋อง แถมขวดนม + ส่งฟรี + 50 พอยท์', kind: 'cond', start: '2026-10-15', end: '2026-11-30', active: true, quotaTotal: 80, used: 12, perCust: 3,
          aud: 'all', ctype: 'qty', min: 2, scope: { mode: 'skus', ref: ['DX-MP1'] }, strict: true, stackPromo: true, stackCoupon: true, stackPoints: true },
        { id: 'p9', name: 'ลูกค้าใหม่ ซื้อครบ ฿5,000 ลด ฿300 + ลุ้นโชค 1 สิทธิ์', kind: 'cond', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 200, used: 31, perCust: 1,
          aud: 'new', ctype: 'amt', min: 5000, scope: { mode: 'all', ref: null }, strict: false, stackPromo: true, stackCoupon: false, stackPoints: true },
        { id: 'p10', name: 'วันพิเศษ 10.27 ซื้อเท่าไรก็ได้ ลด 10% (สูงสุด ฿500) + พอยท์ ×2', kind: 'cond', start: '2026-10-27', end: '2026-10-27', active: true, quotaTotal: 300, used: 120, perCust: 1,
          aud: 'all', ctype: 'amt', min: 0, scope: { mode: 'all', ref: null }, strict: false, stackPromo: false, stackCoupon: true, stackPoints: true },
        { id: 'p11', name: 'ซื้อผ้าอ้อมครบ 2 แพ็ก ลด ฿60 (โควตาหมดแล้ว)', kind: 'cond', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 20, used: 20, perCust: 1,
          aud: 'all', ctype: 'qty', min: 2, scope: { mode: 'skus', ref: ['PP-DM'] }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true },
        { id: 'p12', name: 'ซื้อเข็มฉีดยาครบ 5 กล่อง แถม 1 กล่อง (ยังไม่เริ่ม)', kind: 'cond', start: '2026-12-01', end: '2026-12-31', active: true, quotaTotal: 100, used: 0, perCust: 2,
          aud: 'all', ctype: 'qty', min: 5, scope: { mode: 'skus', ref: ['SY-3ML'] }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true },
        { id: 'p13', name: 'ซื้อสินค้ากลุ่มนมผง รับพอยท์ ×1.5', kind: 'cond', start: '2026-10-01', end: '2026-11-30', active: true, quotaTotal: 0, used: 0, perCust: 0,
          aud: 'all', ctype: 'qty', min: 1, scope: { mode: 'pset', ref: 'ps2' }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true }
      ],
      coupons: [
        { id: 'k1', code: 'SAVE100', name: 'โค้ดลด ฿100 เมื่อซื้อครบ ฿1,000', kind: 'code', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 500, used: 120, perCust: 1,
          aud: 'all', dtype: 'baht', value: 100, cap: 0, min: 1000, scope: { mode: 'all', ref: null }, except: [], stackPromo: true, stackPoints: true },
        { id: 'k2', code: 'COLLECT-NOV', name: 'คูปองเก็บเอง ลด 8% (ไม่ร่วมสินค้าหนัก)', kind: 'collect', start: '2026-10-01', end: '2026-11-30', active: true, quotaTotal: 300, used: 80, perCust: 1,
          aud: 'all', dtype: 'pct', value: 8, cap: 300, min: 1500, scope: { mode: 'all', ref: null }, except: ['ps3'], stackPromo: false, stackPoints: true },
        { id: 'k3', code: 'MONTHLY-OCT', name: 'คูปองแจกรายเดือน ลด ฿150 เมื่อซื้อครบ ฿2,000', kind: 'monthly', start: '2026-10-01', end: '2026-10-31', active: true, quotaTotal: 0, used: 0, perCust: 1,
          aud: 'all', dtype: 'baht', value: 150, cap: 0, min: 2000, scope: { mode: 'all', ref: null }, except: [], stackPromo: true, stackPoints: true },
        { id: 'k4', code: 'FREESHIP', name: 'คูปองส่งฟรี 1 ครั้ง', kind: 'collect', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 1000, used: 40, perCust: 2,
          aud: 'all', dtype: 'ship', value: 0, cap: 0, min: 0, scope: { mode: 'all', ref: null }, except: [], stackPromo: true, stackPoints: true }
      ],
      points: {
        expiryDays: 365
      },
      catalog: [
        { id: 'r1', name: 'คูปองลด ฿100 (1 ใบ)', pts: 300, stock: 100, active: true, aud: 'all' },
        { id: 'r2', name: 'เครดิตเงินคืน ฿200', pts: 500, stock: 50, active: true, aud: 'all' },
        { id: 'r3', name: 'ชุดพรีเมียม: กระเป๋า + 1 สิทธิ์ลุ้น', pts: 800, stock: 20, active: true, aud: 'all' },
        { id: 'r4', name: 'คูปองส่งฟรี 1 ครั้ง', pts: 150, stock: 200, active: true, aud: 'all' }
      ],
      ladders: [
        { id: 'l1', name: 'สะสมยอดรายปี 2569 (ทั้งปีสัญญา)', start: '2026-01-01', end: '2026-12-31', active: true, aud: 'B2B', scope: { mode: 'all', ref: null },
          tiers: [{ id: 't1', at: 10000, name: 'ขั้น 1 · ฿10,000', cap: 0, formText: 'ที่อยู่จัดส่ง*\nเบอร์โทร*' }, { id: 't2', at: 30000, name: 'ขั้น 2 · ฿30,000', cap: 0, formText: 'ที่อยู่จัดส่ง*' }, { id: 't3', at: 60000, name: 'ขั้น 3 · ฿60,000', cap: 5, formText: 'ชื่อผู้เดินทางตามพาสปอร์ต*\nเบอร์โทร*\nหมายเหตุ' }] }
      ],
      raffles: [
        { id: 'f1', mode: 'A', style: 'wheel', speed: 'normal', name: 'ลุ้นโชคปลายปี 2569 (ลุ้นทันที)', desc: 'ใช้สิทธิ์ 1 ใบ หมุนวงล้อ รู้ผลทันที', start: '2026-10-01', end: '2026-12-31', active: true, aud: 'all', perBaht: 1000, ptsPer: 300,
          prizes: [{ id: 'z1', name: 'รางวัลปลอบใจ', weight: 50, stock: 999 }, { id: 'z2', name: 'คูปองลด ฿100', weight: 30, stock: 200 }, { id: 'z3', name: 'พอยท์ 500', weight: 15, stock: 100 }, { id: 'z4', name: 'ชุดของพรีเมียม', weight: 5, stock: 10 }] },
        { id: 'f2', mode: 'B', name: 'จับรางวัลใหญ่ส่งท้ายปี 2569 (จับตามรอบ)', desc: 'นำสิทธิ์ลงกอง รอประกาศผลตามวันที่กำหนด', start: '2026-10-01', end: '2026-12-25', drawAt: '2026-12-31', active: true, aud: 'all', perBaht: 5000, ptsPer: 0, poolOthers: 240,
          prizes: [{ id: 'z5', name: 'ทริปญี่ปุ่น 2 ท่าน', winners: 1 }, { id: 'z6', name: 'iPad Air', winners: 2 }, { id: 'z7', name: 'คูปองลด ฿500', winners: 5 }] }
      ],
      notify: {
        points: { on: true, days: 30 },
        ladder: { on: true, at80: true, at95: true, expiryDays: 30 },
        claim: { on: true },
        coupon: { on: true, days: 3 },
        promo: { on: true, days: 3 },
        raffle: { on: true }
      }
    };
  }
  PMP.cfg = function () {
    var c = rd('pmpc.sim.cfg', null);
    if (!c) { c = seedCfg(); wr('pmpc.sim.cfg', c); }
    var d = seedCfg(), ch = false;
    if (c.quota) { delete c.quota; ch = true; }
    c.promos.forEach(function (p) { if (p.kind === 'special') { p.kind = 'cond'; if (p.id === 'p10') p.name = 'วันพิเศษ 10.27 ซื้อเท่าไรก็ได้ ลด 10% (สูงสุด ฿500) + พอยท์ ×2'; ch = true; } });
    if (c.points && c.points.mults) { delete c.points.mults; ch = true; }
    if (!c.promos.some(function (p) { return p.id === 'p13'; }) && !c._p13) { c.promos.push(d.promos.filter(function (p) { return p.id === 'p13'; })[0]); c._p13 = 1; ch = true; }
    if (c.pay && c.pay.enabled === undefined) { c.pay.enabled = true; ch = true; }
    ['csets', 'flash', 'paper', 'kits', 'stock', 'partners'].forEach(function (k) { if (!c[k]) { c[k] = d[k] || []; ch = true; } });
    c.paper.forEach(function (p) { if (p.serial && p.serial.on) { p.serial.on = false; ch = true; } if (!p.benefit) { p.benefit = 'discount'; p.item = ''; p.settle = 'pay'; p.cost = 0; p.serial = { on: false, prefix: '', from: 1, to: 0 }; ch = true; } });
    c.paper.forEach(function (p) { if (!Array.isArray(p.terms)) { p.terms = String(p.back || '').split(/\s*·\s*|\n/).map(function (x) { return x.trim(); }).filter(Boolean); ch = true; } if (p.note == null) { p.note = PMP.PAPER_NOTE; ch = true; } if (!p.tpl) { p.tpl = p.benefit === 'item' ? 'gift' : 'classic'; ch = true; } if (!p.theme) { p.theme = 'red'; ch = true; } });
    c.paper.forEach(function (p) { p.maxPerStore = 0; if (!p.start) { p.start = '2026-10-01'; p.end = '2026-12-31'; ch = true; } });
    if (!c._pp3 && !c.paper.some(function (p) { return p.id === 'pp3'; })) { c.paper.push(d.paper.filter(function (p) { return p.id === 'pp3'; })[0]); c._pp3 = 1; ch = true; }
    c.ladders.forEach(function (L, i) { L.tiers.forEach(function (t, j) { if (t.formText == null) { t.formText = 'ที่อยู่จัดส่ง*'; ch = true; } }); });
    c.raffles.forEach(function (f) { if (f.mode !== 'A' && f.mode !== 'B') { f.mode = 'A'; ch = true; } if (f.ptsPer == null) { f.ptsPer = 0; ch = true; } if (!f.aud) { f.aud = 'all'; ch = true; } if (f.mode === 'B' && !f.drawAt) { f.drawAt = f.end; ch = true; } if (f.mode === 'B') f.prizes.forEach(function (z) { if (z.winners == null) { z.winners = 1; ch = true; } }); if (f.mode === 'A' && /ลุ้นโชคปลายปี/.test(f.name) && !/ลุ้นทันที/.test(f.name)) { f.name += ' (ลุ้นทันที)'; ch = true; } });
    if (!c._f2 && !c.raffles.some(function (f) { return f.id === 'f2'; })) { c.raffles.push(d.raffles.filter(function (f) { return f.id === 'f2'; })[0]); c._f2 = 1; ch = true; }
    if (!c.notify) { c.notify = d.notify; ch = true; }
    if (ch) wr('pmpc.sim.cfg', c);
    return c;
  };
  PMP.saveCfg = function (c) { wr('pmpc.sim.cfg', c); };
  PMP.resetCfg = function () { try { if (LS) { Object.keys(LS).forEach(function (k) { if (k.indexOf('pmpc.') === 0) LS.removeItem(k); }); } } catch (e) {} mem = {}; };

  /* seed reward groups (the one reward component, stored per owner) */
  var SEED_RWD = {
    'promotion.p1': [{ k: 'disc', mode: 'pct', value: 5, cap: 200 }],
    'promotion.p5': [{ k: 'disc', mode: 'pct', value: 10, cap: 150 }],
    'promotion.p7': [{ k: 'gift', sku: 'BT-PP01', qty: 1 }, { k: 'ship' }, { k: 'points', pts: 50 }],
    'promotion.p9': [{ k: 'disc', mode: 'baht', value: 300, cap: 0 }, { k: 'entitle', activityId: 'f1', tickets: 1 }],
    'promotion.p10': [{ k: 'disc', mode: 'pct', value: 10, cap: 500 }, { k: 'points', mode: 'mult', value: 2 }],
    'promotion.p13': [{ k: 'points', mode: 'mult', value: 1.5 }],
    'promotion.p11': [{ k: 'disc', mode: 'baht', value: 60, cap: 0 }],
    'promotion.p12': [{ k: 'gift', sku: 'SY-3ML', qty: 1 }],
    'points.r1': [{ k: 'coupon', couponId: 'k1', qty: 1 }],
    'points.r2': [{ k: 'credit', amount: 200, expiryDays: 90 }],
    'points.r3': [{ k: 'offpos', text: 'กระเป๋าผ้า Pharmaplex (รับที่คลัง)', qty: 1 }, { k: 'entitle', activityId: 'f1', tickets: 1 }],
    'points.r4': [{ k: 'coupon', couponId: 'k4', qty: 1 }],
    'campaign.l1-t1': [{ k: 'coupon', couponId: 'k1', qty: 2 }, { k: 'points', pts: 100 }],
    'campaign.l1-t2': [{ k: 'credit', amount: 500, expiryDays: 180 }, { k: 'entitle', activityId: 'f1', tickets: 3 }],
    'campaign.l1-t3': [{ k: 'offpos', text: 'ทริปสัมมนาต่างประเทศ 2 ท่าน (สุ่มจับรางวัลนอกระบบ)', qty: 1 }, { k: 'credit', amount: 1500, expiryDays: 365 }],
    'raffle.z1': [{ k: 'points', pts: 5 }],
    'raffle.z2': [{ k: 'coupon', couponId: 'k1', qty: 1 }],
    'raffle.z3': [{ k: 'points', pts: 500 }],
    'raffle.z4': [{ k: 'offpos', text: 'ชุดของพรีเมียม (ส่งทางไปรษณีย์)', qty: 1 }, { k: 'credit', amount: 300, expiryDays: 90 }],
    'raffle.z5': [{ k: 'offpos', text: 'ทริปญี่ปุ่น 2 ท่าน (ทีมงานติดต่อภายใน 7 วัน)', qty: 1 }],
    'raffle.z6': [{ k: 'offpos', text: 'iPad Air (ส่งทางไปรษณีย์)', qty: 1 }],
    'raffle.z7': [{ k: 'coupon', couponId: 'k1', qty: 5 }]
  };
  PMP.seedReward = function (module, ref) { return clone(SEED_RWD[module + '.' + ref] || []); };

  /* ---------------- per-customer state ---------------- */
  function seedState() {
    var st = { customers: {}, orders: [], log: [] };
    PMP.customers.forEach(function (c) {
      st.customers[c.id] = { points: c.id === 'c-b2b' ? 1240 : c.id === 'c-b2c' ? 300 : 0, lots: c.id === 'c-b2b' ? [{ pts: 240, exp: addDays(seedCfg().now, 20) }] : [], credit: 0, orders: c.id === 'c-b2b' ? 12 : c.id === 'c-b2c' ? 3 : 0,
        wallet: [], tickets: { f1: c.id === 'c-b2b' ? 2 : 0, f2: c.id === 'c-b2b' ? 2 : 0 }, promoUse: {}, couponUse: {}, ladder: { l1: { spent: c.id === 'c-b2b' ? 8400 : 0, unlocked: [], claimed: [] } }, queue: [], draws: [], ledger: [], collected: {} };
    });
    st.shared = { promoUsed: {}, couponUsed: {}, prizeUsed: {}, rafflePool: {}, drawResult: {} };
    return st;
  }
  PMP.state = function () { var s = rd('pmpc.sim.state', null); if (!s) { s = seedState(); wr('pmpc.sim.state', s); } return s; };
  PMP.saveState = function (s) { wr('pmpc.sim.state', s); };
  PMP.resetState = function () { wr('pmpc.sim.state', seedState()); };
  PMP.resetAll = function () { PMP.resetCfg(); PMP.resetState(); };

  /* ---------------- helpers ---------------- */
  function inRange(now, s, e) { return (!s || now >= s) && (!e || now <= e); }
  function psetById(cfg, id) { return cfg.psets.filter(function (x) { return x.id === id; })[0]; }
  function inPset(ps, p) {
    if (!ps) return false;
    if (ps.exclude.indexOf(p.sku) > -1) return false;
    return ps.brands.indexOf(p.brand) > -1 || ps.cats.indexOf(p.cat) > -1 || ps.skus.indexOf(p.sku) > -1;
  }
  function inScope(cfg, scope, p) {
    if (!scope || scope.mode === 'all') return true;
    if (scope.mode === 'skus') return (scope.ref || []).indexOf(p.sku) > -1;
    if (scope.mode === 'pset') return inPset(psetById(cfg, scope.ref), p);
    return false;
  }
  PMP.inScope = inScope;
  function customer(id) { return PMP.customers.filter(function (c) { return c.id === id; })[0]; }
  function audOk(aud, cust, cs) {
    if (!aud || aud === 'all') return true;
    if (String(aud).indexOf('set:') === 0) { var S = PMP.cfg().csets.filter(function (x) { return x.id === aud.slice(4); })[0]; return !!S && S.members.indexOf(cust.id) > -1; }
    if (aud === 'B2B' || aud === 'B2C') return cust.type === aud;
    if (aud === 'new') return cs.orders === 0;
    return true;
  }
  PMP.status = function (o, now) {
    if (!o.active) return 'inactive';
    if (o.start && now < o.start) return 'upcoming';
    if (o.end && now > o.end) return 'expired';
    if (o.quotaTotal && o.used >= o.quotaTotal) return 'exhausted';
    return 'running';
  };
  PMP.statusLabel = { running: 'กำลังใช้งาน', upcoming: 'ยังไม่เริ่ม', expired: 'หมดอายุ', inactive: 'ไม่ใช้งาน', exhausted: 'หมดโควต้า' };

  /* ---------------- reward service ---------------- */
  var KIND_LABEL = { gift: 'ของแถม', disc: 'ส่วนลด', ship: 'ฟรีค่าจัดส่ง', points: 'พอยท์', coupon: 'คูปอง', credit: 'เครดิตเงินคืน', entitle: 'สิทธิ์ลุ้น', offpos: 'ของรางวัลนอก POS' };
  PMP.kindLabel = KIND_LABEL;
  PMP.rewardsOf = function (module, ref) {
    var k = 'pmpc.rwd.' + module + '.' + ref, g1 = rd(k, null);
    if (g1 && g1.items) return g1.items;
    return PMP.seedReward(module, ref);
  };
  PMP.saveRewards = function (module, ref, items) { wr('pmpc.rwd.' + module + '.' + ref, { sourceModule: module, ownerRef: ref, items: items }); };
  PMP.describe = function (it, cfg) {
    cfg = cfg || PMP.cfg();
    switch (it.k) {
      case 'gift': var p = PMP.product(it.sku); return 'แถม ' + (p ? p.name : it.sku) + ' × ' + (it.qty || 1);
      case 'disc': return it.mode === 'pct' ? 'ลด ' + it.value + '%' + (it.cap ? ' (สูงสุด ' + baht(it.cap) + ')' : '') : 'ลด ' + baht(it.value || 0);
      case 'ship': return 'ฟรีค่าจัดส่ง';
      case 'points': return it.mode === 'mult' ? 'พอยท์ ×' + (it.value || 1) + ' (ของสินค้าที่เข้าโปร)' : 'รับ ' + (it.pts || 0).toLocaleString('en-US') + ' พอยท์';
      case 'coupon': var k = cfg.coupons.filter(function (x) { return x.id === it.couponId; })[0]; return 'คูปอง ' + (k ? k.code : '?') + ' × ' + (it.qty || 1);
      case 'credit': return 'เครดิตเงินคืน ' + baht(it.amount || 0) + (it.expiryDays ? ' (หมดอายุ ' + it.expiryDays + ' วัน)' : '');
      case 'entitle': var f = cfg.raffles.filter(function (x) { return x.id === it.activityId; })[0]; return 'สิทธิ์ลุ้น ' + (it.tickets || 1) + ' ใบ · ' + (f ? f.name : '?');
      case 'offpos': return 'ของรางวัลนอก POS: ' + (it.text || '-') + ' × ' + (it.qty || 1);
    }
    return it.k;
  };

  /* grant the non-cart parts of a reward group to a customer (called after payment / redeem / claim / draw) */
  PMP.grant = function (st, cid, items, src, cfg) {
    var cs = st.customers[cid], out = [], now = cfg.now;
    items.forEach(function (it) {
      if (it.k === 'points') { cs.points += it.pts; cs.ledger.unshift({ d: now, t: '+' + it.pts, why: src }); cs.lots.push({ pts: it.pts, exp: addDays(now, cfg.points.expiryDays) }); out.push('+' + it.pts + ' พอยท์'); }
      else if (it.k === 'coupon') { for (var i = 0; i < (it.qty || 1); i++) cs.wallet.push({ id: uid('w'), couponId: it.couponId, used: false, src: src }); out.push('คูปอง × ' + (it.qty || 1) + ' เข้ากระเป๋า'); }
      else if (it.k === 'credit') { cs.credit += it.amount; out.push('เครดิตเงินคืน +' + baht(it.amount)); }
      else if (it.k === 'entitle') { cs.tickets[it.activityId] = (cs.tickets[it.activityId] || 0) + (it.tickets || 1); out.push('สิทธิ์ลุ้น +' + (it.tickets || 1)); }
      else if (it.k === 'offpos') { cs.queue.push({ id: uid('q'), text: it.text, qty: it.qty || 1, src: src, d: now, status: 'รอส่งมอบ' }); out.push('คิวรับของ: ' + it.text); }
      else if (it.k === 'gift') { cs.queue.push({ id: uid('q'), text: 'ของแถม ' + (PMP.product(it.sku) || { name: it.sku }).name, qty: it.qty || 1, src: src, d: now, status: 'รอส่งมอบ' }); out.push('ของแถมเข้าคิวส่งมอบ'); }
    });
    return out;
  };
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  PMP.addDays = addDays;

  /* ---------------- cart engine ---------------- */
  /* cart: [{sku, qty}] · opts: {customerId, promoIds:[], couponRef:{type:'code'|'wallet', value}, usePoints:int, useCredit:bool} */
  PMP.price = function (cart, opts) {
    var cfg = PMP.cfg(), st = PMP.state(), now = cfg.now, cust = customer(opts.customerId), cs = st.customers[opts.customerId];
    var R = { lines: [], notes: [], eligible: [], promoApplied: [], gifts: [], rewards: [], shipFree: false, coupon: null, couponErr: null, trace: [] };
    var line = {};
    cart.forEach(function (c) {
      if (!c.qty) return;
      var p = PMP.product(c.sku); line[c.sku] = { sku: c.sku, p: p, qty: c.qty, unit: p.price, base: p.price, tag: '', promoDisc: 0, couponDisc: 0 };
    });
    var lines = Object.keys(line).map(function (k) { return line[k]; });
    /* 1 — Flash Sale */
    /* 1b — Flash Sale (ลดตามวันพิเศษ): % ต่อกลุ่มสินค้า + โควตารอบ */
    R.flashUse = {};
    (cfg.flash || []).forEach(function (f) {
      if (PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, now) !== 'running') return;
      var left = f.quota ? f.quota - f.used : 1e9;
      lines.forEach(function (l) {
        if (l.flash || left <= 0) return;
        var rule = f.rules.filter(function (r) { return inPset(psetById(cfg, r.ps), l.p); })[0];
        if (!rule) return;
        var n = Math.min(l.qty, left); left -= n;
        l.flash = { id: f.id, n: n, pct: rule.pct, disc: Math.round(n * l.base * rule.pct) / 100 };
        R.flashUse[f.id] = (R.flashUse[f.id] || 0) + n;
        R.trace.push('Flash “' + f.name + '”: ' + l.p.sku + ' ลด ' + rule.pct + '% × ' + n + ' (โควตารอบเหลือ ' + left + ')');
      });
    });
    lines.forEach(function (l) { l.amount = l.qty * l.base - (l.flash ? l.flash.disc : 0); l.gross = l.amount; });
    var subtotal = lines.reduce(function (a, l) { return a + l.amount; }, 0);
    R.subtotal = subtotal; R.lines = lines;

    /* 2 — promotions: who is eligible, in cards */
    var running = cfg.promos.filter(function (p) { return PMP.status(p, now) === 'running'; });
    running.forEach(function (p) {
      var card = { p: p, ok: false, why: '', near: '' };
      if (!audOk(p.aud, cust, cs)) { card.why = p.aud === 'new' ? 'เฉพาะลูกค้าใหม่ที่ยังไม่เคยสั่งซื้อ' : 'เฉพาะลูกค้า ' + p.aud; R.eligible.push(card); return; }
      if (p.perCust && (cs.promoUse[p.id] || 0) >= p.perCust) { card.why = 'ใช้สิทธิ์ครบ ' + p.perCust + ' ครั้งแล้ว'; R.eligible.push(card); return; }
      var m = matchPromo(cfg, p, lines);
      if (m.ok) { card.ok = true; card.m = m; } else { card.why = m.why; card.near = m.near; }
      R.eligible.push(card);
    });

    /* 3 — selected promos: sequential, only compatible ones */
    var chosen = [];
    (opts.promoIds || []).forEach(function (id) {
      var card = R.eligible.filter(function (c) { return c.p.id === id && c.ok; })[0];
      if (!card) return;
      var bad = chosen.filter(function (o) { return !o.p.stackPromo || !card.p.stackPromo; })[0];
      if (bad) { R.trace.push('ข้าม “' + card.p.name + '” — ใช้ร่วมกับ “' + bad.p.name + '” ไม่ได้'); return; }
      chosen.push(card);
    });
    var shipFree = false, grants = [], promoDiscTotal = 0;
    chosen.forEach(function (card) {
      var p = card.p, items = PMP.rewardsOf('promotion', p.id), scopeLines = card.m.lines, d = 0, notes = [];
      items.forEach(function (it) {
        if (it.k === 'disc') {
          var base = scopeLines.reduce(function (a, l) { return a + (l.amount - l.promoDisc - l.couponDisc); }, 0), v = 0;
          if (it.mode === 'pct') { v = base * (it.value || 0) / 100; if (it.cap && v > it.cap) { v = it.cap; notes.push('ติดเพดาน ' + baht(it.cap)); } }
          else v = Math.min(it.value || 0, base);
          v = Math.round(v * 100) / 100; d += v;
          var rest = v; scopeLines.forEach(function (l, i) { var share = i === scopeLines.length - 1 ? rest : Math.round(v * (l.amount - l.promoDisc) / (base || 1) * 100) / 100; l.promoDisc += share; rest -= share; });
        } else if (it.k === 'gift') { R.gifts.push({ sku: it.sku, qty: (it.qty || 1) * card.m.times, from: p.name }); }
        else if (it.k === 'ship') { shipFree = true; }
        else if (it.k === 'points' && it.mode === 'mult') { scopeLines.forEach(function (l) { l.ptsMult = (l.ptsMult || 1) + (it.value || 1) - 1; }); notes.push('พอยท์ ×' + (it.value || 1)); }
        else grants.push({ it: it, mult: card.m.times, from: p.name });
      });
      promoDiscTotal += d;
      R.promoApplied.push({ id: p.id, name: p.name, discount: d, times: card.m.times, items: items.map(function (i) { return PMP.describe(i, cfg); }), notes: notes });
      R.trace.push('โปร “' + p.name + '”: เข้าเงื่อนไข ' + card.m.times + ' ชุด → ' + items.map(function (i) { return PMP.describe(i, cfg); }).join(' + '));
    });
    R.promoDisc = Math.round(promoDiscTotal * 100) / 100;
    R.chosen = chosen;

    /* 4 — coupon */
    var afterPromo = subtotal - R.promoDisc, couponDisc = 0;
    if (opts.couponRef && opts.couponRef.value) {
      var kp = null, wid = null;
      if (opts.couponRef.type === 'wallet') { var w = cs.wallet.filter(function (x) { return x.id === opts.couponRef.value && !x.used; })[0]; if (w) { wid = w.id; kp = cfg.coupons.filter(function (k) { return k.id === w.couponId; })[0]; } else R.couponErr = 'ไม่พบคูปองในกระเป๋า'; }
      else { var code = String(opts.couponRef.value).trim().toUpperCase(); kp = cfg.coupons.filter(function (k) { return k.code === code; })[0]; if (!kp) R.couponErr = 'ไม่พบโค้ด “' + code + '”'; else if (kp.kind !== 'code' && kp.kind !== 'collect') { R.couponErr = 'คูปองนี้ต้องเก็บ/รับเข้ากระเป๋าก่อนใช้'; kp = null; } else if (kp.kind === 'collect' && !cs.wallet.some(function (x) { return x.couponId === kp.id && !x.used; })) { R.couponErr = 'คูปองนี้เป็นแบบเก็บเอง — กดเก็บในศูนย์คูปองก่อน'; kp = null; } else if (kp.kind === 'collect') wid = cs.wallet.filter(function (x) { return x.couponId === kp.id && !x.used; })[0].id; }
      if (kp && !R.couponErr) {
        var why = null;
        if (PMP.status(kp, now) !== 'running') why = 'คูปองนี้ ' + PMP.statusLabel[PMP.status(kp, now)];
        else if (!audOk(kp.aud, cust, cs)) why = 'คูปองนี้ไม่เปิดให้กลุ่มของคุณ';
        else if (kp.kind !== 'monthly' && kp.perCust && (cs.couponUse[kp.id] || 0) >= kp.perCust && opts.couponRef.type !== 'wallet') why = 'ใช้ครบโควตาต่อคนแล้ว';
        else {
          var bad2 = chosen.filter(function (c) { return !kp.stackPromo || !c.p.stackCoupon; })[0];
          if (bad2) why = 'ใช้ร่วมกับโปร “' + bad2.p.name + '” ไม่ได้ (ยกเลิกโปรนั้นก่อน หรือเปลี่ยนคูปอง)';
        }
        var elig = lines.filter(function (l) { return inScope(cfg, kp.scope, l.p) && !(kp.except || []).some(function (id) { return inPset(psetById(cfg, id), l.p); }); });
        var eligAmt = elig.reduce(function (a, l) { return a + l.amount - l.promoDisc; }, 0);
        if (!why && kp.dtype !== 'ship' && eligAmt <= 0) why = 'ไม่มีสินค้าในตะกร้าที่ใช้คูปองนี้ได้ (ติดข้อยกเว้นหรือนอกขอบเขต)';
        if (!why && afterPromo < kp.min) why = 'ยอดซื้อยังไม่ถึงขั้นต่ำ ' + baht(kp.min) + ' (ตอนนี้ ' + baht(afterPromo) + ')';
        if (why) R.couponErr = why;
        else {
          if (kp.dtype === 'ship') { shipFree = true; couponDisc = 0; }
          else { couponDisc = kp.dtype === 'pct' ? Math.min(eligAmt * kp.value / 100, kp.cap || 1e12) : Math.min(kp.value, eligAmt); couponDisc = Math.round(couponDisc * 100) / 100; }
          R.coupon = { id: kp.id, code: kp.code, name: kp.name, discount: couponDisc, walletId: wid, ship: kp.dtype === 'ship', excluded: lines.filter(function (l) { return elig.indexOf(l) < 0; }).map(function (l) { return l.p.name; }), stackPoints: kp.stackPoints };
          R.trace.push('คูปอง ' + kp.code + ': ' + (kp.dtype === 'ship' ? 'ฟรีค่าจัดส่ง' : 'ลด ' + baht(couponDisc)) + (R.coupon.excluded.length ? ' (ไม่นับ ' + R.coupon.excluded.length + ' รายการที่ติดข้อยกเว้น)' : ''));
        }
      }
    }
    R.couponDisc = couponDisc;

    /* 5 — shipping */
    var goods = afterPromo - couponDisc;
    R.shipBase = cfg.shipping.fee;
    R.shipping = (shipFree || goods >= cfg.shipping.freeOver || goods <= 0) ? 0 : cfg.shipping.fee;
    R.shipFree = shipFree;
    if (R.shipping === 0 && !shipFree && goods >= cfg.shipping.freeOver) R.trace.push('ค่าส่งฟรี — ยอดสินค้าถึง ' + baht(cfg.shipping.freeOver));

    /* 6 — pay with points / credit */
    var payable = goods + R.shipping;
    R.pointsOff = cfg.pay.enabled === false;
    var okPts = !R.pointsOff && chosen.every(function (c) { return c.p.stackPoints; }) && (!R.coupon || R.coupon.stackPoints);
    R.pointsBlocked = (!okPts && !R.pointsOff) ? (chosen.filter(function (c) { return !c.p.stackPoints; })[0] || { p: { name: 'คูปองที่เลือก' } }).p.name : null;
    var maxByPct = Math.floor(goods * cfg.pay.maxPct / 100 / cfg.pay.ptBaht);
    R.pointsMax = okPts ? Math.max(0, Math.min(cs.points, maxByPct)) : 0;
    R.pointsUsed = okPts ? Math.max(0, Math.min(opts.usePoints || 0, R.pointsMax)) : 0;
    R.pointsDisc = R.pointsUsed * cfg.pay.ptBaht;
    payable -= R.pointsDisc;
    R.creditUsed = opts.useCredit ? Math.min(cs.credit, Math.max(0, payable)) : 0;
    payable -= R.creditUsed;
    R.total = Math.max(0, Math.round(payable * 100) / 100);

    /* 7 — what the order will earn */
    var net = Math.max(0, goods - R.pointsDisc);
    /* points = qty × the product's own points/unit (0 when the product has none) × promotion multiplier. No default rate. */
    var earn = 0, earnTrace = [];
    lines.forEach(function (l) {
      var pv = (cfg.pts && cfg.pts[l.p.sku] != null) ? cfg.pts[l.p.sku] : l.p.pts; l.basePts = pv ? l.qty * pv : 0; l.ptsMult = l.basePts ? (l.ptsMult || 1) : 1;
      l.pts = Math.round(l.basePts * l.ptsMult); earn += l.pts;
      if (l.ptsMult > 1 && l.basePts) earnTrace.push(l.p.sku + ' ×' + l.ptsMult);
    });
    R.earnBase = earn;
    R.earnMultNote = earnTrace;
    R.bonusPts = grants.reduce(function (a, g) { return a + (g.it.k === 'points' ? (g.it.pts || 0) * g.mult : 0); }, 0);
    var tickets = {};
    cfg.raffles.forEach(function (f) { if (PMP.status(f, now) === 'running' && f.perBaht) { var n = Math.floor(net / f.perBaht); if (n > 0) tickets[f.id] = n; } });
    R.ticketsBuy = tickets;
    R.grants = grants;
    // ladder preview
    R.ladderAdd = {};
    cfg.ladders.forEach(function (L) {
      if (PMP.status(L, now) !== 'running' || !audOk(L.aud, cust, cs)) return;
      var tot = 0; lines.forEach(function (l) { if (!inScope(cfg, L.scope, l.p)) return; var v = Math.round((l.amount - l.promoDisc - l.couponDisc) * 100) / 100; (l.ladder = l.ladder || {})[L.id] = v; tot += v; });
      R.ladderAdd[L.id] = Math.round(tot * 100) / 100;
    });
    return R;
  };

  /* does the cart satisfy a promotion? → {ok, times, lines, why, near} */
  function matchPromo(cfg, p, lines) {
    var scoped = lines.filter(function (l) { return inScope(cfg, p.scope, l.p); });
    if (!scoped.length) return { ok: false, why: 'ยังไม่มีสินค้าที่เข้าเงื่อนไขในตะกร้า', near: '' };
    var qty = 0, amt = 0;
    if (p.ctype === 'qty') {
      if (p.strict) { // strict unit: only count lines whose unit is the base unit (factor 1)
        scoped.forEach(function (l) { if (l.p.factor === 1) qty += l.qty; });
      } else { scoped.forEach(function (l) { qty += l.qty * l.p.factor; }); }
    }
    amt = scoped.reduce(function (a, l) { return a + l.amount - l.promoDisc; }, 0);
    if (p.ctype === 'qty') {
      if (qty < p.min) return { ok: false, why: 'ซื้ออีก ' + (p.min - qty) + ' ' + (p.strict ? 'หน่วย (ตรวจหน่วยเข้มงวด นับเฉพาะหน่วยเดียวกัน)' : 'หน่วย') + ' จะได้รับสิทธิ์', near: 'อีก ' + (p.min - qty) };
      return { ok: true, times: Math.max(1, 1), lines: scoped, qty: qty };
    }
    if (amt < p.min) return { ok: false, why: 'ซื้ออีก ' + baht(p.min - amt) + ' จะได้รับสิทธิ์', near: 'อีก ' + baht(p.min - amt) };
    return { ok: true, times: 1, lines: scoped, amt: amt };
  }

  /* promo ↔ promo compatibility map for the UI cards */
  PMP.compat = function (a, b) { return a.stackPromo && b.stackPromo; };

  /* ---------------- checkout: apply everything for real ---------------- */
  PMP.checkout = function (cart, opts) {
    var cfg = PMP.cfg(), st = PMP.state(), R = PMP.price(cart, opts), cs = st.customers[opts.customerId], now = cfg.now, log = [];
    if (!R.lines.length) return { error: 'ตะกร้าว่าง' };
    R.chosen.forEach(function (c) { c.p.used++; cs.promoUse[c.p.id] = (cs.promoUse[c.p.id] || 0) + 1; log.push('ตัดโควตาโปร ' + c.p.id + ' (ทั้งหมด ' + c.p.used + '/' + (c.p.quotaTotal || '∞') + ')'); });
    if (R.coupon) { var kp = cfg.coupons.filter(function (k) { return k.id === R.coupon.id; })[0]; kp.used++; cs.couponUse[kp.id] = (cs.couponUse[kp.id] || 0) + 1; if (R.coupon.walletId) cs.wallet.forEach(function (w) { if (w.id === R.coupon.walletId) w.used = true; }); log.push('ใช้คูปอง ' + kp.code); }
    if (R.pointsUsed) { cs.points -= R.pointsUsed; cs.ledger.unshift({ d: now, t: '-' + R.pointsUsed, why: 'ใช้เป็นส่วนลดในออเดอร์' }); log.push('หักพอยท์ ' + R.pointsUsed); }
    if (R.creditUsed) { cs.credit -= R.creditUsed; log.push('หักเครดิต ' + baht(R.creditUsed)); }
    Object.keys(R.flashUse || {}).forEach(function (fid) { var f = cfg.flash.filter(function (x) { return x.id === fid; })[0]; f.used += R.flashUse[fid]; log.push('ตัดโควตา Flash ' + f.name + ' −' + R.flashUse[fid]); });
    // earn
    if (R.earnBase) { cs.points += R.earnBase; cs.ledger.unshift({ d: now, t: '+' + R.earnBase, why: 'ซื้อสินค้า (รายสินค้า × ตัวคูณ)' }); cs.lots.push({ pts: R.earnBase, exp: addDays(now, cfg.points.expiryDays) }); log.push('ได้พอยท์ ' + R.earnBase); }
    Object.keys(R.ticketsBuy).forEach(function (fid) { cs.tickets[fid] = (cs.tickets[fid] || 0) + R.ticketsBuy[fid]; log.push('ได้สิทธิ์ลุ้นจากยอดซื้อ +' + R.ticketsBuy[fid]); });
    R.grants.forEach(function (g) {
      var items = []; for (var i = 0; i < g.mult; i++) items.push(g.it);
      PMP.grant(st, opts.customerId, items, 'โปร ' + g.from, cfg).forEach(function (m) { log.push(m); });
    });
    R.gifts.forEach(function (g) { cs.queue.push({ id: uid('q'), text: 'ของแถม ' + PMP.product(g.sku).name, qty: g.qty, src: g.from, d: now, status: 'จัดส่งพร้อมออเดอร์' }); log.push('ของแถม ' + g.qty + ' ชิ้นแนบไปกับออเดอร์'); });
    // ladder
    cfg.ladders.forEach(function (L) {
      if (R.ladderAdd[L.id] == null) return;
      var lv = cs.ladder[L.id] || (cs.ladder[L.id] = { spent: 0, unlocked: [], claimed: [] }); lv.spent += R.ladderAdd[L.id];
      L.tiers.forEach(function (t) { if (lv.spent >= t.at && lv.unlocked.indexOf(t.id) < 0) { lv.unlocked.push(t.id); log.push('ปลดล็อก ' + L.name + ' · ' + t.name); } });
      log.push('ยอดสะสม ' + L.name + ' = ' + baht(lv.spent));
    });
    cs.orders++;
    var order = { no: 'SO' + (1000 + st.orders.length + 1), customerId: opts.customerId, d: now, lines: R.lines.map(function (l) { return { sku: l.sku, qty: l.qty, amount: l.amount, pts: l.pts || 0, ptsMult: l.ptsMult || 1, ladder: l.ladder || {} }; }), pointsEarned: R.earnBase, pointsBonus: R.bonusPts || 0, ladder: JSON.parse(JSON.stringify(R.ladderAdd || {})), status: 'ปกติ', subtotal: R.subtotal, promoDisc: R.promoDisc, couponDisc: R.couponDisc, shipping: R.shipping, pointsDisc: R.pointsDisc, creditUsed: R.creditUsed, total: R.total, promos: R.promoApplied.map(function (p) { return p.name; }), coupon: R.coupon && R.coupon.code, earn: R.earnBase, effects: log };
    st.orders.unshift(order);
    PMP.saveCfg(cfg); PMP.saveState(st);
    return { order: order, R: R };
  };

  /* cancel an order: points it earned and the amount it added to every annual-spend campaign are ALWAYS taken back (read from fields stored on the order) */
  PMP.cancelOrder = function (no) {
    var cfg = PMP.cfg(), st = PMP.state(), o = st.orders.filter(function (x) { return x.no === no; })[0];
    if (!o) return { error: 'ไม่พบออเดอร์' }; if (o.status === 'ยกเลิก') return { error: 'ออเดอร์นี้ยกเลิกไปแล้ว' };
    var cs = st.customers[o.customerId], out = [], pts = (o.pointsEarned || 0) + (o.pointsBonus || 0);
    if (pts) { var take = Math.min(cs.points, pts); cs.points -= take; cs.ledger.unshift({ d: cfg.now, t: '-' + take, why: 'ยกเลิกออเดอร์ ' + o.no + ' — หักพอยท์คืน' }); var left = take; for (var i = cs.lots.length - 1; i >= 0 && left > 0; i--) { var d = Math.min(cs.lots[i].pts, left); cs.lots[i].pts -= d; left -= d; } cs.lots = cs.lots.filter(function (x) { return x.pts > 0; }); out.push('หักพอยท์คืน ' + take + (take < pts ? ' (พอยท์คงเหลือไม่พอ ขาด ' + (pts - take) + ')' : '')); }
    Object.keys(o.ladder || {}).forEach(function (lid) { var lv = cs.ladder[lid]; if (!lv) return; lv.spent = Math.max(0, Math.round((lv.spent - o.ladder[lid]) * 100) / 100); var L = cfg.ladders.filter(function (x) { return x.id === lid; })[0]; if (L) L.tiers.forEach(function (t) { if (lv.spent < t.at && lv.unlocked.indexOf(t.id) > -1 && lv.claimed.indexOf(t.id) < 0) { lv.unlocked.splice(lv.unlocked.indexOf(t.id), 1); out.push('ขั้น ' + t.name + ' ถูกล็อกกลับ'); } }); out.push('หักยอดสะสม ' + (L ? L.name : lid) + ' ' + baht(o.ladder[lid])); });
    o.status = 'ยกเลิก'; o.cancelDate = cfg.now; o.cancelLog = out; cs.orders = Math.max(0, cs.orders - 1);
    PMP.saveState(st); return { out: out };
  };

  /* ---------------- other module services ---------------- */
  PMP.redeem = function (cid, itemId) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], it = cfg.catalog.filter(function (x) { return x.id === itemId; })[0];
    if (!it || !it.active) return { error: 'รายการนี้ปิดแลกอยู่' };
    if (it.stock <= 0) return { error: 'ของรางวัลหมด' };
    if (cs.points < it.pts) return { error: 'พอยท์ไม่พอ (ต้องใช้ ' + it.pts + ' มี ' + cs.points + ')' };
    cs.points -= it.pts; it.stock--; cs.ledger.unshift({ d: cfg.now, t: '-' + it.pts, why: 'แลก ' + it.name });
    var out = PMP.grant(st, cid, PMP.rewardsOf('points', it.id), 'แลกพอยท์: ' + it.name, cfg);
    PMP.saveCfg(cfg); PMP.saveState(st); return { out: out };
  };
  PMP.formFields = function (t) { return String(t.formText || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return { label: x.replace(/\*$/, ''), req: /\*$/.test(x) }; }); };
  PMP.claimTier = function (cid, lid, tid, answers) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], lv = cs.ladder[lid];
    if (!lv || lv.unlocked.indexOf(tid) < 0) return { error: 'ยังไม่ปลดล็อก' };
    if (lv.claimed.indexOf(tid) > -1) return { error: 'ขอรับไปแล้ว' };
    var L = cfg.ladders.filter(function (x) { return x.id === lid; })[0], t = L.tiers.filter(function (x) { return x.id === tid; })[0];
    var miss = PMP.formFields(t).filter(function (f, i) { return f.req && !(answers && String(answers[i] || '').trim()); });
    if (miss.length) return { error: 'กรอกข้อมูลที่จำเป็นให้ครบ: ' + miss.map(function (f) { return f.label; }).join(', ') };
    if (t.cap && (t.used || 0) >= t.cap) return { error: 'สิทธิ์ขั้นนี้เต็มแล้ว' };
    lv.claimed.push(tid); t.used = (t.used || 0) + 1;
    st.claims = st.claims || [];
    st.claims.unshift({ id: uid('cl'), cid: cid, lid: lid, tid: tid, name: L.name + ' · ' + t.name, answers: answers || [], labels: PMP.formFields(t).map(function (f) { return f.label; }), status: 'รอตรวจ', d: cfg.now, reason: '', snap: lv.spent, log: [{ d: cfg.now, t: 'ส่งคำขอโดยลูกค้า (ตัดสิทธิ์ขั้นนี้ไว้แล้ว)' }] });
    PMP.saveCfg(cfg); PMP.saveState(st);
    /* a tier without a form is claimable at once: nothing to review, the reward is granted automatically */
    if (!PMP.formFields(t).length) { var id0 = st.claims[0].id, st2 = PMP.state(); st2.claims[0].auto = true; PMP.saveState(st2); var ra = PMP.claimAct(id0, 'approve'); return { out: ['รับรางวัลแล้ว (ขั้นนี้ไม่มีฟอร์ม ระบบอนุมัติให้อัตโนมัติ) — ' + (ra.out || []).join(' · ')] }; }
    return { out: ['ส่งคำขอแล้ว สถานะ “รอตรวจ” — รอทีมงานอนุมัติ (ตัดสิทธิ์ขั้นนี้ไว้แล้ว)'] };
  };
  PMP.claimAct = function (claimId, act, reason) {
    var cfg = PMP.cfg(), st = PMP.state(), c = (st.claims || []).filter(function (x) { return x.id === claimId; })[0];
    if (!c || c.status !== 'รอตรวจ') return { error: 'คำขอนี้ดำเนินการแล้ว' };
    var cs = st.customers[c.cid], lv = cs.ladder[c.lid], L = cfg.ladders.filter(function (x) { return x.id === c.lid; })[0], t = L.tiers.filter(function (x) { return x.id === c.tid; })[0];
    if (act === 'approve') { c.status = 'อนุมัติ/ส่งมอบแล้ว'; (c.log = c.log || []).push({ d: cfg.now, t: (c.auto ? 'อนุมัติอัตโนมัติ (ขั้นนี้ไม่มีฟอร์ม) — ' : 'อนุมัติ — ') + 'ส่งรางวัลตาม component ของขั้น' }); var out = PMP.grant(st, c.cid, PMP.rewardsOf('campaign', c.lid + '-' + c.tid), 'แคมเปญ ' + c.name, cfg); PMP.saveCfg(cfg); PMP.saveState(st); return { out: out }; }
    if (!reason) return { error: 'ต้องระบุเหตุผลที่ปฏิเสธ' };
    c.status = 'ปฏิเสธ'; c.reason = reason; (c.log = c.log || []).push({ d: cfg.now, t: 'ปฏิเสธ · เหตุผล: ' + reason + ' (คืนสิทธิ์ให้ขั้นนี้)' }); lv.claimed = lv.claimed.filter(function (x) { return x !== c.tid; }); t.used = Math.max(0, (t.used || 1) - 1);
    PMP.saveCfg(cfg); PMP.saveState(st); return { out: ['ปฏิเสธคำขอ — คืนสิทธิ์ให้ขั้นนี้ ลูกค้าส่งใหม่ได้'] };
  };
  /* ---- paper coupons (ใช้ที่ร้าน · นับก้นคูปองเพื่อเบิกเงิน) ---- */

  /* ---- Code 128 (subset B) barcode → SVG string. Same code on every coupon of a set (no per-coupon running number). ---- */
  var C128 = ['212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212','112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131','311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321','112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121','313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111','314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114','122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212','124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113','114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'];
  PMP.code128 = function (text) {
    var t = String(text || ''), vals = [104], sum = 104, i, v;
    for (i = 0; i < t.length; i++) { v = t.charCodeAt(i) - 32; if (v < 0 || v > 94) v = 0; vals.push(v); sum += v * (i + 1); }
    vals.push(sum % 103); vals.push(106);
    return vals.map(function (x) { return C128[x]; }).join('');
  };
  /* w = quiet-zone-less module count is derived; returns {svg, modules}. h = bar height (viewBox units) */
  PMP.code128svg = function (text, h, color) {
    var pat = PMP.code128(text), x = 10, bars = '', i, w;
    for (i = 0; i < pat.length; i++) { w = +pat.charAt(i); if (i % 2 === 0) bars += '<rect x="' + x + '" y="0" width="' + w + '" height="' + (h || 40) + '"/>'; x += w; }
    var W = x + 10;
    return { modules: W, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + (h || 40) + '" preserveAspectRatio="none" fill="' + (color || '#000') + '" shape-rendering="crispEdges">' + bars + '</svg>' };
  };

  /* paper coupon templates (layout) + colour themes */
  PMP.PAPER_TPL = [
    { id: 'classic', name: 'คลาสสิก', desc: 'ตัวเลขใหญ่กลางบัตร พื้นไล่สีอ่อน ก้นคูปองด้านขวา อ่านง่ายที่สุด', fit: 'discount' },
    { id: 'band', name: 'แถบสีหัวบัตร', desc: 'แถบสีเต็มความกว้างด้านบน ชื่อแบรนด์ชัด พื้นขาวประหยัดหมึก', fit: 'both' },
    { id: 'bold', name: 'สีเต็มใบ', desc: 'พื้นสีเข้ม ตัวหนังสือขาว สะดุดตา เหมาะแจกกลางงาน/บูท', fit: 'discount' },
    { id: 'gift', name: 'ตั๋วแลกของฟรี', desc: 'กรอบหนา มีไอคอนของขวัญ เหมาะกับของแถม/บริการฟรีที่ร้านพาร์ทเนอร์', fit: 'item' },
    { id: 'minimal', name: 'มินิมอล', desc: 'พื้นขาว ขอบสีด้านซ้าย พิมพ์สีเดียวได้ ต้นทุนต่ำ', fit: 'both' }
  ];
  PMP.PAPER_THEMES = { red: { n: 'แดง Pharmaplex', pc: '#B71C1C', pt: '#FFF3F3' }, blue: { n: 'น้ำเงิน', pc: '#1565C0', pt: '#EEF5FF' }, green: { n: 'เขียว', pc: '#2E7D32', pt: '#EEF8EE' }, orange: { n: 'ส้ม', pc: '#E65100', pt: '#FFF4EA' } };
  PMP.PAPER_NOTE = 'คูปองนี้พิมพ์โดย Pharmaplex เท่านั้น ห้ามถ่ายสำเนาหรือดัดแปลง ร้านต้องเก็บก้นคูปองทุกใบเพื่อใช้เบิกเงิน หากพบคูปองชำรุดหรือสงสัยว่าปลอมแปลง โปรดแจ้งฝ่ายบริการลูกค้า';
  PMP.paperAccepts = function (pp, storeId) { return pp.active && (pp.stores.mode === 'all' ? PMP.stores.filter(function (x) { return x.kind === 'sys'; }).some(function (x) { return x.id === storeId; }) : pp.stores.ids.indexOf(storeId) > -1); };
  /* what the issuer settles per redeemed coupon: discount sets → the printed value; free-item sets → agreed cost (0 when the partner sponsors) */
  PMP.paperUnit = function (pp) { return pp.benefit === 'item' ? (pp.settle === 'pay' ? (pp.cost || 0) : 0) : (pp.value || 0); };
  PMP.paperBenefitText = function (pp) { return pp.benefit === 'item' ? 'แลก ' + (pp.item || 'ของฟรี') + ' ฟรี' : 'ลด ' + util_baht(pp.value) + (pp.min ? ' เมื่อซื้อครบ ' + util_baht(pp.min) : ''); };
  function util_baht(n) { return '฿' + Math.round(n).toLocaleString('en-US'); }
  PMP.serialLabel = function (pp, n) { return (pp.serial.prefix || '') + '-' + String(n).padStart(6, '0'); };
  /* parse "1-10, 15, 21" (numbers or PREFIX-000015) into a list of serial numbers */
  PMP.parseSerials = function (txt) {
    var out = [], bad = [];
    String(txt || '').split(/[\s,;]+/).filter(Boolean).forEach(function (tok) {
      var t = tok.replace(/^[A-Za-z]+-?/, '').replace(/\.\./g, '-'), m = t.match(/^0*(\d+)-[A-Za-z]*-?0*(\d+)$/), n = t.match(/^0*(\d+)$/);
      if (m) { var a = +m[1], b = +m[2]; if (b < a || b - a > 5000) bad.push(tok); else for (var i = a; i <= b; i++) out.push(i); } else if (n) out.push(+n[1]); else bad.push(tok);
    });
    return { list: out, bad: bad };
  };
  PMP.paperClaim = function (ppId, storeId, stubs, serialTxt) {
    var cfg = PMP.cfg(), st = PMP.state(), pp = cfg.paper.filter(function (x) { return x.id === ppId; })[0];
    if (!pp || !storeId) return { error: 'เลือกชุดและร้าน/พาร์ทเนอร์' };
    var sr = { list: [], bad: [] }, n = stubs;
    if (!(n > 0)) return { error: 'กรอกจำนวนก้นคูปอง' };
    st.paperClaims = st.paperClaims || [];
    var live = st.paperClaims.filter(function (c) { return c.ppId === ppId && c.status !== 'ปฏิเสธ'; });
    var prev = live.filter(function (c) { return c.storeId === storeId; }).reduce(function (a, c) { return a + c.stubs; }, 0), tot = live.reduce(function (a, c) { return a + c.stubs; }, 0);
    var flags = [];
    if (!PMP.paperAccepts(pp, storeId)) flags.push('ไม่ได้อยู่ในรายชื่อผู้รับคูปองชุดนี้');
    if (tot + n > pp.issued) flags.unshift('⚠ ผิดปกติร้ายแรง: รวมเกินจำนวนที่พิมพ์/ออก (' + pp.issued + ' ใบ) — ตรวจก่อนจ่าย');
    if (sr.bad.length) flags.push('เลขใบอ่านไม่ได้: ' + sr.bad.join(', '));
    if (pp.serial && pp.serial.on && sr.list.length) {
      var seen = {}, dupIn = sr.list.filter(function (x) { if (seen[x]) return true; seen[x] = 1; return false; }); if (dupIn.length) flags.push('เลขใบซ้ำในคำขอเดียวกัน: ' + dupIn.slice(0, 5).map(function (x) { return PMP.serialLabel(pp, x); }).join(', '));
      var oor = sr.list.filter(function (x) { return x < pp.serial.from || x > pp.serial.to; }); if (oor.length) flags.push('เลขใบอยู่นอกช่วงที่พิมพ์ (' + pp.serial.from + '–' + pp.serial.to + '): ' + oor.slice(0, 5).map(function (x) { return PMP.serialLabel(pp, x); }).join(', '));
      var used = {}; live.forEach(function (c) { (c.serials || []).forEach(function (x) { used[x] = c.storeId; }); }); var dup = sr.list.filter(function (x) { return used[x] != null; }); if (dup.length) flags.push('เลขใบเคยถูกเบิกแล้ว (' + dup.length + ' ใบ) เช่น ' + PMP.serialLabel(pp, dup[0]) + ' โดย ' + PMP.partner(used[dup[0]]).name);
    }
    st.paperClaims.unshift({ id: uid('pc'), ppId: ppId, storeId: storeId, stubs: n, serials: sr.list, amount: n * PMP.paperUnit(pp), flags: flags, status: 'รอตรวจนับ', d: cfg.now, counted: null, by: 'บันทึกโดยแอดมิน', log: [{ d: cfg.now, t: 'รับก้น ' + n + ' ใบเข้าระบบ (บันทึกโดยแอดมิน)' }] });
    PMP.saveState(st); return { flags: flags, n: n };
  };
  PMP.paperAct = function (id, act, counted, extra) {
    extra = extra || {};
    var st = PMP.state(), c = (st.paperClaims || []).filter(function (x) { return x.id === id; })[0], cfg = PMP.cfg();
    if (!c) return { error: 'ไม่พบคำขอ' };
    var pp = cfg.paper.filter(function (x) { return x.id === c.ppId; })[0];
    if (act === 'count') { if (!(counted >= 0)) return { error: 'กรอกจำนวนที่นับได้' }; c.counted = counted; c.amount = counted * PMP.paperUnit(pp); c.status = 'ตรวจนับแล้ว'; (c.log = c.log || []).push({ d: cfg.now, t: 'นับก้นได้ ' + counted + ' ใบ (ร้านแจ้ง ' + c.stubs + ')' }); }
    else if (act === 'recount') { c.status = 'รอตรวจนับ'; (c.log = c.log || []).push({ d: cfg.now, t: 'ส่งกลับไปตรวจนับใหม่' }); }
    else if (act === 'pay') { if (c.status !== 'ตรวจนับแล้ว') return { error: 'ต้องตรวจนับก่อน' + (pp.settle === 'pay' || pp.benefit === 'discount' ? 'จ่าย' : 'ปิดงาน') }; c.status = (pp.benefit === 'item' && pp.settle !== 'pay') ? 'ปิดงานแล้ว' : 'จ่ายแล้ว'; c.payRef = extra.ref || ''; c.payDate = extra.date || cfg.now; if (extra.note) c.note = extra.note; (c.log = c.log || []).push({ d: c.payDate, t: (c.status === 'ปิดงานแล้ว' ? 'ปิดงาน (พาร์ทเนอร์ออกเอง ไม่มีการจ่าย)' : 'จ่ายเงิน') + (c.payRef ? ' · อ้างอิง ' + c.payRef : '') + (extra.note ? ' · อนุมัติพิเศษ: ' + extra.note : '') }); }
    else if (act === 'reject') { c.status = 'ปฏิเสธ'; c.reason = extra.reason || ''; (c.log = c.log || []).push({ d: cfg.now, t: 'ปฏิเสธ' + (extra.reason ? ' · เหตุผล: ' + extra.reason : '') }); }
    PMP.saveState(st); return { ok: true };
  };
  /* ---- starter kit (เซตร้านยาเปิดใหม่) ---- */
  PMP.kitCalc = function (kit, qtys) {
    var cfg = PMP.cfg(), lines = [], sub = 0, blocked = [], errs = [];
    kit.items.forEach(function (it, i) {
      var q = qtys && qtys[i] != null ? qtys[i] : it.qty, p = PMP.product(it.sku), stock = cfg.stock[it.sku] != null ? cfg.stock[it.sku] : 9999;
      if (it.req && q < it.min) errs.push(p.name + ' ต้องไม่น้อยกว่า ' + it.min);
      if (q > stock) blocked.push(p.name + ' สต็อกเหลือ ' + stock);
      lines.push({ it: it, p: p, q: q, amt: q * p.price }); sub += q * p.price;
    });
    var disc = Math.round(sub * kit.disc) / 100;
    return { lines: lines, sub: sub, disc: disc, total: sub - disc, blocked: blocked, errs: errs };
  };
  PMP.kitOrder = function (cid, kitId, qtys, by) {
    var cfg = PMP.cfg(), st = PMP.state(), kit = cfg.kits.filter(function (k) { return k.id === kitId; })[0], c = PMP.customers.filter(function (x) { return x.id === cid; })[0];
    if (!kit) return { error: 'ไม่พบเซต' };
    if (kit.aud === 'B2B' && c.type !== 'B2B') return { error: 'เซตนี้สั่งได้เฉพาะลูกค้า B2B' };
    var r = PMP.kitCalc(kit, qtys);
    if (r.errs.length) return { error: r.errs.join(' · ') };
    if (r.blocked.length) return { error: 'สต็อกไม่พอ: ' + r.blocked.join(' · ') };
    var cs = st.customers[cid]; st.kitOrders = st.kitOrders || [];
    var pts = r.lines.reduce(function (a, l) { return a + l.q * l.p.pts; }, 0);
    cs.points += pts; if (pts) cs.ledger.unshift({ d: cfg.now, t: '+' + pts, why: 'สั่ง ' + kit.name }); cs.orders++;
    r.lines.forEach(function (l) { if (cfg.stock[l.it.sku] != null) cfg.stock[l.it.sku] -= l.q; });
    var o = { no: 'KIT' + (2000 + st.kitOrders.length + 1), cid: cid, kit: kit.name, total: r.total, by: by || 'ลูกค้า', d: cfg.now, lines: r.lines.map(function (l) { return l.p.name + ' × ' + l.q; }), pts: pts };
    st.kitOrders.unshift(o); PMP.saveCfg(cfg); PMP.saveState(st); return { order: o };
  };
  PMP.collect = function (cid, couponId) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], k = cfg.coupons.filter(function (x) { return x.id === couponId; })[0];
    if (!k) return { error: 'ไม่พบคูปอง' };
    if (PMP.status(k, cfg.now) !== 'running') return { error: 'คูปองนี้ ' + PMP.statusLabel[PMP.status(k, cfg.now)] };
    if (cs.wallet.some(function (w) { return w.couponId === k.id; }) && k.perCust <= 1) return { error: 'เก็บไปแล้ว (1 คน 1 ใบ)' };
    cs.wallet.push({ id: uid('w'), couponId: k.id, used: false, src: 'กดเก็บเอง' }); k.used++;
    PMP.saveCfg(cfg); PMP.saveState(st); return { ok: true };
  };
  PMP.issueMonthly = function () {
    var cfg = PMP.cfg(), st = PMP.state(), n = 0;
    cfg.coupons.filter(function (k) { return k.kind === 'monthly' && PMP.status(k, cfg.now) === 'running'; }).forEach(function (k) {
      PMP.customers.forEach(function (c) { var cs = st.customers[c.id]; if (audOk(k.aud, c, cs) && !cs.wallet.some(function (w) { return w.couponId === k.id; })) { cs.wallet.push({ id: uid('w'), couponId: k.id, used: false, src: 'แจกรายเดือน' }); n++; } });
    });
    PMP.saveState(st); return n;
  };
  function fnv(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }
  PMP.fnv = fnv;
  /* Activity = ONE mode. A: instant draw (weights + stock). B: enter pool, admin draws on drawAt (winners per prize). */
  PMP.raffle = function (fid) { return PMP.cfg().raffles.filter(function (x) { return x.id === fid; })[0]; };
  PMP.raffleOf = function (mode) { return PMP.cfg().raffles.filter(function (x) { return x.mode === mode; }); };
  /* Mode A — result decided here (server side in the real system), animation is cosmetic. */
  PMP.drawA = function (cid, fid) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], f = PMP.raffle(fid);
    if (!f || f.mode !== 'A') return { error: 'กิจกรรมนี้ไม่ใช่แบบลุ้นทันที' };
    if (PMP.status(f, cfg.now) !== 'running') return { error: 'กิจกรรมนี้ไม่เปิดอยู่' };
    if ((cs.tickets[fid] || 0) < 1) return { error: 'ไม่มีสิทธิ์ลุ้น' };
    var pool = f.prizes.filter(function (z) { return (st.shared.prizeUsed[z.id] || 0) < z.stock; });
    if (!pool.length) return { error: 'ของรางวัลหมด' };
    cs.tickets[fid]--;
    var tot = pool.reduce(function (a, z) { return a + z.weight; }, 0), r = Math.random() * tot, win = pool[0];
    for (var i = 0; i < pool.length; i++) { if (r < pool[i].weight) { win = pool[i]; break; } r -= pool[i].weight; }
    st.shared.prizeUsed[win.id] = (st.shared.prizeUsed[win.id] || 0) + 1;
    var out = PMP.grant(st, cid, PMP.rewardsOf('raffle', win.id), 'ลุ้นโชค: ' + win.name, cfg);
    cs.draws.unshift({ d: cfg.now, f: f.name, fid: f.id, mode: 'A', prize: win.name, out: out });
    PMP.saveState(st); return { prize: win, out: out, odds: Math.round(win.weight / tot * 1000) / 10 };
  };
  /* tickets from points (only if the activity sets ptsPer > 0) */
  PMP.exchangeTickets = function (cid, fid, n) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], f = PMP.raffle(fid); n = n || 1;
    if (!f || !f.ptsPer) return { error: 'กิจกรรมนี้ไม่เปิดให้แลกพอยท์' };
    if (PMP.status(f, cfg.now) !== 'running') return { error: 'กิจกรรมนี้ไม่เปิดอยู่' };
    var need = f.ptsPer * n; if (cs.points < need) return { error: 'พอยท์ไม่พอ (ต้องใช้ ' + need + ')' };
    cs.points -= need; cs.ledger.unshift({ d: cfg.now, t: '-' + need, why: 'แลกสิทธิ์ลุ้น ' + n + ' ใบ · ' + f.name }); cs.tickets[fid] = (cs.tickets[fid] || 0) + n;
    PMP.saveState(st); return { ok: true, need: need };
  };
  PMP.poolSize = function (fid) { var st = PMP.state(), f = PMP.raffle(fid), p = st.shared.rafflePool[fid] || {}; return Object.keys(p).reduce(function (a, k) { return a + p[k]; }, 0) + ((f && f.poolOthers) || 0); };
  PMP.drawResult = function (fid) { return (PMP.state().shared.drawResult || {})[fid] || null; };
  /* Mode B — enter the pool, later draw with a published seed */
  PMP.enterPool = function (cid, fid, n) {
    var st = PMP.state(), cs = st.customers[cid], f = PMP.raffle(fid); n = n || 1;
    if (!f || f.mode !== 'B') return { error: 'กิจกรรมนี้ไม่ใช่แบบจับตามรอบ' };
    if ((st.shared.drawResult || {})[fid]) return { error: 'จับรางวัลไปแล้ว' };
    if ((st.shared.drawLock || {})[fid]) return { error: 'กองถูกล็อกแล้ว — ปิดรับสิทธิ์เข้ากอง' };
    if ((cs.tickets[fid] || 0) < n) return { error: 'สิทธิ์ไม่พอ' };
    cs.tickets[fid] -= n; var p = st.shared.rafflePool[fid] || (st.shared.rafflePool[fid] = {}); p[cid] = (p[cid] || 0) + n;
    PMP.saveState(st); return { ok: true };
  };
  /* ---- Mode B fairness: lock pool (commitment = SHA-256 of the pool list) -> draw with a seed -> anyone can recompute ---- */
  function sha256(msg) {
    var s = unescape(encodeURIComponent(String(msg))), l = s.length, i, j;
    if (!sha256.K) { var K0 = [], H0 = [], p = 2; while (K0.length < 64) { var pr = true; for (j = 2; j * j <= p; j++) if (p % j === 0) { pr = false; break; } if (pr) { if (H0.length < 8) H0.push(Math.floor((Math.sqrt(p) % 1) * 4294967296)); K0.push(Math.floor((Math.cbrt(p) % 1) * 4294967296)); } p++; } sha256.K = K0; sha256.H = H0; }
    var K = sha256.K, h = sha256.H.slice(), w = [], nw = (((l + 8) >> 6) + 1) * 16;
    for (i = 0; i < nw; i++) w[i] = 0;
    for (i = 0; i < l; i++) w[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8);
    w[l >> 2] |= 0x80 << (24 - (l % 4) * 8); w[nw - 1] = l * 8;
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var o = 0; o < nw; o += 16) {
      var x = w.slice(o, o + 16);
      for (i = 16; i < 64; i++) { var a15 = x[i - 15], a2 = x[i - 2]; x[i] = (x[i - 16] + (rr(a15, 7) ^ rr(a15, 18) ^ (a15 >>> 3)) + x[i - 7] + (rr(a2, 17) ^ rr(a2, 19) ^ (a2 >>> 10))) | 0; }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var t1 = (hh + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + x[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(function (v) { return ('00000000' + (v >>> 0).toString(16)).slice(-8); }).join('');
  }
  PMP.sha256 = sha256;
  function poolEntries(st, f) {
    var p = st.shared.rafflePool[f.id] || {}, a = Object.keys(p).filter(function (k) { return p[k] > 0; }).sort().map(function (k) { return { who: k, n: p[k] }; });
    if (f.poolOthers) a.push({ who: 'other', n: f.poolOthers }); return a;
  }
  function canon(fid, ent) { return fid + '|' + ent.map(function (e) { return e.who + ':' + e.n; }).join(','); }
  function expandEnt(ent) { var out = []; ent.forEach(function (e) { for (var i = 0; i < e.n; i++) out.push(e.who === 'other' ? 'other-' + i : e.who); }); return out; }
  function runDraw(prizes, ent, commit, seed) {
    var fin = commit + '|' + seed, left = expandEnt(ent), winners = [], k = 0;
    prizes.forEach(function (z) { for (var w = 0; w < (z.winners || 1) && left.length; w++) { var idx = parseInt(sha256(fin + '|' + (k++)).slice(0, 12), 16) % left.length; var who = left[idx]; winners.push({ prizeId: z.id, prize: z.name, who: who }); left = left.filter(function (x) { return x !== who; }); /* 1 คน ถูกได้ 1 รางวัลต่อการจับ — ตัดทุกใบของผู้ชนะออก */ } });
    return winners;
  }
  function rndHex() { var s = ''; try { var u = new Uint8Array(8); (g.crypto || g.msCrypto).getRandomValues(u); for (var i = 0; i < u.length; i++) s += ('0' + u[i].toString(16)).slice(-2); } catch (e) { s = ''; } while (s.length < 16) s += Math.floor(Math.random() * 16).toString(16); return s; }
  PMP.fairCommit = function (fid) { var st = PMP.state(), f = PMP.raffle(fid), ent = poolEntries(st, f), c = canon(fid, ent); return { entries: ent, canon: c, commit: sha256(c), total: ent.reduce(function (a, e) { return a + e.n; }, 0) }; };
  PMP.fairLockOf = function (fid) { return (PMP.state().shared.drawLock || {})[fid] || null; };
  PMP.fairLock = function (fid) {
    var cfg = PMP.cfg(), st = PMP.state(), f = PMP.raffle(fid); if (!f || f.mode !== 'B') return { error: 'กิจกรรมนี้ไม่ใช่แบบจับตามรอบ' };
    st.shared.drawLock = st.shared.drawLock || {}; if ((st.shared.drawResult || {})[fid]) return { error: 'จับรางวัลไปแล้ว' }; if (st.shared.drawLock[fid]) return { error: 'ล็อกกองไปแล้ว' };
    var cm = PMP.fairCommit(fid); if (!cm.total) return { error: 'ยังไม่มีสิทธิ์ในกอง' };
    st.shared.drawLock[fid] = { at: cfg.now, commit: cm.commit, canon: cm.canon, entries: cm.entries, total: cm.total }; PMP.saveState(st); return st.shared.drawLock[fid];
  };
  PMP.drawB = function (fid, forceCid, pub) {
    var cfg = PMP.cfg(), st = PMP.state(), f = PMP.raffle(fid);
    if (!f || f.mode !== 'B') return { error: 'กิจกรรมนี้ไม่ใช่แบบจับตามรอบ' };
    st.shared.drawResult = st.shared.drawResult || {}; if (st.shared.drawResult[fid]) return { error: 'จับรางวัลไปแล้ว' };
    var lock = (st.shared.drawLock || {})[fid]; if (!lock) { var r0 = PMP.fairLock(fid); if (r0.error) return r0; st = PMP.state(); lock = st.shared.drawLock[fid]; }
    var src = f.fair && f.fair.seedSrc === 'public' ? 'public' : 'system'; pub = String(pub == null ? '' : pub).trim();
    if (src === 'public' && !pub) return { error: 'กรอกค่าสาธารณะที่ใช้เป็น seed ก่อนจับ' };
    var prizes = f.prizes.map(function (z) { return { id: z.id, name: z.name, winners: z.winners || 1 }; }), seed, winners, att;
    for (att = 0; att < (forceCid ? 6000 : 1); att++) { /* demo button only: search seeds until the simulated customer wins prize #1 — the draw stays verifiable */
      seed = src === 'public' ? 'PUB[' + pub + (att ? '#' + att : '') + ']' : 'SYS[' + rndHex() + ']';
      winners = runDraw(prizes, lock.entries, lock.commit, seed); if (!forceCid || (winners[0] && winners[0].who === forceCid)) break;
    }
    winners.forEach(function (w) { if (w.who.indexOf('other-') !== 0) { var out = PMP.grant(st, w.who, PMP.rewardsOf('raffle', w.prizeId), 'จับรางวัล: ' + w.prize, cfg); st.customers[w.who].draws.unshift({ d: cfg.now, f: f.name, fid: f.id, mode: 'B', prize: w.prize, out: out }); } });
    var res = { seed: seed, seedSrc: src, pub: src === 'public' ? pub : '', commit: lock.commit, total: lock.total, d: cfg.now, winners: winners, prizes: prizes, demo: !!forceCid };
    st.shared.drawResult[fid] = res; PMP.saveState(st); return res;
  };
  PMP.verifyDraw = function (fid, cid) {
    var st = PMP.state(), lock = (st.shared.drawLock || {})[fid], res = (st.shared.drawResult || {})[fid], steps = [], ok = true;
    function add(good, t, d, ct, cd) { steps.push({ ok: good, t: t, d: d || '', ct: ct || t, cd: cd == null ? (d || '') : cd }); if (!good) ok = false; }
    if (!lock) return { steps: [{ ok: false, t: 'ยังไม่ได้ล็อกกอง', d: 'ยังไม่มีรหัสให้ตรวจ' }], ok: false, pending: true };
    add(sha256(canon(fid, lock.entries)) === lock.commit, 'รหัสกองตรงกับรายชื่อกองที่ล็อกไว้', 'คำนวณ SHA-256 ของรายชื่อกอง (' + lock.total + ' ใบ) ใหม่แล้วเทียบกับรหัสที่ประกาศ', 'รายชื่อผู้ร่วมลุ้นไม่ถูกแก้หลังปิดรับ', 'ระบบนับและตรวจรายชื่อทั้งกอง ' + lock.total + ' ใบอีกรอบ ยังตรงกับตอนที่ปิดรับ ไม่มีใครถูกเพิ่มหรือลบ');
    if (cid) { var me = lock.entries.filter(function (e) { return e.who === cid; })[0]; if (me) add(me.n === ((st.shared.rafflePool[fid] || {})[cid] || 0), 'สิทธิ์ของลูกค้านี้อยู่ในกองครบ', me.n + ' ใบ', 'สิทธิ์ของคุณอยู่ในกองครบ ' + me.n + ' ใบ', 'ทุกใบที่คุณลงกองถูกนับรวมในการจับ ไม่มีสิทธิ์ตกหล่น'); }
    if (!res) return { steps: steps, ok: ok, pending: true };
    if (!res.prizes) return { steps: steps.concat([{ ok: false, t: 'ผลนี้จับก่อนมีระบบตรวจสอบ', d: 'ไม่มีข้อมูลสำหรับคำนวณซ้ำ' }]), ok: false, legacy: true };
    add(res.commit === lock.commit, 'ผลการจับอ้างอิงรหัสกองเดียวกับที่ประกาศก่อนจับ', 'กองไม่ถูกเปลี่ยนระหว่างล็อกกับจับ', 'การจับใช้รายชื่อชุดเดียวกับที่ประกาศไว้ก่อนจับ', 'ไม่มีการเปลี่ยนรายชื่อระหว่างปิดรับกับวันจับรางวัล');
    add(lock.at <= res.d, 'ล็อกกองก่อนวันจับรางวัล', 'ล็อก ' + lock.at + ' · จับ ' + res.d, 'ปิดรับรายชื่อก่อนวันจับรางวัล', 'ปิดรับเมื่อ ' + lock.at + ' แล้วจึงจับเมื่อ ' + res.d + ' — ไม่มีการแอบเพิ่มรายชื่อหลังรู้ผล');
    var w2 = runDraw(res.prizes, lock.entries, lock.commit, res.seed);
    add(w2.length === res.winners.length && w2.every(function (w, i) { return w.who === res.winners[i].who && w.prizeId === res.winners[i].prizeId; }), 'คำนวณซ้ำด้วย seed + รายชื่อกอง ได้ผู้โชคดีชุดเดียวกัน', w2.length + ' ผู้โชคดี ตรงกับที่ประกาศทุกคน', 'ผู้โชคดีทุกคนมาจากสูตร ไม่ได้มาจากการเลือก', 'ระบบจับรางวัลซ้ำอีกครั้งด้วยวิธีเดียวกัน ได้ผู้โชคดี ' + w2.length + ' คน ชุดเดียวกับที่ประกาศทุกคน — ถ้ามีใครถูกสลับ ผลจะไม่ตรงทันที');
    return { steps: steps, ok: ok, pending: false };
  };
  /* ---------------- customer notifications: derived from admin cfg.notify + customer state · in-web only (bell + notification center) ---------------- */
  PMP.notifications = function (cid) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], cust = customer(cid), now = cfg.now, N = cfg.notify || {}, out = [];
    function days(iso) { return Math.round((new Date(iso) - new Date(now)) / 864e5); }
    function add(id, type, level, title, body, href) { out.push({ id: id, type: type, level: level, title: title, body: body, href: href }); }
    if (N.points && N.points.on) {
      var sum = 0, L = (cs.lots || []).map(function (l) { sum += l.pts; return { pts: l.pts, exp: l.exp }; });
      if (cs.points - sum > 0) L.push({ pts: cs.points - sum, exp: addDays(now, cfg.points.expiryDays) });
      L.sort(function (a, b) { return a.exp < b.exp ? -1 : 1; });
      var over = L.reduce(function (a, l) { return a + l.pts; }, 0) - cs.points; for (var i = 0; i < L.length && over > 0; i++) { var d0 = Math.min(L[i].pts, over); L[i].pts -= d0; over -= d0; }
      var soon = L.filter(function (l) { return l.pts > 0 && days(l.exp) >= 0 && days(l.exp) <= N.points.days; });
      if (soon.length) { var tot = soon.reduce(function (a, l) { return a + l.pts; }, 0), dd = days(soon[0].exp); add('pt:' + soon[0].exp, 'points', dd <= 7 ? 'error' : 'warn', 'พอยท์ใกล้หมดอายุ', tot.toLocaleString() + ' พอยท์จะหมดอายุภายใน ' + dd + ' วัน (' + soon[0].exp + ') — ใช้เป็นส่วนลดตอนชำระเงินหรือแลกของรางวัลก่อนหมด', '../points/05-customer-redeem.html'); }
    }
    if (N.ladder && N.ladder.on) cfg.ladders.forEach(function (Ld) {
      if (PMP.status(Ld, now) !== 'running' || !audOk(Ld.aud, cust, cs)) return;
      var lv = cs.ladder[Ld.id] || { spent: 0, unlocked: [], claimed: [] }, nxt = Ld.tiers.filter(function (t) { return t.at > lv.spent; })[0];
      Ld.tiers.forEach(function (t) { if (lv.unlocked.indexOf(t.id) > -1 && lv.claimed.indexOf(t.id) < 0 && !(st.claims || []).some(function (c) { return c.cid === cid && c.lid === Ld.id && c.tid === t.id && c.status !== 'ปฏิเสธ'; })) add('lu:' + Ld.id + t.id, 'ladder', 'success', 'ปลดล็อกรางวัลแล้ว: ' + t.name, 'ยอดสะสมของคุณถึงเกณฑ์แล้ว — กดรับรางวัลได้ที่หน้าแคมเปญ', '../campaign/06-customer-ladder.html'); });
      if (nxt) {
        var pct = lv.spent / nxt.at * 100, left = nxt.at - lv.spent;
        if (N.ladder.at95 && pct >= 95) add('l95:' + Ld.id + nxt.id, 'ladder', 'warn', 'เกือบถึงแล้ว! ' + nxt.name, 'อีกเพียง ' + baht(left) + ' ปลดล็อกรางวัลขั้นถัดไป (สะสมแล้ว ' + pct.toFixed(0) + '%)', '../campaign/06-customer-ladder.html');
        else if (N.ladder.at80 && pct >= 80) add('l80:' + Ld.id + nxt.id, 'ladder', 'info', 'สะสมครบ 80% ของ ' + nxt.name, 'อีก ' + baht(left) + ' ถึงขั้นถัดไป', '../campaign/06-customer-ladder.html');
        var dl = days(Ld.end); if (N.ladder.expiryDays && dl >= 0 && dl <= N.ladder.expiryDays) add('lx:' + Ld.id, 'ladder', 'warn', 'แคมเปญสะสมยอดใกล้สิ้นสุด', 'เหลือ ' + dl + ' วัน (สิ้นสุด ' + Ld.end + ') · ยังขาด ' + baht(left) + ' ถึง ' + nxt.name, '../campaign/06-customer-ladder.html');
      }
    });
    if (N.claim && N.claim.on) (st.claims || []).filter(function (c) { return c.cid === cid; }).forEach(function (c) {
      if (c.status === 'รอตรวจ') add('cl:' + c.id + ':w', 'claim', 'info', 'ได้รับคำขอรับรางวัลแล้ว', c.name + ' · ทีมงานตรวจสอบภายใน 2 วันทำการ', '../campaign/07-customer-claim-form.html');
      else if (c.status === 'ปฏิเสธ') add('cl:' + c.id + ':r', 'claim', 'error', 'คำขอรับรางวัลถูกปฏิเสธ', c.name + ' · เหตุผล: ' + (c.reason || '-') + ' (สิทธิ์ถูกคืนแล้ว ส่งคำขอใหม่ได้)', '../campaign/07-customer-claim-form.html');
      else add('cl:' + c.id + ':a', 'claim', 'success', 'คำขอรับรางวัลอนุมัติแล้ว', c.name + (c.auto ? ' · ได้รับทันที' : ' · ส่งรางวัลเข้าบัญชีแล้ว'), '../campaign/07-customer-claim-form.html');
    });
    if (N.coupon && N.coupon.on) cs.wallet.forEach(function (w) {
      var k = cfg.coupons.filter(function (x) { return x.id === w.couponId; })[0]; if (!k || w.used || !k.end) return; var dl = days(k.end);
      if (dl >= 0 && dl <= N.coupon.days) add('cp:' + w.id, 'coupon', dl <= 1 ? 'error' : 'warn', 'คูปองใกล้หมดอายุ', k.code + ' · ' + k.name + ' — หมดอายุใน ' + dl + ' วัน (' + k.end + ')', '../coupon/08-customer-center.html');
    });
    if (N.promo && N.promo.on) cfg.promos.forEach(function (p) {
      if (PMP.status(p, now) !== 'running' || !audOk(p.aud, cust, cs) || !p.end) return; var dl = days(p.end);
      if (dl >= 0 && dl <= N.promo.days) add('pm:' + p.id, 'promo', 'info', 'โปรโมชั่นใกล้สิ้นสุด', p.name + ' — ' + (dl === 0 ? 'สิ้นสุดวันนี้' : 'สิ้นสุดใน ' + dl + ' วัน') + ' (' + p.end + ')', '../promotion/06-customer-list.html');
    });
    if (N.raffle && N.raffle.on) cfg.raffles.forEach(function (f) {
      if (!(f.active && (f.aud === 'all' || f.aud === cust.type))) return; var n = cs.tickets[f.id] || 0, res = (st.shared.drawResult || {})[f.id];
      if (res && ((st.shared.rafflePool[f.id] || {})[cid] || 0) > 0 && !PMP.revealed(cid, f.id)) { add('rf:' + f.id + ':rv', 'raffle', 'warn', 'ประกาศผลแล้ว — เปิดดูว่าคุณได้รางวัลไหม', f.name + ' · แตะเพื่อเปิดผลของคุณ', '../raffle/08-customer-scheduled.html?f=' + f.id + '&reveal=1'); }
      else if (res) { var mw = res.winners.filter(function (w) { return w.who === cid; }); add('rf:' + f.id + ':res', 'raffle', mw.length ? 'success' : 'info', mw.length ? 'ยินดีด้วย! คุณถูกรางวัล' : 'ประกาศผลแล้ว: ' + f.name, mw.length ? mw.map(function (w) { return w.prize; }).join(' · ') + ' — รางวัลเข้าบัญชี/คิวรับของแล้ว' : 'รอบนี้คุณไม่ได้รับรางวัล ขอบคุณที่ร่วมสนุก', '../raffle/08-customer-scheduled.html?f=' + f.id); }
      else if (n > 0 && PMP.status(f, now) === 'running') add('rf:' + f.id + ':tk:' + n, 'raffle', 'info', 'คุณมีสิทธิ์ลุ้น ' + n + ' ใบ', f.name + (f.mode === 'A' ? ' — ใช้ลุ้นได้ทันที' : ' — นำลงกองก่อนประกาศผล ' + f.drawAt), f.mode === 'A' ? '../raffle/07-customer-instant-draw.html?f=' + f.id : '../raffle/08-customer-scheduled.html?f=' + f.id);
    });
    var rk = { error: 0, warn: 1, success: 2, info: 3 }; out.sort(function (a, b) { return rk[a.level] - rk[b.level]; });
    var rd0 = (rd('pmpc.sim.nread', {}) || {})[cid] || {}; out.forEach(function (n) { n.read = !!rd0[n.id]; });
    return out;
  };
  PMP.notifRead = function (cid, ids) { var m = rd('pmpc.sim.nread', {}) || {}; m[cid] = m[cid] || {}; (ids || PMP.notifications(cid).map(function (n) { return n.id; })).forEach(function (i) { m[cid][i] = 1; }); wr('pmpc.sim.nread', m); };
  /* Mode B reveal: a customer who entered the pool opens their own result first (suspense), then sees the full winner list */
  PMP.revealed = function (cid, fid) { var res = (PMP.state().shared.drawResult || {})[fid], m = rd('pmpc.sim.reveal', {}) || {}; return !!(res && (m[cid] || {})[fid] === res.seed); };
  PMP.setRevealed = function (cid, fid) { var res = (PMP.state().shared.drawResult || {})[fid], m = rd('pmpc.sim.reveal', {}) || {}; if (!res) return; m[cid] = m[cid] || {}; m[cid][fid] = res.seed; wr('pmpc.sim.reveal', m); };
  PMP.resetReveal = function (cid, fid) { var m = rd('pmpc.sim.reveal', {}) || {}; if (m[cid]) delete m[cid][fid]; wr('pmpc.sim.reveal', m); try { localStorage.removeItem('pmpc.sim.rvshown'); sessionStorage.clear(); } catch (e) { } };
  PMP.revealPending =function (cid) { var st = PMP.state(); return PMP.cfg().raffles.filter(function (f) { return f.mode === 'B' && (st.shared.drawResult || {})[f.id] && ((st.shared.rafflePool[f.id] || {})[cid] || 0) > 0 && !PMP.revealed(cid, f.id); }); };
})(window);
