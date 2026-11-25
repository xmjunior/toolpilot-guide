const test=require('node:test');
const assert=require('node:assert/strict');
const rules=import('../scripts/revenue-rules.mjs');
const ref={param:'via',value:'mario-belmonte'}, host='beehiiv.com', link='https://www.beehiiv.com/?via=mario-belmonte', offer={active:true,expiresAt:'2026-11-30T04:59:59Z'};
const good='<a data-affiliate="beehiiv" rel="sponsored" href="'+link+'">Try</a><script src="/assets/outbound-tracking.js"></script>';
for(const [name,url,expected] of [
 ['valid link',link,true],['missing referral','https://beehiiv.com/',false],['wrong referral','https://beehiiv.com/?via=other',false],['duplicate referral',link+'&via=other',false],['spoof host','https://beehiiv.com.example.org/?via=mario-belmonte',false],['HTTP',link.replace('https:','http:'),false],['fragment only','https://beehiiv.com/#via=mario-belmonte',false],['credentials','https://u:p@beehiiv.com/?via=mario-belmonte',false],['encoded referral',link.replace('mario-belmonte','mario%2Dbelmonte'),true]])test(name,async()=>assert.equal((await rules).validAffiliateUrl(url,host,ref),expected));
for(const [name,o,now,expected] of [
 ['before expiry',offer,'2026-11-30T04:59:58Z',true],['at expiry',offer,offer.expiresAt,true],['after expiry',offer,'2026-11-30T05:00:00Z',false],['invalid expiry',{active:true,expiresAt:'invalid'},offer.expiresAt,false],['inactive',{...offer,active:false},offer.expiresAt,false]])test(name,async()=>assert.equal((await rules).isPromoActive(o,Date.parse(now)),expected));
for(const [name,html,expected] of [
 ['ready page',good,true],['mention only','beehiiv',false],['missing tracker',good.replace('/assets/outbound-tracking.js',''),false],['missing sponsored attribute',good.replace('rel="sponsored"',''),false],['duplicate tracker',good+good,false],['HTML escaped URL',good.replace(link,link+'&amp;utm_source=site'),true]])test(name,async()=>assert.equal((await rules).hasReadyAffiliate(html,host,ref),expected));
