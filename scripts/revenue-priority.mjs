import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasReadyAffiliate, isPromoActive } from "./revenue-rules.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cfg=JSON.parse(fs.readFileSync(path.join(root,"data/revenue-opportunities-2026.json"),"utf8"));
const now=Date.now();

function walk(dir){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules"].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
const htmlFiles=walk(root).filter(p=>p.endsWith(".html"));
function pageCount(key){
  const needle=key.toLowerCase();
  return htmlFiles.filter(f=>{
    const rel=path.relative(root,f).replace(/\\/g,"/").toLowerCase();
    const body=fs.readFileSync(f,"utf8").toLowerCase();
    return rel.includes(needle)||body.includes(needle);
  }).length;
}
function marketPoints(n){
  if(!n) return 0;
  return Math.min(15,Math.round(Math.log10(n+1)*3.5));
}
function demandPoints(n){
  if(!n) return 0;
  return Math.min(10,Math.round(Math.log10(n+1)*2));
}
function score(x){
  const pages=pageCount(x.key);
  const active=x.affiliateStatus==="active";
  const promo=isPromoActive(x.currentOffer,now);
  const readyPages=active ? htmlFiles.filter(f=>hasReadyAffiliate(fs.readFileSync(f,"utf8"),x.affiliateHost,x.affiliateReferral)).length : 0;
  const payout=x.commissionPercent?Math.min(20,Math.round(x.commissionPercent*0.4)):0;
  const recurrence=x.recurringMonths?Math.min(10,Math.round(x.recurringMonths/1.2)):0;
  const readiness=Math.min(15,(active?readyPages:pages)*3);
  const market=marketPoints(x.marketReviewCount);
  const demand=demandPoints(x.searchDemandEstimate);
  const activePoints=active?40:0;
  const promoPoints=promo?10:0;
  const setupPenalty=x.userSetupRequired?10:0;
  const total=Math.max(0,Math.min(100,activePoints+payout+recurrence+readiness+market+demand+promoPoints-setupPenalty));
  let lane;
  if(active) lane=readyPages>0?"SELL_NOW":"FIX_ATTRIBUTION";
  else if((x.marketReviewCount||0)>=3000 || pages>=3) lane="UNLOCK_AFFILIATE";
  else lane="WAIT";
  let next;
  if(lane==="SELL_NOW") next=promo
    ?"Distribute and optimize existing high-intent pages before the live offer expires; do not create unrelated pages."
    :"Distribute and optimize existing high-intent pages; new content needs a distinct buyer query.";
  else if(lane==="FIX_ATTRIBUTION") next="Repair valid tracked affiliate links before distributing.";
  else if(lane==="UNLOCK_AFFILIATE") next="Do not create more product pages. First unlock a real affiliate relationship without adding material user workload.";
  else next="Do not spend build time yet. Recheck only when monetization or demand evidence improves.";
  return {...x,pages,readyPages,total,lane,next,promoActive:!!promo};
}

const rows=cfg.opportunities.map(score).sort((a,b)=>b.total-a.total);
const check=process.argv.includes("--check");
const approved=new Set(cfg.approvedAffiliateHosts||[]);
const errors=[];
for(const r of rows){
  if(r.affiliateStatus==="active"){
    if(!r.affiliateHost||!approved.has(r.affiliateHost)) errors.push(`${r.name}: active affiliate host is not approved`);
    if(r.readyPages<1) errors.push(`${r.name}: active affiliate has no valid tracked affiliate page`);
  }
  if(r.lane==="SELL_NOW" && r.affiliateStatus!=="active") errors.push(`${r.name}: SELL_NOW without an active affiliate`);
  if(r.key==="beehiiv" && r.searchAdsAllowed!==false) errors.push("beehiiv: search ads must remain disabled by partner-program rule");
}
if(check){
  if(errors.length){ for(const e of errors) console.error("FAIL:",e); process.exit(1); }
  console.log("PASS: revenue priority rules are internally consistent.");
}
console.log("\nToolPilot revenue priority — source snapshot "+cfg.asOf+"; evaluated "+new Date(now).toISOString());
for(const r of rows){
  console.log(`${String(r.total).padStart(3)}  ${r.lane.padEnd(16)} ${r.name.padEnd(16)} mentions=${r.pages} ready=${r.readyPages} promo=${r.promoActive?"active":"inactive"} payout=${r.affiliateStatus==="active"?(r.payoutSetupVerified?"verified":"unverified"):"n/a"}  ${r.next}`);
}
