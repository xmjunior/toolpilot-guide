import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"data/newsletter-platforms-2026.json"),"utf8"));
const platforms=data.platforms;
const MARKER="<!-- generated-by: toolpilot-money-engine -->";
const force=process.argv.includes("--overwrite-curated");
let created=0, updated=0, skipped=0;

const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const out=(p,c)=>{
  const f=path.join(root,p);
  fs.mkdirSync(path.dirname(f),{recursive:true});
  if(fs.existsSync(f)){
    const previous=fs.readFileSync(f,"utf8");
    if(!previous.includes(MARKER) && !force){
      console.log(`SKIP curated page: ${p}`);
      skipped++;
      return false;
    }
    fs.writeFileSync(f,c);
    updated++;
    return true;
  }
  fs.writeFileSync(f,c);
  created++;
  return true;
};

function shell(title,desc,canonical,body){
 const schema=JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:title,description:desc,dateModified:data.reviewed,mainEntityOfPage:canonical,publisher:{"@type":"Organization",name:"ToolPilot Guide",url:"https://toolpilot-guide.onrender.com/"}});
 return `${MARKER}
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#08090b"><title>${esc(title)} | ToolPilot Guide</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/growth.css"><link rel="icon" type="image/svg+xml" href="/assets/toolpilot-icon.svg"><script type="application/ld+json">${schema}</script></head><body><header class="navbar"><div class="container nav-inner"><a class="logo" href="/">TOOL<i>PILOT</i> GUIDE</a><nav class="links"><a href="/newsletter-platforms.html">Newsletter comparisons</a><a href="/methodology.html">Methodology</a></nav></div></header><main class="container">${body}</main><footer class="footer"><div class="container"><p>© 2026 ToolPilot Guide · Verify current prices and terms with the provider.</p></div></footer><script defer src="/assets/outbound-tracking.js"></script><script defer src="/assets/metricool-consent.js"></script></body></html>`;
}
function cta(key,p,context){
  if(p.affiliate){
    const u=new URL(p.affiliate);
    u.searchParams.set("utm_source","toolpilot");
    u.searchParams.set("utm_medium","generated-money-page");
    u.searchParams.set("utm_campaign","newsletter_money_pages");
    u.searchParams.set("utm_content",context);
    return `<a data-affiliate="${esc(key+"-"+context)}" class="btn" target="_blank" rel="noopener noreferrer sponsored" href="${esc(u.toString())}">See ${esc(p.name)} plans — partner link ↗</a>`;
  }
  return `<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="${esc(p.official)}">See ${esc(p.name)} official pricing ↗</a>`;
}
function disclosure(keys){
  const active=keys.filter(k=>platforms[k]?.affiliate).map(k=>platforms[k].name);
  if(!active.length) return "";
  return `<aside><strong>Commercial transparency.</strong> ToolPilot may earn a commission from qualifying ${esc(active.join(" / "))} purchases through labelled partner links. Affiliate availability does not determine the recommendation.</aside>`;
}
function compare(a,b){
 const A=platforms[a],B=platforms[b],slug=`${a}-vs-${b}`,canonical=`https://toolpilot-guide.onrender.com/compare/${slug}.html`;
 const title=`${A.name} vs ${B.name} (2026): pricing, free plans & business fit`;
 const body=`<section class="article-hero"><div class="eyebrow">NEWSLETTER PLATFORM COMPARISON</div><h1>${esc(A.name)} vs ${esc(B.name)}</h1><p>Compare current plan economics and choose by business outcome, not feature count.</p></section><article class="article">${disclosure([a,b])}<div class="table-wrap"><table class="comparison"><thead><tr><th>Decision</th><th>${esc(A.name)}</th><th>${esc(B.name)}</th></tr></thead><tbody><tr><td>Free plan</td><td>${esc(A.free)}</td><td>${esc(B.free)}</td></tr><tr><td>Paid entry</td><td>${esc(A.paid)}</td><td>${esc(B.paid)}</td></tr><tr><td>Best fit</td><td>${esc(A.strength)}</td><td>${esc(B.strength)}</td></tr></tbody></table></div><h2>Decision rule</h2><p>Choose the smallest viable plan that solves the primary job today; model the next subscriber tier before annual billing.</p><p>${cta(a,A,slug)} ${cta(b,B,slug)}</p></article>`;
 out(`compare/${slug}.html`,shell(title,`Compare ${A.name} vs ${B.name} using current pricing and free-plan limits.`,canonical,body));
}
function pricing(k){
 const p=platforms[k],canonical=`https://toolpilot-guide.onrender.com/pricing/${k}-pricing-2026.html`,title=`${p.name} pricing 2026: free plan & paid starting point`;
 const body=`<section class="article-hero"><div class="eyebrow">PRICING GUIDE</div><h1>${esc(p.name)} pricing</h1><p>Start with the smallest plan that solves today's problem.</p></section><article class="article">${disclosure([k])}<h2>Free plan</h2><p>${esc(p.free)}</p><h2>Paid entry</h2><p>${esc(p.paid)}</p><h2>Best fit</h2><p>${esc(p.strength)}</p><p>${cta(k,p,k+"-pricing")}</p></article>`;
 out(`pricing/${k}-pricing-2026.html`,shell(title,`Current ${p.name} pricing and free-plan limits for 2026.`,canonical,body));
}
function alternatives(k){
 const p=platforms[k],keys=Object.keys(platforms).filter(x=>x!==k),canonical=`https://toolpilot-guide.onrender.com/alternatives/${k}-alternatives.html`,title=`Best ${p.name} alternatives in 2026`;
 const rows=keys.map(x=>{const q=platforms[x];return `<tr><td>${esc(q.name)}</td><td>${esc(q.free)}</td><td>${esc(q.paid)}</td><td>${esc(q.strength)}</td></tr>`}).join("");
 const body=`<section class="article-hero"><div class="eyebrow">ALTERNATIVES</div><h1>${esc(p.name)} alternatives</h1><p>Switch only if another platform solves the primary job better.</p></section><article class="article">${disclosure([k,...keys])}<div class="table-wrap"><table class="comparison"><thead><tr><th>Alternative</th><th>Free plan</th><th>Paid entry</th><th>Best fit</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Next step</h2><p>${cta(k,p,k+"-alternatives")}</p></article>`;
 out(`alternatives/${k}-alternatives.html`,shell(title,`Compare current ${p.name} alternatives by cost and business fit.`,canonical,body));
}

const generation=data.generate||{};
const pairs=Array.isArray(generation.comparisons)?generation.comparisons:[];
const pricingKeys=Array.isArray(generation.pricing)?generation.pricing:[];
const alternativeKeys=Array.isArray(generation.alternatives)?generation.alternatives:[];
for(const pair of pairs){
  if(!Array.isArray(pair)||pair.length!==2||!platforms[pair[0]]||!platforms[pair[1]]) throw new Error("Invalid comparison pair in data.generate");
  compare(pair[0],pair[1]);
}
for(const k of pricingKeys){ if(!platforms[k]) throw new Error(`Unknown pricing platform: ${k}`); pricing(k); }
for(const k of alternativeKeys){ if(!platforms[k]) throw new Error(`Unknown alternatives platform: ${k}`); alternatives(k); }
console.log(`Money engine complete. created=${created} updated=${updated} skipped_curated=${skipped}. Generated only explicitly approved entries from data.generate. Use --overwrite-curated only after explicit review.`);
