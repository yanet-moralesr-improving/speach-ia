import { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [audioSrc, setAudioSrc] = useState('');
  const [error, setError] = useState('');

  const supportsRecording = useMemo(
    () => typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia,
    []
  );

  const resetConversation = () => {
    setTranscript('');
    setAiResponse('');
    setAudioSrc('');
    setError('');
  };

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    resetConversation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        try {
          setIsProcessing(true);
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch(`${API_BASE_URL}/api/speech`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Unable to process the audio. Please try again.');
          }

          const data = await response.json();
          setTranscript(data.transcript || '');
          setAiResponse(data.responseText || '');

          if (data.audioBase64) {
            const src = `data:audio/wav;base64,${data.audioBase64}`;
            setAudioSrc(src);
            const audio = new Audio(src);
            await audio.play();
          }
        } catch (err) {
          console.error(err);
          setError(err.message || 'An unexpected error occurred.');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('Microphone access failed. Check your browser permissions.');
    }
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      setIsRecording(false);
    } else {
      await startRecording();
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Speach AI</h1>
        <p>
          Ask your question using the microphone. The OpenAI assistant will
          answer with a voice reply.
        </p>
      </header>

      <main className="card">
        <section className="controls">
          {!supportsRecording && (
            <p className="error">Your browser does not support audio capture.</p>
          )}

          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            type="button"
            onClick={handleToggleRecording}
            disabled={!supportsRecording || isProcessing}
          >
            {isRecording ? 'Stop recording' : 'Start speaking'}
          </button>

          {isProcessing && <p className="status">Processing your audio…</p>}
        </section>

        <section className="results">
          {transcript && (
            <div className="result-block">
              <h2>What you said</h2>
              <p>{transcript}</p>
            </div>
          )}

          {aiResponse && (
            <div className="result-block">
              <h2>Assistant response</h2>
              <p>{aiResponse}</p>
              {audioSrc && (
                <audio controls src={audioSrc} className="player" />
              )}
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </section>

        {(transcript || aiResponse || error) && (
          <button
            type="button"
            className="secondary-btn"
            onClick={resetConversation}
            disabled={isProcessing}
          >
            Clear
          </button>
        )}
      </main>

      <footer className="app-footer">
        <p>
          You must set the <code>OPENAI_API_KEY</code> variable on the server to
          enable the conversation.
        </p>
      </footer>
    </div>
  );
}

export default App;
