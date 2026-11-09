// tailwind safelist: text-success text-warning text-destructive bg-success bg-warning bg-destructive bg-success/15 bg-warning/15 bg-destructive/15 border-success/50 border-warning/50 border-destructive/50 border-success/40 border-warning/40 border-destructive/40 bg-success/10 bg-warning/10 bg-destructive/10 text-success/80 text-warning/80 text-destructive/80 bg-success/20 bg-warning/20 bg-destructive/20 hover:bg-success/20 hover:bg-warning/20 hover:bg-destructive/20
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

export const TEMP_BASELINE = 37.5;
export const RISK_THRESHOLDS = {
  spo2: { normalMin: 95, warningMin: 90, highMin: 85 },
  perfusion: { normalMin: 1, warningMin: 0.5, highMin: 0.3 },
  temperature: { normalMaxDeviation: 0.5, warningMaxDeviation: 1.5 },
  levels: { moderateMin: 3, highMin: 7 },
} as const;

export const scoreSpo2 = (v: number) => {
  const t = RISK_THRESHOLDS.spo2;
  return v >= t.normalMin ? 0 : v >= t.warningMin ? 1 : v >= t.highMin ? 2 : 3;
};
export const scorePi = (v: number) => {
  const t = RISK_THRESHOLDS.perfusion;
  return v >= t.normalMin ? 0 : v >= t.warningMin ? 1 : v >= t.highMin ? 2 : 3;
};
export const temperatureRisk = (temp: number) => {
  const rise = Math.max(0, temp - TEMP_BASELINE);
  const t = RISK_THRESHOLDS.temperature;
  const points = rise <= t.normalMaxDeviation ? 0 : rise <= t.warningMaxDeviation ? 1 : 2;
  return {
    rise,
    points,
    label: points === 0 ? "Normal" : points === 1 ? "Warning" : "High risk",
    tone: points === 0 ? "success" : points === 1 ? "warning" : "destructive",
  };
};
export const scoreTemp = (temp: number) => temperatureRisk(temp).points;
export const calculateRiskScore = ({ spo2, pi, temp }: Pick<Reading, "spo2" | "pi" | "temp">) =>
  scoreSpo2(spo2) + scorePi(pi) + scoreTemp(temp);
const levelOf = (s: number): Level =>
  s >= RISK_THRESHOLDS.levels.highMin ? "High" : s >= RISK_THRESHOLDS.levels.moderateMin ? "Moderate" : "Low";
const tone = (l: Level) => (l === "High" ? "destructive" : l === "Moderate" ? "warning" : "success");
const action = (l: Level) => (l === "High" ? "Intervention required" : l === "Moderate" ? "Re-check required" : "No action");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const now = () => new Date().toLocaleTimeString("en-GB");

const patient = {
  name: "Ahmed Al-Harbi", id: "A-1042", age: 34, sex: "Male", blood: "O+", weight: "82 kg",
  ward: "Orthopedic Surgery · Bed 12", procedure: "Left tibial shaft fracture — IM nail fixation (post-op day 1)",
  doctor: "Dr. Sara Al-Qahtani", allergies: "Penicillin", conditions: "High ACS risk — tibial shaft fracture",
  meds: "Enoxaparin, Cefazolin, Morphine PCA", admitted: "2 Oct 2026",
};

