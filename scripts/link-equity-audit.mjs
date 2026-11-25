import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const cfg=JSON.parse(fs.readFileSync(path.join(root,"data/critical-money-pages.json"),"utf8"));
const files=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if([".git","node_modules"].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(p.endsWith(".html")) files.push(p);
  }
}
walk(root);
const rel=p=>path.relative(root,p).replace(/\\/g,"/");
const fileSet=new Set(files.map(rel));

function target(from,href){
  href=href.split("#")[0].split("?")[0];
  if(!href || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  if(href==="/") return "index.html";
  let t=href.startsWith("/")?href.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(from),href));
  if(t.endsWith("/")) t+="index.html";
  return fileSet.has(t)?t:null;
}

const graph=new Map();
const inbound=new Map([...fileSet].map(p=>[p,new Set()]));
for(const f of files){
  const p=rel(f), html=fs.readFileSync(f,"utf8");
  const outs=new Set();
  for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)){
    const t=target(p,m[1]);
    if(t && t!==p){ outs.add(t); inbound.get(t)?.add(p); }
  }
  graph.set(p,outs);
}

const depth=new Map([["index.html",0]]);
const queue=["index.html"];
while(queue.length){
  const cur=queue.shift(), d=depth.get(cur);
  for(const n of graph.get(cur)||[]){
    if(!depth.has(n)){depth.set(n,d+1);queue.push(n);}
  }
}

const errors=[];
console.log("\nToolPilot internal link equity");
for(const x of cfg.critical){
  const links=inbound.get(x.path)?.size||0;
  const dep=depth.has(x.path)?depth.get(x.path):Infinity;
  const depText=Number.isFinite(dep)?String(dep):"unreachable";
  console.log(`${x.path.padEnd(58)} inbound=${String(links).padStart(2)} depth=${depText}`);
  if(links<x.minInbound) errors.push(`${x.path}: inbound ${links} < required ${x.minInbound}`);
  if(dep>x.maxDepth) errors.push(`${x.path}: homepage depth ${depText} > allowed ${x.maxDepth}`);
}
if(errors.length){
  for(const e of errors) console.error("FAIL:",e);
  process.exit(1);
}
console.log("PASS: critical money pages have sufficient internal authority and short click paths.");
