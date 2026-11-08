/* ToolPilot Guide — Metricool analytics, explicit opt-in only.
 * Metricool site hash is specific to ToolPilot Guide, never other brands.
 * Analytics is disabled until the visitor accepts optional tracking.
 */
(function () {
  "use strict";
  const consentKey = "toolpilot_analytics_consent_v1";
  const hash = "94ec569502f9255793023f324f5d0901";
  let loading = false;
  const isEs = document.documentElement.lang.toLowerCase().startsWith("es");

  function beginTracking() {
    if (loading) return;
    loading = true;
    const script = document.createElement("script");
    script.src = "https://tracker.metricool.com/resources/be.js";
    script.async = true;
    script.onload = function () {
      if (window.beTracker && typeof window.beTracker.t === "function") {
        window.beTracker.t({hash: hash});
      }
    };
    script.onerror = function () { loading = false; };
    document.head.appendChild(script);
  }

  function readConsent() {
    try { return window.localStorage.getItem(consentKey); } catch (_) { return null; }
  }
  function saveConsent(value) {
    try { window.localStorage.setItem(consentKey, value); } catch (_) {}
  }
  function dismissBanner() {
    const banner = document.getElementById("tp-analytics-consent");
    if (banner) banner.remove();
  }
  function displayBanner() {
    if (document.getElementById("tp-analytics-consent")) return;
    const banner = document.createElement("section");
    banner.id = "tp-analytics-consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", isEs ? "Preferencias de privacidad" : "Privacy preferences");
    banner.style.cssText = "position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;max-width:690px;margin:0 auto;padding:18px 20px;color:#f7f5f1;background:#171717;border:1px solid #b18d58;box-shadow:0 12px 40px #000b;border-radius:8px;font:14px/1.45 system-ui,sans-serif;";
    const message = document.createElement("p");
    message.style.cssText = "margin:0 0 14px;color:#e0ddd7";
    message.textContent = isEs
      ? "¿Nos permites medir visitas y mejorar la web usando Metricool? Es opcional. Puedes continuar sin seguimiento."
      : "May we use Metricool to measure visits and improve our site? This is optional. You can continue without analytics.";
    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;align-items:center";
    function action(label, accept) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = "border:1px solid #baa073;border-radius:4px;padding:9px 13px;cursor:pointer;font-size:13px;font-weight:700;background:" + (accept ? "#dfbd83;color:#161616" : "transparent;color:#f7f5f1");
      button.addEventListener("click", function () {
        saveConsent(accept ? "accepted" : "declined");
        dismissBanner();
        if (accept) beginTracking();
      });
      controls.appendChild(button);
    }
    action(isEs ? "Aceptar estadísticas" : "Accept analytics", true);
    action(isEs ? "Rechazar" : "Decline", false);
    const privacy = document.createElement("a");
    privacy.href = isEs ? "/es/privacidad.html" : "/privacy.html";
    privacy.textContent = isEs ? "Privacidad" : "Privacy";
    privacy.style.cssText = "color:#dfbd83;text-decoration:underline;font-size:13px";
    controls.appendChild(privacy);
    banner.appendChild(message);
    banner.appendChild(controls);
    document.body.appendChild(banner);
  }
  function addPrivacyLink() {
    if (document.getElementById("tp-privacy-link")) return;
    const link = document.createElement("a");
    link.id = "tp-privacy-link";
    link.href = isEs ? "/es/privacidad.html" : "/privacy.html";
    link.textContent = isEs ? "Privacidad y estadísticas" : "Privacy & analytics";
    link.style.cssText = "display:inline-block;color:#dfbd83;font:12px/1.5 system-ui,sans-serif;text-decoration:underline;margin:8px 14px";
    const footer = document.querySelector("footer");
    if (footer) footer.appendChild(link);
    else document.body.appendChild(link);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addPrivacyLink, {once: true});
  else addPrivacyLink();
  const consent = readConsent();
  if (consent === "accepted") beginTracking();
  else if (consent !== "declined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", displayBanner, {once: true});
    else displayBanner();
  }

  // Allow consent to be reopened from our privacy policy.
  window.toolPilotReviewPrivacy = function () {
    saveConsent("");
    displayBanner();
  };
})();