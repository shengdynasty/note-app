import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note } from '../../types';

type LearnTab = 'summary' | 'flashcards' | 'quiz' | 'fillblank' | 'chat';

interface QuizQuestion { question: string; options: string[]; correct: number; explanation?: string; }
interface Flashcard { front: string; back: string; }
interface FillBlank { sentence: string; answer: string; hint?: string; }
interface KeyTerm { term: string; def: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

interface LearnPanelProps {
  note: Note;
  apiKey: string;
  onClose: () => void;
  onSetApiKey: (key: string) => void;
}

function extractNoteText(note: Note): string {
  const parts: string[] = [`Title: ${note.title}`];
  note.textBoxes.forEach(b => { if (b.text.trim()) parts.push(b.text.trim()); });
  if (note.audioSegments?.length) {
    const t = note.audioSegments.map(s => s.text).filter(Boolean).join(' ');
    if (t.trim()) parts.push(`Transcript: ${t}`);
  }
  return parts.join('\n\n') || `Note titled "${note.title}" with handwritten content.`;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 1600
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text ?? '';
}

function parseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as T;
}

// ─── Smart Notes Tab ──────────────────────────────────────────────────────────
function SmartNotesTab({ note, apiKey }: { note: Note; apiKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [keyTerms, setKeyTerms] = useState<KeyTerm[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const noteText = extractNoteText(note);

  const generate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await callClaude(apiKey,
        'You are a study assistant. Return ONLY valid JSON — no markdown, no extra text.',
        [{ role: 'user', content: `Analyze this note. Return JSON exactly:\n{"bullets":["...","...","..."],"keyTerms":[{"term":"...","def":"..."}]}\nInclude 4-6 bullets and 5-8 key terms.\n\nNote:\n${noteText}` }]
      );
      try {
        const p = parseJSON<{ bullets: string[]; keyTerms: KeyTerm[] }>(raw);
        setSummary(p.bullets.join('\n'));
        setKeyTerms(p.keyTerms ?? []);
      } catch {
        setSummary(raw); setKeyTerms([]);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [apiKey, noteText]);

  useEffect(() => { if (!summary && !loading) generate(); }, []); // eslint-disable-line

  const toggleExpand = (i: number) =>
    setExpanded(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  if (loading) return <LoadingState label="Generating Smart Notes…" />;

  if (!summary) return (
    <EmptyState icon="📋" title="Smart Notes" desc="AI reads your note and extracts the key ideas and vocabulary.">
      <button className="lp-btn-primary" onClick={generate}>Generate Smart Notes</button>
    </EmptyState>
  );

  const bullets = summary.split('\n').filter(Boolean);

  return (
    <div className="lp-section">
      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {/* Summary */}
      <div className="lp-card">
        <div className="lp-card-head">
          <span className="lp-card-head-label">Summary</span>
          <button className="lp-copy-btn" onClick={() => navigator.clipboard.writeText(summary)}>Copy</button>
        </div>
        <ul className="lp-bullet-list">
          {bullets.map((b, i) => (
            <li key={i} className="lp-bullet-item">
              <span className="lp-bullet-dot" />
              <span>{b.replace(/^[•\-]\s*/, '')}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Terms */}
      {keyTerms.length > 0 && (
        <div className="lp-card">
          <div className="lp-card-head">
            <span className="lp-card-head-label">Key Terms</span>
            <span className="lp-badge">{keyTerms.length}</span>
          </div>
          <div className="lp-terms-list">
            {keyTerms.map((kt, i) => (
              <div key={i} className={`lp-term-row ${expanded.has(i) ? 'expanded' : ''}`}
                onClick={() => toggleExpand(i)}>
                <div className="lp-term-top">
                  <span className="lp-term-word">{kt.term}</span>
                  <svg className="lp-term-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 4l4 4 4-4" />
                  </svg>
                </div>
                {expanded.has(i) && <div className="lp-term-def">{kt.def}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="lp-regen-btn" onClick={generate}>↺ Regenerate</button>
    </div>
  );
}

// ─── Flashcards Tab ──────────────────────────────────────────────────────────
function FlashcardsTab({ note, apiKey }: { note: Note; apiKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [studying, setStudying] = useState(false); // true = only unknowns
  const [showComplete, setShowComplete] = useState(false);
  const noteText = extractNoteText(note);

  const generate = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await callClaude(apiKey,
        'You are a flashcard generator. Return ONLY a valid JSON array.',
        [{ role: 'user', content: `Generate 10 flashcards from this note. JSON: [{"front":"term or concept","back":"clear definition or explanation"}]\n\nNote:\n${noteText}` }]
      );
      const parsed = parseJSON<Flashcard[]>(raw);
      setCards(parsed); setIdx(0); setFlipped(false); setKnown(new Set()); setShowComplete(false);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [apiKey, noteText]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!cards.length) return;
      if (e.key === 'ArrowRight') advance(1);
      if (e.key === 'ArrowLeft') advance(-1);
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cards, idx]); // eslint-disable-line

  const visibleCards = studying ? cards.map((c, i) => ({ ...c, orig: i })).filter(c => !known.has(c.orig)) : cards.map((c, i) => ({ ...c, orig: i }));
  const current = visibleCards[idx];

  const advance = (dir: number) => {
    setFlipped(false);
    setTimeout(() => setIdx(i => Math.max(0, Math.min(visibleCards.length - 1, i + dir))), 60);
  };

  const markKnown = () => {
    const origIdx = current?.orig ?? idx;
    setKnown(prev => new Set([...prev, origIdx]));
    setFlipped(false);
    if (idx >= visibleCards.length - 1) {
      // last card
      if (known.size + 1 >= cards.length) { setShowComplete(true); return; }
      setIdx(0);
    } else {
      setTimeout(() => setIdx(i => i), 60);
    }
  };

  const markStillLearning = () => {
    setKnown(prev => { const s = new Set(prev); s.delete(current?.orig ?? idx); return s; });
    advance(1);
  };

  const resetStudy = () => { setKnown(new Set()); setIdx(0); setFlipped(false); setShowComplete(false); setStudying(false); };

  if (loading) return <LoadingState label="Creating flashcards…" />;

  if (cards.length === 0) return (
    <EmptyState icon="🃏" title="Flashcards" desc="Study key terms with flip cards — just like Quizlet, powered by your notes.">
      <button className="lp-btn-primary" onClick={generate}>Generate Flashcards</button>
    </EmptyState>
  );

  if (showComplete) return (
    <div className="lp-section lp-center">
      <div className="lp-complete-icon">🎉</div>
      <h2 className="lp-complete-title">You know all {cards.length} cards!</h2>
      <p className="lp-complete-sub">Great work. Want to review again?</p>
      <div className="lp-complete-actions">
        <button className="lp-btn-primary" onClick={resetStudy}>Restart</button>
        <button className="lp-btn-secondary" onClick={generate}>New Set</button>
      </div>
    </div>
  );

  const knownCount = known.size;
  const progress = (knownCount / cards.length) * 100;

  return (
    <div className="lp-section lp-fc-layout">
      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {/* Progress */}
      <div className="lp-fc-progress-row">
        <div className="lp-fc-progress-bar">
          <div className="lp-fc-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="lp-fc-progress-label">{knownCount}/{cards.length} known</span>
        <button
          className={`lp-fc-study-toggle ${studying ? 'active' : ''}`}
          onClick={() => { setStudying(s => !s); setIdx(0); setFlipped(false); }}>
          {studying ? '⟲ All cards' : '🎯 Study unknowns'}
        </button>
      </div>

      {/* Card counter */}
      <div className="lp-fc-counter">
        <button className="lp-fc-nav" onClick={() => advance(-1)} disabled={idx === 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="lp-fc-counter-text">{idx + 1} / {visibleCards.length}</span>
        <button className="lp-fc-nav" onClick={() => advance(1)} disabled={idx >= visibleCards.length - 1}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* Flip card */}
      <div className="lp-fc-scene" onClick={() => setFlipped(f => !f)}>
        <div className={`lp-fc-card ${flipped ? 'flipped' : ''}`}>
          <div className="lp-fc-face lp-fc-front">
            <div className="lp-fc-side-tag">Term</div>
            <div className="lp-fc-text">{current?.front}</div>
            <div className="lp-fc-tap-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
              tap to flip
            </div>
          </div>
          <div className="lp-fc-face lp-fc-back">
            <div className="lp-fc-side-tag">Definition</div>
            <div className="lp-fc-text">{current?.back}</div>
          </div>
        </div>
      </div>

      {/* Know it / Still learning */}
      {flipped && (
        <div className="lp-fc-grade-row">
          <button className="lp-fc-grade-btn still" onClick={markStillLearning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            Still learning
          </button>
          <button className="lp-fc-grade-btn know" onClick={markKnown}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Know it
          </button>
        </div>
      )}

      {/* Dot nav */}
      <div className="lp-fc-dots">
        {visibleCards.map((c, i) => (
          <button key={i}
            className={`lp-fc-dot ${i === idx ? 'active' : ''} ${known.has(c.orig) ? 'known' : ''}`}
            onClick={() => { setIdx(i); setFlipped(false); }} />
        ))}
      </div>

      <div className="lp-fc-actions">
        <button className="lp-regen-btn" onClick={generate}>↺ New Set</button>
        <span className="lp-fc-kbd-hint">← → arrows · space to flip</span>
      </div>
    </div>
  );
}

// ─── Quiz Tab ────────────────────────────────────────────────────────────────
function QuizTab({ note, apiKey }: { note: Note; apiKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const noteText = extractNoteText(note);

  const generate = useCallback(async () => {
    setLoading(true); setError(''); setAnswers({}); setCurrent(0); setShowResults(false);
    try {
      const raw = await callClaude(apiKey,
        'You are a quiz generator. Return ONLY a valid JSON array, no markdown.',
        [{ role: 'user', content: `Generate 6 multiple-choice questions from this note. JSON: [{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"brief explanation"}]\n\nNote:\n${noteText}` }]
      );
      setQuestions(parseJSON<QuizQuestion[]>(raw));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [apiKey, noteText]);

  if (loading) return <LoadingState label="Generating quiz…" />;

  if (questions.length === 0) return (
    <EmptyState icon="❓" title="Quiz" desc="Test yourself with AI-generated multiple choice questions from your notes.">
      <button className="lp-btn-primary" onClick={generate}>Generate Quiz</button>
    </EmptyState>
  );

  if (showResults) {
    const score = questions.filter((q, i) => answers[i] === q.correct).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="lp-section">
        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
        <div className={`lp-quiz-result-card ${pct === 100 ? 'perfect' : pct >= 70 ? 'good' : 'ok'}`}>
          <div className="lp-quiz-result-emoji">{pct === 100 ? '🎉' : pct >= 70 ? '👍' : '💪'}</div>
          <div className="lp-quiz-result-score">{score}/{questions.length}</div>
          <div className="lp-quiz-result-pct">{pct}%</div>
          <div className="lp-quiz-result-msg">
            {pct === 100 ? 'Perfect score!' : pct >= 70 ? 'Nice work!' : 'Keep studying!'}
          </div>
        </div>

        {questions.map((q, i) => {
          const userAns = answers[i];
          const correct = userAns === q.correct;
          return (
            <div key={i} className={`lp-quiz-review-card ${correct ? 'correct' : 'wrong'}`}>
              <div className="lp-quiz-review-status">{correct ? '✓' : '✗'}</div>
              <div className="lp-quiz-review-body">
                <div className="lp-quiz-review-q">Q{i + 1}. {q.question}</div>
                {!correct && userAns !== undefined && (
                  <div className="lp-quiz-review-your">Your answer: {q.options[userAns]}</div>
                )}
                <div className="lp-quiz-review-correct">Correct: {q.options[q.correct]}</div>
                {q.explanation && <div className="lp-quiz-review-exp">{q.explanation}</div>}
              </div>
            </div>
          );
        })}

        <div className="lp-quiz-end-btns">
          <button className="lp-btn-secondary" onClick={() => { setAnswers({}); setCurrent(0); setShowResults(false); }}>Retry</button>
          <button className="lp-btn-primary" onClick={generate}>New Quiz</button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answered = answers[current] !== undefined;
  const isLast = current === questions.length - 1;

  return (
    <div className="lp-section">
      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {/* Progress bar */}
      <div className="lp-quiz-progress">
        <div className="lp-quiz-progress-bar">
          <div className="lp-quiz-progress-fill" style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }} />
        </div>
        <span className="lp-quiz-progress-label">{Object.keys(answers).length}/{questions.length}</span>
      </div>

      {/* Question card */}
      <div className="lp-quiz-card">
        <div className="lp-quiz-num">Question {current + 1} of {questions.length}</div>
        <div className="lp-quiz-question">{q.question}</div>

        <div className="lp-quiz-options">
          {q.options.map((opt, oi) => {
            const isSelected = answers[current] === oi;
            const isCorrect = q.correct === oi;
            let cls = '';
            if (answered) {
              if (isCorrect) cls = 'correct';
              else if (isSelected) cls = 'wrong';
            }
            return (
              <button key={oi}
                className={`lp-quiz-opt ${cls} ${!answered ? 'hoverable' : ''}`}
                onClick={() => !answered && setAnswers(p => ({ ...p, [current]: oi }))}>
                <span className="lp-opt-letter">{['A', 'B', 'C', 'D'][oi]}</span>
                <span className="lp-opt-text">{opt}</span>
                {answered && isCorrect && <span className="lp-opt-check">✓</span>}
                {answered && isSelected && !isCorrect && <span className="lp-opt-x">✗</span>}
              </button>
            );
          })}
        </div>

        {answered && q.explanation && (
          <div className="lp-quiz-explanation">
            <span className="lp-quiz-exp-icon">💡</span>
            {q.explanation}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="lp-quiz-nav">
        <button className="lp-btn-ghost" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
          ← Back
        </button>
        {isLast ? (
          <button
            className="lp-btn-primary"
            onClick={() => setShowResults(true)}
            disabled={Object.keys(answers).length < questions.length}>
            See Results
          </button>
        ) : (
          <button
            className="lp-btn-primary"
            onClick={() => setCurrent(c => c + 1)}
            disabled={!answered}>
            Next →
          </button>
        )}
      </div>

      {/* Dot navigation */}
      <div className="lp-fc-dots" style={{ marginTop: 4 }}>
        {questions.map((_, i) => (
          <button key={i}
            className={`lp-fc-dot ${i === current ? 'active' : ''} ${answers[i] !== undefined ? (answers[i] === questions[i].correct ? 'known' : 'wrong-dot') : ''}`}
            onClick={() => setCurrent(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Fill-in-the-Blank Tab ───────────────────────────────────────────────────
function FillBlankTab({ note, apiKey }: { note: Note; apiKey: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<FillBlank[]>([]);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const noteText = extractNoteText(note);

  const generate = useCallback(async () => {
    setLoading(true); setError(''); setInputs({}); setChecked(false);
    try {
      const raw = await callClaude(apiKey,
        'You are a fill-in-the-blank question generator. Return ONLY a valid JSON array.',
        [{ role: 'user', content: `Generate 6 fill-in-the-blank sentences from this note. Replace one key word with ___. JSON: [{"sentence":"The ___ is the powerhouse of the cell.","answer":"mitochondria","hint":"an organelle"}]\n\nNote:\n${noteText}` }]
      );
      setItems(parseJSON<FillBlank[]>(raw));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [apiKey, noteText]);

  if (loading) return <LoadingState label="Generating questions…" />;

  if (items.length === 0) return (
    <EmptyState icon="✏️" title="Fill in the Blank" desc="Complete sentences by filling in missing key words from your notes.">
      <button className="lp-btn-primary" onClick={generate}>Generate Questions</button>
    </EmptyState>
  );

  const score = items.filter((q, i) =>
    (inputs[i] ?? '').trim().toLowerCase() === q.answer.toLowerCase()
  ).length;

  return (
    <div className="lp-section">
      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {checked && (
        <div className={`lp-score-pill ${score === items.length ? 'perfect' : score >= items.length * 0.6 ? 'good' : 'ok'}`}>
          {score === items.length ? '🎉' : score >= items.length * 0.6 ? '👍' : '💪'}
          &nbsp; {score}/{items.length} correct
        </div>
      )}

      {items.map((q, i) => {
        const userAns = inputs[i] ?? '';
        const correct = checked && userAns.trim().toLowerCase() === q.answer.toLowerCase();
        const wrong = checked && userAns.trim() !== '' && !correct;
        const blank = checked && userAns.trim() === '';
        const parts = q.sentence.split('___');
        return (
          <div key={i} className={`lp-fill-card ${correct ? 'correct' : wrong ? 'wrong' : blank ? 'blank' : ''}`}>
            <div className="lp-fill-num">Q{i + 1}</div>
            <div className="lp-fill-sentence">
              {parts.map((part, pi) => (
                <React.Fragment key={pi}>
                  <span>{part}</span>
                  {pi < parts.length - 1 && (
                    <input
                      className={`lp-fill-input ${correct ? 'correct' : wrong ? 'wrong' : ''}`}
                      value={userAns}
                      onChange={e => setInputs(p => ({ ...p, [i]: e.target.value }))}
                      disabled={checked}
                      placeholder="___"
                      spellCheck={false}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            {checked && (correct
              ? <div className="lp-fill-feedback correct">✓ Correct!</div>
              : wrong
                ? <div className="lp-fill-feedback wrong">✗ Answer: <strong>{q.answer}</strong></div>
                : <div className="lp-fill-feedback blank">Answer: <strong>{q.answer}</strong></div>
            )}
            {!checked && q.hint && <div className="lp-fill-hint">💡 {q.hint}</div>}
          </div>
        );
      })}

      <div className="lp-fill-actions">
        {!checked ? (
          <button className="lp-btn-primary"
            onClick={() => setChecked(true)}
            disabled={Object.keys(inputs).length === 0}>
            Check Answers
          </button>
        ) : (
          <button className="lp-btn-secondary"
            onClick={() => { setInputs({}); setChecked(false); }}>
            Try Again
          </button>
        )}
        <button className="lp-regen-btn" onClick={generate}>↺ New Questions</button>
      </div>
    </div>
  );
}

// ─── Chat Tab ────────────────────────────────────────────────────────────────
function ChatTab({ note, apiKey }: { note: Note; apiKey: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const noteText = extractNoteText(note);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput(''); setLoading(true); setError('');
    try {
      const res = await callClaude(apiKey,
        `You are a helpful study assistant. Answer based on this note:\n\n${noteText}\n\nIf not covered, still help but note what's from the note vs general knowledge.`,
        updated, 1200
      );
      setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const SUGGESTIONS = ['Summarize the main ideas', 'What are the key terms?', 'Explain this in simpler terms', 'What might be on a test?'];

  return (
    <div className="lp-chat-layout">
      <div className="lp-chat-messages">
        {messages.length === 0 && (
          <div className="lp-chat-empty">
            <div className="lp-chat-empty-icon">💬</div>
            <div className="lp-chat-empty-title">Chat with your notes</div>
            <div className="lp-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="lp-suggestion" onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`lp-bubble ${m.role}`}>
            {m.role === 'assistant' && <div className="lp-bubble-icon">✦</div>}
            <div className="lp-bubble-text">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="lp-bubble assistant">
            <div className="lp-bubble-icon">✦</div>
            <div className="lp-typing"><span /><span /><span /></div>
          </div>
        )}
        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
        <div ref={endRef} />
      </div>

      <div className="lp-chat-bar">
        {messages.length > 0 && (
          <button className="lp-clear-chat" onClick={() => setMessages([])}>Clear</button>
        )}
        <div className="lp-chat-input-wrap">
          <textarea
            className="lp-chat-input"
            rows={1}
            placeholder="Ask anything about your notes…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
          />
          <button className="lp-chat-send" onClick={send} disabled={!input.trim() || loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function LoadingState({ label }: { label: string }) {
  return (
    <div className="lp-loading">
      <div className="lp-loading-ring" />
      <p>{label}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="lp-empty">
      <div className="lp-empty-icon">{icon}</div>
      <h3 className="lp-empty-title">{title}</h3>
      <p className="lp-empty-desc">{desc}</p>
      {children}
    </div>
  );
}

function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="lp-error">
      <span>⚠️ {msg}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main LearnPanel ──────────────────────────────────────────────────────────
export default function LearnPanel({ note, apiKey, onClose, onSetApiKey }: LearnPanelProps) {
  const [tab, setTab] = useState<LearnTab>('summary');
  const [tempKey, setTempKey] = useState('');
  const hasKey = apiKey.trim().startsWith('sk-');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const TABS: { id: LearnTab; icon: React.ReactNode; label: string }[] = [
    {
      id: 'summary', label: 'Smart Notes',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
    },
    {
      id: 'flashcards', label: 'Flashcards',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="3" /><line x1="2" y1="9" x2="22" y2="9" /></svg>,
    },
    {
      id: 'quiz', label: 'Quiz',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
    {
      id: 'fillblank', label: 'Fill-in',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>,
    },
    {
      id: 'chat', label: 'Chat',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    },
  ];

  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="lp-header">
          <div className="lp-header-left">
            <div className="lp-header-logo">✦</div>
            <div className="lp-header-info">
              <div className="lp-header-title">Learn</div>
              <div className="lp-header-note">{note.title}</div>
            </div>
          </div>
          <button className="lp-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="lp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`lp-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="lp-body">
          {!hasKey ? (
            <div className="lp-key-gate">
              <div className="lp-key-icon">🔑</div>
              <h3>Connect Claude AI</h3>
              <p>Enter your Anthropic API key to unlock Smart Notes, Flashcards, Quiz, Fill-in, and Chat.</p>
              <div className="lp-key-row">
                <input type="password" placeholder="sk-ant-…" value={tempKey}
                  onChange={e => setTempKey(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && tempKey.trim()) onSetApiKey(tempKey.trim()); }} />
                <button className="lp-btn-primary"
                  onClick={() => { if (tempKey.trim()) onSetApiKey(tempKey.trim()); }}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {tab === 'summary' && <SmartNotesTab note={note} apiKey={apiKey} />}
              {tab === 'flashcards' && <FlashcardsTab note={note} apiKey={apiKey} />}
              {tab === 'quiz' && <QuizTab note={note} apiKey={apiKey} />}
              {tab === 'fillblank' && <FillBlankTab note={note} apiKey={apiKey} />}
              {tab === 'chat' && <ChatTab note={note} apiKey={apiKey} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
