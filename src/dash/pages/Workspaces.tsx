/* ---------------------------------------------------------------------------
   Portfolio and Profile workspaces.

   The sidebar's two big sections are groups of subtabs. Each subtab renders
   the editor that already owns that data, so the split is navigation, not a
   second copy of the same settings.
   --------------------------------------------------------------------------- */

import { Card, CardHead, EmptyState, Icon, type IconName } from "../ui";
import { useDash } from "../context";
import { AccountProfilePage } from "./Account";
import { CustomizeProfilePage } from "./Customize";
import { LayoutPage } from "./Layout";
import { AssetBrowserPage } from "./Community";
import { DesignPage } from "./Design";

export type PortfolioTab = "general" | "about" | "projects" | "gallery" | "audio" | "games" | "design";
export type ProfileWorkspaceTab =
  | "profile"
  | "appearance"
  | "experience"
  | "integrations"
  | "switches";

export const PORTFOLIO_TABS: { id: PortfolioTab; label: string; icon: IconName }[] = [
  { id: "general", label: "General", icon: "home" },
  { id: "about", label: "About", icon: "user" },
  { id: "projects", label: "Projects", icon: "layers" },
  { id: "gallery", label: "Gallery", icon: "image" },
  { id: "audio", label: "Audio player", icon: "music" },
  { id: "games", label: "Games", icon: "gamepad" },
  { id: "design", label: "Design", icon: "palette" },
];

export const PROFILE_TABS: { id: ProfileWorkspaceTab; label: string; icon: IconName }[] = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "experience", label: "Experience", icon: "sparkles" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "switches", label: "Switches", icon: "sliders" },
];

function GeneralPortfolio() {
  const { about, links, widgets, go } = useDash();
  const design = about.design;
  const rows: { label: string; value: string; tab: PortfolioTab }[] = [
    { label: "Sections", value: `${design.sections.length} / 24`, tab: "projects" },
    { label: "Slideshow", value: design.slideshow ? "On" : "Off", tab: "projects" },
    { label: "Social links", value: String(links.links.filter((link) => link.visible).length), tab: "general" },
    { label: "Widgets", value: String(widgets.widgets.filter((widget) => widget.visible !== false).length), tab: "general" },
  ];

  return (
    <>
      <Card>
        <CardHead
          icon="layers"
          title="Portfolio"
          subtitle="Everything your page shows around the profile card: the writing, the projects, the gallery and how they are styled."
        />
        <div className="tw-portfolio-grid">
          {rows.map((row) => (
            <div className="tw-portfolio-stat" key={row.label}>
              <b>{row.value}</b>
              <small>{row.label}</small>
            </div>
          ))}
        </div>
        <p className="tw-foot-note">
          Pick a subtab to edit a piece of it. Design holds the shared surface and pill styles, so
          the About block and every project card can match without repeating yourself.
        </p>
      </Card>

      <Card>
        <CardHead icon="sparkles" title="Jump back in" subtitle="The three things people change most." />
        <div className="tw-row">
          <button type="button" className="tw-quick-link" onClick={() => go("portfolio-projects")}>
            <Icon name="layers" size={15} /> Edit projects
          </button>
          <button type="button" className="tw-quick-link" onClick={() => go("portfolio-design")}>
            <Icon name="palette" size={15} /> Style every surface
          </button>
          <button type="button" className="tw-quick-link" onClick={() => go("portfolio-gallery")}>
            <Icon name="image" size={15} /> Open the gallery
          </button>
        </div>
      </Card>
    </>
  );
}

export function PortfolioPage({ tab }: { tab: PortfolioTab }) {
  switch (tab) {
    case "about":
      return <CustomizeProfilePage tab="profile" />;
    case "projects":
      return <LayoutPage />;
    case "gallery":
      return <AssetBrowserPage />;
    case "audio":
      return <CustomizeProfilePage tab="integrations" />;
    case "games":
      return (
        <Card>
          <CardHead
            icon="gamepad"
            title="Games"
            subtitle="The games you play, shown as their own cards on the page."
          />
          <EmptyState
            icon="gamepad"
            title="No games yet"
            message="Games use the same section system as projects: add an Interests section and pick the games from the library."
            action={
              <button type="button" className="tw-btn tw-btn--primary" onClick={() => (window.location.hash = "#/dashboard/portfolio-projects")}>
                Add a section
              </button>
            }
          />
        </Card>
      );
    case "design":
      return <DesignPage />;
    default:
      return <GeneralPortfolio />;
  }
}

export function ProfileWorkspacePage({ tab }: { tab: ProfileWorkspaceTab }) {
  switch (tab) {
    case "appearance":
      return <CustomizeProfilePage tab="profile" />;
    case "experience":
      return <CustomizeProfilePage tab="experience" />;
    case "integrations":
      return <CustomizeProfilePage tab="integrations" />;
    case "switches":
      return <CustomizeProfilePage tab="switches" />;
    default:
      return <AccountProfilePage />;
  }
}
