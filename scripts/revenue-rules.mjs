export function isPromoActive(offer, now=Date.now()){
  const expiry=Date.parse(offer?.expiresAt||"");
  return offer?.active===true && Number.isFinite(expiry) && Number.isFinite(now) && now<=expiry;
}

export function validAffiliateUrl(href,host,ref){
  try{
    const u=new URL(href);
    return u.protocol==="https:" && !u.username && !u.password && !u.port &&
      u.hostname.replace(/^www\./,"")===host && !!ref?.param && !!ref?.value &&
      u.searchParams.getAll(ref.param).length===1 && u.searchParams.get(ref.param)===ref.value;
  }catch{return false;}
}

export function hasReadyAffiliate(html,host,ref){
  if((html.match(/\/assets\/outbound-tracking\.js/g)||[]).length!==1)return false;
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].some(m=>
    validAffiliateUrl(m[1].replace(/&amp;/g,"&"),host,ref) &&
    /\bdata-affiliate=["'][^"']+["']/i.test(m[0]) &&
    /\brel=["'][^"']*\bsponsored\b/i.test(m[0]));
}
