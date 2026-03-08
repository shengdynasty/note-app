import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  isRecording: boolean;
  onToggle: () => void;
  onTranscriptAdded?: (text: string, startTime: number) => void;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioRecorder({ isRecording, onToggle, onTranscriptAdded }: AudioRecorderProps) {
  const [elapsed, setElapsed] = useState(0);
  const [waveBars, setWaveBars] = useState<number[]>(Array(20).fill(4));
  const [transcripts, setTranscripts] = useState<{ time: number; text: string }[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const waveRef = useRef<ReturnType<typeof setInterval>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording) {
      startRef.current = Date.now() - elapsed;
      timerRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
      waveRef.current = setInterval(() => {
        setWaveBars(Array(20).fill(0).map(() => 4 + Math.random() * 24));
      }, 120);

      // Web Speech API for transcription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const SpeechRecognitionAPI = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const last = event.results[event.results.length - 1];
          if (last.isFinal) {
            const text = last[0].transcript.trim();
            const time = Date.now() - startRef.current;
            setTranscripts(prev => [...prev, { time, text }]);
            onTranscriptAdded?.(text, time);
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } else {
      clearInterval(timerRef.current);
      clearInterval(waveRef.current);
      setWaveBars(Array(20).fill(4));
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
      if (elapsed === 0) return;
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(waveRef.current);
    };
  }, [isRecording]);

  if (!isRecording && transcripts.length === 0) return null;

  return (
    <div className="audio-recorder">
      <div className="audio-recorder-row">
        <button className={`record-btn ${isRecording ? 'recording' : 'idle'}`} onClick={onToggle}>
          {isRecording ? '⏹' : '▶'}
        </button>
        <div className="audio-waveform">
          {waveBars.map((h, i) => (
            <div key={i} className="wave-bar" style={{ height: isRecording ? h : 4 }} />
          ))}
        </div>
        <span className="audio-time">{formatTime(elapsed)}</span>
      </div>

      {transcripts.length > 0 && (
        <div className="audio-transcripts">
          {transcripts.slice(-5).map((t, i) => (
            <div key={i} className="audio-transcript-item">
              <span className="audio-transcript-time">{formatTime(t.time)}</span>
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
