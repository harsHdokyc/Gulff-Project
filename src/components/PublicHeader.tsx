import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu, X, Sparkles, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Features", path: "/features" },
  { label: "About", path: "/about" },
];

const PublicHeader = () => {
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 16));

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path.split("#")[0]) && location.hash === (path.includes("#") ? `#${path.split("#")[1]}` : location.hash);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="max-w-6xl mx-auto px-4 pt-3 sm:pt-4">
          <motion.div
            animate={{
              backgroundColor: scrolled ? "hsl(var(--background) / 0.6)" : "hsl(var(--background) / 0.2)",
              borderColor: scrolled ? "hsl(var(--border) / 0.8)" : "hsl(var(--border) / 0.3)",
              paddingLeft: scrolled ? 12 : 16,
              paddingRight: scrolled ? 12 : 16,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative flex items-center justify-between h-14 rounded-full border backdrop-blur-xl shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.15)]"
          >
            {/* subtle inner glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/[0.04] via-transparent to-primary/[0.04] pointer-events-none" />

            {/* Logo */}
            <Link to="/" className="relative flex items-center gap-2 pl-3 group">
              <motion.div
                whileHover={{ rotate: 180, scale: 1.1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary/40 blur-md -z-10"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>
              <span className="font-heading text-[15px] font-semibold text-foreground tracking-tight">
                Compliance<span className="text-primary">HQ</span>
              </span>
            </Link>

            {/* Desktop nav with magnetic hover pill */}
            <nav
              className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2"
              onMouseLeave={() => setHovered(null)}
            >
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onMouseEnter={() => setHovered(link.path)}
                    className="relative px-4 py-1.5 text-[13px] font-medium transition-colors"
                  >
                    {hovered === link.path && (
                      <motion.span
                        layoutId="nav-hover"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                      {link.label}
                    </span>
                    {active && (
                      <motion.span
                        layoutId="nav-active-dot"
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right cluster */}
            <div className="flex items-center gap-1 pr-1.5">
              <motion.button
                onClick={toggle}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isDark ? "sun" : "moon"}
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.25 }}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>

              <Link to="/signin" className="hidden md:block">
                <Button variant="ghost" size="sm" className="rounded-full text-[13px] h-8 px-3">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="hidden md:block">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="sm"
                    className="rounded-full text-[13px] h-8 pl-3.5 pr-2 gap-1 group bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10"
                  >
                    Get Started
                    <span className="w-5 h-5 rounded-full bg-background/15 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </Button>
                </motion.div>
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-full text-foreground hover:bg-accent transition-colors"
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={mobileOpen ? "x" : "menu"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.header>

      {/* Spacer so content isn't hidden under fixed header */}
      <div aria-hidden className="h-20" />

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-2xl pt-24 px-6"
          >
            <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
            <nav className="relative flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="group flex items-center justify-between py-4 border-b border-border/50"
                  >
                    <span className="font-heading text-3xl font-semibold text-foreground">
                      {link.label}
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:rotate-45 transition-all duration-300" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative mt-10 flex flex-col gap-3"
            >
              <Link to="/signin" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="lg" className="w-full rounded-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}>
                <Button size="lg" className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PublicHeader;
