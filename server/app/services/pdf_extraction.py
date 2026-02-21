"""
PDF Comparison Service    Simple & Reliable

Compares images across PDFs using:
  • Perceptual hash  (catches resizes, compression, screenshots)
  • Colour histogram (catches tone/colour shifts)
  • Template matching (catches sub-image / embedded screenshots)

Compares tables across PDFs using:
  • Exact MD5 fingerprint  (identical tables)
  • Jaccard cell overlap   (similar tables)
  • Header + entity overlap (same-structure tables about same subjects)

Reverse image search:
  • Uses ImgBB to temporarily host local PDF images
  • Uses SerpApi (Google Lens engine) to extract web sources
"""

import base64
import io
import os
import hashlib
import re
from itertools import combinations
from concurrent.futures import ThreadPoolExecutor, as_completed

import pymupdf
import pdfplumber
import numpy as np
import requests
from PIL import Image
from flask import current_app

# ════════════════════════════════════════════════════════════════
#  IMAGE UTILITIES
# ════════════════════════════════════════════════════════════════

def _auto_crop(img: Image.Image, fuzz: int = 15) -> Image.Image:
    """Remove uniform-colour borders that screenshots add."""
    arr = np.array(img.convert("RGB"))
    if arr.size == 0:
        return img

    def _uniform(strip):
        if strip.size == 0:
            return False
        ref = strip.reshape(-1, 3).mean(axis=0)
        return np.all(np.abs(strip.reshape(-1, 3).astype(float) - ref) < fuzz)

    h, w = arr.shape[:2]
    t, b, l, r = 0, h - 1, 0, w - 1
    while t < h - 1 and _uniform(arr[t]):   t += 1
    while b > t   and _uniform(arr[b]):     b -= 1
    while l < w - 1 and _uniform(arr[:, l]): l += 1
    while r > l   and _uniform(arr[:, r]):   r -= 1

    if (t + (h - 1 - b) + l + (w - 1 - r)) >= 4:
        cropped = img.crop((l, t, r + 1, b + 1))
        if cropped.size[0] > 20 and cropped.size[1] > 20:
            return cropped
    return img


def _phash(img: Image.Image, hash_size: int = 16) -> np.ndarray:
    """DCT-based perceptual hash  robust to resize and compression."""
    from scipy.fft import dct

    factor = 4
    full = hash_size * factor
    grey = np.array(
        _auto_crop(img).convert("L").resize((full, full), Image.LANCZOS),
        dtype=np.float64,
    )
    d = dct(dct(grey.T, type=2, norm="ortho").T, type=2, norm="ortho")
    low = d[:hash_size, :hash_size]
    return (low > np.median(low)).flatten()


def _histogram(img: Image.Image, bins: int = 32) -> np.ndarray:
    """Normalised RGB colour histogram."""
    rgb = np.array(
        _auto_crop(img).convert("RGB").resize((128, 128), Image.LANCZOS)
    )
    parts = []
    for ch in range(3):
        h, _ = np.histogram(rgb[:, :, ch], bins=bins, range=(0, 256))
        h = h.astype(float)
        s = h.sum()
        if s > 0:
            h /= s
        parts.append(h)
    return np.concatenate(parts)


def _phash_sim(h1, h2) -> float:
    """1 minus normalised Hamming distance."""
    return 1.0 - float(np.count_nonzero(h1 != h2)) / len(h1)


def _hist_sim(h1, h2) -> float:
    """Bhattacharyya coefficient (1 = identical)."""
    return float(np.clip(np.sum(np.sqrt(h1 * h2)), 0.0, 1.0))


def _image_similarity(img_a: Image.Image, img_b: Image.Image) -> float:
    """Combined similarity: 50 % pHash + 50 % histogram."""
    return 0.5 * _phash_sim(_phash(img_a), _phash(img_b)) \
         + 0.5 * _hist_sim(_histogram(img_a), _histogram(img_b))


def _img_to_base64(img: Image.Image, fmt: str = "PNG") -> str:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    mime = "image/png" if fmt == "PNG" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(buf.getvalue()).decode()}"


