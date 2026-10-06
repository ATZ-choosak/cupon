// Build the Pharmaplex platform spec from Pharmaplex-Platform-Spec.md (this folder)
// Outputs: Pharmaplex-Platform-Spec.docx and Pharmaplex-Platform-Spec.html
// PDF: chrome --headless --print-to-pdf=<out>.pdf <out>.html
// Requires: NODE_PATH pointing at a folder that contains node_modules/docx

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, HeadingLevel, AlignmentType, PageBreak, Header, Footer,
  PageNumber, LevelFormat, BorderStyle, Bookmark, InternalHyperlink,
} = require('docx');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'Pharmaplex-Platform-Spec.md');
const OUT_DOCX = path.join(ROOT, 'Pharmaplex-Platform-Spec.docx');
const OUT_HTML = path.join(ROOT, 'Pharmaplex-Platform-Spec.html');
const FONT = 'TH SarabunPSK';
const MONO = 'Consolas';
const RED = 'A32F34';
const CONTENT_W = 9026;
const IMG_MAX_W = 600; // A4 width 11906 - 2 * 1440 margins

// ---------- markdown parsing ----------
function parseBlocks(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^---+\s*$/.test(line)) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      blocks.push({ t: 'h', level: m[1].length, text: m[2].trim() });
      i++; continue;
    }
    if (line.startsWith('```')) {
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { body.push(lines[i]); i++; }
      i++;
      blocks.push({ t: 'code', text: body.join('\n') });
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]); i++;
      }
      const cells = rows
        .filter((r, idx) => !(idx === 1 && /^\|\s*:?-+/.test(r)))
        .map((r) => r.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim()));
      blocks.push({ t: 'table', head: cells[0], rows: cells.slice(1) });
      continue;
    }
    if ((m = line.match(/^!\[(.*?)\]\((.*?)\)\s*$/))) {
      blocks.push({ t: 'img', alt: m[1], src: m[2] });
      i++; continue;
    }
    if (line.startsWith('>')) {
      const body = [];
      while (i < lines.length && lines[i].startsWith('>')) { body.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ t: 'callout', text: body.join(' ') });
      continue;
    }
    if ((m = line.match(/^(\s*)- (.*)$/))) {
      const level = Math.floor(m[1].length / 2);
      blocks.push({ t: 'li', level, text: m[2] });
      i++; continue;
    }
    if ((m = line.match(/^(\s*)\d+\. (.*)$/))) {
      blocks.push({ t: 'ol', level: Math.floor(m[1].length / 2), text: m[2] });
      i++; continue;
    }
    // paragraph: merge following plain lines
    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#|```|\||>|!\[|\s*- |\s*\d+\. |---)/.test(lines[i])) {
      para.push(lines[i].trim()); i++;
    }
    blocks.push({ t: 'p', text: para.join(' ') });
  }
  return blocks;
}

// inline: **bold**, `code`, *italic*
function inlineTokens(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0; let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ s: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ s: tok.slice(2, -2), b: true });
    else if (tok.startsWith('`')) out.push({ s: tok.slice(1, -1), code: true });
    else out.push({ s: tok.slice(1, -1), i: true });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ s: text.slice(last) });
  return out;
}

// ---------- docx ----------
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function runsFor(text, base = {}) {
  return inlineTokens(text).map((t) => new TextRun({
    text: t.s,
    bold: t.b || base.bold,
    italics: t.i || base.italics,
    font: t.code ? MONO : FONT,
    size: t.code ? 16 : base.size || 34,
    color: base.color,
  }));
}

function cellWidths(head, rows) {
  const n = head.length;
  const lens = new Array(n).fill(0);
  [head, ...rows].forEach((r) => r.forEach((c, j) => {
    if (j < n) lens[j] = Math.max(lens[j], Math.min(c.length, 60));
  }));
  const total = lens.reduce((a, b) => a + Math.max(b, 6), 0);
  let widths = lens.map((l) => Math.max(Math.round((Math.max(l, 6) / total) * CONTENT_W), 900));
  const diff = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += diff;
  return widths;
}

