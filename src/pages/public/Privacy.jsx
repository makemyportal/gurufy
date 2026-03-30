import { Link } from 'react-router-dom'
import { Shield, Lock, Eye, Database, Mail, Phone } from 'lucide-react'

const LAST_UPDATED = 'March 1, 2025'

const SECTIONS = [
  {
    id: 'information-we-collect',
    title: '1. Information We Collect',
    content: [
      {
        subtitle: '1.1 Information You Provide',
        text: 'When you create an account, we collect your name, email address, profile photo, educational qualifications, work experience, and any other information you choose to provide. For schools, we collect institutional information, contact details, and administrative credentials.',
      },
      {
        subtitle: '1.2 Information We Collect Automatically',
        text: 'We collect information about how you use our platform, including your IP address, browser type, device information, pages visited, features used, and time spent on the platform. This helps us improve your experience and ensure platform security.',
      },
      {
        subtitle: '1.3 Information from Third Parties',
        text: 'If you choose to sign in using Google, we receive basic profile information from Google as permitted by your Google account settings. We do not receive your Google password.',
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    content: [
      {
        text: 'We use the information we collect to: provide, maintain, and improve the LDMS platform; personalize your experience and show relevant content; match teachers with appropriate job opportunities; send you important service notifications and updates; respond to your support requests; detect and prevent fraud and abuse; comply with legal obligations.',
      },
    ],
  },
  {
    id: 'sharing',
    title: '3. How We Share Your Information',
    content: [
      {
        subtitle: '3.1 Public Profile Information',
        text: 'Your profile name, photo, educational qualifications, and bio are visible to other users on the platform. You can control the visibility of additional profile fields in your privacy settings.',
      },
      {
        subtitle: '3.2 With Schools (Job Applications)',
        text: 'When you apply for a job, the school posting that job will be able to view your profile, resume, and application materials. We will never share your contact information without your explicit consent.',
      },
      {
        subtitle: '3.3 Service Providers',
        text: 'We share information with trusted third-party service providers who help us operate our platform, including cloud hosting (Google Firebase), analytics, and payment processing. These providers are bound by strict data protection agreements.',
      },
      {
        subtitle: '3.4 Legal Requirements',
        text: 'We may disclose your information if required by law, court order, or to protect the rights, property, or safety of LDMS, our users, or the public.',
      },
    ],
  },
  {
    id: 'data-security',
    title: '4. Data Security',
    content: [
      {
        text: 'We implement industry-standard security measures to protect your information: all data is encrypted in transit using TLS/SSL; passwords are hashed using bcrypt; our platform is built on Google Firebase, which provides enterprise-grade security; we conduct regular security audits; we have strict access controls and employee data handling policies.',
      },
    ],
  },
  {
    id: 'your-rights',
    title: '5. Your Rights',
    content: [
      {
        text: 'You have the right to: access the personal data we hold about you; correct inaccurate or incomplete information; request deletion of your account and associated data; export your data in a portable format; opt out of marketing communications; withdraw consent for data processing where applicable. To exercise any of these rights, please contact us at privacy@ldms.in.',
      },
    ],
  },
  {
    id: 'cookies',
    title: '6. Cookies & Tracking',
    content: [
      {
        text: "We use cookies and similar tracking technologies to maintain your session, remember your preferences, and understand how you use our platform. You can control cookie settings through your browser. Note that disabling certain cookies may affect platform functionality. We do not use your data for third-party advertising.",
      },
    ],
  },
  {
    id: 'data-retention',
    title: '7. Data Retention',
    content: [
      {
        text: 'We retain your information for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory reasons. Some anonymized, aggregated data may be retained indefinitely for research and analytics.',
      },
    ],
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    content: [
      {
        text: 'LDMS is designed for professional educators aged 18 and above. We do not knowingly collect personal information from individuals under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information promptly.',
      },
    ],
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: [
      {
        text: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on the platform. Your continued use of LDMS after the changes take effect constitutes acceptance of the updated policy.',
      },
    ],
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    content: [
      {
        text: 'If you have questions about this Privacy Policy or our data practices, please contact our Data Protection Officer at privacy@ldms.in or by mail at: LDMS Technologies Pvt. Ltd., Bangalore, Karnataka, India 560001.',
      },
    ],
  },
]

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-20 overflow-hidden border-b border-white/5">
        <div className="absolute top-0 left-1/3 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-indigo-400 font-bold text-sm">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-400 font-medium">Last updated: {LAST_UPDATED}</p>
          <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              At LDMS, we take your privacy seriously. This policy explains what data we collect, how we use it, and your rights as a user. We are committed to being transparent and protecting your personal information in compliance with Indian data protection laws.
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
                      className="block text-xs font-semibold text-slate-400 hover:text-indigo-400 py-1.5 transition-colors leading-tight">
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
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-bold text-white">Questions about your privacy?</span>
                </div>
                <div className="space-y-2">
                  <a href="mailto:privacy@ldms.in" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    <Mail className="w-4 h-4" /> privacy@ldms.in
                  </a>
                </div>
                <p className="text-slate-600 text-xs font-medium mt-3">We respond to all privacy inquiries within 5 business days.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