# ────────────────────────────────────────────────────────────────
#  Template matching  (detects sub-image / screenshot-in-screenshot)
# ────────────────────────────────────────────────────────────────

def _template_match_score(small: Image.Image, large: Image.Image) -> float:
    """
    Fast NCC template matching  checks if `small` appears inside `large`.
    Works on downsampled greyscale for speed.
    Returns best NCC score (0–1).
    """
    from scipy.signal import fftconvolve

    # Work at reduced resolution for speed
    MAX_DIM = 512
    def _downscale(img):
        w, h = img.size
        if max(w, h) <= MAX_DIM:
            return img
        ratio = MAX_DIM / max(w, h)
        return img.resize((max(1, int(w * ratio)), max(1, int(h * ratio))), Image.LANCZOS)

    large_g = np.array(_downscale(large).convert("L"), dtype=np.float64)
    small_g = np.array(_downscale(small).convert("L"), dtype=np.float64)

    sh, sw = small_g.shape
    lh, lw = large_g.shape

    if sh >= lh or sw >= lw:
        return 0.0
    if sh < 10 or sw < 10:
        return 0.0

    # Template must cover at least 1 % of the large image
    if (sh * sw) < 0.01 * (lh * lw):
        return 0.0

    best = 0.0
    for scale in (1.0, 0.75, 0.5):
        th, tw = int(sh * scale), int(sw * scale)
        if th < 10 or tw < 10 or th >= lh or tw >= lw:
            continue

        tmpl = np.array(
            _downscale(small).convert("L").resize((tw, th), Image.LANCZOS),
            dtype=np.float64,
        )
        t_mean, t_std = tmpl.mean(), tmpl.std()
        if t_std < 1e-6:
            continue

        t_norm = (tmpl - t_mean) / t_std
        n = tmpl.size
        ones = np.ones_like(tmpl)

        corr = fftconvolve(large_g, t_norm[::-1, ::-1], mode="valid")
        lsum = fftconvolve(large_g, ones[::-1, ::-1], mode="valid")
        lsum2 = fftconvolve(large_g ** 2, ones[::-1, ::-1], mode="valid")

        l_mean = lsum / n
        l_var = lsum2 / n - l_mean ** 2
        l_std = np.sqrt(np.maximum(l_var, 0))
        l_std[l_std < 1e-6] = 1e-6

        ncc = corr / (n * l_std)
        score = float(ncc.max())
        best = max(best, score)
        if best >= 0.65:
            break

    return float(np.clip(best, 0.0, 1.0))


# ════════════════════════════════════════════════════════════════
#  EXTRACTION
# ════════════════════════════════════════════════════════════════

def _extract_images(pdf_path: str) -> list[dict]:
    """Pull every raster image from a PDF."""
    images = []
    doc = pymupdf.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc[page_num]
        for idx, info in enumerate(page.get_images(full=True)):
            xref = info[0]
            try:
                raw = doc.extract_image(xref)
                if not raw:
                    continue
                pil = Image.open(io.BytesIO(raw["image"])).convert("RGB")
                w, h = pil.size
                if w < 30 or h < 30:          # skip tiny icons
                    continue
                images.append({
                    "page": page_num + 1,
                    "index": idx,
                    "width": w,
                    "height": h,
                    "pil": pil,
                    "data": _img_to_base64(pil),
                })
            except Exception as e:
                print(f"[pdf] skip xref={xref} p{page_num + 1}: {e}")
    doc.close()
    return images


def _extract_tables(pdf_path: str) -> list[dict]:
    """Pull every table from a PDF."""
    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            for idx, raw in enumerate(page.extract_tables()):
                if not raw or len(raw) < 1:
                    continue
                cleaned = [
                    [(c or "").strip() for c in row]
                    for row in raw
                ]
                tables.append({
                    "page": page_num + 1,
                    "index": idx,
                    "headers": cleaned[0],
                    "rows": cleaned[1:] if len(cleaned) > 1 else [],
                })
    return tables