function docxTable(block) {
  const widths = cellWidths(block.head, block.rows);
  const mkCell = (text, w, header) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: RED } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: runsFor(text, { size: 27, bold: header, color: header ? 'FFFFFF' : undefined }),
    })],
  });
  const rows = [
    new TableRow({ tableHeader: true, children: block.head.map((c, j) => mkCell(c, widths[j], true)) }),
    ...block.rows.map((r) => new TableRow({
      children: widths.map((w, j) => mkCell(r[j] || '', w, false)),
    })),
  ];
  return [new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows,
  }), new Paragraph({ spacing: { after: 120 } })];
}

function docxImage(block) {
  const file = path.join(ROOT, block.src);
  const buf = fs.readFileSync(file);
  const { w, h } = pngSize(buf);
  const scale = Math.min(IMG_MAX_W / w, 740 / h, 1);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({
        type: 'png', data: buf,
        transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
        altText: { title: block.alt, description: block.alt, name: block.alt },
      })],
    }),
  ];
}

// split code lines that would overflow the page width (diagrams keep their leading indent)
function wrapCode(ln, max = 96) {
  const out = [];
  let rest = ln;
  const indent = (ln.match(/^\s*/) || [''])[0];
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut <= indent.length) cut = max;
    out.push(rest.slice(0, cut));
    rest = indent + '    ' + rest.slice(cut).trimStart();
  }
  out.push(rest);
  return out;
}

function toDocx(blocks) {
  const children = [];
  let h2count = 0;
  const sections = blocks.filter((b) => b.t === 'h' && b.level === 2).slice(1);
  for (const b of blocks) {
    if (b.t === 'h' && b.level === 2 && h2count === 1) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2, pageBreakBefore: true, spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RED, space: 4 } },
        children: [new TextRun({ text: 'สารบัญ', bold: true, size: 40, font: FONT, color: '222222' })],
      }));
      sections.forEach((s, i) => children.push(new Paragraph({
        spacing: { after: 100 }, indent: { left: 360 },
        children: [new InternalHyperlink({
          anchor: `sec${i + 1}`,
          children: [new TextRun({ text: `${i + 1}. ${s.text.replace(/^\d+\.\s*/, '')}`, font: FONT, size: 32, color: RED, underline: {} })],
        })],
      })));
    }
    if (b.t === 'h') {
      if (b.level === 1) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1, spacing: { before: 2400, after: 200 },
          children: [new TextRun({ text: 'PHARMAPLEX', bold: true, size: 26, font: FONT, color: RED, characterSpacing: 60 })],
        }));
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 200, line: 520 },
          children: [new TextRun({ text: b.text, bold: true, size: 72, font: FONT, color: '222222' })],
        }));
      } else if (b.level === 2) {
        h2count++;
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          pageBreakBefore: h2count > 1,
          spacing: { before: 200, after: 160 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RED, space: 4 } },
          children: [new Bookmark({ id: `sec${h2count - 1}`, children: [new TextRun({ text: b.text, bold: true, size: 40, font: FONT, color: '222222' })] })],
        }));
      } else if (b.level === 3) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 }, keepNext: true,
          children: [new TextRun({ text: b.text, bold: true, size: 32, font: FONT, color: RED })],
        }));
      } else {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_4, spacing: { before: 180, after: 80 }, keepNext: true,
          children: [new TextRun({ text: b.text, bold: true, size: 28, font: FONT, color: '333333' })],
        }));
      }
    } else if (b.t === 'p') {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: 400 },
        children: runsFor(b.text),
      }));
    } else if (b.t === 'li' || b.t === 'ol') {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 400 },
        indent: { left: 360 + b.level * 360, hanging: 300 },
        children: [
          new TextRun({ text: b.t === 'li' ? (b.level ? '–  ' : '•  ') : '', font: FONT, size: 34 }),
          ...runsFor(b.text),
        ],
      }));
    } else if (b.t === 'code') {
      for (const ln of b.text.split('\n')) {
        children.push(new Paragraph({
          spacing: { after: 0, line: 240 },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F3F3' },
          indent: { left: 120, right: 120 },
          children: [new TextRun({ text: ln.length ? ln : ' ', font: MONO, size: 16 })],
        }));
      }
      children.push(new Paragraph({ spacing: { after: 120 } }));
    } else if (b.t === 'table') {
      children.push(...docxTable(b));
    } else if (b.t === 'img') {
      children.push(...docxImage(b));
    } else if (b.t === 'callout') {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 60, after: 120, line: 400 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FFF4E5' },
        border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'E0A030', space: 8 } },
        indent: { left: 200, right: 120 },
        children: runsFor(b.text, { size: 30 }),
      }));
    }
  }
  return children;
}

