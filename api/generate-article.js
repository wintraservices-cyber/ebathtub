// /api/generate-article.js
// Vercel serverless function — proxies Google Gemini API server-side.
// Free tier: 1,500 requests/day, 15 requests/min on gemini-1.5-flash.
// No credit card required. Get your key at aistudio.google.com.
//
// Required Vercel environment variable:
//   GEMINI_API_KEY  (Vercel dashboard → Settings → Environment Variables)

const GEMINI_MODEL = 'gemini-1.5-flash';
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
    return res.status(500).json({ error: 'Server not configured. Add GEMINI_API_KEY in Vercel environment variables.' });
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

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return res.status(response.status).json({ error: 'Gemini API request failed', detail: errText });
    }

    const data = await response.json();

    // Gemini response shape: data.candidates[0].content.parts[0].text
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
