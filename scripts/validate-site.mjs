import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const BASE="https://toolpilot-guide.onrender.com";
const errors=[];
const warnings=[];

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules"].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
function rel(p){return path.relative(root,p).replace(/\\/g,"/");}
const files=walk(root);
const fileSet=new Set(files.map(rel));
const htmlFiles=files.filter(p=>p.endsWith(".html"));
const read=p=>fs.readFileSync(p,"utf8");
const strip=u=>u.split("#")[0].split("?")[0];
function localTarget(from,raw){
  const u=strip(raw);
  if(!u || u.startsWith("#") || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(u)) return null;
  if(u==="/") return "index.html";
  let target;
  if(u.startsWith("/")) target=u.slice(1);
  else target=path.posix.normalize(path.posix.join(path.posix.dirname(from),u));
  if(target.endsWith("/")) target+="index.html";
  return target;
}
function expectedCanonical(p){
  if(p==="index.html") return BASE+"/";
  if(p.endsWith("/index.html")) return BASE+"/"+p.slice(0,-"index.html".length);
  return BASE+"/"+p;
}
function isCommercial(p){
  return ["index.html","newsletter-platforms.html","email-marketing.html","ecommerce.html","free-tools.html","newsletter-resources.html"].includes(p)
    || /^(guides|pricing|compare|alternatives|newsletter|email|ecommerce|tools|black-friday)\//.test(p);
}
function sitemapRequired(p){
  return isCommercial(p) && !p.startsWith("go/") && !p.startsWith("embed/");
}

for(const f of files.filter(p=>p.endsWith(".json"))){
  try{JSON.parse(read(f));}catch(e){errors.push(`Invalid JSON: ${rel(f)} — ${e.message}`);}
}

for(const f of htmlFiles){
  const p=rel(f), html=read(f);
  const attrs=[...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const raw of attrs){
    const target=localTarget(p,raw);
    if(target && !fileSet.has(target)) errors.push(`Broken internal link: ${p} -> ${raw} (resolved ${target})`);
  }

  if(isCommercial(p)){
    const m=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
      || html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
    if(!m) errors.push(`Missing canonical on commercial page: ${p}`);
    else if(m[1]!==expectedCanonical(p)) errors.push(`Canonical mismatch: ${p} -> ${m[1]} (expected ${expectedCanonical(p)})`);
  }

  const anchors=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  let affiliateCount=0;
  for(const m of anchors){
    const tag=m[0], href=m[1];
    const affiliate=/via=mario-belmonte/i.test(href) || /\bdata-affiliate=/i.test(tag) || /\brel=["'][^"']*\bsponsored\b/i.test(tag);
    if(!affiliate) continue;
    affiliateCount++;
    let host="";
    try{host=new URL(href,BASE).hostname.replace(/^www\./,"");}catch{}
    if(host!=="beehiiv.com") errors.push(`Unapproved affiliate host on ${p}: ${host||href}`);
    if(!/\brel=["'][^"']*\bsponsored\b/i.test(tag)) errors.push(`Affiliate link missing rel=sponsored: ${p} -> ${href}`);
    if(!/\bdata-affiliate=/i.test(tag)) errors.push(`Affiliate link missing data-affiliate tracking label: ${p} -> ${href}`);
  }
  if(affiliateCount){
    const tracking=(html.match(/\/assets\/outbound-tracking\.js/g)||[]).length;
    if(tracking!==1) errors.push(`Affiliate page must load outbound-tracking.js exactly once: ${p} (found ${tracking})`);
  }
  if(/outbound-tracking-v2\.js/i.test(html)) warnings.push(`Legacy outbound-tracking-v2.js referenced: ${p}`);

  const forbidden=[
    "NO VERIFIED BF 2026 OFFER TODAY",
    "ANNOUNCED — starts Nov 13",
    "ANNOUNCED — starts Nov 27"
  ];
  for(const s of forbidden) if(html.includes(s)) errors.push(`Stale commercial copy in ${p}: "${s}"`);
}

const sitemapPath=path.join(root,"sitemap.xml");
if(!fs.existsSync(sitemapPath)) errors.push("Missing sitemap.xml");
else{
  const xml=read(sitemapPath);
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  const seen=new Set();
  for(const u of urls){
    if(seen.has(u)) errors.push(`Duplicate sitemap URL: ${u}`);
    seen.add(u);
    let p="";
    try{
      const parsed=new URL(u);
      if(parsed.origin!==BASE) errors.push(`Foreign sitemap origin: ${u}`);
      p=parsed.pathname.replace(/^\//,"")||"index.html";
      if(p.endsWith("/")) p+="index.html";
    }catch{errors.push(`Invalid sitemap URL: ${u}`);continue;}
    if(!fileSet.has(p)) errors.push(`Sitemap points to missing file: ${u} -> ${p}`);
  }
  for(const f of htmlFiles){
    const p=rel(f);
    if(!sitemapRequired(p)) continue;
    const url=expectedCanonical(p);
    if(!seen.has(url)) errors.push(`Commercial page missing from sitemap: ${p}`);
  }
}

const promoNeedle="BFCM2026";
const promoExpiry=Date.parse("2026-11-30T04:59:00Z");
if(Date.now()>promoExpiry){
  for(const f of htmlFiles){
    const p=rel(f), html=read(f);
    if(html.includes(promoNeedle)) errors.push(`Expired promotion still published: ${p} contains ${promoNeedle}`);
  }
}

console.log(`Validated ${htmlFiles.length} HTML pages and ${files.length} repository files.`);
for(const w of warnings) console.warn("WARN:",w);
if(errors.length){
  console.error(`FAIL: ${errors.length} site integrity error(s).`);
  for(const e of errors) console.error(" -",e);
  process.exit(1);
}
console.log("PASS: links, canonicals, sitemap, affiliate rules and promo freshness.");
