"""Stage 6: on-screen text (OCR) for videos and photos with Apple Vision.

usage: ocr.py [--videos] [--images] [--source youtube,facebook,instagram]
              [--interval 5] [--limit N] [--dry-run]
       (neither --videos nor --images = both)

Videos: ffmpeg decodes keyframes only (-skip_frame nokey, far cheaper than a full
decode) and keeps one at least every --interval seconds; near-duplicate frames
(32x18 grayscale mean diff < 4) and blank frames are skipped before OCR.
Timestamps are the keyframe's real pts, so seek-to-time in the viewer is exact.

Writes derived/<media path>/ocr.json. Resumable: skips media whose ocr.json exists.
"""
import argparse, re, subprocess, tempfile, time
from pathlib import Path
import numpy as np
from PIL import Image
from common import CFG, ROOT, derived_dir, follow, heartbeat, in_shard, iter_images, iter_videos, log, now, wait_if_paused, write_json

LANGS = list(CFG["ocr"]["languages"])  # Apple Vision language codes, from the project config
MIN_CONF = 0.3
DUP_DIFF = 4.0
FF_THREADS = 1  # per worker; parallelism comes from --shard workers


def ocr_image(img: Image.Image):
    from ocrmac import ocrmac
    res = ocrmac.OCR(img, recognition_level="accurate", language_preference=LANGS,
                     unit="line").recognize()
    lines = [{"text": t.strip(), "conf": round(float(c), 3), "bbox": [round(v, 4) for v in b]}
             for t, c, b in res if t.strip() and c >= MIN_CONF]
    return lines


def thumb(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("L").resize((32, 18), Image.BILINEAR), dtype=np.float32)


def ocr_video(p: Path, interval: float, progress=None) -> dict:
    frames, sampled = [], 0
    with tempfile.TemporaryDirectory() as td:
        vf = (f"select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,{interval - 0.5})',"
              "scale='min(1280\\,iw)':-2,showinfo")
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-threads", str(FF_THREADS), "-skip_frame", "nokey",
                            "-i", str(p), "-filter_threads", "1", "-vf", vf, "-fps_mode", "vfr", "-q:v", "3",
                            f"{td}/f_%06d.jpg"],
                           capture_output=True, text=True)
        pts = [float(x) for x in re.findall(r"\bn:\s*\d+.*?pts_time:([\d.]+)", r.stderr)]
        files = sorted(Path(td).glob("f_*.jpg"))
        if r.returncode != 0 and not files:
            raise RuntimeError(r.stderr[-500:])
        last = None
        if progress:
            progress(0, len(files), "frames extracted")
        for f, t in zip(files, pts):
            sampled += 1
            if progress and sampled % 10 == 0:
                progress(sampled, len(files), f"frame {sampled}/{len(files)} at {t:.0f}s")
            img = Image.open(f)
            small = thumb(img)
            if small.std() < 3:  # blank / black frame
                continue
            if last is not None and np.abs(small - last).mean() < DUP_DIFF:
                continue
            last = small
            lines = ocr_image(img)
            if lines:
                frames.append({"t": round(t, 2), "text": "\n".join(l["text"] for l in lines), "lines": lines})
    return {"kind": "video", "interval": interval, "frames_sampled": sampled, "frames": frames}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--videos", action="store_true")
    ap.add_argument("--images", action="store_true")
    ap.add_argument("--source", default="youtube,facebook,instagram")
    ap.add_argument("--interval", type=float, default=float(CFG["ocr"]["interval_s"]))
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--shard", help="i/n: this worker's share of the files, e.g. 0/3")
    ap.add_argument("--follow", action="store_true", help="keep picking up new downloads until they finish")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    both = not (a.videos or a.images)
    sources = tuple(a.source.split(","))
    stage = "ocr" + (a.shard.split("/")[0] if a.shard else "")

    def build_todo():
        todo = []
        if a.images or both:  # images first: fast, and thumbnails give early coverage
            todo += [("image", s, p) for s, p in iter_images(sources)
                     if in_shard(p, a.shard) and not (derived_dir(p) / "ocr.json").exists()]
        if a.videos or both:
            todo += [("video", s, p) for s, p in iter_videos(sources)
                     if in_shard(p, a.shard) and not (derived_dir(p) / "ocr.json").exists()]
        return todo[: a.limit] if a.limit else todo

    from importlib.metadata import version
    tool = f"Apple Vision via ocrmac {version('ocrmac')} (accurate, {'+'.join(LANGS)})"

    def process(todo):
        log(f"{sum(k == 'image' for k, *_ in todo)} images, {sum(k == 'video' for k, *_ in todo)} videos to OCR")
        failed = []
        for i, (kind, src, p) in enumerate(todo, 1):
            wait_if_paused(stage)
            t0 = time.time()
            item = str(p.relative_to(ROOT))
            beat = lambda done, tot, detail: heartbeat(stage, item=item, kind=kind, index=i, total=len(todo), item_started=t0,
                                                       item_progress=done / tot if tot else None, detail=detail)
            if kind == "video":
                beat(0, 0, "extracting keyframes")
            elif i % 25 == 1:
                beat(0, 0, "photos")
            try:
                if kind == "image":
                    lines = ocr_image(Image.open(p))
                    r = {"kind": "image", "text": "\n".join(l["text"] for l in lines), "lines": lines}
                else:
                    r = ocr_video(p, a.interval, progress=beat)
            except Exception as e:
                log(f"[{i}/{len(todo)}] ERROR {p}: {e!r}")
                failed.append(p)
                continue
            write_json(derived_dir(p) / "ocr.json", r | {"source": src, "media": str(p), "tool": tool, "created": now()})
            if kind == "video" or i % 200 == 0:
                n = len(r["frames"]) if kind == "video" else len(r["lines"])
                log(f"[{i}/{len(todo)}] {kind} {n} {'frames w/ text' if kind == 'video' else 'lines'} "
                    f"in {time.time() - t0:.0f}s  {p.name}")
        return failed

    if a.dry_run:
        todo = build_todo()
        log(f"{sum(k == 'image' for k, *_ in todo)} images, {sum(k == 'video' for k, *_ in todo)} videos to OCR")
        return
    wait_if_paused(stage)
    follow(build_todo, process, a.follow)
    heartbeat(stage, item=None, detail="finished")
    log("done")


if __name__ == "__main__":
    main()
