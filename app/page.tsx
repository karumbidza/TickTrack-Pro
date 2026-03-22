import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'TickTrack Pro — Maintenance Management for Multi-Branch Organisations',
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f7f6f3;
    --surface: #ffffff;
    --surface2: #f0efe9;
    --border: #e2e0d8;
    --border-strong: #c8c6bc;
    --text-primary: #1a1916;
    --text-secondary: #6b6860;
    --text-muted: #9e9c94;
    --accent: #2a2825;
    --accent-hover: #1a1714;
    --tag-bg: #eceae3;
    --tag-text: #4a4843;
    --green: #2d6a4f;
    --green-bg: #e8f5ee;
    --amber: #92400e;
    --amber-bg: #fef3c7;
    --blue: #1e40af;
    --blue-bg: #eff6ff;
    --nav-height: 64px;
    --radius: 10px;
    --radius-lg: 16px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #111110;
      --surface: #1c1b19;
      --surface2: #252421;
      --border: #2e2d2a;
      --border-strong: #3d3c38;
      --text-primary: #f0efe9;
      --text-secondary: #9e9c94;
      --text-muted: #6b6860;
      --accent: #f0efe9;
      --accent-hover: #ffffff;
      --tag-bg: #252421;
      --tag-text: #c8c6bc;
      --green: #6ee7b7;
      --green-bg: #064e3b;
      --amber: #fcd34d;
      --amber-bg: #451a03;
      --blue: #93c5fd;
      --blue-bg: #1e3a5f;
    }
  }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* NAV */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: var(--nav-height);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 clamp(1.5rem, 5vw, 4rem);
  }
  .nav-inner {
    width: 100%; max-width: 1100px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
  }
  .logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: var(--text-primary);
  }
  .logo-mark {
    width: 32px; height: 32px; background: var(--accent);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .logo-mark svg { width: 18px; height: 18px; }
  .logo-name { font-size: 15px; font-weight: 500; letter-spacing: -0.01em; }
  .nav-links { display: flex; align-items: center; gap: 2rem; }
  .nav-links a {
    text-decoration: none; color: var(--text-secondary);
    font-size: 14px; transition: color 0.15s;
  }
  .nav-links a:hover { color: var(--text-primary); }
  .nav-cta { display: flex; align-items: center; gap: 0.75rem; }
  .btn-ghost {
    text-decoration: none; color: var(--text-secondary);
    font-size: 14px; padding: 0.5rem 1rem;
    border-radius: var(--radius); transition: all 0.15s;
    border: 1px solid transparent;
  }
  .btn-ghost:hover { color: var(--text-primary); border-color: var(--border); background: var(--surface); }
  .btn-primary {
    text-decoration: none; color: var(--bg);
    background: var(--accent); font-size: 14px;
    padding: 0.5rem 1.25rem; border-radius: var(--radius);
    font-weight: 500; transition: all 0.15s;
    border: 1px solid var(--accent);
  }
  .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

  /* MAIN LAYOUT */
  main { padding-top: var(--nav-height); }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 clamp(1.5rem, 5vw, 4rem); }

  /* HERO */
  .hero { padding: 6rem 0 4rem; text-align: center; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--tag-bg); color: var(--tag-text);
    font-size: 12px; font-weight: 500; letter-spacing: 0.04em;
    padding: 0.35rem 0.875rem; border-radius: 99px;
    margin-bottom: 2rem;
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
    border: 1px solid var(--border);
  }
  .hero-badge span { width: 6px; height: 6px; border-radius: 50%; background: var(--green); display: inline-block; }
  h1 {
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    font-weight: 300;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    max-width: 820px;
    margin: 0 auto 1.5rem;
  }
  h1 em { font-style: normal; font-weight: 500; }
  .hero-sub {
    font-size: clamp(1rem, 2vw, 1.15rem);
    color: var(--text-secondary);
    max-width: 520px;
    margin: 0 auto 2.5rem;
    line-height: 1.65;
  }
  .hero-actions {
    display: flex; align-items: center; justify-content: center;
    gap: 0.75rem; flex-wrap: wrap;
  }
  .btn-large {
    text-decoration: none; color: var(--bg);
    background: var(--accent); font-size: 15px;
    padding: 0.75rem 2rem; border-radius: var(--radius);
    font-weight: 500; transition: all 0.15s;
    border: 1px solid var(--accent);
  }
  .btn-large:hover { background: var(--accent-hover); }
  .btn-large-ghost {
    text-decoration: none; color: var(--text-secondary);
    font-size: 15px; padding: 0.75rem 2rem;
    border-radius: var(--radius); transition: all 0.15s;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .btn-large-ghost:hover { color: var(--text-primary); border-color: var(--border-strong); }
  .hero-note { font-size: 13px; color: var(--text-muted); margin-top: 1rem; }

  /* TRUSTED BY */
  .trusted {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 2rem 0;
    text-align: center;
  }
  .trusted p { font-size: 12px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; font-family: 'DM Mono', monospace; margin-bottom: 1.25rem; }
  .trusted-logos { display: flex; align-items: center; justify-content: center; gap: 2.5rem; flex-wrap: wrap; }
  .trusted-logos span { font-size: 13px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.02em; }

  /* SECTION HEADERS */
  .section { padding: 5rem 0; }
  .section-label {
    font-size: 11px; color: var(--text-muted);
    letter-spacing: 0.1em; text-transform: uppercase;
    font-family: 'DM Mono', monospace;
    margin-bottom: 0.75rem;
  }
  .section-title {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 300; letter-spacing: -0.025em;
    line-height: 1.25; margin-bottom: 1rem;
  }
  .section-title em { font-style: normal; font-weight: 500; }
  .section-desc { font-size: 1rem; color: var(--text-secondary); max-width: 480px; line-height: 1.65; }

  /* WORKFLOW */
  .workflow { padding: 5rem 0; }
  .workflow-header { margin-bottom: 3.5rem; }
  .workflow-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .workflow-step { background: var(--surface); padding: 2rem 1.75rem; position: relative; }
  .step-number {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--text-muted);
    letter-spacing: 0.06em; margin-bottom: 1.25rem;
    display: block;
  }
  .step-icon {
    width: 36px; height: 36px;
    background: var(--surface2);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1rem;
    border: 1px solid var(--border);
  }
  .step-icon svg { width: 18px; height: 18px; stroke: var(--text-secondary); fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .step-title { font-size: 14px; font-weight: 500; margin-bottom: 0.5rem; }
  .step-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }

  /* FEATURES GRID */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .feature-card { background: var(--surface); padding: 2rem 1.75rem; }
  .feature-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: var(--surface2);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
  }
  .feature-icon svg { width: 20px; height: 20px; stroke: var(--text-secondary); fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
  .feature-title { font-size: 14px; font-weight: 500; margin-bottom: 0.5rem; }
  .feature-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }

  /* WHO IS IT FOR */
  .use-cases { padding: 5rem 0; }
  .use-case-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-top: 2.5rem; }
  .use-case-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem 1.25rem;
    text-align: center;
  }
  .use-case-icon { font-size: 22px; margin-bottom: 0.75rem; display: block; }
  .use-case-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
  .use-case-sub { font-size: 12px; color: var(--text-muted); margin-top: 0.25rem; }

  /* PRICING */
  .pricing { padding: 5rem 0; }
  .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-top: 3rem; }
  .pricing-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    position: relative;
  }
  .pricing-card.featured { border-color: var(--border-strong); background: var(--surface); }
  .featured-badge {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: var(--bg);
    font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
    padding: 0.3rem 0.875rem; border-radius: 99px;
    white-space: nowrap;
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
  }
  .plan-name { font-size: 13px; color: var(--text-muted); font-family: 'DM Mono', monospace; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .plan-price { font-size: 2.25rem; font-weight: 300; letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.375rem; }
  .plan-price span { font-size: 14px; font-weight: 400; color: var(--text-muted); }
  .plan-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 1.75rem; line-height: 1.5; }
  .plan-divider { border: none; border-top: 1px solid var(--border); margin-bottom: 1.5rem; }
  .plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.625rem; margin-bottom: 2rem; }
  .plan-features li { font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
  .plan-features li::before { content: ''; width: 14px; height: 14px; flex-shrink: 0; background: var(--tag-bg); border-radius: 50%; border: 1px solid var(--border); display: flex; }
  .plan-features li.included::before { background: var(--green-bg); border-color: var(--green); }
  .plan-cta {
    display: block; text-align: center; text-decoration: none;
    padding: 0.75rem; border-radius: var(--radius);
    font-size: 14px; font-weight: 500; transition: all 0.15s;
    border: 1px solid var(--border); color: var(--text-primary);
    background: var(--surface2);
  }
  .plan-cta:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .plan-cta.featured-cta { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .plan-cta.featured-cta:hover { background: var(--accent-hover); }

  /* CTA SECTION */
  .cta-section { padding: 5rem 0 6rem; }
  .cta-box {
    background: var(--accent);
    border-radius: var(--radius-lg);
    padding: clamp(2.5rem, 5vw, 4rem);
    text-align: center;
  }
  .cta-box h2 {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 300; letter-spacing: -0.025em;
    color: var(--bg); margin-bottom: 1rem;
  }
  .cta-box h2 em { font-style: normal; font-weight: 500; }
  .cta-box p { font-size: 1rem; color: rgba(247, 246, 243, 0.65); margin-bottom: 2rem; }
  .btn-cta-inv {
    display: inline-block; text-decoration: none;
    background: var(--bg); color: var(--accent);
    padding: 0.875rem 2.25rem; border-radius: var(--radius);
    font-size: 15px; font-weight: 500; transition: all 0.15s;
  }
  .btn-cta-inv:hover { opacity: 0.92; }

  /* FOOTER */
  footer { border-top: 1px solid var(--border); padding: 2.5rem 0; }
  .footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  .footer-links { display: flex; gap: 1.5rem; }
  .footer-links a { font-size: 13px; color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
  .footer-links a:hover { color: var(--text-secondary); }
  .footer-copy { font-size: 13px; color: var(--text-muted); }

  /* MOBILE */
  @media (max-width: 640px) {
    .nav-links { display: none; }
    .hero { padding: 4rem 0 3rem; }
    .workflow-steps { grid-template-columns: 1fr; }
    .features-grid { grid-template-columns: 1fr; }
  }

  /* ANIMATIONS */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .hero-badge { animation: fadeUp 0.4s ease both; }
  h1 { animation: fadeUp 0.4s 0.08s ease both; }
  .hero-sub { animation: fadeUp 0.4s 0.14s ease both; }
  .hero-actions { animation: fadeUp 0.4s 0.2s ease both; }
`

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f7f6f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <span className="logo-name">TickTrack Pro</span>
          </a>
          <div className="nav-links">
            <a href="#workflow">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-cta">
            <a href="/auth/login" className="btn-ghost">Sign in</a>
            <a href="/get-started" className="btn-primary">Start free trial</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge"><span></span> Live — 30-day free trial, no card needed</div>
          <h1>Maintenance management for <em>organisations that can&apos;t afford chaos</em></h1>
          <p className="hero-sub">Log issues from any branch, assign to contractors, track to completion — one system for your entire operation.</p>
          <div className="hero-actions">
            <a href="/get-started" className="btn-large">Start free trial</a>
            <a href="#workflow" className="btn-large-ghost">See how it works</a>
          </div>
          <p className="hero-note">30 days free &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; EcoCash &amp; USD accepted</p>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="trusted">
        <div className="container">
          <p>Built for organisations like</p>
          <div className="trusted-logos">
            <span>Government Offices</span>
            <span>Fuel Networks</span>
            <span>School Groups</span>
            <span>Property Managers</span>
            <span>Multi-branch Retail</span>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="workflow" id="workflow">
        <div className="container">
          <div className="workflow-header">
            <p className="section-label">How it works</p>
            <h2 className="section-title">From logged issue to <em>closed ticket</em></h2>
            <p className="section-desc">A transparent workflow your team, contractors, and management can all follow in real time.</p>
          </div>
          <div className="workflow-steps">
            <div className="workflow-step">
              <span className="step-number">01</span>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
              </div>
              <p className="step-title">Issue is logged</p>
              <p className="step-desc">Any staff member at any branch submits a ticket — with photos, location, and priority level.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">02</span>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              </div>
              <p className="step-title">Admin reviews</p>
              <p className="step-desc">Your admin sees the ticket, requests quotes from contractors, or assigns directly.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">03</span>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </div>
              <p className="step-title">Contractor works</p>
              <p className="step-desc">Assigned contractor updates progress in real time. Everyone sees what&apos;s happening.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">04</span>
              <div className="step-icon">
                <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>
              </div>
              <p className="step-title">Closed and rated</p>
              <p className="step-desc">Work approved, invoice submitted, service rated. Ticket closes with a full audit trail.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="container">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything your facilities team needs. <em>Nothing they don&apos;t.</em></h2>
          <p className="section-desc" style={{ marginBottom: '3rem' }}>Built for multi-branch organisations managing maintenance — not generic IT helpdesks.</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </div>
              <p className="feature-title">Ticket management</p>
              <p className="feature-desc">Create, assign, prioritise, and track maintenance issues from any branch. Every ticket has a full history.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <p className="feature-title">Multi-tenant &amp; multi-branch</p>
              <p className="feature-desc">Each organisation is fully isolated. Multiple branches under one account — with branch-level reporting.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <p className="feature-title">Contractor network</p>
              <p className="feature-desc">Invite contractors, request competitive quotes before assigning, manage their access and invoices.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.22 2 2 0 012.12.12h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91A16 16 0 0016.09 17l1.17-1.17a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
              </div>
              <p className="feature-title">SMS &amp; email alerts</p>
              <p className="feature-desc">Automatic notifications via Africa&apos;s Talking SMS and email — works even on basic phones.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              </div>
              <p className="feature-title">Invoice &amp; billing</p>
              <p className="feature-desc">Contractors submit invoices on ticket close. Admins approve and track all billing in one place.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              </div>
              <p className="feature-title">SLA tracking &amp; reporting</p>
              <p className="feature-desc">Set response time targets. Track performance across branches, contractors, and issue categories.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="use-cases">
        <div className="container">
          <p className="section-label">Who uses it</p>
          <h2 className="section-title">Built for <em>organisations with many locations</em></h2>
          <div className="use-case-grid">
            <div className="use-case-card">
              <span className="use-case-icon">🏛️</span>
              <p className="use-case-name">Government offices</p>
              <p className="use-case-sub">Multiple departments</p>
            </div>
            <div className="use-case-card">
              <span className="use-case-icon">⛽</span>
              <p className="use-case-name">Fuel networks</p>
              <p className="use-case-sub">Multi-station groups</p>
            </div>
            <div className="use-case-card">
              <span className="use-case-icon">🏫</span>
              <p className="use-case-name">School groups</p>
              <p className="use-case-sub">Education facilities</p>
            </div>
            <div className="use-case-card">
              <span className="use-case-icon">🏢</span>
              <p className="use-case-name">Property managers</p>
              <p className="use-case-sub">Residential &amp; commercial</p>
            </div>
            <div className="use-case-card">
              <span className="use-case-icon">🏪</span>
              <p className="use-case-name">Retail chains</p>
              <p className="use-case-sub">Multi-branch stores</p>
            </div>
            <div className="use-case-card">
              <span className="use-case-icon">🏗️</span>
              <p className="use-case-name">Construction</p>
              <p className="use-case-sub">Site management</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="container">
          <p className="section-label">Pricing</p>
          <h2 className="section-title">Simple pricing. <em>No surprises.</em></h2>
          <p className="section-desc">USD and ZWL accepted. EcoCash, OneMoney, and bank transfer supported.</p>
          <div className="pricing-grid">

            <div className="pricing-card">
              <p className="plan-name">Basic</p>
              <p className="plan-price">$29 <span>/ month</span></p>
              <p className="plan-desc">For small teams getting their first system in place.</p>
              <hr className="plan-divider" />
              <ul className="plan-features">
                <li className="included">Up to 10 users</li>
                <li className="included">Ticket management</li>
                <li className="included">Email notifications</li>
                <li className="included">Basic reporting</li>
                <li className="included">Mobile access</li>
              </ul>
              <a href="/get-started" className="plan-cta">Start free trial</a>
            </div>

            <div className="pricing-card featured">
              <div className="featured-badge">Most popular</div>
              <p className="plan-name">Pro</p>
              <p className="plan-price">$79 <span>/ month</span></p>
              <p className="plan-desc">For growing organisations that need automation and contractor tools.</p>
              <hr className="plan-divider" />
              <ul className="plan-features">
                <li className="included">Up to 50 users</li>
                <li className="included">Everything in Basic</li>
                <li className="included">Contractor network &amp; quotes</li>
                <li className="included">SMS notifications</li>
                <li className="included">Invoice management</li>
                <li className="included">SLA tracking</li>
                <li className="included">API access</li>
              </ul>
              <a href="/get-started" className="plan-cta featured-cta">Start free trial</a>
            </div>

            <div className="pricing-card">
              <p className="plan-name">Enterprise</p>
              <p className="plan-price">$199 <span>/ month</span></p>
              <p className="plan-desc">For large organisations needing white-labelling and dedicated support.</p>
              <hr className="plan-divider" />
              <ul className="plan-features">
                <li className="included">Unlimited users</li>
                <li className="included">Everything in Pro</li>
                <li className="included">White-label options</li>
                <li className="included">SSO &amp; advanced security</li>
                <li className="included">Dedicated support manager</li>
                <li className="included">Custom integrations</li>
              </ul>
              <a href="/get-started" className="plan-cta">Start free trial</a>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <h2>Replace your WhatsApp group. <em>Today.</em></h2>
            <p>30-day free trial. No credit card. Set up in under 10 minutes.</p>
            <a href="/get-started" className="btn-cta-inv">Start for free</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <p className="footer-copy">© 2025 TickTrack Pro. All rights reserved.</p>
            <div className="footer-links">
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="mailto:hello@tick-trackpro.com">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
