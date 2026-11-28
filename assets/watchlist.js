/* ToolPilot Guide — optional consent-based email watchlist. */
(function(){
  "use strict";
  const leadEndpoint="https://rjgpwcmfgdkmlplifwck.supabase.co/functions/v1/toolpilot-lead-capture";
  const isEs=(document.documentElement.lang||"en").toLowerCase().startsWith("es");
  const eventEndpoint="https://rjgpwcmfgdkmlplifwck.supabase.co/functions/v1/toolpilot-event";

  function source(){
    const u=(new URLSearchParams(location.search).get("utm_source")||"").trim().toLowerCase();
    if(u) return u.replace(/[^a-z0-9._-]/g,"").slice(0,100)||"tagged";
    try {
      if(!document.referrer) return "direct";
      return new URL(document.referrer).hostname.toLowerCase().replace(/^www\./,"").slice(0,100);
    } catch(_) { return "unknown"; }
  }

  document.querySelectorAll("form[data-toolpilot-watchlist]").forEach(function(form){
    const status=form.querySelector("[data-status]");
    form.addEventListener("submit",async function(e){
      e.preventDefault();
      if(status) status.textContent=isEs?"Guardando…":"Saving…";
      const email=form.querySelector('input[type="email"]');
      const consent=form.querySelector('input[name="consent"]');
      const company=form.querySelector('input[name="company"]');
      const sourceName=form.getAttribute("data-source")||"watchlist";
      try{
        const response=await fetch(leadEndpoint,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            email:email ? email.value : "",
            consent:!!(consent&&consent.checked),
            company:company ? company.value : "",
            source:sourceName,
            locale:(document.documentElement.lang||"en").slice(0,10),
            referrer:document.referrer||""
          })
        });
        const result=await response.json();
        if(!response.ok||!result.ok) throw new Error("capture_failed");
        if(status) {
          status.textContent=isEs?"Solicitud guardada. Para confirmar, envía un correo desde la misma dirección. ":"Request saved. To confirm, send an email from the same address. ";
          const link=document.createElement("a");
          link.href="mailto:toolpilotguide.global@gmail.com?subject="+encodeURIComponent("CONFIRM TOOLPILOT WATCHLIST")+"&body="+encodeURIComponent("I confirm that I want to receive ToolPilot deal and buying-guide updates. I can unsubscribe at any time.");
          link.textContent=isEs?"Confirmar por correo":"Confirm by email";
          status.appendChild(link);
        }
        form.reset();
        fetch(eventEndpoint,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            event_name:"lead_submit",
            target:sourceName,
            page_path:location.pathname,
            source:source()
          }),
          keepalive:true
        }).catch(()=>{});
      }catch(_){
        if(status) status.textContent=isEs?"No hemos podido guardar el correo. Inténtalo más tarde; las herramientas siguen disponibles sin registro.":"We could not save your email. Please try again later; all free tools remain available without signup.";
      }
    });
  });
})();
