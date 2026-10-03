// tailwind safelist: text-success text-warning text-destructive bg-success bg-warning bg-destructive bg-success/15 bg-warning/15 bg-destructive/15 border-success/50 border-warning/50 border-destructive/50
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vascular Alert Smart Sleeve — Live Dashboard" },
      { name: "description", content: "Live SpO2, perfusion and temperature monitoring with a 0–8 vascular risk score, patient info, history and alerts." },
      { property: "og:title", content: "Vascular Alert Smart Sleeve — Live Dashboard" },
      { property: "og:description", content: "Live SpO2, perfusion and temperature monitoring with a 0–8 vascular risk score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Level = "Low" | "Moderate" | "High";
type Reading = { t: string; spo2: number; pi: number; temp: number; hr: number; score: number };
type Alert = { id: number; time: string; level: Level; score: number; msg: string };

const scoreSpo2 = (v: number) => (v >= 95 ? 0 : v >= 90 ? 1 : v >= 85 ? 2 : 3);
const scorePi = (v: number) => (v >= 1 ? 0 : v >= 0.5 ? 1 : v >= 0.3 ? 2 : 3);
const scoreTemp = (v: number) => (v >= 32 ? 0 : v >= 30 ? 1 : 2);
const levelOf = (s: number): Level => (s >= 7 ? "High" : s >= 3 ? "Moderate" : "Low");
const tone = (l: Level) => (l === "High" ? "destructive" : l === "Moderate" ? "warning" : "success");
const action = (l: Level) => (l === "High" ? "Intervention required" : l === "Moderate" ? "Re-check required" : "No action");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const now = () => new Date().toLocaleTimeString("en-GB");

const patient = {
  name: "Ahmed Al-Harbi", id: "A-1042", age: 58, sex: "Male", blood: "O+", weight: "82 kg",
  ward: "Vascular Surgery · Bed 12", procedure: "Left radial artery graft (post-op day 1)",
  doctor: "Dr. Sara Al-Qahtani", allergies: "Penicillin", conditions: "Type 2 diabetes, Hypertension",
  meds: "Heparin, Metformin, Amlodipine", admitted: "2 Oct 2026",
};

function Dashboard() {
  const [data, setData] = useState<Reading[]>([]);
  const [log, setLog] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toast, setToast] = useState<Alert | null>(null);
  const [mode, setMode] = useState<"normal" | "moderate" | "high">("normal");
  const cur = useRef({ spo2: 97, pi: 2.5, temp: 33.5, hr: 76 });
  const lastLevel = useRef<Level>("Low");
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const c = cur.current;
      const target =
        mode === "high" ? { spo2: 82, pi: 0.2, temp: 29, hr: 112 }
        : mode === "moderate" ? { spo2: 91, pi: 0.6, temp: 31, hr: 92 }
        : { spo2: 97, pi: 2.5, temp: 33.5, hr: 76 };
      c.spo2 = clamp(c.spo2 + (target.spo2 - c.spo2) * 0.15 + (Math.random() - 0.5) * 1, 70, 100);
      c.pi = clamp(c.pi + (target.pi - c.pi) * 0.15 + (Math.random() - 0.5) * 0.15, 0.05, 5);
      c.temp = clamp(c.temp + (target.temp - c.temp) * 0.12 + (Math.random() - 0.5) * 0.15, 25, 37);
      c.hr = clamp(c.hr + (target.hr - c.hr) * 0.15 + (Math.random() - 0.5) * 3, 40, 160);
      const score = scoreSpo2(c.spo2) + scorePi(c.pi) + scoreTemp(c.temp);
      const r: Reading = { t: now(), spo2: +c.spo2.toFixed(1), pi: +c.pi.toFixed(2), temp: +c.temp.toFixed(1), hr: Math.round(c.hr), score };
      setData((d) => [...d.slice(-119), r]);
      if (tick.current++ % 5 === 0) setLog((l) => [r, ...l].slice(0, 200));
      const lvl = levelOf(score);
      if (lvl !== "Low" && lvl !== lastLevel.current) {
        const a: Alert = { id: Date.now(), time: r.t, level: lvl, score, msg: lvl === "High" ? "High risk — intervention required now" : "Moderate risk — re-check the limb" };
        setAlerts((x) => [a, ...x].slice(0, 50));
        setToast(a);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`Vascular Alert: ${lvl} (${score}/8)`, { body: a.msg });
        }
      }
      lastLevel.current = lvl;
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const last = data[data.length - 1] ?? { spo2: 97, pi: 2.5, temp: 33.5, hr: 76, score: 0, t: "" };
  const level = levelOf(last.score);
  const tn = tone(level);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {toast && (
        <div className={`fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg bg-card border-${tone(toast.level)}/50`}>
          <p className={`text-sm font-bold text-${tone(toast.level)}`}>🔔 {toast.level} · {toast.score}/8</p>
          <p className="text-sm">{toast.msg}</p>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Vascular Alert <span className="text-primary">Smart Sleeve</span></h1>
          <p className="text-xs text-muted-foreground">Live monitoring · Left forearm</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof Notification !== "undefined" && (
            <button onClick={() => Notification.requestPermission()} className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary">Enable notifications</button>
          )}
          {(["normal", "moderate", "high"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${mode === m ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary hover:border-primary"}`}>
              Simulate {m}
            </button>
          ))}
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[340px_1fr] lg:p-6">
        {/* Patient */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 font-bold text-primary">AH</div>
            <div>
              <p className="font-semibold">{patient.name}</p>
              <p className="text-xs text-muted-foreground">#{patient.id} · {patient.age} y · {patient.sex}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Vital label="Heart rate" value={`${last.hr}`} unit="bpm" />
            <Vital label="SpO2" value={`${last.spo2}`} unit="%" />
            <Vital label="Perfusion" value={`${last.pi}`} unit="%" />
            <Vital label="Skin temp" value={`${last.temp}`} unit="°C" />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Ward", patient.ward], ["Procedure", patient.procedure], ["Doctor", patient.doctor],
              ["Blood type", patient.blood], ["Weight", patient.weight], ["Allergies", patient.allergies],
              ["Conditions", patient.conditions], ["Medications", patient.meds], ["Admitted", patient.admitted],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Score + sensors */}
        <section className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className={`rounded-2xl border bg-card p-5 border-${tn}/50`}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk Score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className={`font-mono text-6xl font-semibold text-${tn}`}>{last.score}</span>
              <span className="mb-2 font-mono text-muted-foreground">/ 8</span>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i < last.score ? (i >= 6 ? "bg-destructive" : i >= 2 ? "bg-warning" : "bg-success") : "bg-muted"}`} />
              ))}
            </div>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold bg-${tn}/15 text-${tn}`}>
              <span className={`h-2 w-2 rounded-full bg-${tn}`} />{level}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{action(level)}</p>
          </div>
          <Sensor label="SpO2" unit="%" value={last.spo2} pts={scoreSpo2(last.spo2)} max={3} />
          <Sensor label="Perfusion" unit="%" value={last.pi} pts={scorePi(last.pi)} max={3} />
          <Sensor label="Temperature" unit="°C" value={last.temp} pts={scoreTemp(last.temp)} max={2} />
        </section>

        {/* Trends */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Trends · last 2 min</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Chart title="Risk Score (0–8)" data={data} k="score" color="var(--chart-5)" domain={[0, 8]} refs={[3, 7]} />
            <Chart title="SpO2 (%)" data={data} k="spo2" color="var(--chart-1)" domain={[70, 100]} />
            <Chart title="Perfusion Index (%)" data={data} k="pi" color="var(--chart-2)" domain={[0, 5]} />
            <Chart title="Temperature (°C)" data={data} k="temp" color="var(--chart-3)" domain={[25, 37]} />
          </div>
        </section>

        {/* Alerts */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {alerts.length > 0 && <button onClick={() => setAlerts([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications. Low scores (0–2) don't send any.</p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold bg-${tone(a.level)}/15 text-${tone(a.level)}`}>{a.level}</span>
                  <span className="font-mono text-muted-foreground">{a.time}</span>
                  <span className="flex-1">{a.msg}</span>
                  <span className="font-mono">{a.score}/8</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* History table */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">History log <span className="font-normal text-muted-foreground">· every 5 s</span></h2>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr><th className="py-2">Time</th><th>SpO2</th><th>Perf.</th><th>Temp</th><th>HR</th><th>Score</th><th>Level</th></tr>
              </thead>
              <tbody className="font-mono">
                {log.map((r, i) => {
                  const l = levelOf(r.score);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5">{r.t}</td><td>{r.spo2}</td><td>{r.pi}</td><td>{r.temp}</td><td>{r.hr}</td><td>{r.score}</td>
                      <td className={`font-sans text-xs font-semibold text-${tone(l)}`}>{l}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">How the scale and sensor work</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { l: "Low" as Level, r: "0–2", d: "Normal blood flow. No notification sent." },
              { l: "Moderate" as Level, r: "3–6", d: "Flow is dropping. Notification sent — re-check the limb." },
              { l: "High" as Level, r: "7–8", d: "Likely vascular compromise. Notification sent — intervention required." },
            ].map((x) => (
              <div key={x.l} className={`rounded-xl border p-4 border-${tone(x.l)}/50`}>
                <p className={`font-semibold text-${tone(x.l)}`}>{x.l} <span className="font-mono">· {x.r}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2">Sensor</th><th>0 pts</th><th>1 pt</th><th>2 pts</th><th>3 pts</th></tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-t border-border"><td className="py-2 font-sans">SpO2</td><td>≥95%</td><td>90–94</td><td>85–89</td><td>&lt;85</td></tr>
                <tr className="border-t border-border"><td className="py-2 font-sans">Perfusion index</td><td>≥1.0%</td><td>0.5–0.99</td><td>0.3–0.49</td><td>&lt;0.3</td></tr>
                <tr className="border-t border-border"><td className="py-2 font-sans">Skin temperature</td><td>≥32°C</td><td>30–31.9</td><td>&lt;30</td><td>—</td></tr>
              </tbody>
            </table>
          </div>
          <ol className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            {[
              ["Sense", "Optical (PPG) sensor shines red and infrared light into the skin to read SpO2 and perfusion; a thermistor reads skin temperature."],
              ["Score", "Each reading gets points (SpO2 0–3, perfusion 0–3, temperature 0–2). Points add up to a 0–8 score every second."],
              ["Classify", "The total is mapped to Low, Moderate or High."],
              ["Alert", "Moderate and High send a notification to the care team; every reading is saved to history."],
            ].map(([h, d], i) => (
              <li key={h} className="rounded-xl bg-secondary p-4">
                <p className="font-semibold text-primary">{i + 1}. {h}</p>
                <p className="mt-1 text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

function Vital({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-semibold">{value}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></p>
    </div>
  );
}

function Sensor({ label, unit, value, pts, max }: { label: string; unit: string; value: number; pts: number; max: number }) {
  const l = pts === 0 ? "success" : pts === max ? "destructive" : "warning";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold">{value}<span className="ml-1 text-base text-muted-foreground">{unit}</span></p>
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
