/* Real language and tool logos are bundled locally so skills never depend on an external icon CDN. */

export type Tech = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export const TECH_STACK: Tech[] = [
  {id:"lua",name:"Lua",slug:"lua",color:"#7777ff"},
  {id:"luau",name:"Luau",slug:"luau",color:"#00a2ff"},
  {id:"c",name:"C",slug:"c",color:"#a8b9cc"},
  {id:"r",name:"R",slug:"r",color:"#276dc3"},
  {id:"elixir",name:"Elixir",slug:"elixir",color:"#9b7fbd"},
  {id:"haskell",name:"Haskell",slug:"haskell",color:"#a58cb3"},
  {id:"scala",name:"Scala",slug:"scala",color:"#dc322f"},
  {id:"perl",name:"Perl",slug:"perl",color:"#74a8c4"},
  {id:"bash",name:"Bash",slug:"gnubash",color:"#4eaa25"},
  {id:"roblox",name:"Roblox Studio",slug:"robloxstudio",color:"#00a2ff"},
  {id:"blender",name:"Blender",slug:"blender",color:"#f5792a"},
  {id:"godot",name:"Godot",slug:"godotengine",color:"#478cbf"},
  {id:"unity3d",name:"Unity 3D",slug:"unity",color:"#ffffff"},
  {id:"express",name:"Express",slug:"express",color:"#ffffff"},
  {id:"fastapi",name:"FastAPI",slug:"fastapi",color:"#009688"},
  {id:"django",name:"Django",slug:"django",color:"#44b78b"},
  {id:"flask",name:"Flask",slug:"flask",color:"#ffffff"},
  {id:"graphql",name:"GraphQL",slug:"graphql",color:"#e10098"},
  {id:"prisma",name:"Prisma",slug:"prisma",color:"#5a67d8"},
  {id:"nginx",name:"NGINX",slug:"nginx",color:"#009639"},
  {id:"linux",name:"Linux",slug:"linux",color:"#fcc624"},
  {id:"vite",name:"Vite",slug:"vite",color:"#a46fff"},
  {id:"vitest",name:"Vitest",slug:"vitest",color:"#6e9f18"},
  {id:"jest",name:"Jest",slug:"jest",color:"#c21325"},
  {id:"photoshop",name:"Photoshop",slug:"adobephotoshop",color:"#31a8ff"},
  {id:"aftereffects",name:"After Effects",slug:"adobeaftereffects",color:"#9999ff"},
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
  { id: "discordjs", name: "Discord.js", slug: "discorddotjs", color: "#5865f2" },
  { id: "electron", name: "Electron", slug: "electron", color: "#47848f" },
];

export const TECH_BY_ID = new Map(TECH_STACK.map((tech) => [tech.id, tech]));

export function techIconUrl(tech: Tech): string {
  return `/skills/${tech.id}.svg`;
}

export function techCategory(id:string):string{
 if(["lua","luau","c","r","elixir","haskell","scala","perl","bash","typescript","javascript","python","rust","go","java","cpp","csharp","php","ruby","swift","kotlin","dart"].includes(id))return "Languages";
 if(["react","nextjs","vue","svelte","astro","flutter","tailwind","html","css","sass","vite"].includes(id))return "Frontend";
 if(["node","bun","deno","postgres","mysql","sqlite","mongodb","redis","supabase","firebase","express","fastapi","django","flask","graphql","prisma","nginx"].includes(id))return "Backend & data";
 return "Tools & platforms";
}
