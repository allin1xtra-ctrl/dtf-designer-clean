"""Fills missing hoodie and sweatpants preview locations from approved images.

No new garments are invented: right sleeves are mirrored from the same color's
approved left sleeve, and other views are recolored from an approved view of
the same garment using the tone/color relationship between two approved fronts.
Garment silhouettes are unchanged, so print masks line up exactly.
Run from the repo root: python3 scripts/derive-garment-views.py
"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from derive_garment_views_lib import load, recolor, R

JOBS = []
for c in ["white", "heather-grey", "regular-grey", "red", "off-white"]:
    JOBS.append(("hoodies", c, "rightSleeve", "mirror", f"hoodies/{c}-leftSleeve"))
for c in ["white", "heather-grey", "regular-grey", "royal-blue", "red", "off-white"]:
    JOBS.append(("hoodies", c, "neckTag", "recolor", ("hoodies/black-neckTag", "hoodies/black-front", f"hoodies/{c}-front")))
for c in ["red", "off-white"]:
    JOBS.append(("pants", c, "back", "recolor", ("pants/white-back", "pants/white-front", f"pants/{c}-front")))
for c in ["white", "heather-grey", "regular-grey", "red", "off-white"]:
    for v in ["leftLeg", "rightLeg"]:
        JOBS.append(("pants", c, v, "recolor", (f"pants/black-{v}", "pants/black-front", f"pants/{c}-front")))

manifest_path = "docs/premium-mockup-replacement-manifest.json"
manifest = json.load(open(manifest_path))
for product, color, view, method, source in JOBS:
    if method == "mirror":
        out = np.ascontiguousarray(load(source)[:, ::-1])
        note = f"Mirrored from approved {source}.webp"
    else:
        out = recolor(load(source[0]), load(source[1]), load(source[2]))
        note = f"Recolored from approved {source[0]}.webp using the {source[1]} -> {source[2]} tone mapping"
    target = f"/premium-mockups/v1/{product}/{color}-{view}.webp"
    Image.fromarray(out, "RGBA").save(R + f"{product}/{color}-{view}.webp", "WEBP", quality=88, method=6, exact=True)
    task = next(t for t in manifest["tasks"] if t["targetPath"] == target)
    task.pop("rejection", None)
    task.update({"status": "derived", "derivation": note, "width": 1254, "height": 1254, "hasAlpha": True,
                 "bytes": os.path.getsize(R + f"{product}/{color}-{view}.webp"), "hasBakedPrintGuide": False})

counts = {}
for t in manifest["tasks"]: counts[t["status"]] = counts.get(t["status"], 0) + 1
manifest["derivedAssets"] = counts.get("derived", 0)
manifest["rejectedAssets"] = counts.get("rejected-visual-qa", 0)
manifest["deferredAssets"] = counts.get("deferred-by-user", 0)
manifest["acceptedAssets"] = counts.get("generated", 0) + counts.get("derived", 0)
json.dump(manifest, open(manifest_path, "w"), indent=2); open(manifest_path, "a").write("\n")

active = [t for t in manifest["tasks"] if t["status"] in ("generated", "derived")]
registry = [{"productId": t["productId"], "colorId": t["colorId"], "view": t["view"], "url": t["targetPath"],
             "width": 1254, "height": 1254, "hasBakedPrintGuide": False} for t in active]
open("lib/premium-mockup-assets.ts", "w").write("export const premiumMockupAssets = " + json.dumps(registry, indent=2) + " as const;\n")
print(f"Derived {len(JOBS)} views; {len(registry)} active previews; status counts {counts}")
