(function(){
  const endpoint="https://rjgpwcmfgdkmlplifwck.supabase.co/functions/v1/toolpilot-event";
  function send(event_name,target){
    const body=JSON.stringify({event_name,target,page_path:location.pathname,source:new URLSearchParams(location.search).get("utm_source")||"site"});
    try{navigator.sendBeacon(endpoint,new Blob([body],{type:"application/json"}));}
    catch(e){fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>{});}
  }
  document.addEventListener("click",function(e){
    const a=e.target.closest("a[data-affiliate]");
    if(a) send("affiliate_click",a.dataset.affiliate||a.href);
    const f=e.target.closest("a[data-freebie]");
    if(f) send("freebie_open",f.dataset.freebie||f.href);
  });
})();