#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R1 helper — render specific PDF pages of the cláusulas bundle to PNG for a fresh visual re-read.
The text layer is the suspected defect, so we render the actual glyphs and read them by eye. Renders
at high scale for legibility. Pages are 1-indexed (the pdf_pages in clause_registry)."""
import os, sys
import pypdfium2 as pdfium

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "AUTOMOTORES.:clausulas_generales.pdf")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "renders")
os.makedirs(OUT, exist_ok=True)

# R1 sample: (clause_code, [1-indexed pdf pages]) — page carrying the flagged artifact
PAGES = sorted(set(int(x) for x in sys.argv[1:])) if len(sys.argv) > 1 else [90, 97, 100, 101, 111, 78]

pdf = pdfium.PdfDocument(PDF)
n = len(pdf)
print(f"PDF has {n} pages; rendering {PAGES} at scale 4")
for p in PAGES:
    if not (1 <= p <= n):
        print(f"  skip {p} (out of range)"); continue
    page = pdf[p - 1]
    bitmap = page.render(scale=4)  # ~288 DPI
    pil = bitmap.to_pil()
    dest = os.path.join(OUT, f"clausulas_p{p:03d}.png")
    pil.save(dest)
    print(f"  wrote {dest} ({pil.size[0]}x{pil.size[1]})")
print("done")
