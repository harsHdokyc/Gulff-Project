import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield, FileText, Bell, ArrowRight, BarChart3,
  Users, Zap, Lock, Star, ChevronDown, ChevronUp,
  CheckCircle2, MousePointerClick, Sparkles, Timer
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import AnimatedSection from "@/components/AnimatedSection";
import { useState } from "react";

const features = [
  {
    icon: Shield,
    title: "Compliance Tracking",
    description: "Track regulatory tasks and deadlines in a single dashboard. Never miss a renewal or filing again.",
  },
  {
    icon: FileText,
    title: "Document Management",
    description: "Store and monitor important business documents with automatic expiry tracking and alerts.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Receive intelligent reminders before deadlines to avoid penalties and stay ahead.",
  },
  {
    icon: BarChart3,
    title: "Visual Reporting",
    description: "See your compliance health at a glance with clear dashboards and status indicators.",
  },
  {
    icon: Users,
    title: "Employee Compliance",
    description: "Track visa expirations, ID renewals, and employee-specific compliance requirements.",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your data is encrypted and stored securely. We take compliance seriously — including our own.",
  },
];

const stats = [
  { value: "10,000+", label: "Tasks Tracked" },
  { value: "99.9%", label: "Uptime" },
  { value: "500+", label: "Businesses" },
  { value: "< 2min", label: "Setup Time" },
];

const testimonials = [
  {
    quote: "ComplianceHQ completely transformed how we handle regulatory deadlines. We went from spreadsheets to a system that actually works.",
    name: "Sarah Al-Rashid",
    role: "Operations Manager",
    company: "Gulf Trading Co.",
  },
  {
    quote: "The simplicity is what sold us. No training needed — our team was up and running in minutes, not weeks.",
    name: "Michael Chen",
    role: "CEO",
    company: "TechBridge Solutions",
  },
  {
    quote: "We almost missed a trade license renewal that would have cost us thousands. That doesn't happen anymore with ComplianceHQ.",
    name: "Fatima Hassan",
    role: "Admin Director",
    company: "Noor Enterprises",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Sign up in seconds with just your email. No credit card, no contracts, no complexity.",
    icon: MousePointerClick,
    visual: (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-9 rounded bg-secondary border border-border" />
        <div className="h-9 rounded bg-secondary border border-border" />
        <div className="h-9 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-xs text-primary font-medium">Create Account</span>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "Set up your business profile",
    description: "A guided onboarding walks you through entering your company details, licenses, and employee info.",
    icon: Sparkles,
    visual: (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-1.5 w-8 rounded-full ${s <= 2 ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Step 2 of 4</span>
        </div>
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 rounded bg-secondary border border-border" />
          <div className="h-8 rounded bg-secondary border border-border" />
        </div>
        <div className="h-8 rounded bg-secondary border border-border" />
      </div>
    ),
  },
  {
    number: "03",
    title: "Start tracking compliance",
    description: "Your dashboard is ready instantly. Add tasks, set deadlines, and get alerts before anything expires.",
    icon: Timer,
    visual: (
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Active", val: "12", color: "text-success" },
            { label: "Pending", val: "5", color: "text-warning" },
            { label: "Overdue", val: "1", color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border bg-secondary/50 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-heading font-semibold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
        {["Trade License", "VAT Filing"].map((t) => (
          <div key={t} className="flex items-center justify-between rounded border border-border px-3 py-2 text-xs">
            <span className="text-foreground">{t}</span>
            <CheckCircle2 className="h-3 w-3 text-success" />
          </div>
        ))}
      </div>
    ),
  },
];

const faqs = [
  {
    question: "Is ComplianceHQ free to use?",
    answer: "Yes! We offer a free plan that lets you track up to 50 compliance tasks. Upgrade anytime for unlimited tasks, team members, and priority support.",
  },
  {
    question: "What types of compliance can I track?",
    answer: "You can track any regulatory obligation — trade licenses, VAT filings, insurance renewals, employee visas, permits, certifications, and more. The system is fully customizable.",
  },
  {
    question: "How do alerts and reminders work?",
    answer: "You'll receive in-app notifications and optional email/WhatsApp reminders at intervals you choose — typically 30, 14, and 7 days before a deadline.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. All data is encrypted in transit and at rest. We use enterprise-grade infrastructure with regular security audits and SOC 2 aligned practices.",
  },
  {
    question: "Can I add my team members?",
    answer: "Yes. You can invite team members to collaborate, assign tasks, and manage compliance together. Role-based access controls ensure everyone sees only what they need.",
  },
  {
    question: "How long does setup take?",
    answer: "Most businesses are fully set up in under 2 minutes. Our guided onboarding walks you through everything step by step — no training required.",
  },
];

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-36 relative">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground mb-8">
              <Zap className="h-3 w-3 text-primary" />
              Built for modern businesses
            </div>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-foreground leading-[1.1] tracking-tight max-w-4xl">
              Never miss a compliance
              <span className="text-primary"> deadline</span> again.
            </h1>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              The modern platform that helps businesses track regulatory tasks, manage documents, and stay ahead of deadlines — all in one place.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={300}>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 text-sm">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="h-12 px-8 text-sm">
                  View Demo Dashboard
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          {/* Dashboard Preview */}
          <AnimatedSection delay={400} className="mt-16">
            <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Tasks", value: "24", color: "text-foreground" },
                  { label: "Pending", value: "8", color: "text-warning" },
                  { label: "Completed", value: "14", color: "text-success" },
                  { label: "Overdue", value: "2", color: "text-destructive" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-secondary/50 p-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-heading font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { task: "Trade License Renewal", date: "Mar 15", status: "Overdue" },
                  { task: "VAT Filing Q1", date: "Mar 31", status: "Pending" },
                  { task: "Employee Visa – Ahmed", date: "Apr 2", status: "Pending" },
                  { task: "Insurance Renewal", date: "Apr 15", status: "Pending" },
                ].map((item) => (
                  <div key={item.task} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
                    <span className="text-foreground">{item.task}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{item.date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === "Overdue"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 100} className="text-center">
                <p className="text-3xl md:text-4xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Everything you need to stay compliant
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              A complete toolkit designed to simplify compliance management for growing businesses.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 80}>
                <div className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors duration-200">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Dramatically Improved */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Up and running in three simple steps
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              No complicated setup. No learning curve. Just a system that works from day one.
            </p>
          </AnimatedSection>

          <div className="space-y-16 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <AnimatedSection key={step.number} delay={i * 150}>
                <div className="relative">
                  {/* Connector line (desktop only) */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(100%+0px)] w-8 h-px bg-border z-0" />
                  )}

                  {/* Step number badge */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="font-heading text-sm font-bold text-primary">{step.number}</span>
                    </div>
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Visual mock */}
                  <div className="mb-5">
                    {step.visual}
                  </div>

                  {/* Text */}
                  <h3 className="font-heading font-semibold text-foreground text-lg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection delay={500} className="mt-16 text-center">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8">
                Try it yourself — it's free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Trusted by businesses like yours
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 100}>
                <div className="rounded-xl border border-border bg-card p-6 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed flex-1">"{t.quote}"</p>
                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.role}, {t.company}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <AnimatedSection className="text-center mb-16">
            <p className="text-sm font-medium text-primary mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything you need to know about ComplianceHQ.
            </p>
          </AnimatedSection>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/20 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm font-medium text-foreground pr-4">{faq.question}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </button>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Ready to simplify your compliance?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Join hundreds of businesses that trust ComplianceHQ to keep them on track. Start free — no credit card required.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;
