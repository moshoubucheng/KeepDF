interface Env {
  DB: D1Database;
}

const VALID_PATHS = new Set([
  '/pdf/merge', '/pdf/split', '/pdf/compress', '/pdf/to-image',
  '/pdf/watermark', '/pdf/to-word', '/pdf/rotate', '/pdf/encrypt', '/pdf/decrypt',
  '/image/compress', '/image/convert', '/image/resize', '/image/crop',
  '/image/stitch', '/image/heic', '/image/to-pdf',
  '/doc/editor', '/doc/md-to-pdf', '/doc/word-count', '/doc/word-to-pdf',
]);

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { path?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { path, type } = body;
  if (!path || !type || !VALID_PATHS.has(path)) {
    return new Response(null, { status: 400 });
  }
  if (type !== 'pageview' && type !== 'usage') {
    return new Response(null, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const ua = request.headers.get('User-Agent') || '';
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const visitorHash = await sha256(`${ip}${ua}${date}`);

  const db = env.DB;

  if (type === 'pageview') {
    // Check if this visitor already seen today for this path
    const existing = await db.prepare(
      'SELECT 1 FROM daily_visitors WHERE date = ? AND path = ? AND visitor_hash = ?'
    ).bind(date, path, visitorHash).first();

    const isNewVisitor = !existing;

    // Upsert daily_stats
    await db.prepare(
      `INSERT INTO daily_stats (date, path, pv, uv)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (date, path) DO UPDATE SET
         pv = pv + 1,
         uv = uv + ?`
    ).bind(date, path, isNewVisitor ? 1 : 0, isNewVisitor ? 1 : 0).run();

    // Record visitor (ignore if duplicate)
    if (isNewVisitor) {
      await db.prepare(
        'INSERT OR IGNORE INTO daily_visitors (date, path, visitor_hash) VALUES (?, ?, ?)'
      ).bind(date, path, visitorHash).run();
    }
  } else {
    // type === 'usage'
    await db.prepare(
      `INSERT INTO daily_stats (date, path, uses)
       VALUES (?, ?, 1)
       ON CONFLICT (date, path) DO UPDATE SET uses = uses + 1`
    ).bind(date, path).run();
  }

  return new Response(null, { status: 204 });
};
