#!/usr/bin/env python3
"""Offline capture of the real document-workflow excerpt. No external requests.
Requires existing Python Playwright, Chromium, FFmpeg and local eSpeak.
Uses an explicitly synthetic offline English narration; does not install or publish.
Run from repository root: python scripts/capture-document-workflow.py OUTPUT_DIRECTORY
The annotated capture uses the original section and copy handler. It is not a live AI run.
"""
import argparse, json, math, re, shutil, subprocess, tempfile, wave, array
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path)
parser.add_argument("--chromium", default=shutil.which("chromium") or shutil.which("chromium-browser"))
parser.add_argument("--espeak", default=shutil.which("espeak") or shutil.which("espeak-ng"))
args = parser.parse_args()
if not args.chromium or not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
    raise SystemExit("Existing Chromium, FFmpeg and FFprobe are required; no automatic installation.")
if not args.espeak:
    raise SystemExit("Existing local eSpeak is required for spoken CTA; no automatic installation.")
out = args.output / "ToolPilot_AI_Document_Workflow_Demo.mp4"
if out.exists():
    raise SystemExit("Original MP4 already exists; refusing to overwrite it.")
root = Path(__file__).resolve().parents[1]
html = (root / "free-tools.html").read_text(encoding="utf-8")
section = re.search(r'<section id="document-workflow"[\s\S]*?</section>', html)
handler = re.search(r'<script>\(function\(\)\{const b=document\.getElementById\("tp-copy-doc"\)[\s\S]*?</script>', html)
if not section or not handler:
    raise SystemExit("Original section or handler changed: review before capture.")
