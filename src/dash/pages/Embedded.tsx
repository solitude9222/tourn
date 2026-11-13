/* ---------------------------------------------------------------------------
   Account Settings and Admin.

   These two consoles keep their existing, fully-wired feature code (claims,
   MFA, sessions, member management, invites) and live behind their own chunk so
   their stylesheets load only when the page is opened.
   --------------------------------------------------------------------------- */

import { AdminDashboard } from "../../components/AdminDashboard";
import { SettingsPage } from "../../components/SettingsPage";
import { DEFAULT_ABOUT_DESIGN } from "../../lib/about";
import { DEFAULT_WIDGET_DESIGN } from "../../lib/widgets";
import { useDash } from "../context";

export function AccountSettingsPage() {
  const { go, setAbout, setWidgets, notify } = useDash();

  // Resets appearance only: the bio, links, badges and every uploaded image
  // stay, so "reset" never costs someone their content.
  const resetToDefaults = () => {
    if (!window.confirm("Reset your card, widget style and effects to the defaults?")) return;
    setAbout((current) => ({
      ...current,
      design: { ...DEFAULT_ABOUT_DESIGN },
      assets: { ...current.assets, card: { ...current.assets.card, id: "none" } },
    }));
    setWidgets((current) => ({ ...current, design: { ...DEFAULT_WIDGET_DESIGN } }));
    notify("Reset to defaults", "Appearance restored — save to publish it.");
  };

  return (
    <div className="tw-legacy-embed">
      <SettingsPage
        onNavigate={(target) => {
          if (target === "about") go("account-profile");
          else if (target === "widgets") go("widgets");
          else go("links");
        }}
        onReset={resetToDefaults}
      />
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="tw-legacy-embed adm adm--embedded">
      <AdminDashboard embedded />
    </div>
  );
}
