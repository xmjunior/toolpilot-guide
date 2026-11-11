/* ToolPilot Guide — anonymous conversion events, no cookies or fingerprinting. */
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
      if(host==="youtube.com" || host.endsWith(".youtube.com")) return "youtube";
      if(host==="instagram.com" || host.endsWith(".instagram.com")) return "instagram";
      if(host==="facebook.com" || host.endsWith(".facebook.com")) return "facebook";
      if(host==="toolpilot-guide.onrender.com") return "internal";
      return "referral";
    } catch(_) { return "unknown"; }
  }

  function send(event_name,target){
    const body=JSON.stringify({
      event_name: event_name,
      target: target,
      page_path: location.pathname,
      source: source()
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
    } catch(_) { /* Fall back to fetch below. */ }
    fallback();
  }

  document.addEventListener("click",function(e){
    if(!(e.target instanceof Element)) return;
    const affiliate=e.target.closest("a[data-affiliate]");
    if(affiliate) send("affiliate_click",affiliate.dataset.affiliate||affiliate.href);
    const freebie=e.target.closest("a[data-freebie]");
    if(freebie) send("freebie_open",freebie.dataset.freebie||freebie.href);
  });
})();
