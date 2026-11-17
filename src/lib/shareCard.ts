export type ShareCardStyle = "hero" | "text";

export type ShareCardInput = {
  style: ShareCardStyle;
  title: string;
  description: string;
  name: string;
  handle: string;
  accent: string;
  avatarUrl: string;
  backgroundUrl: string;
  backgroundStyle: string;
  backgroundFrom: string;
  backgroundTo: string;
};

const W = 1200;
const H = 630;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawBackground(ctx: CanvasRenderingContext2D, input: ShareCardInput, backgroundImage: HTMLImageElement | null) {
  if (backgroundImage) {
    ctx.save();
    if (input.backgroundStyle === "video") ctx.filter = "blur(16px) brightness(.58)";
    else ctx.filter = "brightness(.72)";
    drawCover(ctx, backgroundImage, W, H);
    ctx.restore();
  } else {
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, input.backgroundFrom || "#1b1d24");
    gradient.addColorStop(1, input.backgroundTo || "#08090c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(7, 8, 11, .08)");
  shade.addColorStop(0.55, "rgba(7, 8, 11, .5)");
  shade.addColorStop(1, "rgba(7, 8, 11, .94)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
}

function drawCircleAvatar(ctx: CanvasRenderingContext2D, avatar: HTMLImageElement | null, x: number, y: number, radius: number, accent: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(18, 20, 26, .92)";
  ctx.fill();
  ctx.clip();
  if (avatar) drawCover(ctx, avatar, radius * 2, radius * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.stroke();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function drawHero(ctx: CanvasRenderingContext2D, input: ShareCardInput, avatar: HTMLImageElement | null, background: HTMLImageElement | null) {
  drawBackground(ctx, input, background);
  const cx = W / 2;
  const avatarY = 230;
  drawCircleAvatar(ctx, avatar, cx, avatarY, 102, input.accent);
  let cursor = 355;
  if (input.title) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f8fb";
    ctx.font = "600 42px Outfit, Inter, sans-serif";
    ctx.fillText(input.title, cx, cursor, 900);
    cursor += 48;
  }
  if (input.description) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(236, 239, 245, .82)";
    ctx.font = "400 27px Outfit, Inter, sans-serif";
    for (const line of wrapText(ctx, input.description, 790)) {
      ctx.fillText(line, cx, cursor);
      cursor += 35;
    }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(236, 239, 245, .58)";
  ctx.font = "500 22px Outfit, Inter, sans-serif";
  ctx.fillText(`tourn.lol/${input.handle}`, cx, H - 52, 700);
}

function drawTextBox(ctx: CanvasRenderingContext2D, input: ShareCardInput) {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#111319");
  gradient.addColorStop(0.55, "#0b0c10");
  gradient.addColorStop(1, "#181a21");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const panelW = 780;
  const panelH = 330;
  const x = (W - panelW) / 2;
  const y = (H - panelH) / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, .55)";
  ctx.shadowBlur = 50;
  roundedRect(ctx, x, y, panelW, panelH, 24);
  ctx.fillStyle = "rgba(25, 27, 34, .92)";
  ctx.fill();
  ctx.restore();
  roundedRect(ctx, x, y, panelW, panelH, 24);
  ctx.strokeStyle = input.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  let cursor = y + 92;
  ctx.textAlign = "left";
  if (input.title) {
    ctx.fillStyle = "#f7f8fb";
    ctx.font = "600 38px Outfit, Inter, sans-serif";
    for (const line of wrapText(ctx, input.title, panelW - 120)) {
      ctx.fillText(line, x + 60, cursor);
      cursor += 44;
    }
  }
  if (input.description) {
    ctx.fillStyle = "rgba(236, 239, 245, .76)";
    ctx.font = "400 25px Outfit, Inter, sans-serif";
    cursor += 8;
    for (const line of wrapText(ctx, input.description, panelW - 120)) {
      ctx.fillText(line, x + 60, cursor);
      cursor += 34;
    }
  }
  ctx.fillStyle = "rgba(236, 239, 245, .48)";
  ctx.font = "500 20px Outfit, Inter, sans-serif";
  ctx.fillText(`tourn.lol/${input.handle}`, x + 60, y + panelH - 44, panelW - 120);
}

/** Compose a public 1200x630 share image from the profile's own artwork. */
export async function renderShareCard(input: ShareCardInput): Promise<string> {
  const avatar = await loadImage(input.avatarUrl);
  const backgroundSource =
    input.backgroundStyle === "video"
      ? input.avatarUrl
      : input.backgroundStyle === "image"
        ? input.backgroundUrl
        : "";
  const background = await loadImage(backgroundSource);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create a share image.");
  if (input.style === "text") drawTextBox(ctx, input);
  else drawHero(ctx, input, avatar, background);
  return canvas.toDataURL("image/jpeg", 0.9);
}
