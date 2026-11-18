import type { Route } from "./router";

/**
 * Load a route's code when the visitor shows intent (hover, focus or touch)
 * instead of eagerly after idle. The landing page then keeps its first-load
 * bandwidth for the hero, while a click still finds the destination warm.
 */
const loaders: Partial<Record<Route, () => Promise<unknown>>> = {
  dashboard: () => Promise.all([import("../dash/DashboardApp"), import("../dash/pages/Home")]),
  leaderboard: () => import("../components/Pages"),
  shop: () => import("../components/Pages"),
  cart: () => import("../components/Pages"),
  premium: () => import("../components/Pages"),
  legal: () => import("../components/Pages"),
  profile: () => import("../components/LinkerPreview"),
  demo: () => import("../components/DemoPage"),
};

const warmed = new Set<Route>();

export function preloadRoute(route: Route): void {
  if (!route || warmed.has(route)) return;
  const load = loaders[route];
  if (!load) return;
  warmed.add(route);
  void load().catch(() => warmed.delete(route));
}
