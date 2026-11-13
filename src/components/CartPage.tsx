import { useEffect, useState } from "react";
import { cartItems, cartSubscribe, clearCart, removeFromCart, type CartItem } from "../lib/cart";
import { openSellAuthCart } from "../lib/sellAuth";
import { useAuth } from "../lib/auth";
import "../pages.css";

export function CartPage({ onSignUp }: { onSignUp: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(cartItems());
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => cartSubscribe(() => setItems(cartItems())), []);

  const usernames = items.filter((item) => item.type !== "badge").length;
  const badges = items.length - usernames;

  const checkout = async () => {
    if (!items.length || buying) return;
    if (!user) {
      onSignUp();
      return;
    }
    setBuying(true);
    setError(null);
    try {
      await openSellAuthCart(items.map((item) => ({ type: item.type, handle: item.handle, badge: item.badge })));
      clearCart();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout is unavailable right now.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <section className="page">
      <div className="wrap mkt-head" data-reveal>
        <h1 className="mkt-title">Cart</h1>
        <p className="mkt-sub">
          {items.length
            ? `${usernames} name${usernames === 1 ? "" : "s"} · ${badges} badge${badges === 1 ? "" : "s"}`
            : "Nothing in the basket yet."}
        </p>
      </div>

      <div className="wrap">
        {items.length ? (
          <>
            <div className="cart-list">
              {items.map((item) => (
                <div className="cart-row" key={item.key}>
                  <span className={`cart-mark${item.art ? " cart-mark--art" : ""}`}>
                    {item.art ? <img src={item.art} alt="" width={26} height={26} loading="lazy" /> : item.handle || "?"}
                  </span>
                  <span className="cart-copy">
                    <b>{item.title}</b>
                    <small>{item.subtitle}</small>
                  </span>
                  <span className="cart-price">At checkout</span>
                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => removeFromCart(item.key)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-foot">
              <div className="cart-total">
                <small>Total</small>
                <b>Shown in the store</b>
              </div>
              <div className="cart-actions">
                <button type="button" className="mkt-btn" onClick={() => clearCart()} disabled={buying}>
                  Clear cart
                </button>
                <button type="button" className="mkt-btn mkt-btn--primary" onClick={() => void checkout()} disabled={buying}>
                  {buying ? "Opening checkout…" : user ? "Checkout" : "Sign in to check out"}
                </button>
              </div>
            </div>

            <p className="market-purchase-note">
              Names and badges are paid for in one order. Each username is checked again before checkout, and anything taken in the
              meantime is refused instead of sold twice.
            </p>
            {error ? (
              <p className="premium-buy-note" role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <div className="mkt-empty">
            <b>Your cart is empty</b>
            <p>Add a username or a seasonal badge from the marketplace and it will wait here.</p>
            <a className="mkt-btn mkt-btn--primary" href="#/shop">
              Open the marketplace
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
