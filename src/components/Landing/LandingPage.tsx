import '../../landing.css';

interface LandingPageProps {
  onEnterApp: () => void;
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  return (
    <div className="lnd-root">

      {/* ── Navbar ── */}
      <header className="lnd-nav">
        <div className="lnd-nav-inner">
          <div className="lnd-nav-logo" onClick={onEnterApp}>
            <div className="lnd-nav-logo-mark">N</div>
            <span>Notability</span>
          </div>
          <nav className="lnd-nav-links">
            <a href="#features">Features</a>
            <a href="#learn">Study Tools</a>
            <a href="#transcribe">Transcription</a>
          </nav>
          <div className="lnd-nav-right">
            <button className="lnd-signin-btn" onClick={onEnterApp}>Sign In</button>
            <button className="lnd-cta-btn-sm" onClick={onEnterApp}>Get Started</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lnd-hero">
        <div className="lnd-hero-inner">
          <div className="lnd-hero-text">
            <div className="lnd-hero-eyebrow">✦ AI-powered notes</div>
            <h1 className="lnd-hero-headline">
              Turn your notes<br />into knowledge
            </h1>
            <p className="lnd-hero-sub">
              Write, record, and study smarter. Notability uses Claude AI to
              automatically generate summaries, flashcards, and quizzes from
              your notes — so you learn faster.
            </p>
            <div className="lnd-hero-actions">
              <button className="lnd-cta-btn" onClick={onEnterApp}>Try for free →</button>
              <span className="lnd-hero-sub-note">No account needed</span>
            </div>
            <div className="lnd-hero-badges">
              <div className="lnd-badge">📋 Smart Notes</div>
              <div className="lnd-badge">🃏 Flashcards</div>
              <div className="lnd-badge">❓ Quizzes</div>
              <div className="lnd-badge">💬 AI Chat</div>
            </div>
          </div>

          <div className="lnd-hero-visual">
            {/* App mockup */}
            <div className="lnd-mockup">
              <div className="lnd-mockup-bar">
                <span className="lnd-mockup-dot r" /><span className="lnd-mockup-dot y" /><span className="lnd-mockup-dot g" />
                <span className="lnd-mockup-title">My Notes — Calculus</span>
              </div>
              <div className="lnd-mockup-body">
                <div className="lnd-mockup-sidebar">
                  <div className="lnd-msb-logo">N</div>
                  <div className="lnd-msb-item active">Home</div>
                  <div className="lnd-msb-item">Recents</div>
                  <div className="lnd-msb-item">Favorites</div>
                  <div className="lnd-msb-divider" />
                  <div className="lnd-msb-section">MY LIBRARY</div>
                  <div className="lnd-msb-subject"><span className="lnd-msb-dot blue" />Calculus</div>
                  <div className="lnd-msb-subject"><span className="lnd-msb-dot green" />Biology</div>
                  <div className="lnd-msb-subject"><span className="lnd-msb-dot purple" />History</div>
                </div>
                <div className="lnd-mockup-main">
                  <div className="lnd-mockup-cards">
                    {['Derivatives', 'Integrals', 'Limits', 'Chain Rule'].map((t, i) => (
                      <div key={i} className="lnd-mock-card">
                        <div className="lnd-mock-thumb">
                          {[...Array(4)].map((_, j) => <div key={j} className="lnd-mock-line" style={{ width: `${60 + j * 10}%` }} />)}
                        </div>
                        <div className="lnd-mock-info">
                          <div className="lnd-mock-title">{t}</div>
                          <div className="lnd-mock-date">{i + 1}h ago</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="lnd-mockup-ai-badge">
                    <span>✦</span> AI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 1: All-in-one note taking ── */}
      <section className="lnd-feature" id="features">
        <div className="lnd-feature-inner">
          <div className="lnd-feature-text">
            <div className="lnd-feature-tag">Note Taking</div>
            <h2>All-in-one<br />note taking</h2>
            <p>
              Write notes, annotate PDFs, insert images, and record audio — all in one place.
              Your notes are organized by subject and always a tap away.
            </p>
            <ul className="lnd-feature-list">
              <li><span className="lnd-check">✓</span> Pen, highlighter, shapes &amp; text tools</li>
              <li><span className="lnd-check">✓</span> PDF import &amp; annotation</li>
              <li><span className="lnd-check">✓</span> Audio recording synced to notes</li>
              <li><span className="lnd-check">✓</span> Multiple page types &amp; backgrounds</li>
            </ul>
            <button className="lnd-feature-btn" onClick={onEnterApp}>Start writing →</button>
          </div>
          <div className="lnd-feature-visual">
            <div className="lnd-editor-mockup">
              <div className="lnd-ed-toolbar">
                <div className="lnd-ed-tools">
                  {['✏️', '🖊', '⬜', 'T', '◯'].map((icon, i) => (
                    <div key={i} className={`lnd-ed-tool ${i === 0 ? 'active' : ''}`}>{icon}</div>
                  ))}
                </div>
                <div className="lnd-ed-right">
                  <div className="lnd-ed-color" />
                  <div className="lnd-ed-btn">↩</div>
                  <div className="lnd-ed-btn ai">✦ AI</div>
                </div>
              </div>
              <div className="lnd-ed-canvas">
                <div className="lnd-ed-ruled">
                  {[...Array(8)].map((_, i) => <div key={i} className="lnd-ed-rule" />)}
                </div>
                <div className="lnd-ed-handwriting">
                  <div className="lnd-hw-line">f(x) = x² + 2x + 1</div>
                  <div className="lnd-hw-line sm">Derivative: f'(x) = 2x + 2</div>
                  <div className="lnd-hw-line sm">Critical point at x = -1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 2: Interactive Learning ── */}
      <section className="lnd-feature alt" id="learn">
        <div className="lnd-feature-inner reverse">
          <div className="lnd-feature-visual">
            <div className="lnd-learn-mockup">
              {/* Header */}
              <div className="lnd-lm-header">
                <div className="lnd-lm-logo">✦</div>
                <div>
                  <div className="lnd-lm-title">Learn</div>
                  <div className="lnd-lm-note">Calculus — Chapter 3</div>
                </div>
              </div>
              {/* Tabs */}
              <div className="lnd-lm-tabs">
                {['Smart Notes', 'Flashcards', 'Quiz', 'Chat'].map((t, i) => (
                  <div key={t} className={`lnd-lm-tab ${i === 1 ? 'active' : ''}`}>{t}</div>
                ))}
              </div>
              {/* Flashcard */}
              <div className="lnd-lm-card">
                <div className="lnd-lm-tag">Term</div>
                <div className="lnd-lm-text">Chain Rule</div>
                <div className="lnd-lm-tap">tap to flip</div>
              </div>
              {/* Grade row */}
              <div className="lnd-lm-grade">
                <div className="lnd-lm-still">✗ Still learning</div>
                <div className="lnd-lm-know">✓ Know it</div>
              </div>
              {/* Progress */}
              <div className="lnd-lm-progress">
                <div className="lnd-lm-pbar"><div className="lnd-lm-pfill" style={{ width: '60%' }} /></div>
                <span>6/10 known</span>
              </div>
            </div>
          </div>
          <div className="lnd-feature-text">
            <div className="lnd-feature-tag" style={{ background: 'rgba(82,183,136,0.12)', color: '#34C759' }}>AI Study Tools</div>
            <h2>Interactive<br />learning</h2>
            <p>
              Claude AI reads your notes and instantly generates study materials.
              Flashcards, quizzes, and smart summaries — all tailored to exactly what you wrote.
            </p>
            <ul className="lnd-feature-list">
              <li><span className="lnd-check">✓</span> Smart Notes — AI summary &amp; key terms</li>
              <li><span className="lnd-check">✓</span> Quizlet-style flashcards with Know/Learning tracking</li>
              <li><span className="lnd-check">✓</span> Multiple-choice quiz with explanations</li>
              <li><span className="lnd-check">✓</span> Fill-in-the-blank practice</li>
            </ul>
            <button className="lnd-feature-btn" onClick={onEnterApp}>Study smarter →</button>
          </div>
        </div>
      </section>

      {/* ── Feature 3: Real-time transcription ── */}
      <section className="lnd-feature" id="transcribe">
        <div className="lnd-feature-inner">
          <div className="lnd-feature-text">
            <div className="lnd-feature-tag" style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500' }}>Transcription</div>
            <h2>Real-time<br />notes from audio</h2>
            <p>
              Record lectures, meetings, or voice memos and get an automatic AI transcript.
              Your audio is synced to your notes so you never miss a word.
            </p>
            <ul className="lnd-feature-list">
              <li><span className="lnd-check">✓</span> One-tap audio recording</li>
              <li><span className="lnd-check">✓</span> AI-powered transcription</li>
              <li><span className="lnd-check">✓</span> Insert transcript directly into notes</li>
              <li><span className="lnd-check">✓</span> Auto-summarize recordings with Claude</li>
            </ul>
            <button className="lnd-feature-btn" onClick={onEnterApp}>Try recording →</button>
          </div>
          <div className="lnd-feature-visual">
            <div className="lnd-transcript-mockup">
              <div className="lnd-tr-top">
                <div className="lnd-tr-rec">
                  <div className="lnd-rec-dot" />
                  Recording…
                </div>
                <div className="lnd-tr-time">0:42</div>
              </div>
              <div className="lnd-tr-wave">
                {[3,5,8,4,9,6,3,7,5,8,4,6,9,3,5,7,4,8,5,6].map((h, i) => (
                  <div key={i} className="lnd-tr-bar" style={{ height: h * 4 }} />
                ))}
              </div>
              <div className="lnd-tr-transcript">
                <div className="lnd-tr-label">Transcript</div>
                <div className="lnd-tr-line">"The derivative of x squared is 2x, which represents the slope of the tangent line at any point on the curve…"</div>
              </div>
              <div className="lnd-tr-ai">
                <span>✦</span> AI Summary: Covers derivatives, tangent lines, and instantaneous rate of change.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="lnd-bottom-cta">
        <div className="lnd-bottom-cta-inner">
          <h2>Try Notability today</h2>
          <p>Everything you need to take better notes and study smarter — free to start.</p>
          <div className="lnd-cta-btns">
            <button className="lnd-cta-btn large" onClick={onEnterApp}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              Open Web App
            </button>
            <button className="lnd-cta-btn-outline" onClick={onEnterApp}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              iOS App
            </button>
          </div>
          <div className="lnd-cta-note">No sign-up required to try the web app.</div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lnd-footer">
        <div className="lnd-footer-inner">
          <div className="lnd-footer-left">
            <div className="lnd-footer-logo">
              <div className="lnd-nav-logo-mark sm">N</div>
              <span>Notability</span>
            </div>
            <span className="lnd-footer-copy">© 2026 Ginger Labs, Inc.</span>
          </div>
          <div className="lnd-footer-links">
            <a href="#">Features</a>
            <a href="#">Support</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Jobs</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
