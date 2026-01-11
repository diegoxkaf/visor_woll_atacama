import { indexGeoJSON } from './geojson-indexer.js';
import { analyzeQuery, generateSuggestions } from './query-analyzer.js';
import { buildContext, limitContextTokens } from './context-builder.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API Key not configured in Vercel environment variables.' });
  }

  try {
    // 1. Indexar GeoJSON (usa caché si ya está cargado)
    const metadata = await indexGeoJSON();

    // 2. Obtener la última consulta del usuario
    const userMessage = messages[messages.length - 1];
    const userQuery = userMessage.content;

    // 3. Analizar la consulta
    const analysis = analyzeQuery(userQuery);

    // 4. Construir contexto basado en el análisis
    const { context, hasData } = buildContext(analysis, metadata);
    const limitedContext = limitContextTokens(context, 2000);

    // 5. Construir mensaje de sistema con contexto
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente experto para el Visor Territorial Water Oriented Living Lab (WoLL) de la Región de Atacama.

Tu objetivo es ayudar a los usuarios a entender los datos geoespaciales disponibles en el visor.

${limitedContext}

INSTRUCCIONES:
- Responde basándote ÚNICAMENTE en los datos proporcionados arriba
- Si no tienes información suficiente, sugiere al usuario que explore las capas del mapa
- Sé conciso pero informativo
- Usa números y estadísticas cuando estén disponibles
- Si el usuario pregunta sobre relaciones entre datos, analiza las estadísticas proporcionadas`
    };

    // 6. Preparar mensajes para Groq
    const groqMessages = [
      systemMessage,
      ...messages
    ];

    // 7. Llamar a Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: groqMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Error from Groq API' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in chat handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
