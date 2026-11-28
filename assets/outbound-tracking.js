/* ToolPilot Guide — first-party anonymous funnel events. No cookies or fingerprinting. */
(function(){
  "use strict";
  const endpoint="https://rjgpwcmfgdkmlplifwck.supabase.co/functions/v1/toolpilot-event";

  function source(){
    const tagged=(new URLSearchParams(location.search).get("utm_source")||"").trim().toLowerCase();
    if(tagged) return tagged.replace(/[^a-z0-9._-]/g,"").slice(0,100)||"tagged";
    try {
      if(!document.referrer) return "direct";
      const host=new URL(document.referrer).hostname.toLowerCase().replace(/^www\./,"");
      if(host==="linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
      if(host==="google.com" || host.endsWith(".google.com")) return "google";
      if(host==="bing.com" || host.endsWith(".bing.com")) return "bing";
      if(host==="duckduckgo.com" || host.endsWith(".duckduckgo.com")) return "duckduckgo";
      if(host==="reddit.com" || host.endsWith(".reddit.com")) return "reddit";
      if(host==="youtube.com" || host.endsWith(".youtube.com") || host==="youtu.be") return "youtube";
      if(host==="instagram.com" || host.endsWith(".instagram.com")) return "instagram";
      if(host==="facebook.com" || host.endsWith(".facebook.com")) return "facebook";
      if(host==="toolpilot-guide.onrender.com") return "internal";
      return "referral";
    } catch(_) { return "unknown"; }
  }

  function send(event_name,target){
    const body=JSON.stringify({
      event_name:event_name,
      target:target||"",
      page_path:location.pathname,
      source:source()
    });
    const fallback=()=>fetch(endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:body,
      keepalive:true
    }).catch(()=>{});
    try {
      if(typeof navigator.sendBeacon==="function" &&
         navigator.sendBeacon(endpoint,new Blob([body],{type:"application/json"}))) return;
    } catch(_) {}
    fallback();
  }

  // Preserve only the coarse YouTube origin through relevant first-party links.
  // No cookies, no new events, no changes to external affiliate links.
  function youtubeInternalHref(href,current){
    if(!href||href.startsWith('#'))return href;
    let u,base;try{base=new URL(current);u=new URL(href,base);}catch(_){return href;}
    if(u.origin!==base.origin||!/^https?:$/.test(u.protocol))return href;
    if(!(/^\/(?:free-tools\.html|tools\/[a-z0-9-]+\.html|black-friday\/(?:verified-saas-deals-2026|saas-cost-calculator)\.html)$/.test(u.pathname)||u.pathname==='/'))return href;
    if(u.searchParams.has('utm_source'))return href;
    if(u.pathname===base.pathname&&u.search===base.search)return href;
    u.searchParams.set('utm_source','youtube');
    if(!u.searchParams.has('utm_medium'))u.searchParams.set('utm_medium','internal');
    return u.pathname+u.search+u.hash;
  }
  function tagYouTubeLinks(){
    if(source()!=="youtube")return;
    document.querySelectorAll('a[href]:not([download]):not([data-affiliate]):not([rel~="sponsored"])').forEach(a=>{
      const before=a.getAttribute("href"),after=youtubeInternalHref(before,location.href);
      if(after!==before)a.setAttribute("href",after);
    });
  }
  function pageView(){ tagYouTubeLinks(); send("page_view",document.title.slice(0,250)); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",pageView,{once:true});
  else pageView();

  document.addEventListener("click",function(e){
    if(!(e.target instanceof Element)) return;
    const anchor=e.target.closest("a[href]");
    const affiliate=e.target.closest('a[data-affiliate],a[rel~="sponsored"],a[href*="via=mario-belmonte"]');
    if(affiliate) {
      send("affiliate_click",affiliate.dataset.affiliate||affiliate.href);
    } else if(anchor) {
      try {
        const u=new URL(anchor.href,location.href);
        if(/^https?:$/.test(u.protocol) && u.hostname!==location.hostname) send("outbound_official_click",u.href);
      } catch(_) {}
    }
    const freebie=e.target.closest("a[data-freebie]");
    if(freebie) send("freebie_open",freebie.dataset.freebie||freebie.href);
    const cta=e.target.closest("a.btn,a.textlink");
    if(cta && !affiliate) send("cta_click",cta.getAttribute("href")||"");
  });
})();
