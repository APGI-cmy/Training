"""Check all pages and render unit boundaries for review, outside synced caches."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from pypdf import PdfReader
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
folder = root / "private/course-books/scannex"
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
manifest = json.loads((folder / "manifest.json").read_text())
full_path = folder / "scannex-complete-ebook.pdf"
full = PdfReader(full_path).pages
offset, results, samples = 0, [], []
for resource in manifest["resources"][1:]:
    path = folder / resource["filename"]
    document = PdfReader(path).pages
    assert len(document) == resource["pages"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == resource["sha256"]
    for number, page in enumerate(document):
        assert full[offset + number].extract_text() == page.extract_text(), (resource["id"], number)
        assert len(page.extract_text().strip()) > 0, (resource["id"], number, "no extractable content")
    for number in [0, len(document)-1]:
        prefix = output / f'page-{offset+number+1}'
        subprocess.run(["pdftoppm", "-f", str(offset+number+1), "-singlefile", "-scale-to", "530", "-png", str(full_path), str(prefix)], check=True, capture_output=True)
        sample = Image.open(prefix.with_suffix(".png")).convert("RGB")
        samples.append((f'{resource["id"].upper()} page {number+1}; full page {offset+number+1}', sample))
    results.append({"unit": resource["id"], "pages": len(document), "starts_at": offset+1, "text_matches_full": True})
    offset += len(document)
assert offset == len(full)
for batch in range(2):
    sheet = Image.new("RGB", (1260, 1740), "#e4e8e6")
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(samples[batch*9:(batch+1)*9]):
        im.thumbnail((395, 530))
        x, y = (i % 3)*420+12, (i//3)*580+35
        sheet.paste(im, (x,y))
        draw.text((x,y-24), label, fill="black")
    sheet.save(output / f"book-boundaries-{batch+1}.png")
(output / "pdf-verification.json").write_text(json.dumps({"pages": offset, "chapters": results, "all_pages_text_matched": True}, indent=2))
print(json.dumps({"pages_verified": offset, "chapter_files": len(results), "boundary_sheets": 2}))
