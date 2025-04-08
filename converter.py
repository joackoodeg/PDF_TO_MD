# converter.py
import sys
import fitz  # PyMuPDF
from markdownify import markdownify as md

def pdf_to_markdown(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    for i in range(len(doc)):
        page = doc.load_page(i)
        full_text += f"\n\n# Página {i + 1}\n\n" + page.get_text()

    markdown = md(full_text)
    with open("output.md", "w", encoding="utf-8") as f:
        f.write(markdown)
    print(markdown)  # This is sent back to Electron

if __name__ == "__main__":
    pdf_path = sys.argv[1]
    pdf_to_markdown(pdf_path)

