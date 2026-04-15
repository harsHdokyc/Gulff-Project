import PublicLayout from "@/components/PublicLayout";
import AnimatedSection from "@/components/AnimatedSection";
import { Shield, Target, Heart, Globe } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "We believe compliance starts with trust. We're transparent about how we handle your data and build our product.",
  },
  {
    icon: Target,
    title: "Simplicity First",
    description: "Complex problems deserve simple solutions. We obsess over making compliance management effortless.",
  },
  {
    icon: Heart,
    title: "Customer Obsession",
    description: "Every feature we build starts with a real problem our customers face. Your feedback shapes our roadmap.",
  },
  {
    icon: Globe,
    title: "Global Mindset",
    description: "Built for businesses operating across different regulatory environments and jurisdictions.",
  },
];

const AboutPage = () => {
  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-6 py-24">
        <AnimatedSection>
          <p className="text-sm font-medium text-primary mb-3">About Us</p>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight max-w-3xl">
            Making compliance simple for every business.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            ComplianceHQ was born out of a simple frustration: managing regulatory obligations shouldn't require a dedicated team or expensive consultants. We built the platform we wished existed — modern, intuitive, and powerful enough for any business.
          </p>
        </AnimatedSection>
      </section>

      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <AnimatedSection className="mb-16">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Our Mission</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              To empower businesses of all sizes to stay compliant with confidence. We automate the tedious parts of compliance management so you can focus on growing your business, not chasing paperwork.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <AnimatedSection key={v.title} delay={i * 100}>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <AnimatedSection>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Get in Touch</h2>
            <p className="mt-4 text-muted-foreground max-w-xl">
              Have questions or want to learn more? Reach out to our team.
            </p>
            <div className="mt-8 space-y-3 text-sm text-muted-foreground">
              <p>Email: <span className="text-foreground">hello@compliancehq.com</span></p>
              <p>Support: <span className="text-foreground">support@compliancehq.com</span></p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AboutPage;
