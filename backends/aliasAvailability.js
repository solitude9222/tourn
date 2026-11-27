import {freeHandleValid} from './usernames.js';
import {aliasMatchesDiscord} from './discordAliases.js';

/** Suggestions are checked against the same namespaces as an alias claim. */
export async function aliasAvailability(pool,user,raw,reserved){
 const alias=String(raw||'').trim().toLowerCase();
 const eligible=value=>freeHandleValid(value)&&!reserved.has(value)&&(!user.discord_username||!aliasMatchesDiscord(value,user.discord_username));
 const nextChangeAt=user.alias_updated_at?new Date(new Date(user.alias_updated_at).getTime()+172800000).toISOString():null;
 if(!eligible(alias))return {alias,available:false,message:'Use 3–24 letters or numbers. Choose a public alias different from your Discord username.',suggestions:[],nextChangeAt};
 const root=alias.slice(0,19),candidates=[alias,...['lol','bio','page','01','02','03'].map(suffix=>root+suffix)].filter(eligible);
 const {rows}=await pool.query(`select username h from users where id<>$2 and username=any($1::text[]) union select alias h from users where id<>$2 and alias=any($1::text[]) union select handle h from username_inventory where owner_id is not null and owner_id<>$2 and handle=any($1::text[])`,[candidates,user.id]);
 const taken=new Set(rows.map(row=>row.h)),available=!taken.has(alias);
 return {alias,available,message:available?'This alias is available. Availability is confirmed again when you save.':'This alias is already claimed.',suggestions:available?[]:candidates.filter(value=>value!==alias&&!taken.has(value)).slice(0,3),nextChangeAt};
}
