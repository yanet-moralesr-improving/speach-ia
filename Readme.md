# Speach IA

Aplicación web en React que permite convertir voz a voz usando los servicios de OpenAI. La app captura audio desde el navegador, transcribe lo que el usuario dijo y devuelve una respuesta hablada generada por un asistente IA.

## Requisitos

- Node.js 18 o superior
- Una clave válida de OpenAI almacenada en la variable de entorno `OPENAI_API_KEY`

## Instalación

```bash
npm install
```

## Desarrollo

Ejecuta el servidor de desarrollo (cliente + API) con:

```bash
npm run dev
```

Esto levanta Vite en `http://localhost:5173` y un servidor Express en `http://localhost:5000`. Gracias al proxy configurado, el cliente redirige las peticiones a `/api` hacia el backend.

## Producción

1. Compila la aplicación React:

   ```bash
   npm run build
   ```

2. Inicia el servidor Express que sirve los archivos compilados y expone el endpoint `/api/speech`:

   ```bash
   npm start
   ```

## Uso

1. Abre la aplicación en el navegador y concede permisos de micrófono.
2. Pulsa **Comenzar a hablar** para grabar tu pregunta.
3. Detén la grabación para enviar el audio al backend.
4. El asistente transcribe tu voz, genera una respuesta y la reproduce automáticamente.

Si deseas apuntar a un backend desplegado en otra URL puedes definir `VITE_API_URL` en un archivo `.env` en la raíz del proyecto.
