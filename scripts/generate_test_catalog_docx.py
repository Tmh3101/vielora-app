#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate Vielora Manual Test Catalog DOCX — corporate layout v4.

Structure: Cover page → TOC → Body (H1 sections w/ page breaks, H2 features)
- A4, 2.5cm margins
- Header: doc title + version (not on cover)
- Footer: confidentiality + Trang X/Y (PAGE/NUMPAGES fields, not on cover)
- Heading hierarchy: H1 = sections/groups, H2 = features (real styles → Word TOC)
"""
import re, sys
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

PRIMARY = RGBColor(0x1F, 0x4E, 0x79)   # Navy
SECONDARY = RGBColor(0x5A, 0x5A, 0x5A)  # Slate Gray
TEXT = RGBColor(0x33, 0x33, 0x33)        # Charcoal
HDR_FILL = "1F4E79"
VERSION = "4.6"
DOC_TITLE = "Hướng Dẫn Kiểm Thử Thủ Công"
DOC_SUBTITLE = "Vielora — Nền tảng SaaS Chatbot AI cho website"
DOC_CODE = "VL-DOC-TEST-001"
DOC_DATE = "17/08/2026"

def init_styles(doc):
    def set_style(name, size, color, bold=True, italic=False):
        st = doc.styles[name]
        st.font.name = "Arial"; st.font.size = Pt(size)
        st.font.bold = bold; st.font.italic = italic
        st.font.color.rgb = color; st.font.underline = False
        rPr = st.element.get_or_add_rPr()
        u = rPr.find(qn("w:u"))
        if u is not None:
            rPr.remove(u)
    set_style("Title", 19, PRIMARY)
    set_style("Heading 1", 13.5, PRIMARY)
    set_style("Heading 2", 11.5, SECONDARY)
    set_style("Heading 3", 11, SECONDARY, bold=True, italic=True)

def add_field(run, instr):
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "end")
    run._r.append(f1); run._r.append(it); run._r.append(f2)

def add_paragraph_bottom_border(paragraph, color_hex="1F4E79", size_eighth_pts="12"):
    pPr = paragraph._element.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size_eighth_pts))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color_hex)
    pBdr.append(bottom)
    pPr.append(pBdr)

def parse_inline(p, text, size=10.5, base_bold=False):
    parts = re.split(r"(\*\*.*?\*\*|`[^`]*`|\[[^\]]*\]\([^)]*\))", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2]); run.font.bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = p.add_run(part[1:-1]); run.font.name = "Courier New"
            run.font.size = Pt(size - 1); run.font.color.rgb = RGBColor(0x78, 0x14, 0x14)
        elif part.startswith("[") and "](" in part and part.endswith(")"):
            m = re.match(r"\[(.*?)\]\((.*?)\)", part)
            if m:
                run = p.add_run(f"{m.group(1)} ({m.group(2)})")
                run.font.italic = True; run.font.color.rgb = PRIMARY
        else:
            run = p.add_run(part)
            run.font.bold = base_bold
        if run.font.name is None or run.font.name == "":
            run.font.name = "Arial"
            run.font.size = Pt(size)
            run.font.color.rgb = TEXT
        if base_bold:
            run.font.bold = True

def add_table(doc, rows):
    n = max(len(r) for r in rows)
    t = doc.add_table(rows=len(rows), cols=n)
    t.style = "Table Grid"
    for i, row in enumerate(rows):
        for j in range(n):
            cell = t.cell(i, j)
            cell.text = ""
            p = cell.paragraphs[0]
            parse_inline(p, row[j] if j < len(row) else "", size=9.5, base_bold=(i == 0))
            if i == 0:
                tcPr = cell._tc.get_or_add_tcPr()
                shd = OxmlElement("w:shd")
                shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto")
                shd.set(qn("w:fill"), HDR_FILL)
                tcPr.append(shd)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

LOGO_PATH = None
# Logo thật (nhúng vào trang bìa) — đặt tại docs/manual-testing/assets/vielora-logo.jpg
import os as _os
_logo = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))),
                      "docs/manual-testing/assets/vielora-logo.jpg")
if _os.path.exists(_logo):
    LOGO_PATH = _logo

def add_cover(doc):
    """Trang bìa: logo, tiêu đề, thông tin kiểm soát."""
    for _ in range(3):
        p = doc.add_paragraph()
    if LOGO_PATH:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.add_picture(LOGO_PATH, width=Cm(7.0))
    else:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run("[ĐIỀN LOGO VIELORA]")
        r.font.name = "Arial"; r.font.size = Pt(14); r.font.italic = True
        r.font.color.rgb = RGBColor(0x9A, 0x9A, 0x9A)

    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(30); p.paragraph_format.space_after = Pt(6)
    r = p.add_run(DOC_TITLE.upper())
    r.font.name = "Arial"; r.font.size = Pt(26); r.font.bold = True
    r.font.color.rgb = PRIMARY

    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(40)
    r = p.add_run(DOC_SUBTITLE)
    r.font.name = "Arial"; r.font.size = Pt(14)
    r.font.color.rgb = SECONDARY

    # Metadata — borderless table
    meta = [
        ("Mã tài liệu", DOC_CODE),
        ("Phiên bản", VERSION),
        ("Ngày ban hành", DOC_DATE),
        ("Bộ phận", "[ĐIỀN BỘ PHẬN]"),
        ("Phân loại bảo mật", "NỘI BỘ"),
        ("Tác giả", "[ĐIỀN TÊN]"),
        ("Người duyệt", "[ĐIỀN TÊN]"),
        ("Người phê duyệt", "[ĐIỀN TÊN]"),
    ]
    t = doc.add_table(rows=len(meta), cols=2)
    t.alignment = 1  # center
    for i, (k, v) in enumerate(meta):
        c0, c1 = t.cell(i, 0), t.cell(i, 1)
        c0.width = Cm(5.5); c1.width = Cm(7.5)
        p0 = c0.paragraphs[0]; p0.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r0 = p0.add_run(k + ":"); r0.font.name = "Arial"; r0.font.size = Pt(11)
        r0.font.bold = True; r0.font.color.rgb = SECONDARY
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v); r1.font.name = "Arial"; r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT
    doc.add_page_break()

def add_toc(doc):
    p = doc.add_paragraph(style="Heading 1")
    p.add_run("MỤC LỤC")
    p2 = doc.add_paragraph()
    run = p2.add_run()
    f1 = OxmlElement("w:fldChar"); f1.set(qn("w:fldCharType"), "begin")
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve")
    it.text = 'TOC \\o "1-2" \\h \\z \\u'
    f2 = OxmlElement("w:fldChar"); f2.set(qn("w:fldCharType"), "separate")
    t = OxmlElement("w:t"); t.text = "Mục lục tự động — trong Word nhấn Ctrl+A rồi F9 để cập nhật"
    f3 = OxmlElement("w:fldChar"); f3.set(qn("w:fldCharType"), "end")
    run._r.append(f1); run._r.append(it); run._r.append(f2); run._r.append(t); run._r.append(f3)

def setup_header_footer(doc):
    section = doc.sections[0]
    section.different_first_page_header_footer = True  # cover sạch

    # Header (trang thường): logo nhỏ trái + tên tài liệu/version phải
    hdr = section.header
    p = hdr.paragraphs[0]
    p.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
    if LOGO_PATH:
        run_logo = p.add_run()
        run_logo.add_picture(LOGO_PATH, width=Cm(2.2))
    r = p.add_run(f"\tVielora — {DOC_TITLE}  |  Phiên bản {VERSION}")
    r.font.name = "Arial"; r.font.size = Pt(8.5); r.font.color.rgb = SECONDARY
    add_paragraph_bottom_border(p, "B0B0B0", "6")

    # Footer (trang thường): bảo mật trái, Trang X/Y phải
    ftr = section.footer
    p = ftr.paragraphs[0]
    p.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
    r = p.add_run("Tài liệu nội bộ — Không phổ biến ngoài phạm vi sử dụng\tTrang ")
    r.font.name = "Arial"; r.font.size = Pt(8); r.font.color.rgb = SECONDARY
    run2 = p.add_run(); add_field(run2, "PAGE")
    run2.font.name = "Arial"; run2.font.size = Pt(8); run2.font.color.rgb = SECONDARY
    r3 = p.add_run(" / "); r3.font.name = "Arial"; r3.font.size = Pt(8); r3.font.color.rgb = SECONDARY
    run4 = p.add_run(); add_field(run4, "NUMPAGES")
    run4.font.name = "Arial"; run4.font.size = Pt(8); run4.font.color.rgb = SECONDARY

def build(md_path, docx_path):
    doc = Document()
    # A4 + lề chuẩn 2.5cm
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)
        section.header_distance = Cm(1.2)
        section.footer_distance = Cm(1.2)
    init_styles(doc)

    add_cover(doc)          # Trang 1
    add_toc(doc)            # Trang 2
    setup_header_footer(doc)

    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_code = False
    table_buf = []
    heading_count = 0
    first_h1_seen = False
    num_counter = 0
    prev_was_num = False

    def flush_table():
        nonlocal table_buf
        if table_buf:
            add_table(doc, table_buf)
            table_buf = []

    for raw in lines:
        line = raw.rstrip("\n")
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_table()
            in_code = not in_code
            continue
        if in_code:
            continue

        if stripped.startswith("|") and stripped.endswith("|"):
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in cells):
                continue
            table_buf.append(cells)
            continue
        else:
            flush_table()

        if not stripped:
            continue

        if stripped.startswith("# "):
            # H1 — page break trước mỗi section/nhóm (trừ section đầu sau TOC)
            p = doc.add_paragraph(style="Heading 1")
            if first_h1_seen:
                br = p.add_run(); br.add_break(WD_BREAK.PAGE)
            else:
                first_h1_seen = True
            p.add_run(stripped[2:])
            heading_count += 1
        elif stripped.startswith("## "):
            p = doc.add_paragraph(style="Heading 2")
            p.add_run(stripped[3:])
            heading_count += 1
        elif stripped.startswith("### "):
            p = doc.add_paragraph(style="Heading 3")
            p.add_run(stripped[4:])
            heading_count += 1
        elif stripped == "---":
            pass
        elif stripped.startswith("> "):
            # Blockquote: in nghiêng, thụt lề — KHÔNG hiện ký tự >
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.6)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.line_spacing = 1.15
            text = stripped[2:]
            parts = re.split(r"(\*\*.*?\*\*)", text)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    run = p.add_run(part[2:-2]); run.font.bold = True
                else:
                    run = p.add_run(part)
                run.font.italic = True
                run.font.name = "Arial"; run.font.size = Pt(10.5)
                run.font.color.rgb = SECONDARY
        elif re.match(r"^\d+\.\s", stripped):
            # Numbered list — số LITERAL (tự đếm lại từ 1 mỗi list)
            # Tránh lỗi List Number style nối tiếp số giữa các list
            num_counter = 1 if not prev_was_num else num_counter + 1
            prev_was_num = True
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.75)
            p.paragraph_format.first_line_indent = Cm(-0.45)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(f"{num_counter}. ")
            run.font.name = "Arial"; run.font.size = Pt(10.5); run.font.color.rgb = TEXT
            parse_inline(p, re.sub(r"^\d+\.\s", "", stripped))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            prev_was_num = False
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            parse_inline(p, stripped[2:])
        else:
            prev_was_num = False
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.line_spacing = 1.15
            parse_inline(p, stripped)

    flush_table()
    doc.save(docx_path)
    print(f"Saved {docx_path} | headings={heading_count} (H1 sections + H2 features)")

if __name__ == "__main__":
    md = sys.argv[1] if len(sys.argv) > 1 else "docs/manual-testing/feature-catalog.md"
    out = sys.argv[2] if len(sys.argv) > 2 else "docs/manual-testing/Vielora_Manual_Test_Catalog.docx"
    build(md, out)
