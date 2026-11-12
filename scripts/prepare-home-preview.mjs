import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = (process.env.HOME_PREVIEW_API || "https://tourn-production.up.railway.app").replace(/\/$/, "");
const output = new URL("../src/generated/homePreview.json", import.meta.url);
const assetDir = new URL("../public/home-preview-assets/", import.meta.url);

const get = async (path) => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.json();
};

const handlesFrom = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => String(row?.username || "").trim())
    .filter(Boolean)
    .slice(0, 3);

try {
  let data = null;
  try {
    data = await get("/api/home-preview");
  } catch {
    /* Older backends do not have the route yet — build the pool below. */
  }

  if (!data || !Array.isArray(data.profiles) || data.profiles.length === 0) {
    const board = await get("/api/leaderboard").catch(() => ({ profiles: [] }));
    const handles = [...new Set(["koni", ...handlesFrom(board.profiles)])];
    const profiles = (
      await Promise.all(
        handles.map(async (handle) => {
          try {
            return await get("/api/profile/" + encodeURIComponent(handle));
          } catch {
            return null;
          }
        }),
      )
    ).filter((row) => row?.account?.username && row.profile);
    data = { mode: data?.mode || "random", profiles, topHandles: handles };
  }

  data.mode = data.mode === "top3" ? "random" : ["off", "koni", "random"].includes(data.mode) ? data.mode : "random";
  data.topHandles = [...new Set(["koni", ...(data.topHandles || [])])].slice(0, 4);

  // The hero is silent and has no page background. Do not bundle those media files.
  for (const row of data.profiles || []) {
    const assets = row.profile?.about?.assets;
    if (!assets) continue;
    if (assets.audio) assets.audio = { ...assets.audio, fileUrl: "", lyrics: "", coverUrl: "" };
    if (assets.background) assets.background = { ...assets.background, imageUrl: "", videoUrl: "" };
    if (assets.cursor) assets.cursor = { ...assets.cursor, imageUrl: "" };
    if (assets.effects?.overlay) assets.effects.overlay = { ...assets.effects.overlay, imageUrl: "" };
  }

  if (data.mode !== "off" && !(data.profiles || []).length) throw new Error("No published preview profiles");

  await mkdir(assetDir, { recursive: true });

  async function externalize(value) {
    if (typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
      const [meta, encoded] = value.split(",");
      const ext = meta.includes("svg") ? "svg" : meta.includes("png") ? "png" : meta.includes("gif") ? "gif" : meta.includes("webp") ? "webp" : "jpg";
      const name = createHash("sha256").update(value).digest("hex").slice(0, 20) + "." + ext;
      await writeFile(new URL(name, assetDir), Buffer.from(encoded, "base64"));
      return "/home-preview-assets/" + name;
    }
    if (Array.isArray(value)) return Promise.all(value.map(externalize));
    if (value && typeof value === "object") {
      return Object.fromEntries(
        await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await externalize(item)])),
      );
    }
    return value;
  }

  data = await externalize(data);
  await writeFile(output, JSON.stringify(data));
  console.log(
    `Prepared instant home previews (${data.mode}): ${(data.profiles || []).map((row) => row.account.username).join(", ") || "none"}`,
  );
} catch (error) {
  try {
    await readFile(output);
    console.log("Kept existing home preview snapshot:", error.message);
  } catch {
    await writeFile(output, JSON.stringify({ mode: "random", profiles: [], topHandles: [] }));
  }
}
