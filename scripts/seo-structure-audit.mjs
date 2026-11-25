import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const errors=[];
const warnings=[];
const titles=new Map();
const descriptions=new Map();

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules"].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
const rel=p=>path.relative(root,p).replace(/\\/g,"/");
const commercial=p=>
  ["index.html","newsletter-platforms.html","email-marketing.html","ecommerce.html","free-tools.html","newsletter-resources.html"].includes(p)
  || /^(guides|pricing|compare|alternatives|newsletter|email|ecommerce|tools|black-friday)\//.test(p);

for(const f of walk(root).filter(p=>p.endsWith(".html"))){
  const p=rel(f);
  if(!commercial(p)) continue;
  const html=fs.readFileSync(f,"utf8");

  const titleMatches=[...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if(titleMatches.length!==1) errors.push(`${p}: expected exactly 1 <title>, found ${titleMatches.length}`);
  else{
    const title=titleMatches[0][1].replace(/\s+/g," ").trim();
    if(title.length<20||title.length>75) warnings.push(`${p}: title length ${title.length}`);
    if(!titles.has(title)) titles.set(title,[]);
    titles.get(title).push(p);
  }

  const descMatches=[...html.matchAll(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/gi)];
  if(descMatches.length!==1) errors.push(`${p}: expected exactly 1 meta description, found ${descMatches.length}`);
  else{
    const desc=descMatches[0][1].replace(/\s+/g," ").trim();
    if(desc.length<70||desc.length>190) warnings.push(`${p}: meta description length ${desc.length}`);
    if(!descriptions.has(desc)) descriptions.set(desc,[]);
    descriptions.get(desc).push(p);
  }

  const h1=[...html.matchAll(/<h1\b[^>]*>/gi)].length;
  if(h1!==1) errors.push(`${p}: expected exactly 1 H1, found ${h1}`);

  if(/<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)){
    errors.push(`${p}: commercial page is noindex`);
  }

  for(const m of html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{JSON.parse(m[1]);}
    catch(e){errors.push(`${p}: invalid JSON-LD — ${e.message}`);}
  }

  if(!/<link\b[^>]*rel=["']canonical["']/i.test(html) && !/<link\b[^>]*href=["'][^"']+["'][^>]*rel=["']canonical["']/i.test(html)){
    errors.push(`${p}: missing canonical`);
  }
}

for(const [title,pages] of titles) if(pages.length>1) errors.push(`Duplicate title "${title}" on: ${pages.join(", ")}`);
for(const [desc,pages] of descriptions) if(pages.length>1) errors.push(`Duplicate meta description on: ${pages.join(", ")}`);

for(const w of warnings.slice(0,100)) console.warn("WARN:",w);
if(errors.length){
  console.error(`FAIL: ${errors.length} SEO structure error(s).`);
  for(const e of errors) console.error(" -",e);
  process.exit(1);
}
console.log(`PASS: SEO structure validated for ${titles.size} commercial pages; titles/meta/H1/JSON-LD/noindex/duplicates checked.`);
