// /api/generate-article.js
// Vercel serverless function — proxies Google Gemini API server-side.
// Using gemini-2.5-flash — current stable model as of July 2026.
// Free tier: available via Google AI Studio key (aistudio.google.com)
//
// Required Vercel environment variable:
//   GEMINI_API_KEY  (Vercel dashboard → Settings → Environment Variables)

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing "prompt" string in request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in environment variables.');
    return res.status(500).json({
      error: 'Server not configured. Add GEMINI_API_KEY in Vercel environment variables.'
    });
  }

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: 'Gemini API request failed',
        detail: data?.error?.message || JSON.stringify(data),
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('Gemini returned empty content:', JSON.stringify(data));
      return res.status(500).json({ error: 'Gemini returned empty content' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('Unexpected error calling Gemini API:', err);
    return res.status(500).json({ error: 'Unexpected server error', detail: err.message });
  }
};