function Dashboard() {
  const [data, setData] = useState<Reading[]>([]);
  const [log, setLog] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toast, setToast] = useState<Alert | null>(null);
  const [mode, setMode] = useState<"normal" | "moderate" | "high">("normal");
  const cur = useRef({ spo2: 97, pi: 2.5, temp: 37.2, hr: 76 });
  const lastLevel = useRef<Level>("Low");
  const tick = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      const c = cur.current;
      const target =
        mode === "high" ? { spo2: 82, pi: 0.2, temp: 35.5, hr: 112 }
        : mode === "moderate" ? { spo2: 91, pi: 0.6, temp: 36.2, hr: 92 }
        : { spo2: 97, pi: 2.5, temp: 37.2, hr: 76 };
      c.spo2 = clamp(c.spo2 + (target.spo2 - c.spo2) * 0.15 + (Math.random() - 0.5) * 1, 70, 100);
      c.pi = clamp(c.pi + (target.pi - c.pi) * 0.15 + (Math.random() - 0.5) * 0.15, 0.05, 5);
      c.temp = clamp(c.temp + (target.temp - c.temp) * 0.12 + (Math.random() - 0.5) * 0.15, 30, 40);
      c.hr = clamp(c.hr + (target.hr - c.hr) * 0.15 + (Math.random() - 0.5) * 3, 40, 160);
      const score = calculateRiskScore(c);
      const r: Reading = { t: now(), spo2: +c.spo2.toFixed(1), pi: +c.pi.toFixed(2), temp: +c.temp.toFixed(1), hr: Math.round(c.hr), score };
      setData((d) => [...d.slice(-119), r]);
      if (tick.current++ % 5 === 0) setLog((l) => [r, ...l].slice(0, 200));
      const lvl = levelOf(score);
      if (lvl !== "Low" && lvl !== lastLevel.current) {
        const a: Alert = { id: Date.now(), time: r.t, level: lvl, score, msg: lvl === "High" ? "Possible acute compartment syndrome — intervene now" : "Compromised limb perfusion — re-check the leg" };
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

  const last = data[data.length - 1] ?? { spo2: 97, pi: 2.5, temp: 37.2, hr: 76, score: 0, t: "" };
  const level = levelOf(last.score);
  const tn = tone(level);
  const tempStatus = temperatureRisk(last.temp);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background font-sans text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_18%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(50%_100%_at_82%_0%,color-mix(in_oklab,var(--vital-perf)_14%,transparent),transparent)]" />
      {toast && (
        <div className={`fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-xl border p-4 shadow-lg bg-card border-${tone(toast.level)}/50`} style={{ boxShadow: `0 10px 44px -8px color-mix(in oklab, var(--${tone(toast.level)}) 50%, transparent)` }}>
          <p className={`text-sm font-bold text-${tone(toast.level)}`}>{toast.level} · {toast.score}/8</p>
          <p className="text-sm">{toast.msg}</p>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Vascular Alert <span className="bg-gradient-to-r from-primary via-vital-spo2 to-vital-perf bg-clip-text text-transparent">Smart Sleeve</span></h1>
          <p className="text-xs text-muted-foreground">ACS monitoring · Left lower leg (tibial shaft fracture)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => typeof Notification !== "undefined" && Notification.requestPermission()} className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary">Enable notifications</button>
          {(["normal", "moderate", "high"] as const).map((m) => {
            const t = m === "normal" ? "success" : m === "moderate" ? "warning" : "destructive";
            return (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${mode === m ? `border-${t} bg-${t}/15 text-${t}` : `border-${t}/40 bg-${t}/10 text-${t}/80 hover:bg-${t}/20`}`}>
                Simulate {m}
              </button>
            );
          })}
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[340px_1fr] lg:p-6">
        {/* Patient */}
        <section className="rounded-2xl border border-border bg-card p-5 lg:row-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary to-vital-perf font-bold text-primary-foreground shadow-lg shadow-primary/25">AH</div>
            <div>
              <p className="font-semibold">{patient.name}</p>
              <p className="text-xs text-muted-foreground">#{patient.id} · {patient.age} y · {patient.sex}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Vital label="Heart rate" value={`${last.hr}`} unit="bpm" color="vital-hr" />
            <Vital label="SpO2" value={`${last.spo2}`} unit="%" color="vital-spo2" />
            <Vital label="Perfusion" value={`${last.pi}`} unit="%" color="vital-perf" />
            <Vital label="Skin temp" value={`${last.temp}`} unit="°C" color="vital-temp" />
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
          <div className={`relative overflow-hidden rounded-2xl border bg-card p-5 border-${tn}/50`}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl" style={{ background: `var(--${tn})` }} />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Risk Score</p>
            <div className="mt-2 flex items-end gap-2">
              <span className={`font-mono text-6xl font-semibold text-${tn}`} style={{ textShadow: `0 0 28px color-mix(in oklab, var(--${tn}) 60%, transparent)` }}>{last.score}</span>
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
          <Sensor label="SpO2" unit="%" value={last.spo2} pts={scoreSpo2(last.spo2)} max={3} color="vital-spo2" />
          <Sensor label="Perfusion" unit="%" value={last.pi} pts={scorePi(last.pi)} max={3} color="vital-perf" />
          <Sensor
            label="Temperature"
            unit="°C"
            value={last.temp}
            pts={tempStatus.points}
            max={2}
            color="vital-temp"
            status={tempStatus.label}
            statusTone={tempStatus.tone}
            detail={`Δ ${tempStatus.deviation.toFixed(1)}°C from ${TEMP_BASELINE}°C baseline`}
          />
        </section>

        {/* Trends */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Trends · last 2 min</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Chart title="Risk Score (0–8)" data={data} k="score" colors={["var(--warning)", "var(--destructive)"]} domain={[0, 8]} refs={[RISK_THRESHOLDS.levels.moderateMin, RISK_THRESHOLDS.levels.highMin]} />
            <Chart title="SpO2 (%)" data={data} k="spo2" colors={["var(--primary)", "var(--vital-spo2)"]} domain={[70, 100]} />
            <Chart title="Perfusion Index (%)" data={data} k="pi" colors={["var(--success)", "var(--vital-perf)"]} domain={[0, 5]} />
            <Chart title="Temperature (°C)" data={data} k="temp" colors={["var(--chart-3)", "var(--vital-temp)"]} domain={[34, 39]} />
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
                <li key={a.id} className="flex flex-wrap items-center gap-3 border-l-2 py-2 pl-3 text-sm" style={{ borderColor: `var(--${tone(a.level)})` }}>
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
          <h2 className="text-sm font-semibold">How the scale and sensor work <span className="font-normal text-muted-foreground">· ACS detection after tibial shaft fracture</span></h2>
          <p className="mt-2 text-sm text-muted-foreground">Tibial shaft fractures carry the highest risk of acute compartment syndrome (ACS). The sleeve tracks oxygen, blood flow and skin temperature in the injured leg — a falling score warns the team before classic symptoms appear.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { l: "Low" as Level, r: "0–2", d: "Normal limb perfusion after tibial fracture. No notification sent." },
              { l: "Moderate" as Level, r: "3–6", d: "Perfusion is dropping — early ACS sign. Notification sent — re-check the leg." },
              { l: "High" as Level, r: "7–8", d: "Likely acute compartment syndrome. Notification sent — intervention required." },
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
                <tr className="border-t border-border"><td className="py-2 font-sans">SpO2</td><td>≥{RISK_THRESHOLDS.spo2.normalMin}%</td><td>{RISK_THRESHOLDS.spo2.warningMin}–{RISK_THRESHOLDS.spo2.normalMin - 1}</td><td>{RISK_THRESHOLDS.spo2.highMin}–{RISK_THRESHOLDS.spo2.warningMin - 1}</td><td>&lt;{RISK_THRESHOLDS.spo2.highMin}</td></tr>
                <tr className="border-t border-border"><td className="py-2 font-sans">Perfusion index</td><td>≥{RISK_THRESHOLDS.perfusion.normalMin.toFixed(1)}%</td><td>{RISK_THRESHOLDS.perfusion.warningMin}–0.99</td><td>{RISK_THRESHOLDS.perfusion.highMin}–0.49</td><td>&lt;{RISK_THRESHOLDS.perfusion.highMin}</td></tr>
                <tr className="border-t border-border"><td className="py-2 font-sans">Temperature deviation</td><td>Δ ≤ {RISK_THRESHOLDS.temperature.normalMaxDeviation}°C</td><td>{RISK_THRESHOLDS.temperature.normalMaxDeviation} &lt; Δ ≤ {RISK_THRESHOLDS.temperature.warningMaxDeviation}°C</td><td>Δ &gt; {RISK_THRESHOLDS.temperature.warningMaxDeviation}°C</td><td>—</td></tr>
              </tbody>
            </table>
          </div>
          <ol className="mt-5 grid gap-3 text-sm md:grid-cols-4">
            {[
              ["Sense", "Optical (PPG) sensor shines red and infrared light into the skin to read SpO2 and perfusion; a thermistor reads skin temperature."],
              ["Score", `Each reading gets points (SpO2 0–3, perfusion 0–3, temperature deviation 0–2). Temperature is compared with the ${TEMP_BASELINE}°C baseline, and the points add up to a 0–8 score every second.`],
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

function Vital({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3" style={{ boxShadow: `inset 3px 0 0 0 var(--${color})` }}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-semibold" style={{ color: `var(--${color})` }}>{value}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></p>
    </div>
  );
}

function Sensor({ label, unit, value, pts, max, color, status, statusTone, detail }: { label: string; unit: string; value: number; pts: number; max: number; color: string; status?: string; statusTone?: string; detail?: string }) {
  const l = statusTone ?? (pts === 0 ? "success" : pts === max ? "destructive" : "warning");
  return (
    <div className="rounded-2xl border border-border border-t-2 bg-card p-5" style={{ borderTopColor: `var(--${color})` }}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold" style={{ color: `var(--${color})` }}>{value}<span className="ml-1 text-base text-muted-foreground">{unit}</span></p>
      <p className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-semibold bg-${l}/15 text-${l}`}>
        {status ? `${status} · ` : ""}+{pts} / {max} pts
      </p>
      {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function Chart({ title, data, k, colors, domain, refs = [] }: { title: string; data: Reading[]; k: keyof Reading; colors: [string, string]; domain: [number, number]; refs?: number[] }) {
  const id = `grad-${k}`;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})` }} />
        {title}
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colors[0]} />
                <stop offset="100%" stopColor={colors[1]} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="t" hide />
            <YAxis domain={domain} width={30} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
            {refs.map((r) => <ReferenceLine key={r} y={r} stroke="var(--warning)" strokeDasharray="4 4" />)}
            <Line type="monotone" dataKey={k} stroke={`url(#${id})`} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