# Read existing brand asset as text; no network or external fonts.
logo = (root / "assets/toolpilot-icon.svg").read_text(encoding="utf-8")
logo = re.sub(r'<svg\b', '<svg style="width:34px;height:34px;vertical-align:middle;margin-right:8px"', logo, count=1)
css = """*{box-sizing:border-box}body{font:16px/1.5 system-ui,sans-serif;background:#f4f7ff;color:#142047;margin:0}main{width:100%;padding:130px 15px 190px}h2{font-size:30px;line-height:1.12;letter-spacing:-.045em;margin:15px 0}p{color:#465774}small{font-size:12px}.eyebrow{color:#6032bf;font-size:12px;font-weight:800;letter-spacing:.09em}textarea{resize:none}.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 17px;border:0;background:#1653d1;color:white;font:700 14px system-ui;border-radius:10px;text-decoration:none;cursor:pointer}.btn-outline{background:#eff4ff;color:#2343a0}.actions{display:flex;gap:8px;flex-wrap:wrap}.top{position:fixed;z-index:5;left:0;right:0;top:0;background:#173071;color:white;padding:15px 24px 18px;border-bottom:5px solid #12c8c3}.brand{font-weight:900;letter-spacing:-.03em;font-size:20px}.tag{display:inline-block;background:#12c8c3;color:#123d44;border-radius:5px;font-size:10px;font-weight:800;padding:4px 7px;margin-left:8px}.top h1{font-size:24px;line-height:1.12;margin:6px 0 0;letter-spacing:-.025em}.bottom{position:fixed;left:0;right:0;bottom:0;background:#122450;color:white;padding:18px 24px 26px;z-index:5;border-top:4px solid #ffc95e;min-height:112px}.bottom strong{font-size:21px;line-height:1.15;display:block}.bottom small{display:block;color:#cfdbf5;margin-top:8px;font-size:14px}.focus{outline:4px solid #f1b63e;outline-offset:3px;background:#fff8e6!important}.meter{height:4px;background:#263e76;position:fixed;top:0;left:0;right:0;z-index:7}.meter div{height:4px;background:#ffdc77;width:0}#pointer{display:none;position:fixed;z-index:10;pointer-events:none;width:26px;height:26px;border-radius:50%;background:#ffe47788;border:3px solid #b27715;transform:translate(-50%,-50%)}"""
doc = ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style><body><div class="meter"><div id="progress"></div></div><header class="top"><div class="brand">'+logo+'TOOL<span style="color:#38ded8">PILOT</span> GUIDE <span class="tag">LOCAL DEMO</span></div><h1 id="headline"></h1></header><main>'+section.group(0)+handler.group(0)+'</main><div class="bottom"><strong id="caption"></strong><small id="subcaption"></small></div><div id="pointer"></div></body></html>')
args.output.mkdir(parents=True,exist_ok=True)
fps=6; duration=26; checks={}; errors=[]; index=0
with tempfile.TemporaryDirectory(prefix="toolpilot-capture-") as tmp:
    work=Path(tmp)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.chromium,headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        context=browser.new_context(viewport={"width":540,"height":960},device_scale_factor=2,reduced_motion="reduce")
        # This is an offline annotated excerpt. Do not navigate to or intercept a blocked site.
        context.set_offline(True)
        page=context.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.set_content(doc)
        prompt=page.locator("#tp-doc-example").input_value()
        checks["fictional_facts"]=all(s in prompt for s in ["Delivery: 10 Dec.","Budget: $500 maximum.","Approval: pending.","Owner: not specified."])
        checks["manual_example_label"]=page.get_by_text("Manually verified example — not a live AI response.",exact=False).count()==1
        def caption(title,caption,sub):
            page.evaluate('([a,b,c])=>{document.querySelector("#headline").textContent=a;document.querySelector("#caption").textContent=b;document.querySelector("#subcaption").textContent=c}',[title,caption,sub])
        def focus(selector):
            page.evaluate('(s)=>{document.querySelectorAll(".focus").forEach(x=>x.classList.remove("focus"));document.querySelector(s)?.classList.add("focus")}',selector)
        def pos(selector,offset):
            return page.locator(selector).evaluate('(el,n)=>Math.max(0,el.getBoundingClientRect().top+window.scrollY-n)',offset)
        def record(seconds,end=None):
            global index
            start=page.evaluate("scrollY"); end=start if end is None else end
            for i in range(round(seconds*fps)):
                t=min(1,(i+1)/max(1,int(fps*.8)));t=t*t*(3-2*t)
                page.evaluate('([y,p])=>{window.scrollTo(0,y);document.querySelector("#progress").style.width=p+"%"}',[start+(end-start)*t,100*index/(fps*duration)])
                page.screenshot(path=str(work/f"{index:04d}.png"),animations="disabled")
                index+=1
        caption("Stop vague AI summaries.","Four facts. Zero invented details.","Fictional sample · manually checked");record(3)
        caption("1 · Use a precise prompt","Ask for evidence and unknowns.","Copy Template 6 from the free pack.");focus("#tp-doc-example");record(5,pos("#tp-doc-example",185))
        btn=page.locator("#tp-copy-doc");box=btn.bounding_box()
        page.evaluate('([x,y])=>{const p=document.querySelector("#pointer");p.style.display="block";p.style.left=x+"px";p.style.top=y+"px"}',[box["x"]+box["width"]/2,box["y"]+box["height"]/2])
        btn.click()
        page.wait_for_function('document.querySelector("#tp-copy-status").textContent.includes("Prompt selected")')
        selected=page.locator("#tp-doc-example").evaluate('(t)=>t.value.slice(t.selectionStart,t.selectionEnd)')
        checks["fallback_selection_matches_prompt"]=selected==prompt
        caption("2 · Copy the template","Select, copy and paste.","Offline preview: use your device copy command.");record(3)
        page.evaluate('document.querySelector("#pointer").style.display="none"')
        caption("3 · Verify against the source","10 Dec · $500 maximum","Do not invent a year or change the budget.");focus("dl > div:nth-child(1)");record(5,pos("dl",210))
        caption("4 · Keep unknowns unknown","Approval pending. Owner unknown.","Manually verified example, not a live AI result.");focus("dl > div:nth-child(4)");record(5,pos("dl > div:nth-child(3)",210))
        caption("Get 20 free AI templates.","Open the ToolPilot channel link.","Free for everyone. Subscribe for more tutorials.");focus(".actions");record(5,pos(".actions",390))
        checks["no_browser_errors"]=not errors
        checks["frame_count"]=index==fps*duration
        checks["no_horizontal_overflow"]=page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        browser.close()
    if not all(checks.values()):
        raise SystemExit(str(checks))
    # Original, quiet instrumental cue; no third-party recordings.
    sr=44100;samples=array.array("h");notes=[261.626,329.628,391.995,523.251]
    for i in range(sr*duration):
        t=i/sr;phase=t%.5;env=min(1,phase/.035)*max(0,1-phase/.5)**2
        note=notes[int(t*2)%len(notes)];fade=max(0,min(1,t/.4,(duration-t)/.8))
        samples.append(round((math.sin(2*math.pi*note*t)*.023*env+math.sin(2*math.pi*130.813*t)*.009)*fade*32767))
    with wave.open(str(work/"music.wav"),"wb") as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(samples.tobytes())
    # Time-aligned local synthetic English narration; no API, paid voice or external recording.
    lines = [
        (0, 3, "Stop vague AI summaries."),
        (3, 5, "Ask for evidence and unknowns, not just a summary."),
        (8, 3, "Copy the template."),
        (11, 5, "Check the date and the five hundred dollar maximum."),
        (16, 5, "Approval is pending. The owner is not specified."),
        (21, 5, "Channel link: twenty free templates. Subscribe for more."),
    ]
    inputs = ["-i", str(work/"music.wav")]
    filters = ["[0:a]volume=0.25[music]"]
    labels = ["[music]"]
    voice_durations = []
    for i, (start, slot, line) in enumerate(lines, 1):
        voice = work / f"voice-{i}.wav"
        subprocess.run([args.espeak, "-v", "en-us", "-s", "175", "-w", str(voice), line], check=True)
        with wave.open(str(voice), "rb") as w:
            seconds = w.getnframes() / w.getframerate()
        if seconds > slot:
            raise SystemExit(f"Narration exceeds scene {i}: {seconds:.2f}s > {slot}s")
        voice_durations.append(round(seconds, 3))
        inputs += ["-i", str(voice)]
        filters.append(f"[{i}:a]aresample=44100,adelay={start*1000}:all=1[v{i}]")
        labels.append(f"[v{i}]")
    filters.append("".join(labels)+f"amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=0.9[mix]")
    mix = work / "mix.wav"
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y",*inputs,
                    "-filter_complex",";".join(filters),"-map","[mix]","-c:a","pcm_s16le",str(mix)],check=True)
    with wave.open(str(mix),"rb") as w:
        checks["narration_mix_duration"] = abs(w.getnframes()/w.getframerate()-duration) < .05
    if not checks["narration_mix_duration"]:
        raise SystemExit("Narration mix duration differs from video.")
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-n","-framerate",str(fps),"-i",str(work/"%04d.png"),"-i",str(mix),"-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p","-r","30","-c:a","aac","-b:a","96k","-movflags","+faststart","-shortest",str(out)],check=True)
    probe=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(out)]))
    video=next(s for s in probe["streams"] if s["codec_type"]=="video")
    audio=next(s for s in probe["streams"] if s["codec_type"]=="audio")
    checks["mp4_1080x1920_h264_aac"]=video["codec_name"]=="h264" and video["width"]==1080 and video["height"]==1920 and audio["codec_name"]=="aac"
    evidence={"checks":checks,"duration":probe["format"]["duration"],"size":out.stat().st_size,"narration":"local synthetic English (eSpeak)","voice_durations":voice_durations,"scope":"offline annotated real excerpt; manual fictional example; fallback selection tested; secure-origin clipboard not tested; no upload"}
    (args.output/"capture-evidence.json").write_text(json.dumps(evidence,indent=2))
    if not all(checks.values()):
        raise SystemExit(str(evidence))
    print(json.dumps(evidence,indent=2))
