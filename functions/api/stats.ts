interface Env {
  DB: D1Database;
  STATS_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const key = url.searchParams.get('key');
  if (!key || key !== env.STATS_KEY) {
    return new Response(null, { status: 403 });
  }

  const range = Math.min(parseInt(url.searchParams.get('range') || '30', 10) || 30, 365);
  const since = new Date();
  since.setDate(since.getDate() - range);
  const sinceStr = since.toISOString().slice(0, 10);

  const { results } = await env.DB.prepare(
    `SELECT date, path, pv, uv, uses
     FROM daily_stats
     WHERE date >= ?
     ORDER BY date DESC, path ASC`
  ).bind(sinceStr).all();

  return new Response(JSON.stringify({ range, since: sinceStr, data: results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
