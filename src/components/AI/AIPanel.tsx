import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../../types';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface Flashcard {
  front: string;
  back: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AITab = 'actions' | 'quiz' | 'flashcards' | 'chat';

interface AIPanelProps {
  note: Note;
  apiKey: string;
  onClose: () => void;
  onSetApiKey: (key: string) => void;
}

function extractNoteText(note: Note): string {
  const parts: string[] = [`Note: ${note.title}`];
  note.textBoxes.forEach(b => { if (b.text.trim()) parts.push(b.text.trim()); });
  return parts.join('\n\n') || `Note titled "${note.title}" with handwritten content.`;
}

async function callClaude(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
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
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text ?? '';
}

export default function AIPanel({ note, apiKey, onClose, onSetApiKey }: AIPanelProps) {
  const [tab, setTab] = useState<AITab>('actions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [tempKey, setTempKey] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const noteText = extractNoteText(note);
  const hasKey = apiKey.trim().startsWith('sk-');

  const run = async (task: () => Promise<void>) => {
    setLoading(true); setError('');
    try { await task(); } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const handleSummarize = () => run(async () => {
    const text = await callClaude(apiKey,
      'You are a helpful study assistant. Be concise and clear.',
      `Please summarize this note in 3-5 bullet points:\n\n${noteText}`
    );
    setSummary(text); setTab('actions');
  });

  const handleActionItems = () => run(async () => {
    const text = await callClaude(apiKey,
      'You are a productivity assistant. Extract clear, actionable tasks.',
      `Extract action items and tasks from this note. Format as a bulleted list:\n\n${noteText}`
    );
    setActionItems(text); setTab('actions');
  });

  const handleGenerateQuiz = () => run(async () => {
    const raw = await callClaude(apiKey,
      'You are a quiz generator. Return ONLY valid JSON, no markdown, no explanation.',
      `Generate 5 multiple-choice quiz questions from this note. Return JSON array: [{"question":"...","options":["A","B","C","D"],"correct":0}]\n\nNote:\n${noteText}`
    );
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned) as QuizQuestion[];
      setQuiz(parsed); setAnswers({}); setTab('quiz');
    } catch {
      throw new Error('Failed to parse quiz. Try again.');
    }
  });

  const handleGenerateFlashcards = () => run(async () => {
    const raw = await callClaude(apiKey,
      'You are a flashcard generator. Return ONLY valid JSON, no markdown.',
      `Generate 6 flashcards from this note. Return JSON array: [{"front":"term or question","back":"definition or answer"}]\n\nNote:\n${noteText}`
    );
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned) as Flashcard[];
      setFlashcards(parsed); setFlashIdx(0); setFlipped(false); setTab('flashcards');
    } catch {
      throw new Error('Failed to parse flashcards. Try again.');
    }
  });

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setLoading(true); setError('');
    try {
      const history = [...chatMessages, userMsg];
      const res = await callClaude(apiKey,
        `You are a helpful assistant answering questions about the user's note. Note content:\n\n${noteText}`,
        history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      );
      setChatMessages(prev => [...prev, { role: 'assistant', content: res }]);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  const score = quiz.length > 0
    ? Object.entries(answers).filter(([i, a]) => quiz[Number(i)]?.correct === a).length
    : 0;

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className="ai-panel-hero">
          <div className="ai-panel-hero-top">
            <div className="ai-panel-title">✦ AI Assistant</div>
            <button className="ai-panel-close" onClick={onClose}>✕</button>
          </div>
          <div className="ai-panel-subtitle">Turn your notes into knowledge</div>
        </div>
        <div className="ai-tabs">
          {(['actions', 'quiz', 'flashcards', 'chat'] as AITab[]).map(t => (
            <button key={t} className={`ai-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'actions' ? '⚡ Actions' : t === 'quiz' ? '❓ Quiz' : t === 'flashcards' ? '🃏 Cards' : '💬 Chat'}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-panel-body">
        {!hasKey && (
          <div className="api-key-banner">
            <p>Enter your Anthropic API key to enable AI features like summaries, quizzes, flashcards, and chat.</p>
            <div className="api-key-input-row">
              <input type="password" placeholder="sk-ant-..." value={tempKey}
                onChange={e => setTempKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && tempKey.trim()) onSetApiKey(tempKey.trim()); }} />
              <button className="save-key-btn" onClick={() => { if (tempKey.trim()) onSetApiKey(tempKey.trim()); }}>Save</button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#FF3B30' }}>
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="ai-loading">
            <div className="ai-spinner" />
            <span>AI is thinking…</span>
          </div>
        )}

        {/* Actions tab */}
        {tab === 'actions' && !loading && (
          <>
            <div className="ai-actions">
              <button className="ai-action-btn" onClick={handleSummarize} disabled={!hasKey}>
                <span className="ai-action-icon">📋</span>
                <span>Summarize</span>
                <span className="ai-action-label">Key points</span>
              </button>
              <button className="ai-action-btn" onClick={handleActionItems} disabled={!hasKey}>
                <span className="ai-action-icon">✅</span>
                <span>Action Items</span>
                <span className="ai-action-label">Extract tasks</span>
              </button>
              <button className="ai-action-btn" onClick={handleGenerateQuiz} disabled={!hasKey}>
                <span className="ai-action-icon">❓</span>
                <span>Quiz Me</span>
                <span className="ai-action-label">Test knowledge</span>
              </button>
              <button className="ai-action-btn" onClick={handleGenerateFlashcards} disabled={!hasKey}>
                <span className="ai-action-icon">🃏</span>
                <span>Flashcards</span>
                <span className="ai-action-label">Study mode</span>
              </button>
            </div>

            {summary && (
              <div className="ai-result-card">
                <div className="ai-result-header">
                  <div className="ai-result-title">📋 Summary</div>
                  <button className="ai-copy-btn" onClick={() => navigator.clipboard.writeText(summary)}>Copy</button>
                </div>
                <div className="ai-result-body">{summary}</div>
              </div>
            )}

            {actionItems && (
              <div className="ai-result-card">
                <div className="ai-result-header">
                  <div className="ai-result-title">✅ Action Items</div>
                  <button className="ai-copy-btn" onClick={() => navigator.clipboard.writeText(actionItems)}>Copy</button>
                </div>
                <div className="ai-result-body">{actionItems}</div>
              </div>
            )}

            {!summary && !actionItems && hasKey && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✦</div>
                Choose an action to get started
              </div>
            )}
          </>
        )}

        {/* Quiz tab */}
        {tab === 'quiz' && !loading && (
          <>
            {quiz.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>❓</div>
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Generate a quiz from your note content</p>
                <button className="ai-action-btn" style={{ margin: '0 auto' }} onClick={handleGenerateQuiz} disabled={!hasKey}>
                  <span className="ai-action-icon">❓</span>
                  <span>Generate Quiz</span>
                </button>
              </div>
            ) : (
              <>
                {Object.keys(answers).length === quiz.length && (
                  <div className="quiz-score">Score: {score}/{quiz.length} ({Math.round(score / quiz.length * 100)}%)</div>
                )}
                {quiz.map((q, qi) => (
                  <div key={qi} className="quiz-card">
                    <div className="quiz-question">Q{qi + 1}. {q.question}</div>
                    <div className="quiz-options">
                      {q.options.map((opt, oi) => {
                        const answered = answers[qi] !== undefined;
                        const isSelected = answers[qi] === oi;
                        const isCorrect = q.correct === oi;
                        return (
                          <button key={oi}
                            className={`quiz-option ${answered && isSelected && isCorrect ? 'correct' : ''} ${answered && isSelected && !isCorrect ? 'wrong' : ''} ${answered && !isSelected && isCorrect ? 'correct' : ''}`}
                            onClick={() => !answered && setAnswers(prev => ({ ...prev, [qi]: oi }))}>
                            {['A', 'B', 'C', 'D'][oi]}. {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button className="ai-action-btn" style={{ width: '100%', marginTop: 8 }} onClick={handleGenerateQuiz} disabled={!hasKey}>
                  <span>↺</span> Regenerate Quiz
                </button>
              </>
            )}
          </>
        )}

        {/* Flashcards tab */}
        {tab === 'flashcards' && !loading && (
          <>
            {flashcards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
                <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Create flashcards from your notes</p>
                <button className="ai-action-btn" style={{ margin: '0 auto' }} onClick={handleGenerateFlashcards} disabled={!hasKey}>
                  <span className="ai-action-icon">🃏</span>
                  <span>Generate Flashcards</span>
                </button>
              </div>
            ) : (
              <>
                <div className="flashcard-container" onClick={() => setFlipped(!flipped)}>
                  <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
                    <div className="flashcard-face flashcard-front">
                      <div className="flashcard-label">Term</div>
                      <div className="flashcard-text">{flashcards[flashIdx]?.front}</div>
                      <div className="flashcard-hint">Tap to reveal</div>
                    </div>
                    <div className="flashcard-face flashcard-back">
                      <div className="flashcard-label">Definition</div>
                      <div className="flashcard-text">{flashcards[flashIdx]?.back}</div>
                    </div>
                  </div>
                </div>
                <div className="flashcard-nav">
                  <button onClick={() => { setFlashIdx(Math.max(0, flashIdx - 1)); setFlipped(false); }}>← Prev</button>
                  <span className="flashcard-progress">{flashIdx + 1} / {flashcards.length}</span>
                  <button onClick={() => { setFlashIdx(Math.min(flashcards.length - 1, flashIdx + 1)); setFlipped(false); }}>Next →</button>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  {flashcards.map((_, i) => (
                    <button key={i}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: i === flashIdx ? 'var(--accent)' : 'var(--border)', padding: 0 }}
                      onClick={() => { setFlashIdx(i); setFlipped(false); }} />
                  ))}
                </div>
                <button className="ai-action-btn" style={{ width: '100%' }} onClick={handleGenerateFlashcards} disabled={!hasKey}>
                  <span>↺</span> Regenerate
                </button>
              </>
            )}
          </>
        )}

        {/* Chat tab */}
        {tab === 'chat' && !loading && (
          <>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  Ask anything about your note
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-row">
              <textarea className="chat-input" placeholder="Ask about your notes…"
                value={chatInput} rows={2}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!loading) handleChat(); } }}
                disabled={!hasKey || loading} />
              <button className="chat-send-btn" onClick={handleChat} disabled={!hasKey || loading || !chatInput.trim()}>
                ↑
              </button>
            </div>
            {chatMessages.length > 0 && (
              <button style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, width: '100%', textAlign: 'center' }}
                onClick={() => setChatMessages([])}>Clear chat</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
