// Read-only SellAuth integration. API contract: https://docs.sellauth.com/api-reference/products/get-product
const fail=(status,message)=>Object.assign(new Error(message),{status});
export async function readProviderProduct(mapping,env=process.env,fetcher=fetch){
 if(!env.SELLAUTH_API_KEY)throw fail(503,'Add SELLAUTH_API_KEY on the backend to enable provider checks.');
 const shopId=Number(env.SELLAUTH_SHOP_ID);if(!mapping||!Number.isSafeInteger(shopId)||shopId<1)throw fail(503,'Configure this product’s backend key and shop ID first.');
 const response=await fetcher(`https://api.sellauth.com/v1/shops/${shopId}/products/${mapping.productId}`,{headers:{Authorization:`Bearer ${env.SELLAUTH_API_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!response.ok)throw fail(502,'The provider could not return this product. Check the product mapping and API permissions.');
 const raw=await response.json();const product=raw.data||raw;
 const variant=Array.isArray(product.variants)?product.variants.find(row=>Number(row.id)===mapping.variantId):null;
 if(!variant||Number(product.id)!==mapping.productId||product.deleted_at)throw fail(409,'The mapped provider product or variant no longer exists.');
 const price=Number(variant.price),price_cents=Math.round(price*100),currency=String(product.currency||'').toUpperCase();
 if(!Number.isFinite(price)||price<=0||!Number.isSafeInteger(price_cents)||price_cents>10000000||!['USD','EUR','GBP','AUD','NZD','CAD','CHF','SGD'].includes(currency))throw fail(409,'The provider price or currency is unsupported.');
 // Unknown/null stock is never invented as available. Keep the Admin stock
 // unless this endpoint returns an explicit non-negative variant stock count.
 const value=variant.stock_count??variant.stock;
 const stock=value!==null&&value!==undefined&&Number.isSafeInteger(Number(value))&&Number(value)>=0?Number(value):undefined;
 return {price_cents,currency,...(stock!==undefined?{stock}:{}),visible:product.visibility==='public'&&variant.visibility==='public',checked_at:new Date().toISOString()};
}
