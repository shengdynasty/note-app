import React, { useState, useRef } from 'react';

interface TranscriptModalProps {
  apiKey: string;
  onClose: () => void;
  onInsertText: (text: string) => void;
}

type TranscriptTab = 'file' | 'youtube' | 'paste';

async function callClaude(apiKey: string, system: string, user: string): Promise<string> {
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
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text as string;
}

export default function TranscriptModal({ apiKey, onClose, onInsertText }: TranscriptModalProps) {
  const [tab, setTab] = useState<TranscriptTab>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  function startFileTranscription(file: File) {
    setError('');
    setTranscript('');
    setSummary('');
    setLoading(true);

    // Use Web Speech API to transcribe by playing audio/video
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith('video') ? document.createElement('video') : document.createElement('audio');
    media.src = url;
    media.style.display = 'none';
    document.body.appendChild(media);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Web Speech API not supported in this browser. Please use Chrome.');
      setLoading(false);
      URL.revokeObjectURL(url);
      document.body.removeChild(media);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let fullTranscript = '';
    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fullTranscript += e.results[i][0].transcript + ' ';
      }
      setTranscript(fullTranscript.trim());
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') setError(`Recognition error: ${e.error}`);
    };
    recognition.onend = () => {
      media.pause();
      setIsRecordingAudio(false);
      setLoading(false);
      setTranscript(fullTranscript.trim());
      URL.revokeObjectURL(url);
      document.body.removeChild(media);
    };

    media.onended = () => recognition.stop();
    media.play().then(() => {
      recognition.start();
      setIsRecordingAudio(true);
    }).catch(err => {
      setError(`Cannot play file: ${err.message}`);
      setLoading(false);
    });
  }

  async function fetchYouTubeTranscript() {
    if (!youtubeUrl.trim()) return;
    setError('');
    setTranscript('');
    setSummary('');
    setLoading(true);

    try {
      // Extract video ID
      const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      if (!match) throw new Error('Invalid YouTube URL');
      const videoId = match[1];

      // Try to fetch captions via YouTube's timedtext API (public, no auth needed for auto-captions)
      const captionUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
      const res = await fetch(captionUrl);
      if (!res.ok) throw new Error('Could not fetch YouTube captions. The video may not have English captions.');

      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lines: string[] = (data.events ?? []).map((ev: any) => (ev.segs ?? []).map((s: any) => s.utf8 ?? '').join('')).filter(Boolean);
      const raw = lines.join(' ').replace(/\n/g, ' ').trim();
      if (!raw) throw new Error('No captions found for this video.');
      setTranscript(raw);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    const text = transcript || pasteText;
    if (!text) return;
    if (!apiKey) { setError('Set your Claude API key in Settings first.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await callClaude(
        apiKey,
        'You are a helpful note-taking assistant. Create clear, structured notes from transcripts.',
        `Please create organized, detailed notes from this transcript. Include:\n- A brief summary\n- Key points as bullet points\n- Any action items or important conclusions\n\nTranscript:\n${text}`
      );
      setSummary(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecordingAudio(false);
    setLoading(false);
  }

  const activeText = summary || transcript || pasteText;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content transcript-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎬 Transcript & Auto-Notes</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="transcript-tabs">
          {(['file', 'youtube', 'paste'] as TranscriptTab[]).map(t => (
            <button
              key={t}
              className={`transcript-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'file' ? '📁 Audio/Video File' : t === 'youtube' ? '▶ YouTube URL' : '📋 Paste Transcript'}
            </button>
          ))}
        </div>

        <div className="transcript-body">
          {tab === 'file' && (
            <div className="transcript-section">
              <p className="transcript-hint">Upload an audio or video file. It will be transcribed using your browser's speech recognition.</p>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) startFileTranscription(f); }}
              />
              <div className="transcript-upload-row">
                <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
                  {loading && isRecordingAudio ? '🎙 Transcribing...' : '📂 Choose File'}
                </button>
                {isRecordingAudio && (
                  <button className="btn-danger" onClick={stopRecording}>⏹ Stop</button>
                )}
              </div>
            </div>
          )}

          {tab === 'youtube' && (
            <div className="transcript-section">
              <p className="transcript-hint">Enter a YouTube URL to fetch its auto-generated captions.</p>
              <div className="transcript-input-row">
                <input
                  className="transcript-url-input"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchYouTubeTranscript()}
                />
                <button className="btn-primary" onClick={fetchYouTubeTranscript} disabled={loading || !youtubeUrl.trim()}>
                  {loading ? '⏳ Fetching...' : 'Fetch'}
                </button>
              </div>
            </div>
          )}

          {tab === 'paste' && (
            <div className="transcript-section">
              <p className="transcript-hint">Paste any text or transcript to generate AI notes.</p>
              <textarea
                className="transcript-textarea"
                placeholder="Paste your transcript or text here..."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={6}
              />
            </div>
          )}

          {error && <div className="transcript-error">{error}</div>}

          {transcript && (
            <div className="transcript-result">
              <div className="transcript-result-label">Raw Transcript</div>
              <div className="transcript-result-text">{transcript}</div>
            </div>
          )}

          {summary && (
            <div className="transcript-result summary">
              <div className="transcript-result-label">AI Notes</div>
              <div className="transcript-result-text">{summary}</div>
            </div>
          )}
        </div>

        <div className="transcript-footer">
          <button
            className="btn-ai"
            onClick={handleSummarize}
            disabled={loading || (!transcript && !pasteText) || !apiKey}
            title={!apiKey ? 'Add Claude API key in Settings' : ''}
          >
            {loading && !isRecordingAudio ? '⏳ Generating...' : '✦ Generate AI Notes'}
          </button>
          {activeText && (
            <button className="btn-primary" onClick={() => { onInsertText(activeText); onClose(); }}>
              Insert into Note
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
