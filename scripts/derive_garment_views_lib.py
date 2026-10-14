import sys, numpy as np, cv2
from PIL import Image
R='/home/user/workspace/dtf-designer-clean/public/premium-mockups/v1/'
def load(p):
    a=np.array(Image.open(R+p+'.webp').convert('RGBA'));return a
def lab(rgb): return cv2.cvtColor((rgb/255.).astype(np.float32), cv2.COLOR_RGB2LAB)
def unlab(l): return np.clip(cv2.cvtColor(l.astype(np.float32), cv2.COLOR_LAB2RGB)*255,0,255).astype(np.uint8)
def stats(img):
    m=img[...,3]>200; L=lab(img[...,:3])[m]; return L
def recolor(src_view, src_ref, dst_ref):
    """Map src_view's colors using the tone/color relationship between src_ref and dst_ref (same color pair, any view)."""
    s=stats(src_ref); d=stats(dst_ref)
    qs=np.linspace(0,100,201); sl=np.percentile(s[:,0],qs); dl=np.percentile(d[:,0],qs)
    sl=np.maximum.accumulate(sl+np.arange(len(sl))*1e-4)
    out=lab(src_view[...,:3]).copy()
    out[...,0]=np.interp(out[...,0], sl, dl)
    # Chroma follows target's tone curve: target mean a/b at each lightness level.
    bins=np.percentile(d[:,0],np.linspace(0,100,25)); idx=np.clip(np.digitize(d[:,0],bins)-1,0,23)
    centers=np.array([d[idx==k,0].mean() if (idx==k).any() else np.nan for k in range(24)])
    ok=~np.isnan(centers)
    for c in (1,2):
        means=np.array([d[idx==k,c].mean() if (idx==k).any() else np.nan for k in range(24)])
        dev=(out[...,c]-s[:,c].mean())*0.5
        out[...,c]=np.interp(out[...,0],centers[ok],means[ok])+dev
    rgb=unlab(out); return np.dstack([rgb, src_view[...,3]])
def save(a,p): Image.fromarray(a,'RGBA').save(p,'WEBP',quality=88,method=6,exact=True)
