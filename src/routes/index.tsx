import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vascular Alert Smart Sleeve — Live Dashboard" },
      { name: "description", content: "Live SpO2, perfusion and temperature monitoring with a 0–8 vascular risk score, history and alerts." },
      { property: "og:title", content: "Vascular Alert Smart Sleeve — Live Dashboard" },
      { property: "og:description", content: "Live SpO2, perfusion and temperature monitoring with a 0–8 vascular risk score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Reading = { t: string; spo2: number; pi: number; temp: number; score: number };
type Alert = { id: number; time: string; level: "Warning" | "Critical"; score: number; msg: string };

const scoreSpo2 = (v: number) => (v >= 95 ? 0 : v >= 90 ? 1 : v >= 85 ? 2 : 3);
const scorePi = (v: number) => (v >= 1 ? 0 : v >= 0.5 ? 1 : v >= 0.3 ? 2 : 3);
const scoreTemp = (v: number) => (v >= 32 ? 0 : v >= 30 ? 1 : 2);
const levelOf = (s: number) => (s >= 6 ? "Critical" : s >= 3 ? "Warning" : "Normal");
const tone = (l: string) => (l === "Critical" ? "destructive" : l === "Warning" ? "warning" : "success");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const now = () => new Date().toLocaleTimeString("en-GB");

function Dashboard() {
  const [data, setData] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [ischemia, setIschemia] = useState(false);
  const cur = useRef({ spo2: 97, pi: 2.5, temp: 33.5 });
  const lastLevel = useRef("Normal");

  useEffect(() => {
    const id = setInterval(() => {
      const c = cur.current;
      const target = ischemia ? { spo2: 82, pi: 0.2, temp: 29 } : { spo2: 97, pi: 2.5, temp: 33.5 };
      c.spo2 = clamp(c.spo2 + (target.spo2 - c.spo2) * 0.15 + (Math.random() - 0.5) * 1.2, 70, 100);
      c.pi = clamp(c.pi + (target.pi - c.pi) * 0.15 + (Math.random() - 0.5) * 0.2, 0.05, 5);
      c.temp = clamp(c.temp + (target.temp - c.temp) * 0.12 + (Math.random() - 0.5) * 0.2, 25, 37);
      const score = scoreSpo2(c.spo2) + scorePi(c.pi) + scoreTemp(c.temp);
      const r: Reading = { t: now(), spo2: +c.spo2.toFixed(1), pi: +c.pi.toFixed(2), temp: +c.temp.toFixed(1), score };
      setData((d) => [...d.slice(-59), r]);
      const lvl = levelOf(score);
      if (lvl !== "Normal" && lvl !== lastLevel.current) {
        setAlerts((a) => [
          { id: Date.now(), time: r.t, level: lvl as Alert["level"], score, msg: lvl === "Critical" ? "Possible vascular compromise — check limb immediately" : "Perfusion declining — monitor closely" },
          ...a,
        ].slice(0, 30));
      }
      lastLevel.current = lvl;
    }, 1000);
    return () => clearInterval(id);
  }, [ischemia]);

  const last = data[data.length - 1] ?? { spo2: 97, pi: 2.5, temp: 33.5, score: 0, t: "" };
  const level = levelOf(last.score);
  const tn = tone(level);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Vascular Alert <span className="text-primary">Smart Sleeve</span></h1>
          <p className="text-xs text-muted-foreground">Patient #A-1042 · Left forearm · Live</p>
        </div>
        <button
          onClick={() => setIschemia((v) => !v)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${ischemia ? "border-destructive bg-destructive/15 text-destructive" : "border-border bg-secondary text-secondary-foreground hover:border-primary"}`}
        >
          {ischemia ? "Stop ischemia simulation" : "Simulate ischemia"}
        </button>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[320px_1fr] lg:p-6">
        {/* Score */}
        <section className={`rounded-2xl border bg-card p-5 border-${tn}/50`}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vascular Risk Score</p>
          <div className="mt-3 flex items-end gap-2">
            <span className={`font-mono text-7xl font-semibold text-${tn}`}>{last.score}</span>
            <span className="mb-3 font-mono text-muted-foreground">/ 8</span>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < last.score ? (i >= 5 ? "bg-destructive" : i >= 2 ? "bg-warning" : "bg-success") : "bg-muted"}`} />
            ))}
          </div>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold bg-${tn}/15 text-${tn}`}>
            <span className={`h-2 w-2 rounded-full bg-${tn} ${level !== "Normal" ? "animate-ping" : ""}`} />
            {level}
          </div>
          <div className="mt-5 space-y-1 text-xs text-muted-foreground">
            <p>0–2 Normal · 3–5 Warning · 6–8 Critical</p>
            <p>SpO2 0–3 · Perfusion 0–3 · Temp 0–2</p>
          </div>
        </section>

        {/* Sensors */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Sensor label="SpO2" unit="%" value={last.spo2} pts={scoreSpo2(last.spo2)} max={3} />
          <Sensor label="Perfusion Index" unit="%" value={last.pi} pts={scorePi(last.pi)} max={3} />
          <Sensor label="Skin Temperature" unit="°C" value={last.temp} pts={scoreTemp(last.temp)} max={2} />
        </section>

        {/* History */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">History · last 60 s</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Chart title="SpO2 (%)" data={data} k="spo2" color="var(--chart-1)" domain={[70, 100]} />
            <Chart title="Perfusion Index (%)" data={data} k="pi" color="var(--chart-2)" domain={[0, 5]} />
            <Chart title="Temperature (°C)" data={data} k="temp" color="var(--chart-3)" domain={[25, 37]} />
            <Chart title="Risk Score (0–8)" data={data} k="score" color="var(--chart-5)" domain={[0, 8]} refs={[3, 6]} />
          </div>
        </section>

        {/* Alerts */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Alerts</h2>
            {alerts.length > 0 && <button onClick={() => setAlerts([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts. Press "Simulate ischemia" to test.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${a.level === "Critical" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>{a.level}</span>
                  <span className="font-mono text-muted-foreground">{a.time}</span>
                  <span className="flex-1">{a.msg}</span>
                  <span className="font-mono">{a.score}/8</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Sensor({ label, unit, value, pts, max }: { label: string; unit: string; value: number; pts: number; max: number }) {
  const l = pts === 0 ? "success" : pts === max ? "destructive" : "warning";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-4xl font-semibold">
        {value}<span className="ml-1 text-base text-muted-foreground">{unit}</span>
      </p>
      <p className={`mt-3 text-xs font-semibold text-${l}`}>+{pts} / {max} pts</p>
    </div>
  );
}

function Chart({ title, data, k, color, domain, refs = [] }: { title: string; data: Reading[]; k: keyof Reading; color: string; domain: [number, number]; refs?: number[] }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="t" hide />
            <YAxis domain={domain} width={30} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
            {refs.map((r) => <ReferenceLine key={r} y={r} stroke="var(--warning)" strokeDasharray="4 4" />)}
            <Line type="monotone" dataKey={k} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
