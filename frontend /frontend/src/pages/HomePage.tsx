import React, { useEffect, useMemo, useRef, useState } from "react";


/* ───────────────────────── Types ───────────────────────── */

interface PredictionResult {
  fixture: { opponent: string; venue: string };
  retrieved_metrics: {
    barca_goals_rolling: number;
    barca_xg_rolling: number;
    opp_goals_rolling: number;
    opp_xg_rolling: number;
  };
  prediction: {
    outcome: string;
    probabilities: { loss: number; draw: number; win: number };
  };
}

/* ───────────────────────── Data ───────────────────────── */

const BARCA_CREST = "https://crests.football-data.org/81.png";
const BARCA_STADIUM = "Spotify Camp Nou";

// `stadium` is the opponent's home ground, shown when Barça play away
const LA_LIGA_TEAMS = [
  { name: "Real Madrid", stadium: "Bernabéu", logo: "https://crests.football-data.org/86.png" },
  { name: "Atletico Madrid", stadium: "Estadio Riyadh Air Metropolitano", logo: "https://crests.football-data.org/78.png" },
  { name: "Athletic Club", stadium: "Estadio San Mamés", logo: "https://crests.football-data.org/77.png" },
  { name: "Real Sociedad", stadium: "Reale Arena", logo: "https://crests.football-data.org/92.png" },
  { name: "Villarreal", stadium: "Estadio de la Cerámica", logo: "https://crests.football-data.org/94.png" },
  { name: "Real Betis", stadium: "Estadio La Cartuja de Sevilla", logo: "https://crests.football-data.org/90.png" },
  { name: "Sevilla", stadium: "Estadio Ramón Sánchez-Pizjuán", logo: "https://logodownload.org/wp-content/uploads/2018/11/sevilla-fc-logo-0.png" },
  { name: "Valencia", stadium: "Camp de Mestalla", logo: "https://crests.football-data.org/95.png" },
  { name: "Osasuna", stadium: "Estadio El Sadar", logo: "https://crests.football-data.org/79.png" },
  { name: "Celta Vigo", stadium: "Estadio ABANCA Balaídos", logo: "https://crests.football-data.org/558.png" },
  { name: "Rayo Vallecano", stadium: "Campo de Fútbol de Vallecas", logo: "https://crests.football-data.org/87.png" },
  { name: "Getafe", stadium: "Estadio Coliseum", logo: "https://crests.football-data.org/82.png" },
  { name: "Espanyol", stadium: "Estadi Cornellà-El Prat", logo: "https://crests.football-data.org/80.png" },
  { name: "Alavés", stadium: "Campo de Fútbol de Mendizorrotza", logo: "https://crests.football-data.org/263.png" },
  { name: "Levante", stadium: "Estadi Ciutat de València", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/SQB-jlVosxVV1Ce79FhbOA_500x500.png" },
  { name: "Elche", stadium: "Estadio Martínez Valero", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/uyyqqxLIYT_lQIXRyMI_RA_500x500.png" },
  { name: "Deportivo A Coruña", stadium: "Estadio ABANCA-Riazor", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/24AIbS9gqrkm2oS_PKqKEw_500x500.png" },
  { name: "Racing Santander", stadium: "Campos de Sport de El Sardinero", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/2qlWr1sH_7xAfbRZDRoK3A_500x500.png" },
  { name: "Málaga", stadium: "Estadio La Rosaleda", logo: "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/cPQnNrl3qcM5x70V14TuYA_500x500.png" },
];

const OPP_COLORS: Record<string, string> = {
  "Real Madrid": "#f2f2f2",
  "Atletico Madrid": "#cb3524",
  "Athletic Club": "#e2001a",
  "Real Sociedad": "#2f6fd0",
  "Villarreal": "#ffe114",
  "Real Betis": "#0bb363",
  "Sevilla": "#e5232d",
  "Valencia": "#ff8a1f",
  "Osasuna": "#d91a2a",
  "Celta Vigo": "#6cb7e6",
  "Rayo Vallecano": "#e53238",
  "Getafe": "#3b6fd4",
  "Espanyol": "#2c7be5",
  "Alavés": "#2a6fdb",
  "Levante": "#002d62",
  "Elche": "#008000",
  "Deportivo A Coruña": "#00488f",
  "Racing Santander": "#009639",
  "Málaga": "#00539f",
};
const oppColor = (name: string) => OPP_COLORS[name] ?? "#d7dce8";

/* Readable text colour on top of a given background */
const onColor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "#05070f" : "#ffffff";
};

/* ───────────────────────── Design tokens ─────────────────────────
   Garnet  #a50044   Blue  #004d98   Gold  #edbb00
   Pitch   #05070f   Panel #0b1022   Line  #1b2342
*/
const DISPLAY = "[font-family:'Barlow_Condensed','Arial_Narrow',Impact,sans-serif]";
const BLAUGRANA = "bg-[linear-gradient(90deg,#004d98,#a50044)]";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#edbb00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070f]";
// Springy-but-settled easing; disabled for users who prefer reduced motion
const EASE = "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/* ───────────────────────── Small pieces ───────────────────────── */

function Crest({ src, name, className = "w-10 h-10" }: { src: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`${className} rounded-full bg-[#1b2342] text-gray-300 grid place-items-center text-xs font-bold`}
        aria-label={name}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${name} crest`}
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

// Accept either 0–100 or 0–1 probabilities from the API
function toPercent(p: PredictionResult["prediction"]["probabilities"]) {
  const sum = p.win + p.draw + p.loss;
  const k = sum <= 1.5 ? 100 : 1;
  return { win: p.win * k, draw: p.draw * k, loss: p.loss * k };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ───────────────────────── Page ───────────────────────── */

export function PredictorPage() {
  const [selectedOpponent, setSelectedOpponent] = useState(LA_LIGA_TEAMS[0].name);
  const [isHome, setIsHome] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const opponent = LA_LIGA_TEAMS.find((t) => t.name === selectedOpponent) ?? LA_LIGA_TEAMS[0];
  const filtered = useMemo(
    () => LA_LIGA_TEAMS.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query]
  );

  // Stadium follows the opponent and venue choice
  const venueName = isHome === 1 ? BARCA_STADIUM : opponent.stadium;

  const handlePredict = async () => {
    setLoading(true);
    setRevealed(false);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
      const response = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponent: selectedOpponent, is_home: isHome }),
      });
      if (!response.ok) throw new Error("API error");
      const data: PredictionResult = await response.json();
      setPrediction(data);
      setIsDemo(false);
    } catch {
      // Fallback response for offline API testing
      setPrediction({
        fixture: { opponent: selectedOpponent, venue: isHome === 1 ? "Home" : "Away" },
        retrieved_metrics: {
          barca_goals_rolling: 2.4,
          barca_xg_rolling: 2.1,
          opp_goals_rolling: 1.1,
          opp_xg_rolling: 1.0,
        },
        prediction: { outcome: "Win", probabilities: { win: 72.5, draw: 15.0, loss: 12.5 } },
      });
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  // Animate bars in after the result mounts, and bring it into view
  useEffect(() => {
    if (!prediction) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    return () => cancelAnimationFrame(id);
  }, [prediction]);

  /* Derived values for the result view */
  const probs = prediction ? toPercent(prediction.prediction.probabilities) : null;
  const outcome = prediction?.prediction.outcome;
  const resultOpponent = prediction?.fixture.opponent ?? selectedOpponent;
  // Use the stadium from the prediction itself, not the current selection,
  // so the result stays correct if the user changes the picker afterwards
  const resultVenueName =
    prediction?.fixture.venue === "Home"
      ? BARCA_STADIUM
      : LA_LIGA_TEAMS.find((t) => t.name === resultOpponent)?.stadium ?? "Opponent's ground";
  const headline =
    outcome === "Win"
      ? "Barça are favoured to win"
      : outcome === "Loss"
        ? `${resultOpponent} are favoured to win`
        : "Too close to call. A draw is most likely";
  const confidence = probs ? Math.max(probs.win, probs.draw, probs.loss) : 0;

  // Opponent colour and the most likely outcome (these were missing before)
  const resultColor = oppColor(resultOpponent);
  const leader = probs
    ? probs.win >= probs.draw && probs.win >= probs.loss
      ? "win"
      : probs.loss >= probs.draw
        ? "loss"
        : "draw"
    : "draw";

  const metrics = prediction?.retrieved_metrics;
  const formMax = metrics
    ? Math.max(metrics.barca_goals_rolling, metrics.barca_xg_rolling, metrics.opp_goals_rolling, metrics.opp_xg_rolling, 0.1)
    : 1;

  // Home side is always shown on the left, like a real fixture list
  const barcaLeft = isHome === 1;

  return (
    <div className="min-h-screen bg-[#05070f] text-white antialiased">
      {/* Atmosphere: soft blaugrana glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(0,77,152,0.35),transparent),radial-gradient(50%_60%_at_85%_0%,rgba(165,0,68,0.30),transparent)]"
      />

      <main className="relative mx-auto max-w-4xl px-4 pb-40 pt-10 sm:pt-16">
        {/* ───────── Hero: say what this is in one glance ───────── */}
        <header className="space-y-5">
          <div className="flex items-center gap-3">
            <img src={BARCA_CREST} alt="FC Barcelona crest" className="h-12 w-12" />
            <span className="rounded-full border border-[#edbb00]/40 bg-[#edbb00]/10 px-3 py-1 text-xs font-semibold text-[#edbb00]">
              FC Barcelona Match Predictor 
            </span>
          </div>
          <h1 className={`${DISPLAY} text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl`}>
            Will Barça win their next match?
          </h1>
          <p className="max-w-xl text-base text-gray-300 sm:text-lg">
            Pick an opponent and where the game is played. We turn each side's recent goals and expected goals (xG) into
            win, draw and loss chances.
          </p>

          {/* How it works: a real sequence, so numbering is meaningful */}
          <ol className="grid gap-3 pt-2 sm:grid-cols-3">
            {[
              ["Pick the opponent", "Choose any La Liga side below."],
              ["Set the venue", "Home at Camp Nou or away."],
              ["Get the forecast", "See chances and the form behind them."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3 rounded-xl border border-[#1b2342] bg-[#0b1022]/70 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edbb00] text-sm font-black text-[#05070f]">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-gray-400">{body}</div>
                </div>
              </li>
            ))}
          </ol>
        </header>

        {/* ───────── Fixture: updates live as the user chooses ───────── */}
        <section
          aria-label="Selected fixture"
          className="mt-10 overflow-hidden rounded-3xl border border-[#1b2342] bg-[#0b1022] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        >
          
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-8 sm:px-10">
            {[
              { side: barcaLeft, crest: BARCA_CREST, name: "FC Barcelona" },
              { side: !barcaLeft, crest: opponent.logo, name: opponent.name },
            ]
              .sort((a, b) => Number(b.side) - Number(a.side))
              .map((team, idx) => (
                <React.Fragment key={team.name}>
                  {idx === 1 && (
                    <div className="flex flex-col items-center gap-2">
                      <span className={`${DISPLAY} text-3xl font-bold text-gray-500`}>VS</span>
                      <span className="max-w-[9rem] rounded-full border border-[#1b2342] bg-[#05070f] px-3 py-1 text-center text-xs font-semibold leading-tight text-[#edbb00]">
                        {venueName}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Crest src={team.crest} name={team.name} className={`h-20 w-20 sm:h-28 sm:w-28 ${EASE}`} />
                    <div className={`${DISPLAY} text-xl font-bold sm:text-3xl`}>{team.name}</div>
                  </div>
                </React.Fragment>
              ))}
          </div>

          {/* ───────── Controls ───────── */}
          <div className="space-y-8 border-t border-[#1b2342] p-5 sm:p-8">
            {/* Venue */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-200">Where is the match?</legend>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Match venue">
                {[
                  { v: 1, label: "Home", sub: BARCA_STADIUM},
                  { v: 0, label: "Away", sub: opponent.stadium},
                ].map((o) => {
                  const active = isHome === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setIsHome(o.v)}
                      className={`flex items-center gap-3 rounded-2xl border-1 p-4 text-left active:scale-[0.97] ${EASE} ${FOCUS} ${active
                          ? "border-[#edbb00] bg-[#004d98]/25 shadow-[0_0_24px_rgba(0,77,152,0.35)]"
                          : "border-[#1b2342] bg-[#05070f] hover:border-[#004d98]"
                        }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{o.label}</span>
                        <span className="block truncate text-xs text-gray-400">{o.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Opponent */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label htmlFor="team-search" className="text-sm font-semibold text-gray-200">
                  Who are they playing?
                </label>
                <input
                  id="team-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search teams"
                  className={`w-full rounded-full border border-[#1b2342] bg-[#05070f] px-4 py-2 text-sm text-white placeholder:text-gray-500 sm:w-56 ${FOCUS}`}
                />
              </div>

              <div
                role="radiogroup"
                aria-label="Opponent"
                className="grid max-h-72 grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5"
              >
                {filtered.map((team) => {
                  const active = selectedOpponent === team.name;
                  return (
                    <button
                      key={team.name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedOpponent(team.name)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 active:scale-[0.96] ${EASE} ${FOCUS} ${active
                          ? "border-[#edbb00] bg-[#004d98]/25 shadow-[0_0_20px_rgba(237,187,0,0.18)]"
                          : "border-[#1b2342] bg-[#05070f] hover:border-[#004d98]"
                        }`}
                    >
                      <Crest src={team.logo} name={team.name} className="h-10 w-10" />
                      <span className="line-clamp-1 text-[11px] font-semibold text-gray-200">{team.name}</span>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-gray-400">
                    No team matches “{query}”. Try a shorter name.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Results ───────── */}
        {prediction && probs && metrics && (
          <section
            ref={resultsRef}
            aria-live="polite"
            className="mt-8 scroll-mt-6 overflow-hidden rounded-3xl border border-[#1b2342] bg-[#0b1022] shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            {/* Top strip in the colours of the favoured side */}
            <div
              className="h-1.5 w-full"
              style={{
                background:
                  leader === "win"
                    ? "linear-gradient(90deg,#004d98,#a50044)"
                    : leader === "loss"
                      ? resultColor
                      : "#4b5468",
              }}
            />

            <div className="space-y-8 p-5 sm:p-8">
              {/* Verdict */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-gray-400">
                      Forecast: Barça {prediction.fixture.venue === "Home" ? "vs" : "at"} {resultOpponent}
                      <span className="text-gray-500"> · {resultVenueName}</span>
                    </p>
                    {isDemo && (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                        Demo Mode (Offline)
                      </span>
                    )}
                  </div>
                  <h2 className={`${DISPLAY} text-4xl font-extrabold leading-none sm:text-6xl`}>{headline}</h2>
                  <p className="text-xs text-gray-400">
                    Highest outcome confidence: <span className="font-semibold text-[#edbb00]">{fmt(confidence)}%</span>
                  </p>
                </div>
              </div>

              {/* Probability bar with the leading outcome highlighted */}
              <div className="space-y-4">
                <div
                  className="flex h-12 w-full gap-1 overflow-hidden rounded-2xl bg-[#05070f] p-1 ring-1 ring-[#1b2342]"
                  role="img"
                  aria-label={`Barça win ${fmt(probs.win)}%, draw ${fmt(probs.draw)}%, ${resultOpponent} win ${fmt(probs.loss)}%`}
                >
                  {[
                    { w: probs.win, bg: undefined, cls: BLAUGRANA, color: "#ffffff" },
                    { w: probs.draw, bg: "#4b5468", cls: "", color: "#ffffff" },
                    { w: probs.loss, bg: resultColor, cls: "", color: onColor(resultColor) },
                  ].map((seg, i) => (
                    <div
                      key={i}
                      style={{ width: revealed ? `${seg.w}%` : "0%", background: seg.bg, color: seg.color }}
                      className={`grid place-items-center overflow-hidden rounded-xl text-sm font-extrabold ${seg.cls} ${EASE}`}
                    >
                      {seg.w >= 9 && <span>{fmt(seg.w)}%</span>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "win", label: "Barça win", v: probs.win, dot: <span className={`h-3 w-3 rounded-full ${BLAUGRANA}`} /> },
                    { key: "draw", label: "Draw", v: probs.draw, dot: <span className="h-3 w-3 rounded-full bg-[#4b5468]" /> },
                    {
                      key: "loss",
                      label: `${resultOpponent} win`,
                      v: probs.loss,
                      dot: <span className="h-3 w-3 rounded-full" style={{ background: resultColor }} />,
                    },
                  ].map((l) => (
                    <div
                      key={l.key}
                      className={`space-y-1 rounded-2xl border p-3 ${EASE} ${
                        leader === l.key ? "border-[#edbb00]/60 bg-[#edbb00]/5" : "border-[#1b2342] bg-[#05070f]/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {l.dot}
                        <span className="line-clamp-1">{l.label}</span>
                      </div>
                      <div className={`${DISPLAY} text-3xl font-extrabold sm:text-4xl`}>{fmt(l.v)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form comparison */}
              <div className="space-y-5 rounded-2xl border border-[#1b2342] bg-[#05070f]/70 p-4 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">What the model looked at</h3>
                    <p className="text-xs text-gray-400">Average per game over each team's last 5 matches.</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${BLAUGRANA}`} /> Barça
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: resultColor }} /> {resultOpponent}
                    </span>
                  </div>
                </div>

                {[
                  { label: "Goals scored", b: metrics.barca_goals_rolling, o: metrics.opp_goals_rolling },
                  { label: "Expected goals (xG)", b: metrics.barca_xg_rolling, o: metrics.opp_xg_rolling },
                ].map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-300">
                      <span>{row.label}</span>
                      <span className="text-gray-500">
                        {row.b === row.o ? "Level" : row.b > row.o ? "Edge: Barça" : `Edge: ${resultOpponent}`}
                      </span>
                    </div>
                    {[
                      { who: "Barça", val: row.b, cls: BLAUGRANA, bg: undefined },
                      { who: resultOpponent, val: row.o, cls: "", bg: resultColor },
                    ].map((bar) => (
                      <div key={bar.who} className="grid grid-cols-[88px_1fr_36px] items-center gap-3 text-xs">
                        <span className="line-clamp-1 text-gray-400">{bar.who}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-[#1b2342]">
                          <div
                            className={`h-full rounded-full ${bar.cls} ${EASE}`}
                            style={{ width: revealed ? `${(bar.val / formMax) * 100}%` : "0%", background: bar.bg }}
                          />
                        </div>
                        <span className="text-right font-bold tabular-nums">{fmt(bar.val)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500">
                Models can make mistakes. Football is unpredictable.
              </p>
            </div>
          </section>
        )}

                  <footer className="mt-16 sm:mt-20">
            {/* Thin blaugrana rule */}
            <div className="h-px w-full bg-[linear-gradient(90deg,transparent,#004d98_25%,#a50044_75%,transparent)]" />

            <div className="grid gap-8 py-8 text-center sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10 sm:py-10 sm:text-left">
              {/* Brand + motto */}
              <div className="min-w-0 space-y-3 sm:space-y-4">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
                  <img src={BARCA_CREST} alt="" aria-hidden className="h-10 w-10 shrink-0 opacity-90 sm:h-9 sm:w-9" />
                  <span className={`${DISPLAY} text-xl font-bold leading-tight tracking-wide sm:text-2xl`}>
                    Barça Match Predictor
                  </span>
                </div>
                <p className={`${DISPLAY} text-base font-semibold tracking-wide text-[#edbb00] sm:text-lg`}>
                  Visca el Barça i Visca Catalunya
                </p>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-gray-500 sm:mx-0 sm:max-w-md">
                  An independent fan project. Not affiliated with FC Barcelona or La Liga. Club crests belong to their
                  respective owners.
                </p>
              </div>

              {/* Credit */}
              <div className="flex min-w-0 flex-col items-center gap-2 sm:items-end">
                <p className="text-xs text-gray-500">Built by</p>
                <a
                  href="https://linkedin.com/in/louai-alsabbagh"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Louai Al Sabbagh on LinkedIn (opens in a new tab)"
                  className={`group inline-flex min-h-11 max-w-full items-center gap-3 rounded-full border border-[#1b2342] bg-[#0b1022] py-2 pl-4 pr-2 text-sm font-semibold text-gray-100 hover:border-[#edbb00]/60 ${EASE} ${FOCUS}`}
                >
                  <span className="truncate">Louai Al Sabbagh</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0077b5] text-white">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.83v1.5h.06c.53-.95 1.84-1.95 3.78-1.95 4.04 0 4.78 2.55 4.78 5.88v5.57h-4v-4.94c0-1.18-.02-2.7-1.7-2.7-1.7 0-1.96 1.28-1.96 2.6v5.04h-4v-11Z" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            <p className="border-t border-[#1b2342] py-5 text-center text-[11px] text-gray-600 sm:text-left">
              © {new Date().getFullYear()} Barça Match Predictor
            </p>
          </footer>
      </main>

      {/* ───────── Sticky action bar: translucent layer, content scrolls beneath ───────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#05070f]/70 backdrop-blur-xl backdrop-saturate-150 motion-reduce:bg-[#05070f] [@media(prefers-reduced-transparency:reduce)]:bg-[#05070f] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
            <Crest src={BARCA_CREST} name="FC Barcelona" className="h-8 w-8" />
            <span className="text-xs text-gray-400">vs</span>
            <Crest src={opponent.logo} name={opponent.name} className="h-8 w-8" />
            <span className="truncate text-sm text-gray-300">
              {barcaLeft ? `Barça v ${opponent.name}` : `${opponent.name} v Barça`}
              <span className="text-gray-500"> · {venueName}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handlePredict}
            disabled={loading}
            className={`w-full rounded-2xl ${BLAUGRANA} border border-[#edbb00]/40 px-6 py-4 text-base font-extrabold text-white shadow-[0_8px_30px_rgba(165,0,68,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:min-w-[260px] ${EASE} ${FOCUS}`}
          >
            {loading ? "Analysing recent form…" : prediction ? "Update forecast" : "Predict the result"}
          </button>
        </div>
      </div>
    </div>
  );
}