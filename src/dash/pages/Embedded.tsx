/* ---------------------------------------------------------------------------
   Account Settings and Admin.

   These two consoles keep their existing, fully-wired feature code (claims,
   MFA, sessions, member management, invites) and live behind their own chunk so
   their stylesheets load only when the page is opened.
   --------------------------------------------------------------------------- */

import { AdminDashboard } from "../../components/AdminDashboard";
import { SettingsPage } from "../../components/SettingsPage";
import { useDash } from "../context";

export function AccountSettingsPage() {
  const { go } = useDash();
  return (
    <div className="tw-legacy-embed">
      <SettingsPage
        onNavigate={(target) => {
          if (target === "about") go("account-profile");
          else if (target === "widgets") go("widgets");
          else go("links");
        }}
      />
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="tw-legacy-embed">
      <AdminDashboard embedded />
    </div>
  );
}