# ════════════════════════════════════════════════════════════════
#  IMAGE COMPARISON
# ════════════════════════════════════════════════════════════════

_IMG_THRESHOLD   = 0.68   # direct match (pHash + histogram)
_TMPL_THRESHOLD  = 0.50   # template match (sub-image)


def _compare_images(
    file_a: str, imgs_a: list[dict],
    file_b: str, imgs_b: list[dict],
) -> list[dict]:
    """Pairwise image comparison between two PDFs."""
    matches = []

    for ia in imgs_a:
        for ib in imgs_b:

            # ── 1. Direct similarity (fast) ──────────────────
            sim = round(_image_similarity(ia["pil"], ib["pil"]), 4)
            match_type = "direct"

            # ── 2. Template matching (if direct fails) ───────
            if sim < _IMG_THRESHOLD:
                area_a = ia["width"] * ia["height"]
                area_b = ib["width"] * ib["height"]
                if area_a != area_b:
                    if area_a < area_b:
                        t = _template_match_score(ia["pil"], ib["pil"])
                    else:
                        t = _template_match_score(ib["pil"], ia["pil"])
                    if t >= _TMPL_THRESHOLD:
                        sim = round(max(sim, t), 4)
                        match_type = "contained_in"

            # ── Gate ─────────────────────────────────────────
            threshold = _IMG_THRESHOLD if match_type == "direct" else _TMPL_THRESHOLD
            if sim < threshold:
                continue

            matches.append({
                "similarity": sim,
                "match_type": match_type,
                "file_a": os.path.basename(file_a),
                "page_a": ia["page"],
                "img_index_a": ia["index"],
                "width_a": ia["width"],
                "height_a": ia["height"],
                "data_a": ia["data"],
                "file_b": os.path.basename(file_b),
                "page_b": ib["page"],
                "img_index_b": ib["index"],
                "width_b": ib["width"],
                "height_b": ib["height"],
                "data_b": ib["data"],
            })

    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches


# ════════════════════════════════════════════════════════════════
#  TABLE COMPARISON
# ════════════════════════════════════════════════════════════════

def _table_fingerprint(tbl: dict) -> str:
    raw = str(tbl["headers"]) + str(tbl["rows"])
    return hashlib.md5(raw.encode()).hexdigest()


def _norm(val: str) -> str:
    return (val or "").strip().lower()


def _cell_set(tbl: dict) -> set[str]:
    """All unique, non-empty normalised cell values."""
    cells = set()
    for c in tbl["headers"]:
        v = _norm(c)
        if v:
            cells.add(v)
    for row in tbl["rows"]:
        for c in row:
            v = _norm(c)
            if v:
                cells.add(v)
    return cells


def _entity_set(tbl: dict) -> set[str]:
    """Non-numeric cell values (names, categories, locations)."""
    ents = set()
    for row in tbl["rows"]:
        for c in row:
            v = _norm(c)
            if v and len(v) > 1 and not v.replace(".", "").replace("-", "").isdigit():
                ents.add(v)
    return ents


_TBL_JACCARD   = 0.30   # cell-level Jaccard threshold
_TBL_HEADER    = 0.50   # header overlap threshold
_TBL_ENTITY    = 0.30   # entity overlap threshold


