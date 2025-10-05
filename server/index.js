import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/speech', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Archivo de audio no recibido.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'La API key de OpenAI no está configurada.' });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: { data: req.file.buffer, name: req.file.originalname || 'audio.webm' },
      model: 'gpt-4o-mini-transcribe',
      response_format: 'verbose_json',
      temperature: 0.2
    });

    const userText = transcription.text || transcription.transcript || '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente conversacional en español. Responde de forma breve, amable y clara.'
        },
        {
          role: 'user',
          content: userText || 'No se detectó audio.'
        }
      ],
      temperature: 0.7
    });

    const responseText = completion.choices?.[0]?.message?.content?.trim() || '';

    const speechResponse = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: responseText || 'Lo siento, no pude entenderte.'
    });

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString('base64');

    res.json({
      transcript: userText,
      responseText,
      audioBase64
    });
  } catch (error) {
    console.error('Error en /api/speech', error);
    res.status(500).json({
      error: 'Error al comunicarse con OpenAI.',
      details: error.message
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../dist');

app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
