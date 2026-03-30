import { FileText, Mail } from 'lucide-react'

const LAST_UPDATED = 'March 1, 2025'

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: [
      {
        text: 'By accessing or using LDMS ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Platform. These Terms constitute a legally binding agreement between you and LDMS Technologies Pvt. Ltd. ("LDMS", "we", "us", or "our").',
      },
    ],
  },
  {
    id: 'eligibility',
    title: '2. Eligibility',
    content: [
      {
        text: 'To use LDMS, you must be at least 18 years of age and have the legal capacity to enter into a binding agreement. By using the Platform, you represent and warrant that you meet these eligibility requirements. Teachers must hold or be pursuing a valid teaching qualification. Schools and institutions must be legally registered entities.',
      },
    ],
  },
  {
    id: 'accounts',
    title: '3. User Accounts',
    content: [
      {
        subtitle: '3.1 Account Creation',
        text: 'You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
      },
      {
        subtitle: '3.2 Account Security',
        text: 'You must immediately notify us at support@ldms.in if you suspect any unauthorized use of your account. We are not responsible for any losses resulting from unauthorized use of your account due to your failure to safeguard your credentials.',
      },
      {
        subtitle: '3.3 Account Termination',
        text: 'We reserve the right to suspend or terminate your account at any time for violations of these Terms, without prior notice. You may delete your account at any time through your account settings.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: '4. Acceptable Use',
    content: [
      {
        subtitle: '4.1 Permitted Use',
        text: 'You may use LDMS for professional networking, sharing educational resources, applying for teaching positions, and accessing AI teaching tools, subject to these Terms.',
      },
      {
        subtitle: '4.2 Prohibited Conduct',
        text: 'You must not: post false, inaccurate, or misleading content; harass, threaten, or harm other users; spam or send unsolicited commercial messages; upload malicious code or viruses; attempt to access other users\' accounts; use the platform for any illegal purpose; scrape or extract data without authorization; impersonate another person or institution; post content that infringes intellectual property rights.',
      },
    ],
  },
  {
    id: 'content',
    title: '5. User Content',
    content: [
      {
        subtitle: '5.1 Ownership',
        text: 'You retain ownership of the content you create and share on LDMS, including posts, resources, and profile information.',
      },
      {
        subtitle: '5.2 License to LDMS',
        text: 'By posting content on LDMS, you grant us a non-exclusive, royalty-free, worldwide license to use, display, reproduce, and distribute your content on the Platform for the purpose of operating and improving our services.',
      },
      {
        subtitle: '5.3 Content Moderation',
        text: 'We reserve the right to remove any content that violates these Terms or our Community Guidelines, without prior notice.',
      },
    ],
  },
  {
    id: 'ai-tools',
    title: '6. AI Tools',
    content: [
      {
        text: 'LDMS\'s AI-powered tools generate content based on your inputs. You acknowledge that: AI-generated content may not always be accurate; you are responsible for reviewing and validating AI outputs before using them in educational settings; AI tools are provided as an assistive resource and do not replace professional judgment; we do not guarantee the accuracy, completeness, or fitness for purpose of AI-generated content.',
      },
    ],
  },
  {
    id: 'jobs-marketplace',
    title: '7. Jobs Marketplace',
    content: [
      {
        text: 'LDMS provides a job listing and application platform. We do not guarantee employment or hiring outcomes. Schools posting jobs are responsible for the accuracy of their listings and their own hiring decisions. Teachers are responsible for the accuracy of their applications. LDMS is not a party to any employment agreement between teachers and schools.',
      },
    ],
  },
  {
    id: 'payments',
    title: '8. Payments & Subscriptions',
    content: [
      {
        subtitle: '8.1 Billing',
        text: 'Paid subscriptions are billed in advance on a monthly or annual basis. You authorize us to charge your payment method on each billing date.',
      },
      {
        subtitle: '8.2 Refunds',
        text: 'We offer a 14-day money-back guarantee on Pro subscriptions. After this period, payments are non-refundable except where required by applicable law.',
      },
      {
        subtitle: '8.3 Price Changes',
        text: 'We reserve the right to change pricing with 30 days\' notice. Continued use of paid features after the effective date constitutes acceptance of the new pricing.',
      },
    ],
  },
  {
    id: 'disclaimers',
    title: '9. Disclaimers & Limitation of Liability',
    content: [
      {
        text: 'LDMS is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we disclaim all warranties, express or implied. We shall not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.',
      },
    ],
  },
  {
    id: 'governing-law',
    title: '10. Governing Law',
    content: [
      {
        text: 'These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Bangalore, Karnataka, India.',
      },
    ],
  },
  {
    id: 'changes',
    title: '11. Changes to Terms',
    content: [
      {
        text: 'We may update these Terms from time to time. We will provide 15 days\' notice of material changes via email or platform notification. Continued use of LDMS after the effective date constitutes acceptance of the updated Terms.',
      },
    ],
  },
  {
    id: 'contact',
    title: '12. Contact',
    content: [
      {
        text: 'For questions about these Terms, please contact: legal@ldms.in | LDMS Technologies Pvt. Ltd., Bangalore, Karnataka, India 560001.',
      },
    ],
  },
]

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-20 overflow-hidden border-b border-white/5">
        <div className="absolute top-0 right-1/3 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-violet-400 font-bold text-sm">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">Terms of Service</h1>
          <p className="text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
          <div className="mt-6 p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Please read these Terms of Service carefully before using LDMS. These terms govern your use of our platform and services. By using LDMS, you agree to be bound by these Terms.
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

            {/* TOC */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white/3 border border-white/5 rounded-2xl p-5">
                <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4">Contents</p>
                <nav className="space-y-1">
                  {SECTIONS.map(s => (
                    <a key={s.id} href={`#${s.id}`}
                      className="block text-xs font-semibold text-slate-400 hover:text-violet-400 py-1.5 transition-colors leading-tight">
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            {/* Sections */}
            <div className="lg:col-span-3 space-y-10">
              {SECTIONS.map(section => (
                <div key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="text-xl font-extrabold text-white mb-5 pb-3 border-b border-white/5">{section.title}</h2>
                  <div className="space-y-4">
                    {section.content.map((item, i) => (
                      <div key={i}>
                        {item.subtitle && (
                          <h3 className="text-sm font-bold text-slate-200 mb-2">{item.subtitle}</h3>
                        )}
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Contact Footer */}
              <div className="mt-10 p-6 bg-white/3 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-bold text-white">Questions about our Terms?</span>
                </div>
                <a href="mailto:legal@ldms.in" className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  <Mail className="w-4 h-4" /> legal@ldms.in
                </a>
                <p className="text-slate-600 text-xs font-medium mt-3">We respond to legal inquiries within 5 business days.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
