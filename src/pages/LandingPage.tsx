import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield, FileText, Bell, ArrowRight, BarChart3,
  Users, Lock, Star, ChevronDown, CheckCircle2,
  Sparkles, Zap, Globe, TrendingUp,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import type { MotionValue } from "framer-motion";

// ---------- Step Progress (for walkthrough) ----------
const StepProgress = ({ progress }: { progress: MotionValue<number> }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const unsub = progress.on("change", (v) => {
      if (v < 0.33) setActive(0);
      else if (v < 0.66) setActive(1);
      else setActive(2);
    });
    return () => unsub();
  }, [progress]);
  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold transition-all duration-500 ${
              i <= active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}>
              {String(i + 1).padStart(2, "0")}
            </div>
            {i === active && (
              <motion.div
                layoutId="step-pulse"
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          {i < 2 && (
            <div className="w-10 h-px bg-border overflow-hidden">
              <motion.div
                className="h-full bg-primary origin-left"
                animate={{ scaleX: i < active ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ---------- Step Mockups (live UI inside walkthrough) ----------
const StepMockup = ({ type }: { type: string }) => {
  if (type === "setup") {
    return (
      <div className="relative w-full max-w-sm rounded-2xl glass p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-destructive/60" />
          <div className="w-2 h-2 rounded-full bg-warning/60" />
          <div className="w-2 h-2 rounded-full bg-success/60" />
          <div className="ml-2 text-[10px] text-muted-foreground">Import records</div>
        </div>
        <div className="space-y-2">
          {[
            { name: "employees.csv", size: "12.4 KB", done: true },
            { name: "contracts.csv", size: "8.1 KB", done: true },
            { name: "licenses.csv", size: "3.2 KB", done: false },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-card/60 border border-border/50"
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${f.done ? "bg-success/20" : "bg-primary/20"}`}>
                {f.done ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Zap className="w-3.5 h-3.5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium truncate">{f.name}</div>
                <div className="text-[9px] text-muted-foreground">{f.size}</div>
              </div>
              {!f.done && (
                <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    animate={{ width: ["10%", "70%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Auto-mapping obligations…</span>
          <span className="text-primary">2 of 3</span>
        </div>
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="relative w-full max-w-sm rounded-2xl glass p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-semibold">Compliance Map</div>
          <div className="text-[9px] px-2 py-0.5 rounded-full bg-success/20 text-success">Live</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { v: "94%", l: "Healthy", c: "text-success" },
            { v: "12", l: "Due", c: "text-warning" },
            { v: "3", l: "Risk", c: "text-destructive" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg bg-card/60 border border-border/50 p-2"
            >
              <div className={`text-base font-heading font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[9px] text-muted-foreground">{s.l}</div>
            </motion.div>
          ))}
        </div>
        <div className="rounded-lg bg-card/60 border border-border/50 p-3">
          <div className="text-[10px] text-muted-foreground mb-2">7-day trend</div>
          <div className="flex items-end gap-1 h-12">
            {[40, 55, 48, 65, 60, 78, 90].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // alerts
  return (
    <div className="relative w-full max-w-sm rounded-2xl glass p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-3.5 h-3.5 text-primary" />
        <div className="text-[11px] font-semibold">Smart alerts</div>
        <div className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">3 new</div>
      </div>
      <div className="space-y-2">
        {[
          { t: "VAT return due", d: "in 3 days", c: "warning" },
          { t: "Employee visa expiring", d: "in 7 days", c: "warning" },
          { t: "License renewal failed", d: "action needed", c: "destructive" },
          { t: "Annual report filed", d: "completed", c: "success" },
        ].map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-card/60 border border-border/50"
          >
            <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${
              a.c === "warning" ? "bg-warning" : a.c === "destructive" ? "bg-destructive" : "bg-success"
            } animate-glow-pulse`} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium">{a.t}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{a.d}</div>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ---------- SplitText Reveal ----------
const SplitText = ({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ delay: delay + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
};

// ---------- Animated Counter ----------
const Counter = ({ to, suffix = "", duration = 2 }: { to: number; suffix?: string; duration?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
};

// ---------- Magnetic Button ----------
const MagneticWrap = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const handle = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.3);
  };
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={handle}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
};

const features = [
  { icon: Shield, title: "Compliance Tracking", description: "Track regulatory tasks and deadlines in a single dashboard. Never miss a renewal again.", accent: "from-blue-500/20 to-cyan-500/20" },
  { icon: FileText, title: "Document Vault", description: "Store and monitor critical documents with automatic expiry tracking and intelligent alerts.", accent: "from-purple-500/20 to-pink-500/20" },
  { icon: Bell, title: "Smart Alerts", description: "AI-powered reminders surface what matters before deadlines turn into penalties.", accent: "from-orange-500/20 to-red-500/20" },
  { icon: BarChart3, title: "Live Reporting", description: "Real-time compliance health dashboards with status indicators and trend insights.", accent: "from-green-500/20 to-emerald-500/20" },
  { icon: Users, title: "Workforce Compliance", description: "Track visa expirations, IDs, and employee-specific requirements in one place.", accent: "from-yellow-500/20 to-orange-500/20" },
  { icon: Lock, title: "Bank-Grade Security", description: "End-to-end encryption with SOC 2 compliance. Your data is always yours.", accent: "from-indigo-500/20 to-purple-500/20" },
];

const testimonialsRow1 = [
  { name: "Sarah Chen", role: "CFO at Nexus Co.", text: "We replaced three tools with one. Audit prep went from weeks to a single afternoon." },
  { name: "Marcus Reid", role: "Founder, Vault Labs", text: "The clarity is unreal. I finally sleep knowing nothing is slipping through the cracks." },
  { name: "Aisha Khalid", role: "Ops Director, Meridian", text: "Onboarding took 4 minutes. Our entire compliance posture changed in a week." },
  { name: "David Park", role: "CEO, Lumen Studio", text: "Beautiful product. Feels like the team obsessed over every interaction." },
  { name: "Elena Rossi", role: "Legal Lead, Fern", text: "Smart alerts caught a renewal we would have missed. Paid for itself instantly." },
];

const testimonialsRow2 = [
  { name: "Jordan Blake", role: "COO, Atlas Ventures", text: "The dashboard is the calmest place in our company. That's a compliment." },
  { name: "Priya Sharma", role: "HR Lead, Sable", text: "Visa tracking alone is worth it. Our team trusts the alerts implicitly." },
  { name: "Tom Hartley", role: "Founder, Quill", text: "I've tried everything in this space. Nothing comes close to this experience." },
  { name: "Yuki Tanaka", role: "Director, Origin", text: "It just works. Fast, beautiful, and terrifyingly accurate." },
  { name: "Olivia Grant", role: "GC, Northwind", text: "A compliance tool that designers built. Finally." },
];

const stats = [
  { value: 10000, suffix: "+", label: "Tasks tracked" },
  { value: 99, suffix: "%", label: "Uptime SLA" },
  { value: 500, suffix: "+", label: "Businesses" },
  { value: 2, suffix: "min", label: "Avg setup" },
];

const faqs = [
  { q: "How fast can I get started?", a: "Most teams are fully onboarded within 5 minutes. No credit card required for the trial." },
  { q: "Is my data secure?", a: "Yes. We use end-to-end encryption, SOC 2 controls, and store your data in isolated, region-locked databases." },
  { q: "Can I import existing records?", a: "Absolutely. Bulk CSV import, manual entry, and API access are all supported out of the box." },
  { q: "Do you support multiple jurisdictions?", a: "Yes, the platform is jurisdiction-aware and adapts deadlines and document types to your region." },
  { q: "What does pricing look like?", a: "Transparent flat tiers based on team size. No per-feature paywalls and no hidden fees." },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.92]);

  const horizRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: horizProgress } = useScroll({ target: horizRef, offset: ["start start", "end end"] });
  const horizX = useTransform(horizProgress, [0, 1], ["0%", "-66%"]);

  return (
    <PublicLayout>
      {/* ---------------- HERO ---------------- */}
      <section ref={heroRef} className="relative min-h-[100vh] overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl animate-glow-pulse"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative container mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Introducing Compliance Guard, built for Businesses</span>
          </motion.div>

          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight max-w-5xl">
            <SplitText text="Compliance," />
            <br />
            <span className="text-gradient-primary">
              <SplitText text="finally calm." delay={0.3} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-8 max-w-xl text-lg md:text-xl text-muted-foreground leading-relaxed"
          >
            The modern operating system for regulatory work. Track everything, miss nothing, and feel in control without the spreadsheet chaos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <MagneticWrap>
              <Button asChild size="lg" className="h-12 px-7 text-base group glow-primary">
                <Link to="/signup">
                  Start free trial
                  <ArrowRight className="ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </MagneticWrap>
            <MagneticWrap>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base glass">
                <Link to="/about">See how it works</Link>
              </Button>
            </MagneticWrap>
          </motion.div>

          {/* Floating preview card */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="mt-20 w-full max-w-5xl"
          >
            <div className="relative rounded-2xl glass overflow-hidden glow-primary">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/50">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                <div className="ml-3 text-xs text-muted-foreground">app.complysuite.io</div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-4">
                {[
                  { icon: CheckCircle2, label: "Compliant", value: "94%", color: "text-success" },
                  { icon: Bell, label: "Due soon", value: "12", color: "text-warning" },
                  { icon: Shield, label: "At risk", value: "3", color: "text-destructive" },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 + i * 0.1 }}
                    className="rounded-xl bg-card/60 border border-border/50 p-4"
                  >
                    <s.icon className={`w-5 h-5 mb-2 ${s.color}`} />
                    <div className="text-2xl font-bold font-heading">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- LOGO MARQUEE ---------------- */}
      <section className="py-16 border-y border-border/40">
        <div className="container mx-auto px-6 mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Trusted by ambitious teams worldwide</p>
        </div>
        <div className="overflow-hidden mask-fade-x">
          <div className="flex gap-16 animate-marquee-slow whitespace-nowrap">
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex gap-16 items-center shrink-0">
                {["NEXUS", "VAULT", "MERIDIAN", "LUMEN", "ATLAS", "SABLE", "QUILL", "ORIGIN", "FERN", "NORTHWIND"].map((n) => (
                  <span key={n} className="font-heading text-2xl font-bold text-muted-foreground/40 hover:text-foreground transition-colors">
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- STATS — interactive panel ---------------- */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl glass overflow-hidden"
          >
            {/* ambient glow */}
            <div
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 20% 30%, hsl(var(--primary) / 0.25), transparent 50%), radial-gradient(ellipse at 80% 70%, hsl(280 90% 60% / 0.2), transparent 50%)" }}
            />
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-0">
              {/* Left: heading */}
              <div className="p-10 md:p-14 lg:border-r border-border/50">
                <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">By the numbers</p>
                <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
                  Numbers that <span className="text-gradient-primary">speak for themselves.</span>
                </h2>
                <p className="mt-5 text-muted-foreground max-w-md leading-relaxed">
                  Real metrics from teams running their compliance on autopilot every day, in every region.
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-primary to-primary/40" />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-foreground font-semibold">500+ teams</span> shipping calmer this quarter
                  </div>
                </div>
              </div>

              {/* Right: 2x2 stat tiles */}
              <div className="grid grid-cols-2 gap-px bg-border/40">
                {stats.map((s, i) => {
                  const bars = [40, 65, 50, 80, 70, 90];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                      className="group relative bg-card/40 backdrop-blur-xl p-7 md:p-8 hover:bg-card/70 transition-colors duration-500 cursor-default"
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{s.label}</div>
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-glow-pulse" />
                      </div>
                      <div className="text-4xl md:text-5xl font-heading font-bold text-gradient-primary leading-none">
                        <Counter to={s.value} suffix={s.suffix} />
                      </div>
                      {/* mini bar chart */}
                      <div className="mt-6 flex items-end gap-1 h-8">
                        {bars.map((h, b) => (
                          <motion.div
                            key={b}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 + i * 0.1 + b * 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary/80 group-hover:from-primary/50 group-hover:to-primary transition-colors"
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- FEATURES — bento grid ---------------- */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mb-16"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-primary mb-4">Built different</p>
            <h2 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
              Every feature, <span className="text-gradient-primary">obsessed over.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[220px]">
            {/* 1. BIG hero feature — Compliance Tracking */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="group relative md:col-span-4 md:row-span-2 rounded-2xl glass overflow-hidden p-8 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl group-hover:bg-primary/30 transition-colors duration-700" />
              <div className="relative h-full flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Flagship</span>
                </div>
                <h3 className="font-heading text-3xl md:text-4xl font-bold mt-4 max-w-md">Track every obligation. Miss nothing.</h3>
                <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">A unified command center for filings, renewals, and audits across teams, regions, and entities.</p>

                {/* live mock UI */}
                <div className="mt-auto pt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Compliant", val: "94%", color: "text-success", bar: "bg-success" },
                    { label: "Due soon", val: "12", color: "text-warning", bar: "bg-warning" },
                    { label: "At risk", val: "3", color: "text-destructive", bar: "bg-destructive" },
                  ].map((m, i) => (
                    <div key={i} className="rounded-lg bg-card/60 border border-border/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${m.bar}`} />
                      </div>
                      <div className={`mt-1 text-xl font-heading font-bold ${m.color}`}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 2. Smart Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.7 }}
              className="group relative md:col-span-2 rounded-2xl glass overflow-hidden p-6 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-orange-500/30 to-red-500/20 blur-3xl opacity-60 group-hover:opacity-100 transition" />
              <div className="relative h-full flex flex-col">
                <Bell className="w-5 h-5 text-primary mb-3 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                <h3 className="font-heading text-lg font-semibold">Smart alerts</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">AI-powered nudges before deadlines bite.</p>
                <div className="mt-auto space-y-1.5">
                  {[{ t: "VAT return", d: "in 3 days" }, { t: "Visa renewal", d: "in 7 days" }].map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] rounded-md bg-card/60 border border-border/50 px-2.5 py-1.5">
                      <span>{a.t}</span>
                      <span className="text-warning">{a.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 3. Document Vault */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.7 }}
              className="group relative md:col-span-2 rounded-2xl glass overflow-hidden p-6 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-purple-500/30 to-pink-500/20 blur-3xl opacity-60 group-hover:opacity-100 transition" />
              <div className="relative h-full flex flex-col">
                <FileText className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform duration-500" />
                <h3 className="font-heading text-lg font-semibold">Document vault</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Encrypted storage with auto-expiry tracking.</p>
                <div className="mt-auto flex -space-x-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-10 rounded bg-card/80 border border-border flex items-center justify-center">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))}
                  <div className="w-8 h-10 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-semibold text-primary">+24</div>
                </div>
              </div>
            </motion.div>

            {/* 4. Workforce — wide */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.7 }}
              className="group relative md:col-span-3 rounded-2xl glass overflow-hidden p-6 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative h-full flex flex-col md:flex-row gap-5">
                <div className="flex-1">
                  <Users className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-heading text-lg font-semibold">Workforce compliance</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Visas, IDs, and contracts — tracked per employee, automatically.</p>
                </div>
                <div className="flex md:flex-col gap-2 md:w-32">
                  {[{ n: "S. Chen", s: "ok" }, { n: "M. Reid", s: "warn" }, { n: "A. Khalid", s: "ok" }].map((p, i) => (
                    <div key={i} className="flex-1 md:flex-none flex items-center gap-2 rounded-md bg-card/60 border border-border/50 px-2 py-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/40 shrink-0" />
                      <span className="text-[11px] truncate">{p.n}</span>
                      <div className={`ml-auto w-1.5 h-1.5 rounded-full ${p.s === "ok" ? "bg-success" : "bg-warning"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 5. Live Reporting */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.25, duration: 0.7 }}
              className="group relative md:col-span-3 rounded-2xl glass overflow-hidden p-6 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/20 blur-3xl opacity-50 group-hover:opacity-100 transition" />
              <div className="relative h-full flex flex-col">
                <BarChart3 className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-heading text-lg font-semibold">Live reporting</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Real-time posture, trendlines, and exports.</p>
                {/* mini trend line */}
                <div className="mt-auto h-12 flex items-end gap-1">
                  {[30, 45, 38, 55, 48, 65, 60, 75, 70, 82, 78, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.04, duration: 0.5 }}
                      className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary"
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 6. Security — wide */}
            <motion.div
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.7 }}
              className="group relative md:col-span-6 rounded-2xl glass overflow-hidden p-8 hover:border-primary/40 transition-colors duration-500"
            >
              <div className="absolute inset-0 bg-grid opacity-15" />
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: "radial-gradient(ellipse at 80% 50%, hsl(var(--primary) / 0.15), transparent 60%)" }}
              />
              <div className="relative h-full flex flex-col md:flex-row md:items-center gap-6 justify-between">
                <div className="max-w-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-5 h-5 text-primary" />
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</span>
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl font-bold">Bank-grade security, by default.</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">End-to-end encryption, SOC 2 controls, region-locked storage. Your data, always yours.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["SOC 2", "GDPR", "ISO 27001", "AES-256", "SSO"].map((b) => (
                    <div key={b} className="px-3 py-1.5 rounded-full glass text-xs font-medium hover:border-primary/50 transition">
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- HORIZONTAL SCROLL: PRODUCT WALKTHROUGH ---------------- */}
      <section ref={horizRef} className="relative h-[400vh] bg-background">
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col">
          {/* ambient background */}
          <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.12), transparent 60%)" }}
          />

          {/* Header */}
          <div className="relative container mx-auto px-6 pt-24 pb-8">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-primary mb-3">The walkthrough</p>
                <h2 className="font-heading text-4xl md:text-6xl font-bold max-w-3xl leading-tight">
                  Three steps. <span className="text-gradient-primary">Total clarity.</span>
                </h2>
              </div>
              {/* Progress dots */}
              <StepProgress progress={horizProgress} />
            </div>
          </div>

          {/* Horizontal track */}
          <div className="relative flex-1 flex items-center">
            <motion.div style={{ x: horizX }} className="flex gap-6 pl-6 md:pl-[8%] will-change-transform">
              {[
                {
                  num: "01",
                  icon: Zap,
                  tag: "Setup",
                  title: "Connect in minutes",
                  desc: "Sign up, import your records via CSV or API, and let the system map your obligations automatically.",
                  color: "from-blue-500/30 to-cyan-500/20",
                  mock: "setup",
                },
                {
                  num: "02",
                  icon: Globe,
                  tag: "Visibility",
                  title: "See the full picture",
                  desc: "A live map of your compliance posture — every deadline, document, and risk in one calm view.",
                  color: "from-purple-500/30 to-pink-500/20",
                  mock: "dashboard",
                },
                {
                  num: "03",
                  icon: TrendingUp,
                  tag: "Autopilot",
                  title: "Stay ahead, always",
                  desc: "Smart alerts, automatic renewals, and quarterly insights keep you compliant without lifting a finger.",
                  color: "from-orange-500/30 to-red-500/20",
                  mock: "alerts",
                },
              ].map((step, i) => (
                <div key={i} className="shrink-0 w-[88vw] md:w-[70vw] lg:w-[62vw]">
                  <div className="relative h-[62vh] rounded-3xl glass overflow-hidden grid md:grid-cols-2">
                    {/* Left: copy */}
                    <div className="relative p-8 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border/40">
                      <div className={`absolute -top-32 -left-32 w-72 h-72 rounded-full bg-gradient-to-br ${step.color} blur-3xl opacity-70`} />
                      <div className="relative flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] uppercase tracking-[0.25em]">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" />
                          {step.tag}
                        </div>
                        <div className="text-6xl md:text-7xl font-heading font-bold text-foreground/10 leading-none">{step.num}</div>
                      </div>
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl glass flex items-center justify-center mb-5">
                          <step.icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-heading text-2xl md:text-3xl font-bold mb-3 leading-tight">{step.title}</h3>
                        <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">{step.desc}</p>
                      </div>
                    </div>

                    {/* Right: live mockup */}
                    <div className="relative p-6 md:p-8 flex items-center justify-center bg-background/40">
                      <div className="absolute inset-0 bg-grid opacity-20" />
                      <StepMockup type={step.mock} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="shrink-0 w-[15vw]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS DUAL MARQUEE ---------------- */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 mb-16 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-primary mb-4">Loved by operators</p>
          <h2 className="font-heading text-4xl md:text-6xl font-bold max-w-3xl mx-auto leading-tight">
            What teams are <span className="text-gradient-primary">saying.</span>
          </h2>
        </div>

        <div className="space-y-6 mask-fade-x">
          {[testimonialsRow1, testimonialsRow2].map((row, idx) => (
            <div key={idx} className="overflow-hidden group">
              <div className={`flex gap-5 whitespace-normal ${idx === 0 ? "animate-marquee" : "animate-marquee-reverse"} group-hover:[animation-play-state:paused]`}>
                {[...row, ...row].map((t, i) => (
                  <div
                    key={i}
                    className="shrink-0 w-[340px] md:w-[400px] p-6 rounded-2xl glass hover:border-primary/40 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/40" />
                      <div>
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="py-32">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-primary mb-4">FAQ</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold">Questions, answered.</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
                >
                  <span className="font-medium">{f.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="relative rounded-3xl glass p-12 md:p-20 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.3), transparent 70%)" }}
            />
            <div className="absolute inset-0 bg-grid opacity-30" />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <h2 className="font-heading text-4xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto">
                Stop chasing deadlines. <br />
                <span className="text-gradient-primary">Start owning them.</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
                Join 500+ teams operating with calm confidence. Free for 14 days, no credit card.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <MagneticWrap>
                  <Button asChild size="lg" className="h-12 px-8 text-base group glow-primary">
                    <Link to="/signup">
                      Get started free
                      <ArrowRight className="ml-1 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </MagneticWrap>
                <MagneticWrap>
                  <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base glass">
                    <Link to="/signin">Sign in</Link>
                  </Button>
                </MagneticWrap>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;
