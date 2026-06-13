import aiofiles
import urllib
import mistune
import os

async def write_to_file(filename: str, text: str) -> None:
    """Asynchronously write text to a file in UTF-8 encoding.

    Args:
        filename (str): The filename to write to.
        text (str): The text to write.
    """
    # Ensure text is a string
    if not isinstance(text, str):
        text = str(text)

    # Convert text to UTF-8, replacing any problematic characters
    text_utf8 = text.encode('utf-8', errors='replace').decode('utf-8')

    async with aiofiles.open(filename, "w", encoding='utf-8') as file:
        await file.write(text_utf8)

async def write_text_to_md(text: str, filename: str = "") -> str:
    """Writes text to a Markdown file and returns the file path.

    Args:
        text (str): Text to write to the Markdown file.

    Returns:
        str: The file path of the generated Markdown file.
    """
    file_path = f"outputs/{filename[:60]}.md"
    await write_to_file(file_path, text)
    return urllib.parse.quote(file_path)

def _preprocess_images_for_pdf(text: str) -> str:
    """Convert web image URLs to absolute file paths for PDF generation.
    
    Transforms /outputs/images/... URLs to absolute file:// paths that
    weasyprint can resolve.
    """
    import re
    
    base_path = os.path.abspath(".")
    
    # Pattern to find markdown images with /outputs/ URLs
    def replace_image_url(match):
        alt_text = match.group(1)
        url = match.group(2)
        
        # Convert /outputs/... to absolute path
        if url.startswith("/outputs/"):
            abs_path = os.path.join(base_path, url.lstrip("/"))
            return f"![{alt_text}]({abs_path})"
        return match.group(0)
    
    # Match ![alt text](/outputs/images/...)
    pattern = r'!\[([^\]]*)\]\((/outputs/[^)]+)\)'
    return re.sub(pattern, replace_image_url, text)


async def write_md_to_pdf(text: str, filename: str = "") -> str:
    """Converts Markdown text to a PDF file and returns the file path.
    Uses fpdf2 with Chinese font support (Windows-compatible).

    Args:
        text (str): Markdown text to convert.

    Returns:
        str: The encoded file path of the generated PDF.
    """
    file_path = f"outputs/{filename[:60]}.pdf"
    print(f"[PDF] Starting PDF generation: {file_path}, text length={len(text)}")

    try:
        from fpdf import FPDF
        import re
        import sys

        # Find a Chinese font on the system
        _font_candidates = [
            "C:/Windows/Fonts/msyh.ttc",      # 微软雅黑
            "C:/Windows/Fonts/simsun.ttc",    # 宋体
            "C:/Windows/Fonts/simhei.ttf",    # 黑体
        ]
        font_path = None
        for fp in _font_candidates:
            if os.path.exists(fp):
                font_path = fp
                break

        if not font_path:
            print("[PDF][WARN] No Chinese font found, trying msyh.ttc anyway", file=sys.stderr)
            font_path = "C:/Windows/Fonts/msyh.ttc"

        print(f"[PDF] Using font: {font_path}", file=sys.stderr)

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.set_left_margin(15)
        pdf.set_right_margin(15)
        pdf.add_page()
        pdf.add_font("cjk", "", font_path, uni=True)
        pdf.set_auto_page_break(auto=True, margin=20)

        # Clean markdown: strip images, links, code blocks, table formatting
        clean_text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
        clean_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean_text)
        clean_text = re.sub(r'```.*?```', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'`([^`]+)`', r'\1', clean_text)
        clean_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean_text)
        clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)
        clean_text = clean_text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        # Remove table rows (pipe-separated) to avoid horizontal overflow
        clean_text = re.sub(r'^[\|\s\-:]+$', '', clean_text, flags=re.MULTILINE)
        # Remove leading/trailing pipe from table cells but keep content
        clean_text = re.sub(r'^\|(.+?)\|$', r'\1', clean_text, flags=re.MULTILINE)

        lines = clean_text.split('\n')
        usable_width = 210 - 15 - 15  # A4 width minus margins = 180mm
        print(f"[PDF] Processed {len(lines)} lines, usable_width={usable_width}mm", file=sys.stderr)
        for line in lines:
            line = line.strip()
            if not line:
                pdf.ln(4)
                continue
            # Headers (H1-H6)
            if line.startswith('#'):
                level = min(len(line) - len(line.lstrip('#')), 6)
                header_text = line.lstrip('#').strip()
                sizes = {1: 18, 2: 15, 3: 13, 4: 12, 5: 11, 6: 11}
                pdf.set_font("cjk", size=sizes.get(level, 11))
                try:
                    pdf.multi_cell(0, 7, header_text)
                except Exception:
                    pdf.set_font("cjk", size=9)
                    pdf.multi_cell(0, 5, header_text[:200])
                pdf.set_font("cjk", size=10)
                pdf.ln(2)
            # Horizontal rule
            elif line in ('---', '***'):
                pdf.cell(0, 2, '', new_x="LMARGIN", new_y="NEXT")
                pdf.ln(3)
            else:
                pdf.set_font("cjk", size=10)
                try:
                    pdf.multi_cell(0, 5.5, line)
                except Exception:
                    # Line too wide - truncate or use smaller font
                    pdf.set_font("cjk", size=8)
                    try:
                        pdf.multi_cell(0, 4, line[:300])
                    except Exception:
                        pass  # skip extremely problematic lines

        pdf.output(file_path)
        print(f"[PDF] Report written to {file_path}", file=sys.stderr)

    except Exception as e:
        print(f"[PDF] ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return ""

    encoded_file_path = urllib.parse.quote(file_path)
    return encoded_file_path

async def write_md_to_word(text: str, filename: str = "") -> str:
    """Converts Markdown text to a DOCX file and returns the file path.

    Args:
        text (str): Markdown text to convert.

    Returns:
        str: The encoded file path of the generated DOCX.
    """
    file_path = f"outputs/{filename[:60]}.docx"

    try:
        from docx import Document
        from docx.shared import Pt
        from docx.oxml.ns import qn
        from htmldocx import HtmlToDocx

        # Convert report markdown to HTML
        html = mistune.html(text)
        # Create a document object
        doc = Document()

        # ── Set default font to support Chinese characters ──
        # Without this, Word uses Calibri which lacks CJK glyphs,
        # causing Chinese text to display as boxes (方框/�)
        _chinese_font = "Microsoft YaHei"  # 微软雅黑，Windows 自带，完美支持中文
        for _style_name in ["Normal"] + [f"Heading {i}" for i in range(1, 7)]:
            if _style_name in doc.styles:
                _style = doc.styles[_style_name]
                _style.font.name = _chinese_font
                _style.font.size = Pt(11)
                # Set CJK (East Asian) font separately
                _rpr = _style.element.get_or_add_rPr()
                _rfonts = _rpr.find(qn('w:rFonts'))
                if _rfonts is None:
                    from lxml import etree
                    _rfonts = etree.SubElement(_rpr, qn('w:rFonts'))
                _rfonts.set(qn('w:eastAsia'), _chinese_font)

        # Convert the html generated from the report to document format
        HtmlToDocx().add_html_to_document(html, doc)

        # Saving the docx document to file_path
        doc.save(file_path)

        print(f"Report written to {file_path}")

        encoded_file_path = urllib.parse.quote(file_path)
        return encoded_file_path

    except Exception as e:
        print(f"Error in converting Markdown to DOCX: {e}")
        return ""