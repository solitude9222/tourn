import {needsPrimaryAlias} from './singleAlias.js';
/** Admin owns the catalog; deployment owns provider identifiers. No secrets are stored in products. */
export const MARKETPLACE_SCHEMA = `
create table if not exists marketplace_products(
 id text primary key, title text not null, description text not null default '',
 image_url text not null default '', price_cents integer not null check(price_cents>=0),
 currency text not null default 'USD', reward text not null check(reward in ('premium','badge')),
 badge_id text, checkout_env text not null unique, stock integer check(stock>=0),
 enabled boolean not null default false, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);`;
export const SALE_BADGES=['easter','autumn','summer','christmas_2026','halloween_2026'];
const fail=(status,message)=>Object.assign(new Error(message),{status});
const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){console.error('[marketplace]',error.message);res.status(error.status||503).json({error:error.status?error.message:'The marketplace is temporarily unavailable.'});}};
export function providerMapping(key,env=process.env){
 if(!/^TOURN_PRODUCT_[A-Z0-9_]{1,64}$/.test(key||''))return null;
 const match=/^([1-9]\d*):([1-9]\d*)$/.exec(env[key]||'');
 if(!match)return null;
 const [productId,variantId]=match.slice(1).map(Number);
 return Number.isSafeInteger(productId)&&Number.isSafeInteger(variantId)?{productId,variantId}:null;
}
export function validateProduct(input){
 const id=String(input.id||'').trim().toLowerCase(),title=String(input.title||'').trim();
 const description=String(input.description||'').trim(),image_url=String(input.image_url||'').trim();
 const checkout_env=String(input.checkout_env||`TOURN_PRODUCT_${id.replace(/-/g,'_').toUpperCase()}`).trim();
 const price_cents=Number(input.price_cents),currency=String(input.currency||'USD').toUpperCase();
 const reward=input.reward,badge_id=reward==='badge'?String(input.badge_id||''):null;
 const stock=input.stock===null||input.stock===''||input.stock===undefined?null:Number(input.stock);
 if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id))throw fail(400,'Use a product ID of 2–60 lowercase letters, numbers or hyphens.');
 if(!title||title.length>100||description.length>1200)throw fail(400,'Add a title up to 100 characters and a description up to 1,200.');
 if(image_url){try{const u=new URL(image_url);if(u.protocol!=='https:'||u.username||u.password)throw Error();}catch{throw fail(400,'Use an HTTPS image URL.');}}
 if(!/^TOURN_PRODUCT_[A-Z0-9_]{1,64}$/.test(checkout_env))throw fail(400,'Environment keys must begin TOURN_PRODUCT_ and use uppercase letters, numbers and underscores.');
 if(!Number.isSafeInteger(price_cents)||price_cents<1||price_cents>10000000||!['USD','EUR','GBP','AUD','NZD','CAD','CHF','SGD'].includes(currency))throw fail(400,'Enter a positive price in cents and use USD, EUR, GBP, AUD, NZD, CAD, CHF or SGD.');
 try{new Intl.NumberFormat('en',{style:'currency',currency});}catch{throw fail(400,'Enter a supported currency code.');}
 if(!['premium','badge'].includes(reward)||reward==='badge'&&!SALE_BADGES.includes(badge_id))throw fail(400,'Choose Premium or a supported store badge. Staff roles cannot be sold.');
 if(stock!==null&&(!Number.isSafeInteger(stock)||stock<0||stock>10000000))throw fail(400,'Stock must be a non-negative whole number, or blank for unlimited digital stock.');
 if(typeof input.enabled!=='boolean')throw fail(400,'Choose whether the product is published.');
 return {id,title,description,image_url,price_cents,currency,reward,badge_id,checkout_env,stock,enabled:input.enabled};
}
export function shopMapping(env=process.env){
 const shopId=Number(env.SELLAUTH_SHOP_ID);let shopUrl='';
 try{const url=new URL(env.SELLAUTH_SHOP_URL);if(url.protocol==='https:'&&!url.username&&!url.password)shopUrl=url.origin;}catch{}
 return Number.isSafeInteger(shopId)&&shopId>0&&shopUrl?{shopId,shopUrl}:null;
}
export function publicProduct(row,env=process.env,admin=false){
 const {id,title,description,image_url,price_cents,currency,reward,badge_id,stock,enabled}=row;
 return {id,title,description,image_url,price_cents,currency,reward,badge_id,stock,enabled,
 ready:Boolean(providerMapping(row.checkout_env,env)&&shopMapping(env)),
 ...(admin?{checkout_env:row.checkout_env}:{} )};
}
export function registerMarketplaceRoutes(app,{pool,requireAuth,requireAdmin,limiter,jwt,secret,env=process.env}){
 app.get('/api/marketplace/products',wrap(async(_req,res)=>{
  const {rows}=await pool.query('select * from marketplace_products where enabled=true order by created_at,id');
  res.set('Cache-Control','no-store').json({products:rows.map(row=>publicProduct(row,env))});
 }));
 app.get('/api/admin/marketplace/products',requireAdmin,wrap(async(_req,res)=>{
  const {rows}=await pool.query('select * from marketplace_products order by created_at desc,id');
  res.set('Cache-Control','no-store').json({products:rows.map(row=>publicProduct(row,env,true))});
 }));
 const save=creating=>wrap(async(req,res)=>{
  const product=validateProduct({...req.body,...(!creating?{id:req.params.id}:{})});
  // A configured provider variant must identify exactly one catalog reward.
  const {rows}=await pool.query('select * from marketplace_products where id<>$1',[product.id]);
  const mapping=providerMapping(product.checkout_env,env);
  if(mapping&&rows.some(row=>{const other=providerMapping(row.checkout_env,env);return other&&other.productId===mapping.productId&&other.variantId===mapping.variantId;}))throw fail(409,'This provider variant is already mapped to another product.');
  if(!creating){
   const previous=(await pool.query('select * from marketplace_products where id=$1',[product.id])).rows[0];
   if(!previous)throw fail(404,'Product not found.');
   if(previous.reward!==product.reward||previous.badge_id!==product.badge_id||previous.checkout_env!==product.checkout_env)throw fail(409,'Delivery and checkout mapping are fixed after creation. Create a new product instead.');
  }
  const values=Object.values(product);
  try{
   if(creating)await pool.query('insert into marketplace_products(id,title,description,image_url,price_cents,currency,reward,badge_id,checkout_env,stock,enabled) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',values);
   else {const result=await pool.query('update marketplace_products set title=$2,description=$3,image_url=$4,price_cents=$5,currency=$6,reward=$7,badge_id=$8,checkout_env=$9,stock=$10,enabled=$11,updated_at=now() where id=$1 returning id',values);if(!result.rows.length)throw fail(404,'Product not found.');}
  }catch(error){if(error.code==='23505')throw fail(409,'That product ID or environment key already exists.');throw error;}
  res.status(creating?201:200).json({product:publicProduct(product,env,true)});
 });
 app.post('/api/admin/marketplace/products',limiter,requireAdmin,save(true));
 app.patch('/api/admin/marketplace/products/:id',limiter,requireAdmin,save(false));
 app.post('/api/marketplace/checkout',limiter,requireAuth,wrap(async(req,res)=>{
  const account=(await pool.query('select alias,alias_required from users where id=$1',[req.auth.sub])).rows[0];
  if(needsPrimaryAlias(account))throw fail(409,'Choose your primary alias before checkout.');
  const product=(await pool.query('select * from marketplace_products where id=$1',[String(req.body?.productId||'')])).rows[0];
  if(!product?.enabled)throw fail(404,'This product is not on sale.');
  if(product.stock!==null&&product.stock<1)throw fail(409,'This product is sold out.');
  const mapping=providerMapping(product.checkout_env,env);
  const shop=shopMapping(env);
  if(!mapping||!shop)throw fail(503,'Checkout is awaiting backend configuration.');
  const ticket=jwt.sign({sub:req.auth.sub,v:req.auth.v,kind:'commerce',catalogId:product.id},secret,{algorithm:'HS256',expiresIn:'2h'});
  res.json({...shop,cart:[{...mapping,quantity:1}],metadata:{tourn_checkout:ticket},theme:'dark'});
 }));
}