async function buildDocx(blocks) {
  const children = toDocx(blocks);
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 34 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1300, left: 1440, right: 1440, header: 600, footer: 600 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Pharmaplex — Spec', size: 22, color: '888888', font: FONT })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: ['หน้า ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], size: 22, color: '888888', font: FONT }),
          ],
        })] }),
      },
      children,
    }],
  });
  fs.writeFileSync(OUT_DOCX, await Packer.toBuffer(doc));
}

// ---------- html ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inlineHtml(text) {
  return inlineTokens(text).map((t) => {
    let s = esc(t.s);
    if (t.code) s = `<code>${s}</code>`;
    if (t.b) s = `<strong>${s}</strong>`;
    if (t.i) s = `<em>${s}</em>`;
    return s;
  }).join('');
}

function toHtml(blocks) {
  const out = [];
  let h2count = 0;
  let inList = null; // 'ul' | 'ol'
  const closeList = () => { if (inList) { out.push(`</${inList}>`); inList = null; } };
  for (const b of blocks) {
    if (b.t !== 'li' && b.t !== 'ol') closeList();
    if (b.t === 'h') {
      if (b.level === 2) {
        h2count++;
        out.push(`<h2 id="s${h2count}"${h2count > 1 ? ' class="pb"' : ''}>${esc(b.text)}</h2>`);
      } else {
        out.push(`<h${b.level}>${esc(b.text)}</h${b.level}>`);
      }
    } else if (b.t === 'p') {
      out.push(`<p>${inlineHtml(b.text)}</p>`);
    } else if (b.t === 'li' || b.t === 'ol') {
      if (inList !== 'ul' && b.t === 'li') { closeList(); out.push('<ul>'); inList = 'ul'; }
      if (inList !== 'ol' && b.t === 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
      out.push(`<li class="l${b.level}">${inlineHtml(b.text)}</li>`);
    } else if (b.t === 'code') {
      out.push(`<pre>${esc(b.text)}</pre>`);
    } else if (b.t === 'table') {
      const th = b.head.map((c) => `<th>${inlineHtml(c)}</th>`).join('');
      const trs = b.rows.map((r) => `<tr>${b.head.map((_, j) => `<td>${inlineHtml(r[j] || '')}</td>`).join('')}</tr>`).join('');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
    } else if (b.t === 'img') {
      const src = b.src.replace(/^spec\//, '');
      out.push(`<figure><img src="${src}" alt="${esc(b.alt)}"></figure>`);
    } else if (b.t === 'callout') {
      out.push(`<blockquote>${inlineHtml(b.text)}</blockquote>`);
    }
  }
  closeList();
  return out.join('\n');
}

const CSS = `
@font-face { font-family: "TH SarabunPSK"; src: local("THSarabunPSK"), url("fonts/THSarabun.ttf") format("truetype"); font-weight: 400; font-style: normal; }
@font-face { font-family: "TH SarabunPSK"; src: local("THSarabunPSK-Bold"), url("fonts/THSarabun%20Bold.ttf") format("truetype"); font-weight: 700; font-style: normal; }
@font-face { font-family: "TH SarabunPSK"; src: local("THSarabunPSK-Italic"), url("fonts/THSarabun%20Italic.ttf") format("truetype"); font-weight: 400; font-style: italic; }
@font-face { font-family: "TH SarabunPSK"; src: local("THSarabunPSK-BoldItalic"), url("fonts/THSarabun%20BoldItalic.ttf") format("truetype"); font-weight: 700; font-style: italic; }
:root { --red:#a32f34; --ink:#222; --muted:#666; --line:#e5e5e5; }
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: "TH SarabunPSK", "THSarabunPSK", sans-serif; color: var(--ink); font-size: 23px; line-height: 1.5; margin: 0; background:#fff; }
h1 { color: var(--red); font-size: 40px; margin: 0 0 4px; }
h2 { font-size: 31px; border-bottom: 2px solid var(--red); padding-bottom: 6px; margin: 26px 0 14px; }
h2.pb { break-before: page; }
h3 { color: var(--red); font-size: 26px; margin: 22px 0 8px; break-after: avoid; }
h4 { font-size: 23px; margin: 16px 0 6px; break-after: avoid; }
p { margin: 6px 0 10px; text-align: justify; }
ul, ol { margin: 4px 0 12px 0; padding-left: 28px; }
li { margin: 3px 0; text-align: justify; }
li.l1 { margin-left: 18px; list-style-type: circle; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 20px; line-height: 1.35; break-inside: auto; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { background: var(--red); color: #fff; text-align: left; padding: 6px 8px; }
td { border: 1px solid var(--line); padding: 5px 8px; vertical-align: top; }
tbody tr:nth-child(even) td { background: #fafafa; }
pre { background: #f3f3f3; border-radius: 4px; padding: 10px 12px; font-family: Consolas, "Courier New", monospace; font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-break: break-all; break-inside: avoid; }
code { font-family: Consolas, "Courier New", monospace; font-size: 15px; background: #f3f3f3; padding: 0 3px; border-radius: 3px; }
blockquote { margin: 10px 0 14px; background: #fff4e5; border-left: 5px solid #e0a030; padding: 8px 12px; border-radius: 3px; text-align: justify; }
figure { margin: 12px 0 4px; text-align: center; break-inside: avoid; }
img { max-width: 100%; max-height: 640px; border: 1px solid var(--line); border-radius: 4px; }
figure + p { text-align: center; }
figure + p em { color: var(--muted); font-size: 19px; }
.cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; break-after: page; border-top: 10px solid var(--red); padding: 0 6mm; }
.cover .brand { font-size: 19px; letter-spacing: 3px; text-transform: uppercase; color: var(--red); font-weight: 700; margin-bottom: 26px; }
.cover h1 { font-size: 54px; line-height: 1.3; color: var(--ink); margin: 0 0 18px; max-width: 150mm; }
.cover h1::after { content: ""; display: block; width: 70px; height: 4px; background: var(--red); margin-top: 22px; }
.cover .sub { font-size: 28px; color: var(--muted); margin-top: 4px; }
.cover .meta { margin-top: 56px; color: var(--muted); font-size: 20px; border-top: 1px solid var(--line); padding-top: 14px; }
.cover .meta p { margin: 2px 0; text-align: left; }
.toc { break-after: page; }
.toc-list { list-style: none; padding-left: 0; }
.toc-list li { margin: 6px 0; font-size: 25px; }
.toc-list a { color: var(--red); text-decoration: none; }
`;

function buildHtml(blocks) {
  const h1 = blocks.find((b) => b.t === 'h' && b.level === 1);
  const h2s = blocks.filter((b) => b.t === 'h' && b.level === 2);
  const subtitle = h2s[0] ? h2s[0].text : '';
  const coverMeta = [];
  let idx = blocks.indexOf(h2s[0]) + 1;
  while (idx < blocks.length && !(blocks[idx].t === 'h')) { coverMeta.push(blocks[idx]); idx++; }
  const metaHtml = coverMeta.filter((b) => b.t === 'p').map((b) => `<p>${inlineHtml(b.text)}</p>`).join('');
  const toc = h2s.slice(1).map((h, i) => `<li><a href="#s${i + 1}">${esc(h.text)}</a></li>`).join('');
  const body = toHtml(blocks.slice(idx));
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pharmaplex — Spec</title>
<style>${CSS}</style></head>
<body>
<section class="cover">
  <div class="brand">Pharmaplex</div>
  <h1>${esc(h1 ? h1.text : '')}</h1>
  <div class="sub">${esc(subtitle)}</div>
  <div class="meta">${metaHtml}</div>
</section>
<section class="toc"><h2>สารบัญ</h2><ul class="toc-list">${toc}</ul></section>
${body}
</body></html>`;
}

(async () => {
  const md = fs.readFileSync(SRC, 'utf8');
  const blocks = parseBlocks(md);
  fs.writeFileSync(OUT_HTML, buildHtml(blocks), 'utf8');
  await buildDocx(blocks);
  console.log('built', OUT_DOCX, OUT_HTML);
})();
