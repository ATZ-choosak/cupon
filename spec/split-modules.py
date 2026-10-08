# -*- coding: utf-8 -*-
# Splits Pharmaplex-Platform-Spec.md into one implementation-reference file per
# module and writes them into the pmpc repo's docs/ folder (cross-repo on purpose:
# the customer-facing master spec lives in cupon, the per-module implementation
# references live in pmpc/docs alongside the rest of that team's docs).
# Re-run this whenever Pharmaplex-Platform-Spec.md changes.
import re
import os
import shutil

SRC = 'd:/Bonmek/PMP/cupon/spec/Pharmaplex-Platform-Spec.md'
SRC_ASSETS = 'd:/Bonmek/PMP/cupon/spec/assets'
DOCS_DIR = 'd:/Bonmek/PMP/pmpc/docs'
ASSET_DIR = f'{DOCS_DIR}/assets/pharmaplex-spec'
ASSET_REF = 'assets/pharmaplex-spec'  # as referenced from DOCS_DIR

# keep the vendored assets in sync with the cupon source on every run
for sub in ('diagrams', 'shots', 'ux', 'mockup'):
    dst = f'{ASSET_DIR}/{sub}'
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    shutil.copytree(f'{SRC_ASSETS}/{sub}', dst)

s = open(SRC, encoding='utf-8').read()

pattern = re.compile(r'^## (\d+)\. (.+)$', re.M)
matches = list(pattern.finditer(s))
assert len(matches) == 7, len(matches)

modules = [
    ('pharmaplex-spec-00-overview', 'ภาพรวมระบบ Pharmaplex'),
    ('pharmaplex-spec-01-custom-service', 'บริการสั่งทำพิเศษ (Custom Print & Pre-order Services)'),
    ('pharmaplex-spec-02-promotions', 'โปรโมชั่น (Promotions)'),
    ('pharmaplex-spec-03-coupons', 'คูปอง (Coupons)'),
    ('pharmaplex-spec-04-points-campaign', 'พอยท์และแคมเปญ (Points & Campaigns)'),
    ('pharmaplex-spec-05-raffle', 'การสุ่มรางวัล (Lucky Draw)'),
    ('pharmaplex-spec-06-starter-kit', 'เซตร้านยาเปิดใหม่ (Pharmacy Starter Kit)'),
]

meta_line = ('> ส่วนหนึ่งของสเปกฉบับเต็ม `Pharmaplex-Platform-Spec.md` (ฉบับ 1.0 · 6 ตุลาคม 2569) '
             'ในโปรเจกต์ cupon — แยกไว้ที่นี่เป็นเอกสารอ้างอิงตอน implement ในฝั่ง pmpc เนื้อหาเดียวกัน '
             'ไม่ใช่เอกสารคนละชุด แก้ที่ไฟล์หลักใน cupon แล้วรัน `cupon/spec/split-modules.py` ใหม่เพื่อซิงก์ไฟล์ชุดนี้')

index_lines = [
    '# Pharmaplex Spec — แยกตามโมดูล', '',
    'สเปกของระบบโปรโมชั่น คูปอง พอยท์ แคมเปญ สุ่มรางวัล บริการสั่งทำพิเศษ และเซตร้านยาเปิดใหม่ '
    'แยกจากสเปกฉบับเต็มในโปรเจกต์ cupon (`cupon/spec/Pharmaplex-Platform-Spec.md`) ทีละโมดูล ไว้อ้างอิงตอน implement '
    'โมดูลที่ยังไม่มีโค้ด (ทุกโมดูลยกเว้นบริการสั่งทำพิเศษ) ให้ตรวจกับของจริงก่อนด้วยถ้ามีการพัฒนาไปแล้วบางส่วน', '',
]

for i, (slug, title) in enumerate(modules):
    start = matches[i].start()
    end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
    body = s[start:end]
    body = body[matches[i].end() - start:].lstrip('\n')
    body = re.sub(r'\n+---\s*$', '\n', body)
    body = re.sub(r'^### ', '## ', body, flags=re.M)
    body = re.sub(r'^#### ', '### ', body, flags=re.M)
    body = body.replace('](assets/', f']({ASSET_REF}/')

    out = f'# {title}\n\n{meta_line}\n\n---\n\n{body.rstrip()}\n'
    path = f'{DOCS_DIR}/{slug}.md'
    open(path, 'w', encoding='utf-8').write(out)
    print('wrote', path, len(out), 'chars')
    index_lines.append(f'- [{title}]({slug}.md)')

open(f'{DOCS_DIR}/pharmaplex-spec-index.md', 'w', encoding='utf-8').write('\n'.join(index_lines) + '\n')
print('wrote', f'{DOCS_DIR}/pharmaplex-spec-index.md')
