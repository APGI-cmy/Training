"""Assemble the owner-approved Complete Guide chapters; preserve all originals."""
import argparse
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader, PdfWriter


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parent.parent))
    parser.add_argument("--source", required=True, help="Folder containing the nine approved Complete Guide chapter PDFs")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    source = Path(args.source).resolve()
    output = root / "private/course-books/scannex"
    output.mkdir(parents=True, exist_ok=True)
    combined, resources = PdfWriter(), []
    for number in range(1, 10):
        originals = [p for p in source.glob(f"{number}. Scannex_The_Complete_Guide_Chapter*.pdf") if "DESKTOP" not in p.name]
        if len(originals) != 1:
            raise ValueError(f"Expected one approved Chapter {number}")
        original = originals[0]
        content = original.read_bytes()
        reader = PdfReader(original)
        if reader.is_encrypted and not reader.decrypt(""):
            raise ValueError(f"LU {number} requires the owner's PDF password")
        if not reader.pages or not content.startswith(b"%PDF-"):
            raise ValueError(f"Invalid LU {number} PDF")
        target = output / f"lu{number}.pdf"
        target.write_bytes(content)
        start_page = len(combined.pages)
        combined.append(reader, import_outline=False)
        combined.add_outline_item(f"Learning Unit {number}", start_page)
        resources.append({"id": f"lu{number}", "title": f"Learning Unit {number}", "filename": target.name,
                          "pages": len(reader.pages), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest(),
                          "source": original.name})
    combined.add_metadata({"/Title": "Scannex Training Programme - Complete Learner E-book",
                           "/Author": "APGI", "/Subject": "Published APGI unit books, LU1-LU9; personal learner reference copy"})
    full = output / "scannex-complete-ebook.pdf"
    combined.write(full)
    reopened = PdfReader(full)
    if len(reopened.pages) != sum(r["pages"] for r in resources):
        raise ValueError("Combined page count mismatch")
    content = full.read_bytes()
    resources.insert(0, {"id": "full", "title": "Complete Scannex learner e-book", "filename": full.name,
                         "pages": len(reopened.pages), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
    (output / "manifest.json").write_text(json.dumps({"version": "scannex-books-20261118-v1", "resources": resources}, indent=2), encoding="utf-8")
    print(json.dumps({"resources": len(resources), "full_pages": len(reopened.pages), "full_bytes": len(content)}, indent=2))


if __name__ == "__main__":
    main()
