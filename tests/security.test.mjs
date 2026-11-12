import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestOriginAllowed,canEditMember,verifiedDiscordEmail,privilegedEmail} from '../backends/security.js';
const origins=new Set(['https://tourn.lol','https://swats.bio']);
const request=headers=>({get:name=>headers[name]});
test('CSRF rejects foreign origins, null origins and cross-site browser writes without Origin',()=>{
 for(const headers of [{'origin':'https://evil.example'},{'origin':'null'},{'sec-fetch-site':'cross-site'},{'origin':'https://tourn.lol.evil.example'}])assert.equal(requestOriginAllowed(request(headers),origins),false);
 assert.equal(requestOriginAllowed(request({'origin':'https://tourn.lol','sec-fetch-site':'same-origin'}),origins),true);
 assert.equal(requestOriginAllowed(request({'origin':'https://swats.bio','sec-fetch-site':'cross-site'}),origins),true);
 assert.equal(requestOriginAllowed(request({}),origins),true,'Signed server-to-server webhooks still work');
});
test('staff cannot promote other staff, demote owners, or edit owner data',()=>{
 const staff={is_owner:false},owner={is_owner:true},member={is_owner:false};
 for(const patch of [{role:'owner'},{role:'member'},{is_admin:true},{is_admin:false}])assert.equal(canEditMember(staff,member,patch),false);
 assert.equal(canEditMember(staff,owner,{premium:false}),false);
 assert.equal(canEditMember(staff,member,{premium:true}),true);
 assert.equal(canEditMember(owner,member,{role:'staff'}),true);
});

test('unverified provider emails cannot establish privileged identity',()=>{
 for(const verified of [false,undefined,'true',1])assert.equal(verifiedDiscordEmail({email:'owner@example.com',verified}),null);
 assert.equal(verifiedDiscordEmail({email:' OWNER@example.com ',verified:true}),'owner@example.com');
 assert.equal(privilegedEmail(null,'owner@example.com','admin@example.com'),false);
 assert.equal(privilegedEmail('owner@example.com','owner@example.com','admin@example.com'),true);
 assert.equal(privilegedEmail('member@example.com','owner@example.com','admin@example.com'),false);
});
