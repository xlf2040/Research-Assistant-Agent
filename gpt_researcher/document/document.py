import asyncio
import os
from typing import List, Union
from langchain_community.document_loaders import (
    PyMuPDFLoader,
    TextLoader,
    UnstructuredCSVLoader,
    UnstructuredExcelLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPowerPointLoader,
    UnstructuredWordDocumentLoader
)
from langchain_community.document_loaders import BSHTMLLoader
from langchain_core.documents import Document


class DocumentLoader:

    # OCR 配置
    OCR_DPI = 300           # 渲染分辨率
    OCR_LANG = "eng+chi_sim"  # 识别语言（英文+简体中文）

    def __init__(self, path: Union[str, List[str]]):
        self.path = path

    async def load(self) -> list:
        tasks = []
        if isinstance(self.path, list):
            for file_path in self.path:
                if os.path.isfile(file_path):
                    filename = os.path.basename(file_path)
                    file_name, file_extension_with_dot = os.path.splitext(filename)
                    file_extension = file_extension_with_dot.strip(".").lower()
                    tasks.append(self._load_document(file_path, file_extension))

        elif isinstance(self.path, (str, bytes, os.PathLike)):
            for root, dirs, files in os.walk(self.path):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_name, file_extension_with_dot = os.path.splitext(file)
                    file_extension = file_extension_with_dot.strip(".").lower()
                    tasks.append(self._load_document(file_path, file_extension))

        else:
            raise ValueError("Invalid type for path. Expected str, bytes, os.PathLike, or list thereof.")

        docs = []
        for pages in await asyncio.gather(*tasks):
            for page in pages:
                if page.page_content:
                    docs.append({
                        "raw_content": page.page_content,
                        "url": os.path.basename(page.metadata['source'])
                    })

        if not docs:
            raise ValueError("[NONE] Failed to load any documents!")

        return docs

    async def _load_document(self, file_path: str, file_extension: str) -> list:
        ret_data = []
        try:
            loader_dict = {
                "pdf": PyMuPDFLoader(file_path),
                "txt": TextLoader(file_path),
                "doc": UnstructuredWordDocumentLoader(file_path),
                "docx": UnstructuredWordDocumentLoader(file_path),
                "pptx": UnstructuredPowerPointLoader(file_path),
                "csv": UnstructuredCSVLoader(file_path, mode="elements"),
                "xls": UnstructuredExcelLoader(file_path, mode="elements"),
                "xlsx": UnstructuredExcelLoader(file_path, mode="elements"),
                "md": UnstructuredMarkdownLoader(file_path),
                "html": BSHTMLLoader(file_path),
                "htm": BSHTMLLoader(file_path)
            }

            loader = loader_dict.get(file_extension, None)
            if loader:
                try:
                    ret_data = loader.load()
                    # OCR fallback: PDF 提取为空时，尝试图片识别
                    if file_extension == "pdf" and self._is_empty(ret_data):
                        ret_data = await self._ocr_pdf(file_path)
                except Exception as e:
                    print(f"Failed to load document : {file_path}")
                    print(e)
                    # PDF 加载失败也尝试 OCR
                    if file_extension == "pdf":
                        try:
                            ret_data = await self._ocr_pdf(file_path)
                        except Exception as ocr_e:
                            print(f"OCR fallback also failed: {ocr_e}")

        except Exception as e:
            print(f"Failed to load document : {file_path}")
            print(e)

        return ret_data

    # ── OCR 辅助 ──

    @staticmethod
    def _is_empty(docs: list) -> bool:
        """检查所有文档页面内容是否为空。"""
        if not docs:
            return True
        return all(not doc.page_content.strip() for doc in docs)

    async def _ocr_pdf(self, file_path: str) -> list:
        """对扫描版/图片型 PDF 做 OCR 提取文字。

        使用 PyMuPDF 将每页渲染为图片，再用 pytesseract 识别。
        不依赖 pdf2image / poppler，仅需 tesseract-ocr 系统引擎。

        Returns:
            LangChain Document 列表，含 page_content 和 metadata。
        """
        import asyncio
        return await asyncio.to_thread(self._ocr_pdf_sync, file_path)

    def _ocr_pdf_sync(self, file_path: str) -> list:
        import fitz  # PyMuPDF
        import io
        from PIL import Image

        filename = os.path.basename(file_path)

        try:
            import pytesseract
        except ImportError:
            print(f"[OCR] pytesseract 未安装，跳过 OCR: {filename}")
            print("       请执行: pip install pytesseract")
            return []

        # 自动配置 Tesseract 路径（Windows 默认安装位置）
        _tesseract_paths = [
            os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "Tesseract-OCR", "tesseract.exe"),
            os.path.join(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"), "Tesseract-OCR", "tesseract.exe"),
        ]
        for _tp in _tesseract_paths:
            if os.path.isfile(_tp):
                pytesseract.pytesseract.tesseract_cmd = _tp
                break

        doc = fitz.open(file_path)
        pages = []
        try:
            total = len(doc)
            for i in range(total):
                page = doc[i]
                # 渲染页面为 PNG
                pix = page.get_pixmap(dpi=self.OCR_DPI)
                img = Image.open(io.BytesIO(pix.tobytes("png")))

                try:
                    text = pytesseract.image_to_string(img, lang=self.OCR_LANG)
                except Exception as lang_err:
                    # 语言数据可能未安装，回退到仅英文
                    print(f"[OCR] {self.OCR_LANG} 语言包缺失，回退到 eng: {lang_err}")
                    text = pytesseract.image_to_string(img, lang="eng")

                if text.strip():
                    pages.append(Document(
                        page_content=text.strip(),
                        metadata={"source": filename, "page": i + 1, "ocr": True}
                    ))

            if pages:
                print(f"[OCR] 成功从 {filename} 识别出 {len(pages)}/{total} 页文字")
            else:
                print(f"[OCR] {filename}: 所有页面均未识别到文字")
        finally:
            doc.close()

        return pages
