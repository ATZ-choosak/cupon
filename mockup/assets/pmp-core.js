/* PMP core — shared state + pricing engine for the mockup (runs in the browser, state in localStorage).
   Mirrors what the real services will do:  PromotionService.evaluate · CouponService.validate · PointsService.earn/redeem ·
   CampaignService.quota/ladder · RaffleService.issue/draw · RewardService.grant (one component for every module).
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
    { id: 's4', name: 'ร้านยาชุมชนคลองหลวง' }, { id: 's5', name: 'Pharmaplex สาขาโคราช' }
  ];
  PMP.product = function (sku) { return PMP.products.filter(function (p) { return p.sku === sku; })[0]; };

  /* ---------------- configuration (editable in simulator/01-config) ---------------- */
  function seedCfg() {
    return {
      now: '2026-10-27',
      stock: {},
      csets: [{ id: 'cs1', name: 'ร้านยา VIP ปี 2569', members: ['c-b2b'], extra: 37, note: 'ลูกค้ายอดซื้อสูง' }, { id: 'cs2', name: 'ลูกค้าติดตามหนี้', members: ['c-b2c'], extra: 5, note: '' }],
      flash: [{ id: 'fl1', name: 'Flash Sale 10.27', start: '2026-10-27', end: '2026-10-27', active: true, quota: 50, used: 12, rules: [{ ps: 'ps1', pct: 20 }, { ps: 'ps2', pct: 15 }] }],
      paper: [
        { id: 'pp1', code: 'OCT50', name: 'คูปองกระดาษ ลด ฿50 งานสัมมนา ต.ค.', value: 50, min: 500, issued: 2000, maxPerStore: 300, stores: { mode: 'pick', ids: ['s1', 's2', 's3'] }, active: true, payDays: 30, back: 'ใช้ได้เฉพาะหน้าร้านที่ร่วมรายการ ไม่ใช้ร่วมโปรอื่น' },
        { id: 'pp2', code: 'NOV80', name: 'คูปองกระดาษ ลด ฿80 บูท พ.ย.', value: 80, min: 800, issued: 1000, maxPerStore: 200, stores: { mode: 'all', ids: [] }, active: true, payDays: 30, back: 'ใช้ได้ทุกร้านที่ลงทะเบียน' }],
      kits: [
        { id: 'kt1', name: 'ชุดร้านยาเปิดใหม่ S', disc: 5, aud: 'B2B', items: [{ sku: 'PAR-500', qty: 50, min: 20, req: true }, { sku: 'SY-3ML', qty: 10, min: 5, req: true }, { sku: 'BM-VC500', qty: 6, min: 0, req: false }, { sku: 'PP-DM', qty: 4, min: 0, req: false }] },
        { id: 'kt2', name: 'ชุดร้านยาเปิดใหม่ L', disc: 8, aud: 'B2B', items: [{ sku: 'PAR-500', qty: 100, min: 50, req: true }, { sku: 'SY-3ML', qty: 30, min: 10, req: true }, { sku: 'BM-VC500B', qty: 2, min: 0, req: false }, { sku: 'DX-MP1', qty: 6, min: 0, req: false }] }],
      shipping: { fee: 80, freeOver: 1500 },
      pay: { ptBaht: 1, maxPct: 20 },
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
        { id: 'p10', name: 'วันพิเศษ 10.27 ลดทั้งร้าน 10% (สูงสุด ฿500)', kind: 'special', start: '2026-10-27', end: '2026-10-27', active: true, quotaTotal: 300, used: 120, perCust: 1,
          aud: 'all', ctype: 'amt', min: 0, scope: { mode: 'all', ref: null }, strict: false, stackPromo: false, stackCoupon: true, stackPoints: true },
        { id: 'p11', name: 'ซื้อผ้าอ้อมครบ 2 แพ็ก ลด ฿60 (โควตาหมดแล้ว)', kind: 'cond', start: '2026-10-01', end: '2026-12-31', active: true, quotaTotal: 20, used: 20, perCust: 1,
          aud: 'all', ctype: 'qty', min: 2, scope: { mode: 'skus', ref: ['PP-DM'] }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true },
        { id: 'p12', name: 'ซื้อเข็มฉีดยาครบ 5 กล่อง แถม 1 กล่อง (ยังไม่เริ่ม)', kind: 'cond', start: '2026-12-01', end: '2026-12-31', active: true, quotaTotal: 100, used: 0, perCust: 2,
          aud: 'all', ctype: 'qty', min: 5, scope: { mode: 'skus', ref: ['SY-3ML'] }, strict: false, stackPromo: true, stackCoupon: true, stackPoints: true }
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
        mults: [{ id: 'm1', name: 'พอยท์ ×2 ช่วงวันพิเศษ', start: '2026-10-27', end: '2026-10-29', mult: 2, scope: { mode: 'all', ref: null } },
                { id: 'm2', name: 'พอยท์ ×1.5 กลุ่มนมผง', start: '2026-10-01', end: '2026-11-30', mult: 1.5, scope: { mode: 'pset', ref: 'ps2' } }],
        expiryDays: 365
      },
      catalog: [
        { id: 'r1', name: 'คูปองลด ฿100 (1 ใบ)', pts: 300, stock: 100, active: true, aud: 'all' },
        { id: 'r2', name: 'เครดิตเงินคืน ฿200', pts: 500, stock: 50, active: true, aud: 'all' },
        { id: 'r3', name: 'ชุดพรีเมียม: กระเป๋า + 1 สิทธิ์ลุ้น', pts: 800, stock: 20, active: true, aud: 'all' },
        { id: 'r4', name: 'คูปองส่งฟรี 1 ครั้ง', pts: 150, stock: 200, active: true, aud: 'all' }
      ],
      quota: [
        { id: 'q1', name: 'ราคาพิเศษ Dumex 590 บาท (โควตา 60 กระป๋อง)', start: '2026-10-20', end: '2026-10-31', active: true, sku: 'DX-MP1', special: 590, quotaTotal: 60, used: 41, perCust: 6, holdMin: 15, aud: 'all' }
      ],
      ladders: [
        { id: 'l1', name: 'สะสมยอดรายปี 2569 (ทั้งปีสัญญา)', start: '2026-01-01', end: '2026-12-31', active: true, aud: 'B2B', scope: { mode: 'all', ref: null },
          tiers: [{ id: 't1', at: 10000, name: 'ขั้น 1 · ฿10,000', cap: 0, formText: 'ที่อยู่จัดส่ง*\nเบอร์โทร*' }, { id: 't2', at: 30000, name: 'ขั้น 2 · ฿30,000', cap: 0, formText: 'ที่อยู่จัดส่ง*' }, { id: 't3', at: 60000, name: 'ขั้น 3 · ฿60,000', cap: 5, formText: 'ชื่อผู้เดินทางตามพาสปอร์ต*\nเบอร์โทร*\nหมายเหตุ' }] }
      ],
      raffles: [
        { id: 'f1', name: 'ลุ้นโชคปลายปี 2569', start: '2026-10-01', end: '2026-12-31', active: true, perBaht: 1000, mode: 'A', poolOthers: 240,
          prizes: [{ id: 'z1', name: 'รางวัลปลอบใจ', weight: 50, stock: 999 }, { id: 'z2', name: 'คูปองลด ฿100', weight: 30, stock: 200 }, { id: 'z3', name: 'พอยท์ 500', weight: 15, stock: 100 }, { id: 'z4', name: 'ชุดของพรีเมียม', weight: 5, stock: 10 }] }
      ]
    };
  }
  PMP.cfg = function () {
    var c = rd('pmpc.sim.cfg', null);
    if (!c) { c = seedCfg(); wr('pmpc.sim.cfg', c); return c; }
    var d = seedCfg(), ch = false;
    ['csets', 'flash', 'paper', 'kits', 'stock'].forEach(function (k) { if (!c[k]) { c[k] = d[k]; ch = true; } });
    c.ladders.forEach(function (L, i) { L.tiers.forEach(function (t, j) { if (t.formText == null) { t.formText = 'ที่อยู่จัดส่ง*'; ch = true; } }); });
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
    'promotion.p10': [{ k: 'disc', mode: 'pct', value: 10, cap: 500 }],
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
    'raffle.z4': [{ k: 'offpos', text: 'ชุดของพรีเมียม (ส่งทางไปรษณีย์)', qty: 1 }, { k: 'credit', amount: 300, expiryDays: 90 }]
  };
  PMP.seedReward = function (module, ref) { return clone(SEED_RWD[module + '.' + ref] || []); };

  /* ---------------- per-customer state ---------------- */
  function seedState() {
    var st = { customers: {}, orders: [], log: [] };
    PMP.customers.forEach(function (c) {
      st.customers[c.id] = { points: c.id === 'c-b2b' ? 1240 : c.id === 'c-b2c' ? 300 : 0, lots: [], credit: 0, orders: c.id === 'c-b2b' ? 12 : c.id === 'c-b2c' ? 3 : 0,
        wallet: [], tickets: { f1: c.id === 'c-b2b' ? 2 : 0 }, promoUse: {}, couponUse: {}, quotaUse: {}, ladder: { l1: { spent: c.id === 'c-b2b' ? 8400 : 0, unlocked: [], claimed: [] } }, queue: [], draws: [], ledger: [], collected: {} };
    });
    st.shared = { promoUsed: {}, couponUsed: {}, quotaUsed: {}, prizeUsed: {}, rafflePool: {} };
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
      case 'points': return 'รับ ' + (it.pts || 0).toLocaleString('en-US') + ' พอยท์';
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
    /* 1 — quota campaign special price */
    cfg.quota.forEach(function (q) {
      if (PMP.status(q, now) !== 'running' || !audOk(q.aud, cust, cs) || !line[q.sku]) return;
      var left = q.quotaTotal - q.used, mine = q.perCust - (cs.quotaUse[q.id] || 0), l = line[q.sku];
      var n = Math.max(0, Math.min(l.qty, left, mine));
      if (n > 0) { l.quota = { id: q.id, n: n, special: q.special }; R.trace.push('แคมเปญโควตา “' + q.name + '”: ราคาพิเศษ ' + baht(q.special) + ' × ' + n + ' (เหลือโควตา ' + left + ', สิทธิ์ของคุณ ' + mine + ')'); }
      else R.trace.push('แคมเปญโควตา “' + q.name + '”: ไม่ได้ราคาพิเศษ (โควตา/สิทธิ์ต่อคนหมด)');
    });
    /* 1b — Flash Sale (ลดตามวันพิเศษ): % ต่อกลุ่มสินค้า + โควตารอบ */
    R.flashUse = {};
    (cfg.flash || []).forEach(function (f) {
      if (PMP.status({ active: f.active, start: f.start, end: f.end, quotaTotal: f.quota, used: f.used }, now) !== 'running') return;
      var left = f.quota ? f.quota - f.used : 1e9;
      lines.forEach(function (l) {
        if (l.quota || l.flash || left <= 0) return;
        var rule = f.rules.filter(function (r) { return inPset(psetById(cfg, r.ps), l.p); })[0];
        if (!rule) return;
        var n = Math.min(l.qty, left); left -= n;
        l.flash = { id: f.id, n: n, pct: rule.pct, disc: Math.round(n * l.base * rule.pct) / 100 };
        R.flashUse[f.id] = (R.flashUse[f.id] || 0) + n;
        R.trace.push('Flash “' + f.name + '”: ' + l.p.sku + ' ลด ' + rule.pct + '% × ' + n + ' (โควตารอบเหลือ ' + left + ')');
      });
    });
    lines.forEach(function (l) { l.amount = (l.quota ? l.quota.n * l.quota.special + (l.qty - l.quota.n) * l.base : l.qty * l.base) - (l.flash ? l.flash.disc : 0); l.gross = l.amount; });
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
    var okPts = chosen.every(function (c) { return c.p.stackPoints; }) && (!R.coupon || R.coupon.stackPoints);
    R.pointsBlocked = !okPts ? (chosen.filter(function (c) { return !c.p.stackPoints; })[0] || { p: { name: 'คูปองที่เลือก' } }).p.name : null;
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
    var mults = cfg.points.mults.filter(function (m) { return inRange(now, m.start, m.end); });
    var earn = 0, earnTrace = [];
    lines.forEach(function (l) {
      var pv = (cfg.pts && cfg.pts[l.p.sku] != null) ? cfg.pts[l.p.sku] : l.p.pts; if (!pv) return;
      var mm = 1; mults.forEach(function (m) { if (inScope(cfg, m.scope, l.p)) mm += m.mult - 1; });
      var e = l.qty * pv * mm; earn += e;
      if (mm > 1) earnTrace.push(l.p.sku + ' ×' + mm);
    });
    R.earnBase = Math.floor(earn);
    R.earnMultNote = earnTrace;
    var tickets = {};
    cfg.raffles.forEach(function (f) { if (PMP.status(f, now) === 'running' && f.perBaht) { var n = Math.floor(net / f.perBaht); if (n > 0) tickets[f.id] = n; } });
    R.ticketsBuy = tickets;
    R.grants = grants;
    // ladder preview
    R.ladderAdd = {};
    cfg.ladders.forEach(function (L) {
      if (PMP.status(L, now) !== 'running' || !audOk(L.aud, cust, cs)) return;
      R.ladderAdd[L.id] = lines.filter(function (l) { return inScope(cfg, L.scope, l.p); }).reduce(function (a, l) { return a + l.amount - l.promoDisc - l.couponDisc; }, 0);
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
    // quota hold → permanent cut
    R.lines.forEach(function (l) { if (l.quota) { var q = cfg.quota.filter(function (x) { return x.id === l.quota.id; })[0]; q.used += l.quota.n; cs.quotaUse[q.id] = (cs.quotaUse[q.id] || 0) + l.quota.n; log.push('ตัดโควตาแคมเปญ ' + q.name + ' −' + l.quota.n); } });
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
    var order = { no: 'SO' + (1000 + st.orders.length + 1), customerId: opts.customerId, d: now, lines: R.lines.map(function (l) { return { sku: l.sku, qty: l.qty, amount: l.amount }; }), subtotal: R.subtotal, promoDisc: R.promoDisc, couponDisc: R.couponDisc, shipping: R.shipping, pointsDisc: R.pointsDisc, creditUsed: R.creditUsed, total: R.total, promos: R.promoApplied.map(function (p) { return p.name; }), coupon: R.coupon && R.coupon.code, earn: R.earnBase, effects: log };
    st.orders.unshift(order);
    PMP.saveCfg(cfg); PMP.saveState(st);
    return { order: order, R: R };
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
    st.claims.unshift({ id: uid('cl'), cid: cid, lid: lid, tid: tid, name: L.name + ' · ' + t.name, answers: answers || [], labels: PMP.formFields(t).map(function (f) { return f.label; }), status: 'รอตรวจ', d: cfg.now, reason: '' });
    PMP.saveCfg(cfg); PMP.saveState(st); return { out: ['ส่งคำขอแล้ว สถานะ “รอตรวจ” — รอทีมงานอนุมัติ (ตัดสิทธิ์ขั้นนี้ไว้แล้ว)'] };
  };
  PMP.claimAct = function (claimId, act, reason) {
    var cfg = PMP.cfg(), st = PMP.state(), c = (st.claims || []).filter(function (x) { return x.id === claimId; })[0];
    if (!c || c.status !== 'รอตรวจ') return { error: 'คำขอนี้ดำเนินการแล้ว' };
    var cs = st.customers[c.cid], lv = cs.ladder[c.lid], L = cfg.ladders.filter(function (x) { return x.id === c.lid; })[0], t = L.tiers.filter(function (x) { return x.id === c.tid; })[0];
    if (act === 'approve') { c.status = 'อนุมัติ/ส่งมอบแล้ว'; var out = PMP.grant(st, c.cid, PMP.rewardsOf('campaign', c.lid + '-' + c.tid), 'แคมเปญ ' + c.name, cfg); PMP.saveCfg(cfg); PMP.saveState(st); return { out: out }; }
    if (!reason) return { error: 'ต้องระบุเหตุผลที่ปฏิเสธ' };
    c.status = 'ปฏิเสธ'; c.reason = reason; lv.claimed = lv.claimed.filter(function (x) { return x !== c.tid; }); t.used = Math.max(0, (t.used || 1) - 1);
    PMP.saveCfg(cfg); PMP.saveState(st); return { out: ['ปฏิเสธคำขอ — คืนสิทธิ์ให้ขั้นนี้ ลูกค้าส่งใหม่ได้'] };
  };
  /* ---- paper coupons (ใช้ที่ร้าน · นับก้นคูปองเพื่อเบิกเงิน) ---- */
  PMP.paperAccepts = function (pp, storeId) { return pp.active && (pp.stores.mode === 'all' || pp.stores.ids.indexOf(storeId) > -1); };
  PMP.paperClaim = function (ppId, storeId, stubs) {
    var cfg = PMP.cfg(), st = PMP.state(), pp = cfg.paper.filter(function (x) { return x.id === ppId; })[0];
    if (!pp || !storeId || !(stubs > 0)) return { error: 'เลือกชุด/ร้าน และกรอกจำนวนก้นคูปอง' };
    st.paperClaims = st.paperClaims || [];
    var prev = st.paperClaims.filter(function (c) { return c.ppId === ppId && c.storeId === storeId && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + c.stubs; }, 0);
    var tot = st.paperClaims.filter(function (c) { return c.ppId === ppId && c.status !== 'ปฏิเสธ'; }).reduce(function (a, c) { return a + c.stubs; }, 0);
    var flags = [];
    if (!PMP.paperAccepts(pp, storeId)) flags.push('ร้านไม่ได้อยู่ในชุดที่ร่วมรายการ');
    if (prev + stubs > pp.maxPerStore) flags.push('เกินใบสูงสุดต่อร้าน (' + pp.maxPerStore + ')');
    if (tot + stubs > pp.issued) flags.push('รวมเกินจำนวนที่ออก (' + pp.issued + ')');
    st.paperClaims.unshift({ id: uid('pc'), ppId: ppId, storeId: storeId, stubs: stubs, amount: stubs * pp.value, flags: flags, status: 'รอตรวจนับ', d: cfg.now, counted: null });
    PMP.saveState(st); return { flags: flags };
  };
  PMP.paperAct = function (id, act, counted) {
    var st = PMP.state(), c = (st.paperClaims || []).filter(function (x) { return x.id === id; })[0], cfg = PMP.cfg();
    if (!c) return { error: 'ไม่พบคำขอ' };
    var pp = cfg.paper.filter(function (x) { return x.id === c.ppId; })[0];
    if (act === 'count') { if (!(counted >= 0)) return { error: 'กรอกจำนวนที่นับได้' }; c.counted = counted; c.amount = counted * pp.value; c.status = 'ตรวจนับแล้ว'; }
    else if (act === 'pay') { if (c.status !== 'ตรวจนับแล้ว') return { error: 'ต้องตรวจนับก่อนจ่าย' }; c.status = 'จ่ายแล้ว'; }
    else if (act === 'reject') c.status = 'ปฏิเสธ';
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
  /* Mode A — instant draw, weights + stock. Result decided here (server side in the real system), animation is cosmetic. */
  PMP.drawA = function (cid, fid) {
    var cfg = PMP.cfg(), st = PMP.state(), cs = st.customers[cid], f = cfg.raffles.filter(function (x) { return x.id === fid; })[0];
    if (!f || PMP.status(f, cfg.now) !== 'running') return { error: 'กิจกรรมนี้ไม่เปิดอยู่' };
    if ((cs.tickets[fid] || 0) < 1) return { error: 'ไม่มีสิทธิ์ลุ้น' };
    var pool = f.prizes.filter(function (z) { return (st.shared.prizeUsed[z.id] || 0) < z.stock; });
    if (!pool.length) return { error: 'ของรางวัลหมด' };
    cs.tickets[fid]--;
    var tot = pool.reduce(function (a, z) { return a + z.weight; }, 0), r = Math.random() * tot, win = pool[0];
    for (var i = 0; i < pool.length; i++) { if (r < pool[i].weight) { win = pool[i]; break; } r -= pool[i].weight; }
    st.shared.prizeUsed[win.id] = (st.shared.prizeUsed[win.id] || 0) + 1;
    var out = PMP.grant(st, cid, PMP.rewardsOf('raffle', win.id), 'ลุ้นโชค: ' + win.name, cfg);
    cs.draws.unshift({ d: cfg.now, f: f.name, prize: win.name, out: out });
    PMP.saveState(st); return { prize: win, out: out, odds: Math.round(win.weight / tot * 1000) / 10 };
  };
  /* Mode B — enter the pool, later draw with a published seed */
  PMP.enterPool = function (cid, fid, n) {
    var st = PMP.state(), cs = st.customers[cid];
    if ((cs.tickets[fid] || 0) < n) return { error: 'สิทธิ์ไม่พอ' };
    cs.tickets[fid] -= n; var p = st.shared.rafflePool[fid] || (st.shared.rafflePool[fid] = {}); p[cid] = (p[cid] || 0) + n;
    PMP.saveState(st); return { ok: true };
  };
  PMP.drawB = function (fid) {
    var cfg = PMP.cfg(), st = PMP.state(), f = cfg.raffles.filter(function (x) { return x.id === fid; })[0], mine = st.shared.rafflePool[fid] || {};
    var entries = []; Object.keys(mine).forEach(function (cid) { for (var i = 0; i < mine[cid]; i++) entries.push(cid); });
    for (var j = 0; j < f.poolOthers; j++) entries.push('other-' + j);
    var seed = 'seed-' + Date.now(), commit = fnv(entries.length + ':' + seed.length);
    var idx = parseInt(fnv(seed + entries.length), 16) % entries.length, winner = entries[idx];
    var res = { seed: seed, total: entries.length, idx: idx, winner: winner, commit: commit };
    if (winner.indexOf('other-') !== 0) { PMP.grant(st, winner, PMP.rewardsOf('raffle', f.prizes[f.prizes.length - 1].id), 'ลุ้นโชคโหมด B', cfg); }
    PMP.saveState(st); return res;
  };
})(window);
