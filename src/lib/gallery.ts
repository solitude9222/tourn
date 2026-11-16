export type GalleryItem = { id: string; url: string; caption: string; kind: "image" | "video" };
export type GallerySettings = { enabled: boolean; title: string; subtitle: string; layout: "grid" | "masonry" | "carousel" | "filmstrip"; columns: number; gap: number; radius: number; shape: "original" | "square" | "portrait"; captions: "always" | "hover" | "none"; zoom: boolean; lightbox: boolean; autoplay: boolean; items: GalleryItem[] };
export type PortfolioSettings = { snap: boolean; indicators: boolean; hint: boolean; hintText: string; hintAnimate: boolean; order: ("about" | "sections" | "gallery")[] };
export const DEFAULT_GALLERY: GallerySettings = { enabled: false, title: "Gallery", subtitle: "", layout: "grid", columns: 3, gap: 12, radius: 16, shape: "original", captions: "hover", zoom: true, lightbox: true, autoplay: false, items: [] };
export const DEFAULT_PORTFOLIO: PortfolioSettings = { snap: true, indicators: true, hint: true, hintText: "Scroll to portfolio", hintAnimate: true, order: ["about", "sections", "gallery"] };
const clamp = (value: unknown, fallback: number, min: number, max: number) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
const text = (value: unknown, fallback = "", max = 100) => typeof value === "string" ? value.slice(0,max) : fallback;
export function normalizeGallery(input: unknown): GallerySettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<GallerySettings>;
  const items = Array.isArray(raw.items) ? raw.items.filter(item => item && typeof item.url === "string" && /^(https?:\/\/|data:image\/|\/api\/media\/)/i.test(item.url)).slice(0,24).map((item,index) => ({id:text(item.id,`media-${index}`,80),url:text(item.url,"",2_500_000),caption:text(item.caption,"",300),kind:item.kind === "video" ? "video" as const : "image" as const})) : [];
  return { enabled:raw.enabled === true,title:text(raw.title,"Gallery"),subtitle:text(raw.subtitle,"",180),layout:["grid","masonry","carousel","filmstrip"].includes(raw.layout || "") ? raw.layout! : "grid",columns:Math.round(clamp(raw.columns,3,1,6)),gap:clamp(raw.gap,12,0,32),radius:clamp(raw.radius,16,0,40),shape:["square","portrait"].includes(raw.shape || "") ? raw.shape! : "original",captions:["always","none"].includes(raw.captions || "") ? raw.captions! : "hover",zoom:raw.zoom!==false,lightbox:raw.lightbox!==false,autoplay:raw.autoplay===true,items };
}
export function normalizePortfolio(input: unknown): PortfolioSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Partial<PortfolioSettings>;
  const order = Array.isArray(raw.order) ? raw.order.filter(item => ["about","sections","gallery"].includes(item)) : [];
  return { snap:raw.snap!==false,indicators:raw.indicators!==false,hint:raw.hint!==false,hintText:text(raw.hintText,"Scroll to portfolio",80),hintAnimate:raw.hintAnimate!==false,order:[...new Set([...order,...DEFAULT_PORTFOLIO.order])] };
}
