import { useEffect, useState } from "react";
import { api } from "../lib/backend";
import { useDash } from "./context";
import { Button, Card, CardHead, EmptyState } from "./ui";

export type AnalyticsData = {
  total: number; periodViews: number;
  daily: { date: string; views: number }[];
  devices: { label: string; views: number }[];
  sources: { label: string; views: number }[];
  historySince: string | null;
};
const PERIODS = [
  { value: "24h", label: "Today" }, { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "all", label: "All time" },
];

export function ViewsChart({ daily, days = 7 }: { daily: AnalyticsData["daily"]; days?: number }) {
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  const values = new Map(daily.map((point) => [point.date, point.views]));
  const points: { date: string; views: number }[] = [];
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const key = date.toISOString().slice(0, 10); points.push({ date: key, views: values.get(key) || 0 });
  }
  const top = Math.max(1, ...points.map((point) => point.views));
  const max = Math.max(1, Math.ceil(top / 4) * 4);
  const x = (index: number) => points.length === 1 ? 336 : 40 + index * 590 / (points.length - 1);
  const y = (value: number) => 156 - (value / max) * 132;
  const coordinates = points.map((point, index) => `${x(index)},${y(point.views)}`).join(" ");
  const formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <svg className="tw-chart" viewBox="0 0 650 190" role="img" aria-label={`Daily profile views: ${points.map((p) => `${p.date}: ${p.views}`).join(", ")}`}>
      {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line className="tw-chart-grid" x1="40" x2="630" y1={y(max * ratio)} y2={y(max * ratio)} /><text x="30" y={y(max * ratio) + 4} textAnchor="end">{Math.round(max * ratio)}</text></g>)}
      <polygon points={`${x(0)},156 ${coordinates} ${x(points.length - 1)},156`} fill="rgba(121,161,247,.1)" />
      <polyline className="tw-chart-line" points={coordinates} />
      {points.map((point, index) => <g key={point.date}>
        <circle cx={x(index)} cy={y(point.views)} r={points.length > 40 ? 1.5 : 3} fill="#79a1f7"><title>{point.date}: {point.views} views</title></circle>
        {(index % Math.max(1, Math.ceil(points.length / 6)) === 0 || index === points.length - 1) && <text x={x(index)} y="180" textAnchor="middle">{formatter.format(new Date(point.date + "T00:00:00Z"))}</text>}
      </g>)}
    </svg>
  );
}

function Breakdown({ title, rows }: { title: string; rows: AnalyticsData["devices"] }) {
  const total = rows.reduce((sum, row) => sum + row.views, 0);
  return <div className="tw-stat-panel"><h3>{title}</h3>{rows.length ? <div className="tw-analytics-breakdown">{rows.map((row) => <div key={row.label}><div><span>{row.label}</span><b>{row.views.toLocaleString()} <small>({Math.round(row.views / total * 100)}%)</small></b></div><span className="tw-analytics-bar"><i style={{ width: `${row.views / total * 100}%` }} /></span></div>)}</div> : <EmptyState icon="chart" title="No recorded visits in this period" message="New visits will appear here after someone opens your public page." />}</div>;
}

export function AnalyticsPanel({ compact = false }: { compact?: boolean }) {
  const { user, go } = useDash();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    const load = async () => {
      const result = await api<AnalyticsData>(`/api/analytics?period=${period}`);
      if (!active) return;
      if (result.ok && Array.isArray(result.data.daily) && Array.isArray(result.data.devices) && Array.isArray(result.data.sources)) { setData(result.data); setError(""); }
      else setError(result.ok ? "Analytics returned an incomplete response." : result.error);
    };
    void load();
    const visible = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(visible, 30_000);
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [user.id, period, attempt]);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const days = period === "all" ? Math.max(1, data?.daily[0] ? Math.round((today.getTime() - Date.parse(data.daily[0].date)) / 86400000) + 1 : 7) : ({ "24h": 1, "3d": 3, "7d": 7, "30d": 30 }[period] || 7);
  return <Card>
    <CardHead icon="chart" title={compact ? "Profile Statistics" : "Profile Analytics"} subtitle="Recorded daily visitors, devices and traffic sources. Days use UTC." actions={compact ? <Button onClick={() => go("analytics")} trailingIcon="arrow-right">View analytics</Button> : undefined} />
    <div className="tw-periods tw-analytics-periods" aria-label="Analytics period">{PERIODS.map((entry) => <button key={entry.value} type="button" className={`tw-period${period === entry.value ? " is-active" : ""}`} aria-pressed={period === entry.value} onClick={() => setPeriod(entry.value)}>{entry.label}</button>)}</div>
    {error ? <div className="tw-analytics-error" role="alert"><p>{error}</p><Button icon="refresh" onClick={() => setAttempt((n) => n + 1)}>Retry analytics</Button></div> : !data ? <p className="tw-chart-note" role="status">Loading analytics…</p> : <>
      <div className="tw-analytics-totals"><span><b>{data.periodViews.toLocaleString()}</b> recorded visits in this period</span><span><b>{data.total.toLocaleString()}</b> lifetime views</span></div>
      <ViewsChart daily={data.daily} days={days} />
      <p className="tw-chart-note">{data.historySince ? `Daily history available since ${data.historySince}.` : "Daily history begins with the first recorded visit."} Older lifetime views are kept; their dates and sources cannot be reconstructed.</p>
      <div className="tw-stat-panels"><Breakdown title="Visitor Devices" rows={data.devices} /><Breakdown title="Traffic Sources" rows={data.sources} /></div>
    </>}
  </Card>;
}
