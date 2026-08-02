import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { layout, indexPage, postPage } from "./templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "posts");
const APPS_DIR = join(ROOT, "apps");
const DIST_DIR = join(ROOT, "dist");

// 미니 웹앱 포트폴리오 목록. 각 앱은 /apps/{path}/index.html에 자체 완결된 형태로 존재한다.
const apps = [
  {
    name: "2048",
    path: "2048",
    description: "방향키로 숫자 타일을 밀어 합치는 퍼즐 게임",
  },
];

// spec.md, review.md 등 계획/검토 문서는 정적 사이트에 노출하지 않는다.
function copyDirRecursive(src, dest, { skipExt = [] } = {}) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, { skipExt });
    } else if (!skipExt.includes(extname(entry.name))) {
      copyFileSync(srcPath, destPath);
    }
  }
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    data[key] = value;
  }
  return { data, content: match[2] };
}

function loadPosts() {
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = readFileSync(join(POSTS_DIR, file), "utf-8");
      const { data, content } = parseFrontmatter(raw);
      if (!data.title || !data.date) {
        throw new Error(`${file}: frontmatter에 title/date가 필요합니다`);
      }
      return {
        slug,
        title: data.title,
        date: data.date,
        contentHtml: marked.parse(content),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function build() {
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(join(DIST_DIR, "posts"), { recursive: true });

  const posts = loadPosts();

  writeFileSync(
    join(DIST_DIR, "index.html"),
    layout({ title: "My Blog", base: "", bodyHtml: indexPage(posts, apps) })
  );

  for (const post of posts) {
    writeFileSync(
      join(DIST_DIR, "posts", `${post.slug}.html`),
      layout({ title: post.title, base: "../", bodyHtml: postPage(post) })
    );
  }

  copyFileSync(join(__dirname, "styles.css"), join(DIST_DIR, "styles.css"));
  copyFileSync(join(__dirname, "site.js"), join(DIST_DIR, "site.js"));

  if (existsSync(APPS_DIR)) {
    copyDirRecursive(APPS_DIR, join(DIST_DIR, "apps"), { skipExt: [".md"] });
  }

  console.log(`빌드 완료: 글 ${posts.length}개, 앱 ${apps.length}개 -> dist/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build();
}
