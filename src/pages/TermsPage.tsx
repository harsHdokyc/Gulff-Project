import PublicLayout from "@/components/PublicLayout";
import AnimatedSection from "@/components/AnimatedSection";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing or using ComplianceHQ, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use our services. These terms apply to all users, including visitors, registered users, and organizations.",
  },
  {
    title: "2. Description of Service",
    content: "ComplianceHQ provides a compliance management platform that enables businesses to track regulatory obligations, manage documents, monitor employee compliance status, and receive deadline alerts. The platform is provided on an 'as-is' basis.",
  },
  {
    title: "3. User Accounts",
    content: "You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information during registration. You are responsible for all activities that occur under your account.",
  },
  {
    title: "4. Acceptable Use",
    content: "You agree not to use the platform for any unlawful purpose, to upload malicious content, to attempt unauthorized access, or to interfere with the platform's operation. We reserve the right to suspend accounts that violate these terms.",
  },
  {
    title: "5. Data Ownership",
    content: "You retain ownership of all data you upload to the platform. By using our services, you grant us a limited license to process and store your data solely for the purpose of providing our services to you.",
  },
  {
    title: "6. Limitation of Liability",
    content: "ComplianceHQ is a management tool and does not constitute legal or regulatory advice. We are not liable for any penalties, fines, or losses resulting from missed compliance deadlines or inaccurate data entered by users.",
  },
  {
    title: "7. Termination",
    content: "Either party may terminate the agreement at any time. Upon termination, you may request an export of your data within 30 days. After this period, your data will be permanently deleted from our systems.",
  },
  {
    title: "8. Changes to Terms",
    content: "We reserve the right to modify these terms at any time. Material changes will be communicated via email or platform notification at least 14 days before taking effect.",
  },
];

const TermsPage = () => {
  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-24">
        <AnimatedSection>
          <p className="text-sm font-medium text-primary mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Terms & Conditions</h1>
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

export default TermsPage;
