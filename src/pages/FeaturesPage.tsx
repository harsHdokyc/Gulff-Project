import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, FileText, Bell, Users, BarChart3, Lock,
  Zap, Globe, CheckCircle2, ArrowUpRight, Sparkles, Workflow,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";

const hero = {
  eyebrow: "Features",
  title: "Every detail,",
  titleAccent: "obsessed over.",
  sub: "A complete operating system for compliance - from tracking and alerts to reporting, audit trails, and team workflows. Designed to feel quiet, but never miss.",
};

const pillars = [
  {
    icon: Shield,
    title: "Compliance Tracking",
    desc: "Real-time visibility into every policy, license, and obligation across your business.",
    points: ["Live status calculation", "Risk scoring", "Auto-renewal flagging"],
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Notifications that respect your time. Right person, right channel, right moment.",
    points: ["30/15/7 day cadences", "Quiet hours", "Slack & email"],
  },
  {
    icon: FileText,
    title: "Document Vault",
    desc: "A single source of truth with version history and granular access control.",
    points: ["Versioning", "Permissions", "Search & tags"],
  },
  {
    icon: BarChart3,
    title: "Live Reporting",
    desc: "Dashboards that translate complex compliance data into clear answers.",
    points: ["Custom views", "PDF export", "Trend insights"],
  },
  {
    icon: Users,
    title: "Team Workflows",
    desc: "Assign owners, share visibility, and keep everyone aligned without the noise.",
    points: ["Roles & approvals", "Activity log", "Comments"],
  },
  {
    icon: Lock,
    title: "Bank-grade Security",
    desc: "Encryption at rest and in transit, audit logs, and SOC 2-ready architecture.",
    points: ["AES-256", "SSO ready", "Audit trail"],
  },
];

const compare = [
  { label: "Continuous status calculation", us: true, them: false },
  { label: "Smart, fatigue-free alerts", us: true, them: false },
  { label: "Native team workflows", us: true, them: true },
  { label: "Document versioning", us: true, them: true },
  { label: "Custom dashboards & reports", us: true, them: false },
  { label: "Audit trail with full history", us: true, them: false },
];

const stats = [
  { k: "99.99%", v: "Uptime SLA" },
  { k: "<200ms", v: "Median response" },
  { k: "256-bit", v: "Encryption" },
  { k: "24/7", v: "Monitoring" },
];

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const FeaturesPage = () => {
  return (
    <PublicLayout>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pt-16 pb-24">
        <div className="absolute inset-0 bg-grid opacity-[0.25] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-6 relative">
          <motion.div {...fade()} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background/60 backdrop-blur text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> {hero.eyebrow}
            </div>
            <h1 className="mt-6 font-heading text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02] text-foreground">
              {hero.title}<br />
              <span className="text-gradient-primary">{hero.titleAccent}</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">{hero.sub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 group">
                <Link to="/signup">
                  Start free trial
                  <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:rotate-45" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 rounded-full glass">
                <Link to="/about">Talk to us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Pillars Bento ---------------- */}
      <section className="relative py-20">
        <div className="container mx-auto px-6">
          <motion.div {...fade()} className="max-w-2xl mb-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The platform</p>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight">
              Six pillars. <span className="text-muted-foreground">One calm operating system.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                {...fade(i * 0.05)}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl border border-border bg-card/50 backdrop-blur p-6 overflow-hidden transition-colors hover:border-primary/40"
              >
                <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <p.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-5 font-heading text-xl font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Workflow strip ---------------- */}
      <section className="relative py-20">
        <div className="container mx-auto px-6">
          <div className="relative rounded-3xl glass p-8 md:p-14 overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
            <div className="relative grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Workflow className="h-3 w-3" /> How it flows
                </div>
                <h2 className="mt-4 font-heading text-3xl md:text-4xl font-semibold tracking-tight">
                  Connect. Automate. <span className="text-muted-foreground">Sleep well.</span>
                </h2>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
                  Import your records, set ownership, and let the system handle the rest - deadlines, renewals, and reports.
                </p>
              </div>
              <div className="lg:col-span-7 grid sm:grid-cols-3 gap-3">
                {[
                  { i: Zap, t: "Import", d: "CSV, API, or manual." },
                  { i: Shield, t: "Track", d: "Live status engine." },
                  { i: Bell, t: "Notify", d: "Right place, right time." },
                ].map((s, i) => (
                  <motion.div
                    key={s.t}
                    {...fade(i * 0.08)}
                    className="rounded-2xl border border-border bg-background/60 p-5"
                  >
                    <div className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
                      0{i + 1}
                    </div>
                    <s.i className="h-4 w-4 mt-3 text-primary" />
                    <div className="mt-3 font-heading text-base font-semibold text-foreground">{s.t}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.d}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Comparison ---------------- */}
      <section className="relative py-20">
        <div className="container mx-auto px-6">
          <motion.div {...fade()} className="max-w-2xl mb-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The difference</p>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight">
              Built for ops teams, <span className="text-muted-foreground">not spreadsheets.</span>
            </h2>
          </motion.div>

          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-4 border-b border-border text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <div className="col-span-6">Capability</div>
              <div className="col-span-3 text-center text-foreground">ComplianceHQ</div>
              <div className="col-span-3 text-center">Spreadsheets</div>
            </div>
            {compare.map((row, i) => (
              <motion.div
                key={row.label}
                {...fade(i * 0.04)}
                className="grid grid-cols-12 px-6 py-4 border-b border-border/60 last:border-0 items-center text-sm"
              >
                <div className="col-span-6 text-foreground">{row.label}</div>
                <div className="col-span-3 flex justify-center">
                  {row.us ? (
                    <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="col-span-3 flex justify-center">
                  {row.them ? (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="relative py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl border border-border bg-border overflow-hidden">
            {stats.map((s, i) => (
              <motion.div
                key={s.k}
                {...fade(i * 0.05)}
                className="bg-card p-8 text-center"
              >
                <div className="font-heading text-3xl md:text-4xl font-semibold text-foreground tracking-tight">{s.k}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{s.v}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="pt-12 pb-8 relative">
        <div className="container mx-auto px-6">
          <div className="relative rounded-3xl glass p-12 md:p-16 text-center overflow-hidden">
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.3), transparent 70%)" }}
            />
            <div className="absolute inset-0 bg-grid opacity-30" />
            <motion.div {...fade()} className="relative">
              <h2 className="font-heading text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl mx-auto leading-tight">
                See every feature <span className="text-gradient-primary">in action.</span>
              </h2>
              <p className="mt-5 text-base text-muted-foreground max-w-lg mx-auto">
                Spin up a free workspace in under a minute. No credit card required.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="h-12 px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 group">
                  <Link to="/signup">
                    Get started free
                    <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:rotate-45" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 rounded-full glass">
                  <Link to="/signin">Sign in</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default FeaturesPage;
