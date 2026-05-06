import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, X, Zap, GraduationCap, Sparkles, ChevronDown } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    tag: null,
    price: '₹0',
    period: 'forever',
    desc: 'Perfect for individual teachers getting started.',
    color: 'border-white/10',
    btnClass: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    features: [
      { text: 'Community feed access', included: true },
      { text: 'Basic profile page', included: true },
      { text: 'Join up to 3 groups', included: true },
      { text: 'Browse job listings', included: true },
      { text: '5 AI tool uses / month', included: true },
      { text: 'Resource uploads (500MB)', included: true },
      { text: 'Direct messaging', included: true },
      { text: 'Unlimited AI tools', included: false },
      { text: 'Featured profile badge', included: false },
      { text: 'Priority support', included: false },
      { text: 'Advanced analytics', included: false },
    ],
  },
  {
    name: 'Pro',
    tag: 'Most Popular',
    price: '₹299',
    period: 'per month',
    annualPrice: '₹199',
    annualNote: '/mo, billed annually',
    desc: 'For serious educators ready to accelerate growth.',
    color: 'border-indigo-500/40',
    glow: 'shadow-[0_0_60px_rgba(99,102,241,0.15)]',
    btnClass: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.4)]',
    features: [
      { text: 'Community feed access', included: true },
      { text: 'Enhanced profile + portfolio', included: true },
      { text: 'Unlimited groups', included: true },
      { text: '1-click job apply', included: true },
      { text: 'Unlimited AI tools', included: true },
      { text: 'Resource uploads (10GB)', included: true },
      { text: 'Priority messaging', included: true },
      { text: 'Featured profile badge', included: true },
      { text: 'Priority support', included: true },
      { text: 'Career analytics dashboard', included: true },
      { text: 'Early access to new features', included: true },
    ],
  },
  {
    name: 'School',
    tag: 'For Institutions',
    price: '₹2,499',
    period: 'per month',
    annualPrice: '₹1,999',
    annualNote: '/mo, billed annually',
    desc: 'Complete hiring & brand solution for schools.',
    color: 'border-white/10',
    btnClass: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    features: [
      { text: 'School profile & branding', included: true },
      { text: 'Unlimited job postings', included: true },
      { text: 'Advanced teacher search', included: true },
      { text: 'Direct candidate messaging', included: true },
      { text: 'Applicant tracking system', included: true },
      { text: 'Analytics & reports', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Bulk outreach tools', included: true },
      { text: 'Featured school badge', included: true },
      { text: 'Custom branding', included: true },
      { text: 'API access', included: true },
    ],
  },
]

const FAQS = [
  { q: 'Can I cancel anytime?', a: 'Yes! You can cancel your Pro subscription at any time with no questions asked. You\'ll continue to have access until the end of your billing period.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes, we offer a 14-day free trial for the Pro plan. No credit card required to start your trial.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit/debit cards, UPI, net banking, and Paytm through our secure payment gateway.' },
  { q: 'Are there discounts for NGOs or government schools?', a: 'Absolutely! We offer a 50% discount for verified NGOs and government educational institutions. Contact us to apply.' },
  { q: 'What happens to my data if I downgrade?', a: 'Your content is always safe. If you downgrade, you\'ll retain access to all your previously uploaded resources but won\'t be able to add new ones beyond the free limit.' },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="min-h-screen bg-[#07070d] pt-[70px]">

      {/* ── Hero ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6">Transparent Pricing</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Plans that grow<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">with you</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            Start free. Upgrade when you're ready. No hidden fees, no surprises.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/3 border border-white/10 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!annual ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${annual ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Annual
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-extrabold uppercase tracking-wider">Save 33%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative bg-white/3 border ${plan.color} rounded-2xl p-7 ${plan.glow || ''} hover:-translate-y-1 transition-all duration-300 flex flex-col`}
              >
                {plan.tag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-extrabold uppercase tracking-widest rounded-full shadow-lg">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-500 text-sm font-medium mb-5">{plan.desc}</p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-extrabold text-white">
                      {annual && plan.annualPrice ? plan.annualPrice : plan.price}
                    </span>
                    <span className="text-slate-500 text-sm font-medium pb-1">
                      {annual && plan.annualNote ? plan.annualNote : `/${plan.period}`}
                    </span>
                  </div>
                  {annual && plan.annualPrice && (
                    <p className="text-xs text-emerald-400 font-semibold">
                      Save ₹{parseInt(plan.price.replace('₹','').replace(',','')) * 12 - parseInt(plan.annualPrice.replace('₹','').replace(',','')) * 12}/yr
                    </p>
                  )}
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 mb-7 ${plan.btnClass}`}
                >
                  {plan.name === 'Free' ? 'Get Started Free' : `Start ${plan.name} Plan`}
                </button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included
                        ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        : <X className="w-4 h-4 text-slate-700 shrink-0" />
                      }
                      <span className={`text-sm font-medium ${feature.included ? 'text-slate-300' : 'text-slate-600 line-through'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Trust note */}
          <div className="mt-10 text-center">
            <p className="text-slate-600 text-sm font-medium">
              🔒 Secure payment · Cancel anytime · 14-day free trial on Pro
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest mb-5">FAQ</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Pricing Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 border-t border-white/5">
                    <p className="text-slate-400 text-sm font-medium leading-relaxed pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm font-medium">
              Still have questions?{' '}
              <a href="/contact" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Contact us →</a>
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
