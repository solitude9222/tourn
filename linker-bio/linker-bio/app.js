const asset = p => (window.ASSETS && ASSETS[p]) || p;
const $ = s => document.querySelector(s);
const card = $("#card");
const P = PROFILE;

const avatar = size => `<div class="avatar" style="--s:${size}px;${P.avatar ? `background-image:url(${P.avatar})` : ""}"></div>`;
const badges = () => `<div class="badges">${P.badges.map(b => `<img src="${asset(`badges/${b}.svg`)}" alt="${b}" title="${b}">`).join("")}</div>`;
const socials = () => `<div class="socials">${P.socials.map(s => `<a href="${s.url}"><img src="${asset(`icons/${s.icon}.svg`)}" alt="${s.icon}"></a>`).join("")}</div>`;
const widgets = () => `<div class="widgets">${P.widgets.map(w => `
  <div class="widget">
    <div class="w-icon"></div>
    <div class="w-text">
      <b>${w.title}</b><span>${w.sub}</span>
      ${w.stats.length ? `<small>${w.stats.map(s => `<i>${s}</i>`).join("")}</small>` : ""}
    </div>
    <em>${w.platform}</em>
  </div>`).join("")}</div>`;
const views = () => `<div class="views">👁 ${P.views}</div>`;
const votes = () => `<div class="votes"><span data-v="likes">👍 ${P.likes}</span><span data-v="dislikes">👎 ${P.dislikes}</span></div>`;

const fmt = s => Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0");
const player = () => `
  <div class="player">
    <div class="art">♪</div>
    <div class="p-body">
      <div class="p-top"><div><b>${P.track.title}</b><span>Now playing</span></div>
        <button class="play" id="play" aria-label="play/pause">▶</button></div>
      <div class="p-bar"><small id="t-now">0:00</small><div class="bar"><div class="fill" id="fill"></div></div><small>${fmt(P.track.length)}</small></div>
    </div>
  </div>`;
let pos = 0, timer = null;
function togglePlay() {
  const btn = $("#play"); if (!btn) return;
  if (timer) { clearInterval(timer); timer = null; btn.textContent = "▶"; return; }
  btn.textContent = "❚❚";
  timer = setInterval(() => {
    pos = (pos + 1) % (P.track.length + 1);
    const f = $("#fill"), n = $("#t-now"); if (!f) return clearInterval(timer);
    f.style.width = (pos / P.track.length * 100) + "%"; n.textContent = fmt(pos);
  }, 1000);
}

const TEMPLATES = {
  left: () => `
    <div class="header">${avatar(120)}
      <div><div class="name-row"><h1>${P.name}</h1>${badges()}</div><p class="tag">${P.tagline}</p></div>
    </div>
    ${widgets()}${socials()}${views()}${votes()}`,
  stacked: () => `
    <section class="panel profile">
      <div class="header">${avatar(120)}
        <div><div class="name-row"><h1>${P.name}</h1>${badges()}</div>
          <p class="tag">${P.tagline}</p><p class="bio" id="bio"></p></div>
      </div>
      ${socials()}${views()}${votes()}
    </section>
    <section class="panel"><span class="label">Connections</span>${widgets()}</section>
    <section class="panel"><span class="label">Music</span>${player()}</section>
    <div class="foot"><span>📍 ${P.location}</span><span>👁 ${P.views}</span><span>${P.joined}</span></div>`,
  minimal: () => `
    <div class="header">${avatar(64)}
      <div><h1>${P.name}</h1><p class="tag">${P.tagline}</p></div>
    </div>
    ${badges()}${socials()}`
};

function typeBio() {
  const el = $("#bio"); if (!el) return;
  let i = 0; clearInterval(typeBio.t);
  typeBio.t = setInterval(() => {
    el.textContent = P.bio.slice(0, ++i) + (i < P.bio.length ? "|" : "");
    if (i >= P.bio.length) clearInterval(typeBio.t);
  }, 45);
}

function render(style) {
  clearInterval(timer); timer = null;
  if (!TEMPLATES[style]) style = "left";
  card.className = `card card--${style}`;
  card.innerHTML = TEMPLATES[style]();
  document.querySelectorAll("#switch button").forEach(b => b.classList.toggle("on", b.dataset.style === style));
  location.hash = style;
  typeBio();
}

$("#switch").addEventListener("click", e => { if (e.target.dataset.style) render(e.target.dataset.style); });
card.addEventListener("click", e => {
  if (e.target.closest("#play")) return togglePlay();
  const v = e.target.closest("[data-v]"); if (!v) return;
  const k = v.dataset.v; P[k]++; v.textContent = (k === "likes" ? "👍 " : "👎 ") + P[k];
});
// 3D tilt on hover
card.addEventListener("mousemove", e => {
  if (card.classList.contains("card--stacked")) return;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
});
card.addEventListener("mouseleave", () => card.style.transform = "");
render(location.hash.slice(1) || "left");