def _compare_tables(
    file_a: str, tbls_a: list[dict],
    file_b: str, tbls_b: list[dict],
) -> list[dict]:
    """Pairwise table comparison between two PDFs."""
    matches = []

    for ta in tbls_a:
        fp_a = _table_fingerprint(ta)
        for tb in tbls_b:

            # ── 1. Exact match ───────────────────────────────
            if fp_a == _table_fingerprint(tb):
                matches.append({
                    "similarity": 1.0,
                    "match_type": "identical",
                    "file_a": os.path.basename(file_a), "page_a": ta["page"],
                    "table_a": ta,
                    "file_b": os.path.basename(file_b), "page_b": tb["page"],
                    "table_b": tb,
                })
                continue

            # ── 2. Jaccard cell similarity ───────────────────
            set_a, set_b = _cell_set(ta), _cell_set(tb)
            if set_a and set_b:
                jaccard = len(set_a & set_b) / len(set_a | set_b)
            else:
                jaccard = 0.0

            if jaccard >= _TBL_JACCARD:
                matches.append({
                    "similarity": round(jaccard, 4),
                    "match_type": "similar",
                    "file_a": os.path.basename(file_a), "page_a": ta["page"],
                    "table_a": ta,
                    "file_b": os.path.basename(file_b), "page_b": tb["page"],
                    "table_b": tb,
                })
                continue

            # ── 3. Same structure + shared entities ──────────
            ha = set(_norm(h) for h in ta["headers"]) - {""}
            hb = set(_norm(h) for h in tb["headers"]) - {""}
            if ha and hb:
                h_overlap = len(ha & hb) / max(len(ha), len(hb))
            else:
                h_overlap = 0.0

            if h_overlap >= _TBL_HEADER and len(ta["headers"]) == len(tb["headers"]):
                ea, eb = _entity_set(ta), _entity_set(tb)
                if ea and eb:
                    e_overlap = len(ea & eb) / len(ea | eb)
                    if e_overlap >= _TBL_ENTITY:
                        combined = round(0.3 * h_overlap + 0.7 * e_overlap, 4)
                        matches.append({
                            "similarity": combined,
                            "match_type": "similar",
                            "file_a": os.path.basename(file_a), "page_a": ta["page"],
                            "table_a": ta,
                            "file_b": os.path.basename(file_b), "page_b": tb["page"],
                            "table_b": tb,
                        })

    matches.sort(key=lambda m: m["similarity"], reverse=True)
    return matches


# ════════════════════════════════════════════════════════════════
#  REVERSE IMAGE SEARCH (ImgBB + SerpApi Free Tier)
# ════════════════════════════════════════════════════════════════

IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")


def _prepare_image_base64(img: Image.Image) -> str:
    """Produce a small base64 JPEG suitable for ImgBB upload."""
    buf = io.BytesIO()
    thumb = img.copy()
    thumb.thumbnail((800, 800), Image.LANCZOS)
    if thumb.mode != "RGB":
        thumb = thumb.convert("RGB")
    thumb.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _upload_to_imgbb(img: Image.Image) -> str:
    """Upload image to ImgBB to get a public URL (required by most search APIs)."""
    if not IMGBB_API_KEY:
        print("[imgbb] API key missing. Skipping upload.")
        return ""
        
    try:
        b64_img = _prepare_image_base64(img)
        resp = requests.post(
            "https://api.imgbb.com/1/upload",
            data={
                "key": IMGBB_API_KEY,
                "image": b64_img,
                "expiration": 600 # Auto-delete from their servers after 10 minutes
            },
            timeout=15
        )
        data = resp.json()
        if data.get("success"):
            return data["data"]["url"]
        else:
            print(f"[imgbb] Upload failed: {data.get('error', {}).get('message')}")
    except Exception as e:
        print(f"[imgbb] Execution error: {e}")
        
    return ""


def _reverse_search(img: Image.Image) -> dict:
    """
    Perform reverse image search using SerpApi's Google Lens engine.
    Requires the image to be publicly hosted first (via ImgBB).
    """
    result = {"search_url": "", "web_sources": []}
    
    # 1. Get public URL for the local image
    public_img_url = _upload_to_imgbb(img)
    if not public_img_url:
        return result
        
    # Set the fallback manual search URL so you can still click it if SerpApi fails
    import urllib.parse
    result["search_url"] = f"https://lens.google.com/uploadbyurl?url={urllib.parse.quote(public_img_url)}"
        
    # 2. Search using SerpApi
    if not SERPAPI_KEY:
        print("[serpapi] API key missing. Returning clickable Lens link only.")
        return result
        
    try:
        params = {
            "engine": "google_lens",
            "url": public_img_url,
            "api_key": SERPAPI_KEY,
            "hl": "en"
        }
        
        resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
        data = resp.json()
        
        if "error" in data:
            print(f"[serpapi] Error: {data['error']}")
            return result
            
        sources = []
        seen_domains = set()
        
        # Parse SerpApi Google Lens results (Visual Matches)
        visual_matches = data.get("visual_matches", [])
        for match in visual_matches:
            url = match.get("link")
            title = match.get("title", url)
            
            if not url:
                continue
                
            domain_match = re.search(r"https?://([^/]+)", url)
            domain = domain_match.group(1) if domain_match else url
            
            # Prevent spamming the same domain in results
            if domain in seen_domains:
                continue
            seen_domains.add(domain)
            
            sources.append({"url": url, "title": title[:120]})
            
            if len(sources) >= 5:
                break
                
        result["web_sources"] = sources
        if sources:
            print(f"[serpapi] found {len(sources)} source(s)")
        else:
            print("[serpapi] no web sources found")
            
    except Exception as e:
        print(f"[serpapi] execution error: {e}")

    return result


