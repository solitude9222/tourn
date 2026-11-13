/* ---------------------------------------------------------------------------
   SellAuth checkout embed.

   The backend owns the store config and signs a checkout ticket into the
   purchase metadata, so the delivery webhook can attach the order to the
   signed-in account. The browser only opens the modal with the payload the
   backend returned — it never picks prices or product ids.
   --------------------------------------------------------------------------- */

import { api } from "./backend";

type SellAuthCartItem = {
  productId: number;
  variantId?: number;
  quantity: number;
};

type CheckoutPayload = {
  shopId: number;
  shopUrl: string;
  cart: SellAuthCartItem[];
  metadata?: Record<string, string>;
  theme?: "dark" | "light";
  returnUrl?: string;
  onSuccess?: (payload: { invoiceId?: string | number }) => void;
  onClose?: (payload: { reason?: string }) => void;
};

type SellAuthApi = {
  open: (options: CheckoutPayload) => void;
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

export async function openSellAuthCheckout(
  kind: "premium" | "oneCharacter" | "special" | "badge" = "premium",
  handle?: string,
): Promise<void> {
  const result = await api<CheckoutPayload>("/api/commerce/checkout", {
    method: "POST",
    body: JSON.stringify(handle ? { kind, handle } : { kind }),
  });
  if (!result.ok) throw new Error(result.error || "The store is not open yet.");

  await loadEmbed();
  if (!window.sellAuth) throw new Error("The checkout didn't open. Try again in a moment.");

  // When a paid buyer closes the checkout, land them in Billing so they see what
  // the order added to their account. A buyer who never paid stays where they were.
  let paid = false;
  const toBilling = () => {
    const next = "#/dashboard/billing?checkout=1";
    if (window.location.hash !== next) window.location.hash = next;
  };
  window.sellAuth.open({
    ...result.data,
    onSuccess: () => {
      paid = true;
    },
    onClose: () => {
      if (paid) toBilling();
    },
  });
}
