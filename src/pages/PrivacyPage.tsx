import PublicLayout from "@/components/PublicLayout";
import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "1. Information We Collect",
    content: "We collect information you provide directly, such as your name, email address, company details, and compliance-related data. We also collect usage data to improve our services, including browser type, device information, and interaction patterns.",
  },
  {
    title: "2. How We Use Your Information",
    content: "Your information is used to provide and improve our services, send compliance alerts and reminders, communicate updates, and ensure the security of your account. We never sell your personal data to third parties.",
  },
  {
    title: "3. Data Storage & Security",
    content: "All data is encrypted in transit and at rest. We use industry-standard security practices including secure data centers, regular audits, and access controls. Your compliance documents are stored securely and accessible only to authorized users in your organization.",
  },
  {
    title: "4. Data Sharing",
    content: "We do not share your personal or business data with third parties except when required by law, with your explicit consent, or with trusted service providers who assist in operating our platform under strict confidentiality agreements.",
  },
  {
    title: "5. Your Rights",
    content: "You have the right to access, correct, or delete your personal data at any time. You may also request a copy of your data in a portable format. To exercise these rights, contact our support team.",
  },
  {
    title: "6. Cookies",
    content: "We use essential cookies to maintain your session and preferences. Analytics cookies may be used to understand usage patterns. You can manage cookie preferences through your browser settings.",
  },
  {
    title: "7. Changes to This Policy",
    content: "We may update this policy from time to time. We will notify you of significant changes via email or through the platform. Continued use of our services after changes constitutes acceptance.",
  },
];

const PrivacyPage = () => {
  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-24">
        <AnimatedSection>
          <p className="text-sm font-medium text-primary mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: April 2026</p>
        </AnimatedSection>

        <div className="mt-12 space-y-10">
          {sections.map((section, i) => (
            <AnimatedSection key={section.title} delay={i * 50}>
              <h2 className="font-heading font-semibold text-foreground text-lg">{section.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
};

export default PrivacyPage;