def _run_reverse_searches(images_by_file: list[dict]) -> None:
    """
    Run reverse image search for all extracted images in parallel.
    Mutates each image dict in-place, adding `search_url` and `web_sources`.
    """
    all_imgs: list[dict] = []
    for pf in images_by_file:
        for img in pf["images"]:
            all_imgs.append(img)

    if not all_imgs:
        return

    print(f"[reverse-search] starting search for {len(all_imgs)} image(s)...")

    def _search_one(img_dict: dict) -> None:
        result = _reverse_search(img_dict["pil"])
        img_dict["search_url"] = result["search_url"]
        img_dict["web_sources"] = result["web_sources"]

    # Keeping workers slightly lower to respect free API rate limits
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(_search_one, img): img for img in all_imgs}
        for fut in as_completed(futures, timeout=120):
            try:
                fut.result()
            except Exception as e:
                img = futures[fut]
                img["search_url"] = ""
                img["web_sources"] = []
                print(f"[reverse-search] failed for p{img.get('page')}: {e}")

    found = sum(1 for pf in images_by_file for img in pf["images"] if img.get("web_sources"))
    print(f"[reverse-search] done  {found}/{len(all_imgs)} image(s) had web sources")


# ════════════════════════════════════════════════════════════════
#  PUBLIC API
# ════════════════════════════════════════════════════════════════

def compare_pdfs(pdf_paths: list[str]) -> dict:
    """Compare images + tables across a list of PDF files."""

    per_file = []
    for path in pdf_paths:
        imgs = _extract_images(path)
        tbls = _extract_tables(path)
        per_file.append({
            "file": os.path.basename(path),
            "path": path,
            "total_images": len(imgs),
            "total_tables": len(tbls),
            "images": imgs,
            "tables": tbls,
        })

    # ── pairwise comparison ──────────────────────────────────────
    image_matches = []
    table_matches = []

    for a, b in combinations(range(len(per_file)), 2):
        fa, fb = per_file[a], per_file[b]
        image_matches.extend(
            _compare_images(fa["path"], fa["images"], fb["path"], fb["images"])
        )
        table_matches.extend(
            _compare_tables(fa["path"], fa["tables"], fb["path"], fb["tables"])
        )

    # ── reverse image search (parallel) ──────────────────────────
    _run_reverse_searches(per_file)

    # ── serialise ────────────────────────────────────────────────
    file_summaries = []
    for pf in per_file:
        clean_imgs = [
            {
                k: v for k, v in img.items()
                if k != "pil"
            }
            for img in pf["images"]
        ]
        file_summaries.append({
            "file": pf["file"],
            "total_images": pf["total_images"],
            "total_tables": pf["total_tables"],
            "images": clean_imgs,
            "tables": pf["tables"],
        })

    return {
        "total_files": len(pdf_paths),
        "total_comparisons": len(list(combinations(range(len(pdf_paths)), 2))),
        "total_image_matches": len(image_matches),
        "total_table_matches": len(table_matches),
        "files": file_summaries,
        "image_matches": image_matches,
        "table_matches": table_matches,
    }