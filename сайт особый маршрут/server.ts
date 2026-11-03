import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT = __dirname;
const CONTENT_JS = path.join(ROOT, 'assets', 'data', 'content.js');
const MEDIA_DIR = path.join(ROOT, 'media');
const BACKUP_DIR = path.join(ROOT, '.backups');

const HEADER = `/* =========================================================
   Весь контент сайта. Этот файл переписывает админка —
   вручную править его не нужно, но можно.
   Формат: обычный JS-файл, чтобы сайт открывался и без сервера.
   ========================================================= */
window.SITE_CONTENT = `;

const ALLOWED_EXT: Record<string, string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'],
  video: ['.mp4', '.webm', '.ogv', '.mov', '.m4v'],
  pdf: ['.pdf'],
  media: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.mp4', '.webm', '.ogv', '.mov', '.m4v']
};

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'yu', я: 'ya'
};

function slugify(name: string): { base: string; ext: string } {
  const ext = path.extname(name).toLowerCase();
  const rawBase = path.basename(name, ext);
  const normalized = rawBase.normalize('NFKC').toLowerCase();
  const out: string[] = [];
  for (const ch of normalized) {
    if (TRANSLIT[ch]) {
      out.push(TRANSLIT[ch]);
    } else if (/[a-z0-9]/i.test(ch)) {
      out.push(ch);
    } else {
      out.push('-');
    }
  }
  const base = out.join('').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  return { base, ext };
}

function readContent(): any {
  if (!fs.existsSync(CONTENT_JS)) {
    throw new Error('Файл content.js не найден');
  }
  const text = fs.readFileSync(CONTENT_JS, 'utf-8');
  const start = text.indexOf('{', text.indexOf('SITE_CONTENT'));
  const end = text.lastIndexOf('}');
  return JSON.parse(text.substring(start, end + 1));
}

function writeContent(data: any): void {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (fs.existsSync(CONTENT_JS)) {
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    fs.copyFileSync(CONTENT_JS, path.join(BACKUP_DIR, `content-${stamp}.js`));
    const backups = fs.readdirSync(BACKUP_DIR).sort();
    for (const old of backups.slice(0, Math.max(0, backups.length - 30))) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, old));
      } catch {}
    }
  }

  fs.mkdirSync(path.dirname(CONTENT_JS), { recursive: true });
  const body = HEADER + JSON.stringify(data, null, 2) + ';\n';
  const tmp = CONTENT_JS + '.tmp';
  fs.writeFileSync(tmp, body, 'utf-8');
  fs.renameSync(tmp, CONTENT_JS);
}

function getSafeMediaPath(relPath: string): string | null {
  const clean = decodeURIComponent(relPath || '').replace(/\\/g, '/');
  if (!clean.startsWith('media/')) return null;
  const full = path.resolve(ROOT, clean);
  const mediaResolved = path.resolve(MEDIA_DIR);
  if (!full.startsWith(mediaResolved)) return null;
  return full;
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '200mb', type: '*/*' }));

// Ensure directories exist
fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// API Endpoints
app.get('/api/content', (_req, res) => {
  try {
    const content = readContent();
    res.json({ ok: true, content });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Не удалось прочитать content.js: ' + err.message });
  }
});

app.post('/api/content', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'Ожидался объект с контентом' });
    }
    writeContent(data);
    const time = new Date().toLocaleTimeString('ru-RU');
    res.json({ ok: true, savedAt: time });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Ошибка сохранения: ' + err.message });
  }
});

app.get('/api/media', (_req, res) => {
  try {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const items = fs.readdirSync(MEDIA_DIR).sort();
    const files = items
      .filter(name => fs.statSync(path.join(MEDIA_DIR, name)).isFile())
      .map(name => ({
        file: 'media/' + name,
        size: fs.statSync(path.join(MEDIA_DIR, name)).size
      }));
    res.json({ ok: true, files });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Ошибка получения медиа: ' + err.message });
  }
});

app.post('/api/upload', (req, res) => {
  try {
    const kind = ((req.query.kind as string) || 'image').toLowerCase();
    const rawFilename = decodeURIComponent((req.headers['x-filename'] as string) || 'file');
    const { base, ext } = slugify(path.basename(rawFilename));
    const allowed = ALLOWED_EXT[kind] || ALLOWED_EXT.media;
    if (!allowed.includes(ext)) {
      return res.status(400).json({
        ok: false,
        error: `Такой формат сюда загрузить нельзя. Допустимо: ${allowed.join(', ')}`
      });
    }

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ ok: false, error: 'Пустой файл' });
    }

    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    let name = base + ext;
    if (fs.existsSync(path.join(MEDIA_DIR, name))) {
      const stamp = Date.now().toString().slice(-6);
      name = `${base}-${stamp}${ext}`;
    }

    fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
    res.json({ ok: true, file: 'media/' + name, size: buffer.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Ошибка загрузки: ' + err.message });
  }
});

app.post('/api/delete-media', (req, res) => {
  try {
    const filePath = req.body?.file;
    const full = getSafeMediaPath(filePath);
    if (!full) {
      return res.status(400).json({ ok: false, error: 'Можно удалять только файлы из папки media' });
    }
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Ошибка удаления: ' + err.message });
  }
});

// Admin panel routes (no redirects to avoid infinite redirect loops)
app.get(['/admin', '/admin/', '/admin/index.html', '/admin.html'], (_req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

// Download site archive
app.get(['/site.zip', '/download'], (_req, res) => {
  const zipPath = path.join(ROOT, 'site.zip');
  if (fs.existsSync(zipPath)) {
    res.download(zipPath, 'osobyi-marshrut-site.zip');
  } else {
    res.status(404).send('Archive not found');
  }
});

// Static assets
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.use('/assets', express.static(path.join(ROOT, 'assets')));
app.use('/media', express.static(path.join(ROOT, 'media')));

// HTML Pages
const pages = [
  'index.html',
  'metody.html',
  'resursy.html',
  'psiholog.html',
  'logoped.html',
  'defektolog.html',
  'tetradi.html',
  'galereya.html',
  'otzyvy.html'
];

for (const p of pages) {
  const route = '/' + p;
  app.get(route, (_req, res) => {
    res.sendFile(path.join(ROOT, p));
  });
}

// Root page
app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// Fallback to static root
app.use(express.static(ROOT));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Site: http://localhost:${PORT}/`);
  console.log(`Admin: http://localhost:${PORT}/admin/`);
});
