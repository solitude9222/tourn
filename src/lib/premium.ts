/* ---------------------------------------------------------------------------
   Premium is server-owned.

   The only source of truth is `users.premium` on the backend — set by the
   Stripe webhook after a paid subscription, or by an admin in the console.
   Nothing in the browser can grant Premium: the old localStorage testing flag
   was removed because any visitor could set it themselves.

   This module only holds navigation, so a locked control can send the visitor
   to the page that explains the plan.
   --------------------------------------------------------------------------- */

/** Every locked control sends the visitor here instead of applying the change. */
export function goToPremium(): void {
  window.location.hash = "#/premium";
}
