/* Real tech-stack badges. Icons come from the Simple Icons CDN by slug, so a
   project can show the genuine logo for each language or tool instead of a
   coloured initial. */

export type Tech = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export const TECH_STACK: Tech[] = [
  { id: "typescript", name: "TypeScript", slug: "typescript", color: "#3178c6" },
  { id: "javascript", name: "JavaScript", slug: "javascript", color: "#f7df1e" },
  { id: "react", name: "React", slug: "react", color: "#61dafb" },
  { id: "nextjs", name: "Next.js", slug: "nextdotjs", color: "#ffffff" },
  { id: "vue", name: "Vue", slug: "vuedotjs", color: "#4fc08d" },
  { id: "svelte", name: "Svelte", slug: "svelte", color: "#ff3e00" },
  { id: "astro", name: "Astro", slug: "astro", color: "#bc52ee" },
  { id: "node", name: "Node.js", slug: "nodedotjs", color: "#5fa04e" },
  { id: "bun", name: "Bun", slug: "bun", color: "#fbf0df" },
  { id: "deno", name: "Deno", slug: "deno", color: "#ffffff" },
  { id: "python", name: "Python", slug: "python", color: "#3776ab" },
  { id: "rust", name: "Rust", slug: "rust", color: "#ffffff" },
  { id: "go", name: "Go", slug: "go", color: "#00add8" },
  { id: "java", name: "Java", slug: "openjdk", color: "#ffffff" },
  { id: "cpp", name: "C++", slug: "cplusplus", color: "#00599c" },
  { id: "csharp", name: "C#", slug: "dotnet", color: "#512bd4" },
  { id: "php", name: "PHP", slug: "php", color: "#777bb4" },
  { id: "ruby", name: "Ruby", slug: "ruby", color: "#cc342d" },
  { id: "swift", name: "Swift", slug: "swift", color: "#f05138" },
  { id: "kotlin", name: "Kotlin", slug: "kotlin", color: "#7f52ff" },
  { id: "dart", name: "Dart", slug: "dart", color: "#0175c2" },
  { id: "flutter", name: "Flutter", slug: "flutter", color: "#02569b" },
  { id: "tailwind", name: "Tailwind", slug: "tailwindcss", color: "#06b6d4" },
  { id: "html", name: "HTML5", slug: "html5", color: "#e34f26" },
  { id: "css", name: "CSS3", slug: "css3", color: "#1572b6" },
  { id: "sass", name: "Sass", slug: "sass", color: "#cc6699" },
  { id: "postgres", name: "PostgreSQL", slug: "postgresql", color: "#4169e1" },
  { id: "mysql", name: "MySQL", slug: "mysql", color: "#4479a1" },
  { id: "sqlite", name: "SQLite", slug: "sqlite", color: "#003b57" },
  { id: "mongodb", name: "MongoDB", slug: "mongodb", color: "#47a248" },
  { id: "redis", name: "Redis", slug: "redis", color: "#ff4438" },
  { id: "supabase", name: "Supabase", slug: "supabase", color: "#3fcf8e" },
  { id: "firebase", name: "Firebase", slug: "firebase", color: "#dd2c00" },
  { id: "docker", name: "Docker", slug: "docker", color: "#2496ed" },
  { id: "kubernetes", name: "Kubernetes", slug: "kubernetes", color: "#326ce5" },
  { id: "aws", name: "AWS", slug: "amazonwebservices", color: "#ff9900" },
  { id: "cloudflare", name: "Cloudflare", slug: "cloudflare", color: "#f38020" },
  { id: "vercel", name: "Vercel", slug: "vercel", color: "#ffffff" },
  { id: "git", name: "Git", slug: "git", color: "#f05032" },
  { id: "github", name: "GitHub", slug: "github", color: "#ffffff" },
  { id: "figma", name: "Figma", slug: "figma", color: "#f24e1e" },
  { id: "unity", name: "Unity", slug: "unity", color: "#ffffff" },
  { id: "unreal", name: "Unreal Engine", slug: "unrealengine", color: "#ffffff" },
  { id: "godot", name: "Godot", slug: "godotengine", color: "#478cbf" },
  { id: "lua", name: "Lua", slug: "lua", color: "#2c2d72" },
  { id: "discordjs", name: "Discord.js", slug: "discorddotjs", color: "#5865f2" },
  { id: "electron", name: "Electron", slug: "electron", color: "#47848f" },
  { id: "graphql", name: "GraphQL", slug: "graphql", color: "#e10098" },
  { id: "prisma", name: "Prisma", slug: "prisma", color: "#2d3748" },
  { id: "vite", name: "Vite", slug: "vite", color: "#646cff" },
];

export const TECH_BY_ID = new Map(TECH_STACK.map((tech) => [tech.id, tech]));

export function techIconUrl(tech: Tech): string {
  return `https://cdn.simpleicons.org/${tech.slug}/${tech.color.replace("#", "")}`;
}
