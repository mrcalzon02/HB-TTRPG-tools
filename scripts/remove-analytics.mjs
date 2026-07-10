import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const deleted = [];
const updated = [];

const deleteTargets = new Set([
  'site-analytics.js',
  'site-analytics-config.js',
  'visitor-analytics.html',
  'visitor-analytics.js',
  'visitor-analytics.css',
  'ANALYTICS_SETUP.md',
  'SEO_SEARCH_ACTIVATION.md'
]);

function relative(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function removeFile(file) {
  if (!fs.existsSync(file)) return;
  fs.rmSync(file, { force: true });
  deleted.push(relative(file));
}

function writeIfChanged(file, before, after) {
  if (before === after) return;
  fs.writeFileSync(file, after, 'utf8');
  updated.push(relative(file));
}

function cleanHtml(source) {
  let output = source;

  output = output.replace(/\s*<article\b[^>]*data-visitor-analytics-card=["']true["'][^>]*>[\s\S]*?<\/article>\s*/gi, '\n');
  output = output.replace(/\s*<a\b[^>]*href=["'](?:\.\/)?visitor-analytics\.html["'][^>]*>[\s\S]*?<\/a>\s*/gi, ' ');
  output = output.replace(/\s*<script\b[^>]*src=["'](?:\.\/)?site-analytics(?:-config)?\.js["'][^>]*><\/script>\s*/gi, '\n');
  output = output.replace(/\sdata-analytics-[\w-]+=(?:"[^"]*"|'[^']*')/gi, '');
  output = output.replace(/\s*<h3>\s*6\.\s*Aggregate Analytics and Privacy\s*<\/h3>\s*<p>[\s\S]*?<\/p>\s*<p>[\s\S]*?<\/p>/i, '');
  output = output.replace(/Visitor analytics and searchable tool indexing\.?/gi, 'Search indexing and stable workspace navigation.');
  output = output.replace(/Aggregate usage, engagement, tool popularity, devices, referrers, and operational health\.?/gi, '');

  return output;
}

function cleanJavaScript(source) {
  let output = source;

  output = output.replace(/^\s*document\.querySelectorAll\([^\n]*visitor-analytics[^\n]*\)\.forEach\([^\n]*\);\s*$/gmi, '');
  output = output.replace(/^\s*link\.dataset\.analytics(?:Tool|Label)\s*=.*;\s*$/gmi, '');
  output = output.replace(/entries\s*=\s*Array\.isArray\(data\)\s*\?\s*data\.filter\([\s\S]*?\)\s*:\s*\[\];/g, 'entries = Array.isArray(data) ? data : [];');
  output = output.replace(/\s*window\.HBAnalytics\??\.?(?:track)?\([\s\S]*?\);\s*/g, '\n');
  output = output.replace(/^.*dataset\.analytics(?:Tool|Label).*\n?/gmi, '');

  return output;
}

function cleanJson(file, source) {
  if (path.basename(file) !== 'search-index.json') return source;
  try {
    const data = JSON.parse(source);
    if (!Array.isArray(data)) return source;
    const filtered = data.filter(entry => entry?.id !== 'visitor-analytics' && entry?.url !== 'visitor-analytics.html');
    return `${JSON.stringify(filtered, null, 2)}\n`;
  } catch {
    return source;
  }
}

function cleanXml(source) {
  return source.replace(/\s*<url>\s*<loc>[^<]*visitor-analytics\.html<\/loc>[\s\S]*?<\/url>/gi, '');
}

function cleanMarkdown(source) {
  return source
    .split('\n')
    .filter(line => !/visitor-analytics|site-analytics|ANALYTICS_SETUP|analytics dashboard|live analytics collector/i.test(line))
    .join('\n');
}

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = path.join(directory, entry.name);
    const rel = relative(file);

    if (entry.isDirectory()) {
      visit(file);
      continue;
    }

    if (deleteTargets.has(rel) || deleteTargets.has(entry.name)) {
      removeFile(file);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!['.html', '.js', '.mjs', '.json', '.xml', '.md'].includes(extension)) continue;

    let source;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    let output = source;
    if (extension === '.html') output = cleanHtml(output);
    if (extension === '.js' || extension === '.mjs') output = cleanJavaScript(output);
    if (extension === '.json') output = cleanJson(file, output);
    if (extension === '.xml') output = cleanXml(output);
    if (extension === '.md') output = cleanMarkdown(output);

    writeIfChanged(file, source, output);
  }
}

visit(root);

console.log(`Analytics removal updated ${updated.length} files and deleted ${deleted.length} files.`);
for (const file of updated) console.log(`updated: ${file}`);
for (const file of deleted) console.log(`deleted: ${file}`);
