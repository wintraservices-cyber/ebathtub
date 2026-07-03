// /api/save-article.js
// Called when the Studio's Publish button is clicked.
// Creates a new article document in Sanity so it persists
// across page reloads and is immediately visible in the Studio.
//
// Required Vercel environment variables:
//   SANITY_PROJECT_ID   → 6fogodef
//   SANITY_DATASET      → production
//   SANITY_WRITE_TOKEN  → Editor/Write token from sanity.io/manage → API → Tokens

const PROJECT_ID = process.env.SANITY_PROJECT_ID || '6fogodef';
const DATASET = process.env.SANITY_DATASET || 'production';
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WRITE_TOKEN) {
    console.error('SANITY_WRITE_TOKEN is not set in environment variables.');
    return res.status(500).json({
      error: 'Server not configured. Add SANITY_WRITE_TOKEN in Vercel environment variables.',
    });
  }

  const { title, body, tag, readTime, aiAssisted, status } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: 'Missing required fields: title, body' });
  }

  // Build a slug from the title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 96);

  // Build the Sanity document
  const document = {
    _type: 'article',
    title,
    slug: { _type: 'slug', current: slug },
    status: status || 'published',
    tag: tag || 'Buying Guide',
    readTime: readTime || '5 min read',
    aiAssisted: aiAssisted || true,
    bodyPlaintext: body,
    publishedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      `https://${PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WRITE_TOKEN}`,
        },
        body: JSON.stringify({
          mutations: [{ create: document }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Sanity write error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: 'Failed to save article to Sanity',
        detail: data,
      });
    }

    // Return the new document ID so the front end can track it
    const newId = data.results?.[0]?.id || data.results?.[0]?.document?._id;

    return res.status(200).json({
      success: true,
      sanityId: newId,
      slug,
      message: 'Article saved to Sanity successfully',
    });
  } catch (err) {
    console.error('Unexpected error saving to Sanity:', err);
    return res.status(500).json({ error: 'Unexpected server error', detail: err.message });
  }
};
