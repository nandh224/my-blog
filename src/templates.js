function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// base: '' for pages at the site root, '../' for pages one level deep (posts/*.html)
export function layout({ title, base, bodyHtml }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${base}styles.css">
<script>
(function () {
  var saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
})();
</script>
</head>
<body>
<header class="site-header">
  <a class="site-title" href="${base}index.html">My Blog</a>
  <button id="theme-toggle" type="button" aria-label="테마 전환">🌓</button>
</header>
<main>
${bodyHtml}
</main>
<footer class="site-footer">
  <p>&copy; ${new Date().getFullYear()} My Blog</p>
</footer>
<script src="${base}site.js"></script>
</body>
</html>
`;
}

export function indexPage(posts, apps = []) {
  const items = posts
    .map(
      (p) => `  <li class="post-item">
    <a href="posts/${p.slug}.html">${escapeHtml(p.title)}</a>
    <time datetime="${p.date}">${formatDate(p.date)}</time>
  </li>`
    )
    .join("\n");

  return `<h1>글 목록</h1>
<ul class="post-list">
${items}
</ul>
${appsSection(apps)}`;
}

function appsSection(apps) {
  if (apps.length === 0) return "";

  const cards = apps
    .map(
      (app) => `  <li class="app-card">
    <a class="app-card-link" href="apps/${app.path}/index.html">
      <iframe class="app-card-preview" src="apps/${app.path}/index.html" title="${escapeHtml(app.name)} 미리보기" tabindex="-1" loading="lazy"></iframe>
      <div class="app-card-info">
        <h3>${escapeHtml(app.name)}</h3>
        <p>${escapeHtml(app.description)}</p>
      </div>
    </a>
  </li>`
    )
    .join("\n");

  return `<section class="apps-section">
  <h2>미니 웹앱</h2>
  <ul class="app-list">
${cards}
  </ul>
</section>`;
}

export function postPage(post) {
  return `<article>
  <h1>${escapeHtml(post.title)}</h1>
  <time datetime="${post.date}">${formatDate(post.date)}</time>
  <div class="post-content">
${post.contentHtml}
  </div>
</article>`;
}
