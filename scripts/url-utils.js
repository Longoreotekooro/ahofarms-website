// URL helpers shared by the metadata, sitemap and validation scripts.
// Files stay as .html in the repository; public URLs do not expose the
// extension because Vercel's cleanUrls option serves them extensionlessly.

function cleanPathForFile(file) {
  const normal = String(file).replace(/^\/+/, '').replace(/\\/g, '/');
  if (normal === 'index.html') return '/';
  if (normal.endsWith('/index.html')) return '/' + normal.slice(0, -'/index.html'.length);
  return '/' + normal.replace(/\.html$/, '');
}

function fileForCleanPath(value) {
  const path = String(value || '').split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/$/, '');
  if (!path) return 'index.html';
  return path.endsWith('.html') ? path : path + '.html';
}

module.exports = { cleanPathForFile, fileForCleanPath };
