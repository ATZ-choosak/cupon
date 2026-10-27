/* Registry of every mockup screen. The demo bar, the hub (index.html) and prev/next navigation read from here.
   File names are fixed — implement exactly these files under mockup/<slug>/. role: 'admin' | 'customer' | 'both' */
window.MOCKUP = {
  title: 'Pharmaplex — Mockup ระบบโปรโมชั่น คูปอง พอยท์ แคมเปญ สุ่มรางวัล เซตร้านยาเปิดใหม่',
  modules: [
    {
      slug: 'home', no: 'H', title: 'หน้าแรกลูกค้า',
      desc: 'จัดวางหน้าแรก: Hero · สถานะของฉัน · Flash Sale · หมวด · โปรโมชั่น · คูปอง · แคมเปญ · เซตร้านยา · ลุ้นรางวัล · แลกพอยท์ · ข่าว · แบรนด์ — ต่อยอดจากหน้าแรกเดิมของ pmpc',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวมการจัดวางหน้าแรก', role: 'both' },
        { file: '01-customer-home.html', title: 'หน้าแรกลูกค้า (จำลองตามมุมมอง B2B / B2C / ยังไม่ล็อกอิน)', role: 'customer' }
      ]
    },
    {
      slug: 'foundation', no: '00', title: 'กลุ่มและชุดที่ใช้ซ้ำ',
      desc: 'กลุ่มลูกค้า · ชุดของรางวัล · กลุ่มสินค้า · ตัวเลือก “ทุกคน/บางคน” — ตั้งครั้งเดียว ใช้ได้ทั้งโปรโมชั่น คูปอง พอยท์ แคมเปญ สุ่มรางวัล เซตร้านยา',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow กลุ่ม/ชุดที่ใช้ซ้ำ', role: 'both' },
        { file: '01-admin-customer-sets.html', title: 'กลุ่มลูกค้า: รายการ', role: 'admin' },
        { file: '02-admin-customer-set-editor.html', title: 'กลุ่มลูกค้า: สมาชิก + นำเข้า', role: 'admin' },
        { file: '03-admin-reward-sets.html', title: 'ชุดของรางวัล', role: 'admin' },
        { file: '04-admin-product-sets.html', title: 'กลุ่มสินค้า (แบรนด์/หมวด/SKU)', role: 'admin' },
        { file: '05-admin-audience-picker.html', title: 'ตัวเลือกกลุ่มเป้าหมาย “ทุกคน/บางคน” (ใช้ทุกหน้าตั้งค่า)', role: 'admin' }
      ]
    },
    {
      slug: 'promotion', no: '01', title: 'โปรโมชั่น',
      desc: 'แนวคิดเดียวกับ "เซตของแถม (Bundle)" ที่ใช้งานอยู่ใน pmpc — ขยายผลตอบแทนเป็นของแถม / ส่วนลด / ฟรีค่าจัดส่ง',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow โปรโมชั่น', role: 'both' },
        { file: '01-admin-list.html', title: 'รายการโปรโมชั่น (ลำดับ priority)', role: 'admin' },
        { file: '02-admin-editor.html', title: 'สร้าง/แก้ไขโปรโมชั่น', role: 'admin' },
        { file: '04-admin-flash.html', title: 'แคมเปญลดตามวันพิเศษ', role: 'admin' },
        { file: '05-admin-simulator.html', title: 'จำลองตะกร้า ตรวจโปรที่ชนะ', role: 'admin' },
        { file: '06-customer-list.html', title: 'หน้ารวมโปรโมชั่น', role: 'customer' },
        { file: '07-customer-product.html', title: 'การ์ดสินค้า + หน้าสินค้าที่มีโปร', role: 'customer' },
        { file: '08-customer-detail.html', title: 'รายละเอียดโปร + เลือกสินค้า', role: 'customer' },
        { file: '09-customer-cart.html', title: 'ตะกร้า: โปรที่ได้รับ', role: 'customer' }
      ]
    },
    {
      slug: 'coupon', no: '02', title: 'คูปอง',
      desc: 'คูปองกระดาษ (หน้า-หลัง ไม่สั่งพิมพ์) · คูปองออนไลน์ · คูปองเก็บเอง/แจกรายเดือน · คูปองลูกค้าใหม่',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow คูปอง', role: 'both' },
        { file: '01-admin-hub.html', title: 'ภาพรวมคูปอง 4 แบบ', role: 'admin' },
        { file: '02-admin-paper-list.html', title: 'คูปองกระดาษ: รายการชุด', role: 'admin' },
        { file: '03-admin-paper-editor.html', title: 'สร้างชุดคูปองกระดาษ (หน้า/หลัง/สาขา/สิทธิ์)', role: 'admin' },
        { file: '04-admin-paper-preview.html', title: 'ตัวอย่างคูปองกระดาษ หน้า-หลัง', role: 'admin' },
        { file: '05-admin-paper-claims.html', title: 'คิวเบิกเงินร้าน/สาขา (นับก้นคูปอง)', role: 'admin' },
        { file: '06-admin-online.html', title: 'คูปองออนไลน์ + ประวัติการใช้', role: 'admin' },
        { file: '07-admin-collectible.html', title: 'คูปองเก็บเอง / แจกรายเดือน / ลูกค้าใหม่', role: 'admin' },
        { file: '08-customer-center.html', title: 'ศูนย์คูปอง + กระเป๋าคูปอง', role: 'customer' },
        { file: '09-customer-cart-coupon.html', title: 'ใช้คูปองในตะกร้า/เช็คเอาต์', role: 'customer' },
        { file: '10-customer-paper-info.html', title: 'ตรวจสอบคูปองกระดาษ (สาขาที่ใช้ได้)', role: 'customer' }
      ]
    },
    {
      slug: 'points', no: '03', title: 'พอยท์',
      desc: 'พอยท์รายสินค้า · ตัวคูณช่วงแคมเปญ · แลกของรางวัล · หมดอายุ · ปรับพอยท์โดยแอดมิน',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow พอยท์', role: 'both' },
        { file: '01-admin-rules.html', title: 'กติกาพอยท์ + อัตรารายสินค้า', role: 'admin' },
        { file: '02-admin-catalog.html', title: 'แคตตาล็อกแลกของรางวัล', role: 'admin' },
        { file: '03-admin-ledger.html', title: 'สมุดพอยท์ลูกค้า + ปรับพอยท์', role: 'admin' },
        { file: '04-customer-dashboard.html', title: 'พอยท์ของฉัน + ประวัติ', role: 'customer' },
        { file: '05-customer-redeem.html', title: 'แลกของรางวัลด้วยพอยท์', role: 'customer' },
        { file: '06-customer-earn-preview.html', title: 'พอยท์ที่จะได้ (สินค้า/ตะกร้า/หลังชำระ)', role: 'customer' }
      ]
    },
    {
      slug: 'campaign', no: '04', title: 'แคมเปญ',
      desc: 'แคมเปญตามช่วงเวลา+โควตา (พักโควตา 15 นาที) และแคมเปญสะสมยอดรายปีแบบขั้นบันได',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow แคมเปญ', role: 'both' },
        { file: '01-admin-list.html', title: 'รายการแคมเปญ', role: 'admin' },
        { file: '02-admin-quota-editor.html', title: 'แคมเปญช่วงเวลา+โควตา', role: 'admin' },
        { file: '03-admin-ladder-editor.html', title: 'แคมเปญสะสมยอดรายปี (ขั้นบันได)', role: 'admin' },
        { file: '04-admin-claims.html', title: 'คิวคำขอรับรางวัล', role: 'admin' },
        { file: '05-admin-progress.html', title: 'ความคืบหน้าลูกค้า + แจ้งเตือน', role: 'admin' },
        { file: '06-customer-ladder.html', title: 'ขั้นบันไดรางวัลของฉัน', role: 'customer' },
        { file: '07-customer-claim-form.html', title: 'ฟอร์มรับสิทธิ์ + ประวัติ', role: 'customer' },
        { file: '08-customer-quota-product.html', title: 'สินค้าแคมเปญ: โควตา + พักโควตา', role: 'customer' }
      ]
    },
    {
      slug: 'raffle', no: '05', title: 'สุ่มรางวัล',
      desc: 'สิทธิ์ลุ้น (Tickets) หน่วยกลาง · โหมด A ลุ้นทันที · โหมด B จับตามรอบ · ตัวคุมงบ · ตรวจสอบย้อนหลังได้',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow สุ่มรางวัล', role: 'both' },
        { file: '01-admin-list.html', title: 'รายการกิจกรรมสุ่มรางวัล', role: 'admin' },
        { file: '02-admin-editor.html', title: 'ตั้งค่ากิจกรรม (ทางเข้าสิทธิ์/โหมด)', role: 'admin' },
        { file: '03-admin-prizes-budget.html', title: 'รางวัล น้ำหนัก งบประมาณ', role: 'admin' },
        { file: '04-admin-draw-run.html', title: 'ประกาศกองสิทธิ์ + จับรางวัล (โหมด B)', role: 'admin' },
        { file: '05-admin-audit.html', title: 'บันทึกการลุ้น/ตรวจสอบย้อนหลัง', role: 'admin' },
        { file: '06-customer-tickets.html', title: 'สิทธิ์ลุ้นของฉัน', role: 'customer' },
        { file: '07-customer-instant-draw.html', title: 'ลุ้นทันที (โหมด A)', role: 'customer' },
        { file: '08-customer-scheduled.html', title: 'จับตามรอบ + ประกาศผล (โหมด B)', role: 'customer' },
        { file: '09-customer-history.html', title: 'ประวัติการลุ้น + รางวัลของฉัน', role: 'customer' }
      ]
    },
    {
      slug: 'starterkit', no: '06', title: 'เซตร้านยาเปิดใหม่',
      desc: 'สินค้าบังคับ (ล็อก) + สินค้าทางเลือก (สวิตช์) + คำนวณราคาสุทธิสด · เฉพาะ B2B · สั่งแทนลูกค้าได้',
      screens: [
        { file: '00-flow.html', title: 'ภาพรวม Flow เซตร้านยา', role: 'both' },
        { file: '01-admin-list.html', title: 'รายการเซตร้านยา', role: 'admin' },
        { file: '02-admin-editor.html', title: 'สร้าง/แก้ไขเซต', role: 'admin' },
        { file: '03-admin-order-behalf.html', title: 'แอดมิน/เซลล์สั่งแทนลูกค้า', role: 'admin' },
        { file: '04-customer-catalog.html', title: 'เลือกเซตร้านยา', role: 'customer' },
        { file: '05-customer-builder.html', title: 'ปรับเซต + ราคาสุทธิสด', role: 'customer' },
        { file: '06-customer-blocked.html', title: 'สถานะสินค้าบังคับหมด/ไม่มีสิทธิ์สั่ง', role: 'customer' }
      ]
    }
  ]
};
