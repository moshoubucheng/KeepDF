import { useState, useEffect, useCallback } from 'react';

interface StatsRow {
  date: string;
  path: string;
  pv: number;
  uv: number;
  uses: number;
}

interface StatsResponse {
  range: number;
  since: string;
  data: StatsRow[];
}

interface ToolAgg {
  path: string;
  pv: number;
  uv: number;
  uses: number;
}

interface CategoryGroup {
  category: string;
  tools: ToolAgg[];
  pv: number;
  uv: number;
  uses: number;
}

const RANGES = [7, 30, 90] as const;

export default function StatsDashboard() {
  const [key, setKey] = useState(() => localStorage.getItem('stats_key') || '');
  const [authed, setAuthed] = useState(false);
  const [range, setRange] = useState<number>(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async (k: string, r: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stats?key=${encodeURIComponent(k)}&range=${r}`);
      if (res.status === 403) {
        setAuthed(false);
        setError('Invalid key');
        localStorage.removeItem('stats_key');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: StatsResponse = await res.json();
      setData(json);
      setAuthed(true);
      localStorage.setItem('stats_key', k);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) fetchStats(key.trim(), range);
  };

  useEffect(() => {
    if (authed && key) fetchStats(key, range);
  }, [range]);

  // Auto-login if key is stored
  useEffect(() => {
    if (key && !authed) fetchStats(key, range);
  }, []);

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm py-20">
        <form onSubmit={handleLogin} className="rounded-xl border border-edge bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-fg">Stats Dashboard</h2>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter stats key"
            className="mb-3 w-full rounded-lg border border-edge-input bg-page px-3 py-2 text-fg placeholder:text-fg-faint focus:border-brand-500 focus:outline-none"
          />
          {error && <p className="mb-3 text-sm text-error-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'View Stats'}
          </button>
        </form>
      </div>
    );
  }

  // Aggregate per-tool
  const toolMap = new Map<string, ToolAgg>();
  for (const row of data?.data || []) {
    const existing = toolMap.get(row.path);
    if (existing) {
      existing.pv += row.pv;
      existing.uv += row.uv;
      existing.uses += row.uses;
    } else {
      toolMap.set(row.path, { path: row.path, pv: row.pv, uv: row.uv, uses: row.uses });
    }
  }
  const tools = [...toolMap.values()].sort((a, b) => b.uv - a.uv);

  // Totals
  const totalPv = tools.reduce((s, t) => s + t.pv, 0);
  const totalUv = tools.reduce((s, t) => s + t.uv, 0);
  const totalUses = tools.reduce((s, t) => s + t.uses, 0);

  // Group by category
  const catMap = new Map<string, CategoryGroup>();
  for (const tool of tools) {
    const parts = tool.path.split('/');
    const cat = parts[1] || 'other';
    const existing = catMap.get(cat);
    if (existing) {
      existing.tools.push(tool);
      existing.pv += tool.pv;
      existing.uv += tool.uv;
      existing.uses += tool.uses;
    } else {
      catMap.set(cat, { category: cat, tools: [tool], pv: tool.pv, uv: tool.uv, uses: tool.uses });
    }
  }
  const categories = [...catMap.values()].sort((a, b) => b.uv - a.uv);

  const maxUv = Math.max(...tools.map((t) => t.uv), 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-fg">Stats Dashboard</h1>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                range === r
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface text-fg-sec hover:bg-hover-strong border border-edge'
              }`}
            >
              {r}d
            </button>
          ))}
          {loading && <span className="text-sm text-fg-muted">Loading...</span>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Page Views', value: totalPv },
          { label: 'Unique Visitors', value: totalUv },
          { label: 'Tool Uses', value: totalUses },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-edge bg-surface p-4">
            <div className="text-sm text-fg-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-fg">{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Per-category tables */}
      {categories.map((group) => (
        <div key={group.category} className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold capitalize text-fg">{group.category}</h2>
            <span className="text-sm text-fg-muted">
              PV {group.pv.toLocaleString()} / UV {group.uv.toLocaleString()} / Uses{' '}
              {group.uses.toLocaleString()}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-edge bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-fg-muted">
                  <th className="px-4 py-2 font-medium">Tool</th>
                  <th className="px-4 py-2 text-right font-medium">PV</th>
                  <th className="px-4 py-2 text-right font-medium">UV</th>
                  <th className="px-4 py-2 text-right font-medium">Uses</th>
                  <th className="w-1/3 px-4 py-2 font-medium">UV</th>
                </tr>
              </thead>
              <tbody>
                {group.tools.map((tool) => (
                  <tr key={tool.path} className="border-b border-edge-soft last:border-0">
                    <td className="px-4 py-2 font-mono text-fg-sec">{tool.path}</td>
                    <td className="px-4 py-2 text-right text-fg">{tool.pv.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-fg">{tool.uv.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-fg">{tool.uses.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <div className="h-4 rounded-full bg-inset">
                        <div
                          className="h-4 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(tool.uv / maxUv) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {tools.length === 0 && !loading && (
        <p className="py-12 text-center text-fg-muted">No data for this period.</p>
      )}
    </div>
  );
}
