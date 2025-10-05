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
          formData.append('audio', audioBlob, 'grabacion.webm');

          const response = await fetch(`${API_BASE_URL}/api/speech`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('No se pudo procesar el audio. Intenta nuevamente.');
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
          setError(err.message || 'Ocurrió un error inesperado.');
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
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
        <h1>Speach IA</h1>
        <p>
          Haz una pregunta hablando con tu micrófono. El asistente de OpenAI
          responderá con voz.
        </p>
      </header>

      <main className="card">
        <section className="controls">
          {!supportsRecording && (
            <p className="error">Tu navegador no soporta captura de audio.</p>
          )}

          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            type="button"
            onClick={handleToggleRecording}
            disabled={!supportsRecording || isProcessing}
          >
            {isRecording ? 'Detener grabación' : 'Comenzar a hablar'}
          </button>

          {isProcessing && <p className="status">Procesando tu audio…</p>}
        </section>

        <section className="results">
          {transcript && (
            <div className="result-block">
              <h2>Lo que dijiste</h2>
              <p>{transcript}</p>
            </div>
          )}

          {aiResponse && (
            <div className="result-block">
              <h2>Respuesta del asistente</h2>
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
            Limpiar
          </button>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Necesitas configurar la variable <code>OPENAI_API_KEY</code> en el
          servidor para habilitar la conversación.
        </p>
      </footer>
    </div>
  );
}

export default App;
