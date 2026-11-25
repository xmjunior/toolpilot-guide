/* Search existing sitemap entries. No external search provider, no user tracking beyond existing site analytics. */
(async function(){
 const p=new URLSearchParams(location.search),es=p.get("lang")==="es",q=(p.get("q")||"").trim().slice(0,100),i=document.getElementById("tp-search-input"),list=document.getElementById("search-results"),status=document.getElementById("search-status");
 document.documentElement.lang=es?"es":"en";document.getElementById("tp-search-lang").value=es?"es":"en";i.value=q;i.setAttribute("aria-label",es?"Buscar":"Search");document.getElementById("search-heading").textContent=es?"Busca guías de software":"Search software guides";document.getElementById("tp-search-button").textContent=es?"Buscar":"Search";
 if(!q){status.textContent=es?"Introduce una herramienta o tema.":"Enter a tool or topic.";return;}
 const clean=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 try{
  const res=await fetch("/sitemap.xml");if(!res.ok)throw Error("sitemap");const xml=new DOMParser().parseFromString(await res.text(),"application/xml");
  const terms=clean(q).split(/\s+/).filter(Boolean),seen=new Set(),rows=[];
  for(const el of xml.getElementsByTagName("loc")){const u=new URL(el.textContent,location.origin);if(u.origin!==location.origin||seen.has(u.pathname)||u.pathname==="/"||u.pathname==="/index.html"||u.pathname==="/es/")continue;seen.add(u.pathname);const slug=decodeURIComponent(u.pathname).replace(/\/index\.html$|\.html$/g,"").split("/").filter(Boolean).pop()||"",label=slug.replace(/-/g," "),hay=clean(decodeURIComponent(u.pathname).replace(/[-/]/g," "));const score=terms.reduce((n,t)=>n+(hay.includes(t)?1:0),0);if(score>0)rows.push({url:u.pathname,label:label.charAt(0).toUpperCase()+label.slice(1),score:score*10+(u.pathname.startsWith("/es/")===es?1:0)});}
  rows.sort((a,b)=>b.score-a.score);const shown=rows.slice(0,30);status.textContent=es?shown.length+" resultados":shown.length+" results";
  for(const row of shown){const a=document.createElement("a");a.href=row.url;a.textContent=row.label;list.appendChild(a);}
  if(!shown.length){status.textContent=es?"No encontramos resultados. Prueba otra búsqueda.":"No results. Try a different search.";}
 }catch{status.textContent=es?"No pudimos cargar la búsqueda. Usa el menú de recursos.":"Search could not load. Use the resource menu.";}
})();