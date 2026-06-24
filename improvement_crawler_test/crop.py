#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R1 helper — render a PDF page at high scale and crop a fractional vertical band, so a specific
passage can be read at high effective resolution. Usage: crop.py PAGE Y0 Y1 [LABEL]  (Y as fractions)."""
import os, sys
import pypdfium2 as pdfium

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "AUTOMOTORES.:clausulas_generales.pdf")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "renders")
os.makedirs(OUT, exist_ok=True)

page_no = int(sys.argv[1]); y0 = float(sys.argv[2]); y1 = float(sys.argv[3])
label = sys.argv[4] if len(sys.argv) > 4 else f"p{page_no:03d}_{y0}-{y1}"

pdf = pdfium.PdfDocument(PDF)
page = pdf[page_no - 1]
pil = page.render(scale=8).to_pil()   # ~576 DPI
w, h = pil.size
crop = pil.crop((0, int(h * y0), w, int(h * y1)))
dest = os.path.join(OUT, f"crop_{label}.png")
crop.save(dest)
print(f"wrote {dest} ({crop.size[0]}x{crop.size[1]}) from page {page_no} band y=[{y0},{y1}]")
