/* ---------------------------------------------------------------------------
   SellAuth checkout embed.

   Payments, stock and delivery live in the SellAuth store, not here: the
   storefront only opens its checkout with the product this build sells. The
   values come from env so the shop can change without a code change:

     VITE_SELLAUTH_SHOP_ID               numeric shop id (dash.sellauth.com/api)
     VITE_SELLAUTH_SHOP_URL              https://yourstore.com
     VITE_SELLAUTH_PREMIUM_PRODUCT_ID    product id for Premium
     VITE_SELLAUTH_PREMIUM_VARIANT_ID    optional exact variant (price/stock)

   Delivery is what grants Premium: the product's dynamic delivery URL points
   at the backend, which verifies the request and marks the buyer's account as
   premium. Nothing in the browser can grant it.
   --------------------------------------------------------------------------- */

const env = import.meta.env;

const SHOP_ID = Number(env.VITE_SELLAUTH_SHOP_ID) || 0;
const SHOP_URL = String(env.VITE_SELLAUTH_SHOP_URL || "").replace(/\/+$/, "");
export const SELLAUTH_PREMIUM_PRODUCT_ID = Number(env.VITE_SELLAUTH_PREMIUM_PRODUCT_ID) || 0;
export const SELLAUTH_PREMIUM_VARIANT_ID = Number(env.VITE_SELLAUTH_PREMIUM_VARIANT_ID) || 0;

export const sellAuthConfigured = Boolean(
  SHOP_ID && SHOP_URL && SELLAUTH_PREMIUM_PRODUCT_ID,
);

type SellAuthCartItem = {
  productId: number;
  variantId?: number;
  quantity: number;
};

type SellAuthApi = {
  open: (options: { shopId: number; shopUrl: string; cart: SellAuthCartItem[] }) => void;
};

declare global {
  interface Window {
    sellAuth?: SellAuthApi;
  }
}

let loading: Promise<void> | null = null;

function loadEmbed(): Promise<void> {
  if (window.sellAuth) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.sellauth.com/embed/v3.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("The checkout couldn't load. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openSellAuthCheckout(): Promise<void> {
  if (!sellAuthConfigured) {
    throw new Error(
      "Checkout isn't connected yet — set the SellAuth shop and Premium product IDs.",
    );
  }
  await loadEmbed();
  if (!window.sellAuth) throw new Error("The checkout didn't open. Try again in a moment.");
  window.sellAuth.open({
    shopId: SHOP_ID,
    shopUrl: SHOP_URL,
    cart: [
      {
        productId: SELLAUTH_PREMIUM_PRODUCT_ID,
        variantId: SELLAUTH_PREMIUM_VARIANT_ID || undefined,
        quantity: 1,
      },
    ],
  });
}
