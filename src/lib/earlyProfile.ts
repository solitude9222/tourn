import { profileHandleFromLocation } from "./router";
import { preloadProfile } from "./serverProfile";
import { getViewCount } from "./views";

/**
 * Imported first by main.tsx. ES modules evaluate in import order, so this
 * starts the profile + view-count requests the moment the bundle runs, before
 * React, the router and the rest of the app have even been evaluated. The
 * profile page later joins these same requests instead of starting its own,
 * which removes the "mount → render → effect → fetch" waterfall that used to
 * sit in front of every link page.
 */
try {
  const handle = profileHandleFromLocation();
  if (handle) {
    preloadProfile(handle);
    void getViewCount(handle);
  }
} catch {
  /* Warming is an optimisation only. */
}
