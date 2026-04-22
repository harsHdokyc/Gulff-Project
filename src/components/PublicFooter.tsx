import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Github, Twitter, Linkedin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Compliance", path: "/compliance" },
      { label: "Documents", path: "/documents" },
      { label: "Employees", path: "/employees" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Features", path: "/features" },
      { label: "About", path: "/about" },
      { label: "Contact", path: "/about#contact" },
      { label: "Sign In", path: "/signin" },
      { label: "Get Started", path: "/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Terms & Conditions", path: "/terms" },
    ],
  },
];

const socials = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Github, label: "GitHub", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
];

const FooterLink = ({ to, label }: { to: string; label: string }) => (
  <Link to={to} className="group inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
    <span className="relative">
      {label}
      <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
    </span>
    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
  </Link>
);

const PublicFooter = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("You're on the list", { description: "We'll keep you posted on new releases." });
    setEmail("");
  };

  return (
    <footer className="relative border-t border-border overflow-hidden">
      {/* Background grid + glow */}
      <div className="absolute inset-0 bg-grid opacity-[0.25] pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-10">
        {/* Top: CTA + Newsletter */}
        <div className="grid lg:grid-cols-12 gap-10 pb-16 border-b border-border/60">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-background/60 backdrop-blur text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Stay in the loop
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground mt-5 leading-[1.05]"
            >
              Compliance,<br />
              <span className="text-muted-foreground">delivered to your inbox.</span>
            </motion.h2>

            <p className="mt-4 text-sm text-muted-foreground max-w-md">
              Monthly insights on regulations, deadlines, and best practices. No spam, unsubscribe anytime.
            </p>

            <form onSubmit={handleSubscribe} className="mt-6 flex items-center gap-2 max-w-md p-1.5 rounded-full border border-border bg-background/60 backdrop-blur-xl focus-within:border-primary/60 transition-colors">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="border-0 bg-transparent focus-visible:ring-0 text-sm h-9 pl-3"
              />
              <Button type="submit" size="sm" className="rounded-full h-9 px-4 gap-1 bg-foreground text-background hover:bg-foreground/90">
                Subscribe
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-6">
            {footerSections.map((section, idx) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + idx * 0.07 }}
              >
                <h4 className="font-heading text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink to={link.path} label={link.label} />
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Giant brand wordmark */}
        <div className="relative py-14 border-b border-border/60">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="select-none"
          >
            <h3 className="font-heading text-[18vw] md:text-[14vw] lg:text-[180px] leading-[0.85] font-semibold tracking-tighter text-foreground/90 text-center">
              Compliance<span className="text-primary">HQ</span>
            </h3>
          </motion.div>

          {/* Floating badge over wordmark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute left-1/2 -translate-x-1/2 -bottom-4 flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background/90 backdrop-blur-xl shadow-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Built for the modern team</span>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            All systems operational
            <span className="text-border">•</span>
            <span>© {new Date().getFullYear()} ComplianceHQ</span>
          </div>

          <div className="flex items-center gap-1">
            {socials.map(({ icon: Icon, label, href }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92 }}
                className="w-9 h-9 rounded-full border border-border/80 bg-background/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
