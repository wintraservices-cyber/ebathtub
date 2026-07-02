// /api/get-amazon-products.js
// Vercel serverless function — proxies Amazon Creators API server-side.
// Amazon's Associates Operating Agreement requires product images/prices
// to be fetched live via their API, never hardcoded or re-hosted.
//
// Required Vercel environment variables:
//   AMAZON_CREATORS_CLIENT_ID
//   AMAZON_CREATORS_CLIENT_SECRET
//   AMAZON_PARTNER_TAG   (your Associates tracking ID, e.g. "ebathtub-20")
//
// NOTE: Amazon only grants Creators API access after your Associates
// account has referred at least 10 qualifying sales in the trailing
// 30 days. Until then, this returns { apiAccessPending: true } and
// the site falls back to its styled placeholder images.

const TOKEN_HOST = 'https://creatorsapi.amazon';
const TOKEN_PATH = '/auth/o2/token';
const API_HOST = 'https://creatorsapi.amazon';
const GET_ITEMS_PATH = '/catalog/v1/getItems';

// In-memory token cache for the function instance lifetime.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret) {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${TOKEN_HOST}${TOKEN_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: 'grant_type=client_credentials&scope=creatorsapi/default',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Token request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600000) - 120000;
  return cachedToken;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { asins } = req.body || {};

  if (!Array.isArray(asins) || asins.length === 0) {
    return res.status(400).json({ error: 'Missing "asins" array in request body' });
  }
  if (asins.length > 10) {
    return res.status(400).json({ error: 'getItems supports a maximum of 10 ASINs per request' });
  }

  const clientId = process.env.AMAZON_CREATORS_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!clientId || !clientSecret || !partnerTag) {
    return res.status(200).json({
      apiAccessPending: true,
      message:
        'Amazon Creators API not configured yet. Requires AMAZON_CREATORS_CLIENT_ID, ' +
        'AMAZON_CREATORS_CLIENT_SECRET, and AMAZON_PARTNER_TAG in Vercel environment variables. ' +
        'Amazon grants access only after 10 qualifying referred sales in the trailing 30 days.',
      items: [],
    });
  }

  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const response = await fetch(`${API_HOST}${GET_ITEMS_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-marketplace': 'www.amazon.com',
      },
      body: JSON.stringify({
        itemIds: asins,
        itemIdType: 'ASIN',
        partnerTag,
        partnerType: 'Associates',
        marketplace: 'www.amazon.com',
        resources: [
          'images.primary.large',
          'itemInfo.title',
          'itemInfo.byLineInfo',
          'offersV2.listings.price',
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Amazon Creators API error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: 'Amazon Creators API request failed',
        detail: data,
        hint: response.status === 403
          ? 'A 403 usually means account eligibility (10 sales/30 days), not a credentials bug.'
          : undefined,
      });
    }

    const items = (data.itemsResult?.items || []).map((item) => ({
      asin: item.asin,
      title: item.itemInfo?.title?.displayValue || '',
      brand: item.itemInfo?.byLineInfo?.brand?.displayValue || '',
      image: item.images?.primary?.large?.url || '',
      price: item.offersV2?.listings?.[0]?.price?.displayAmount || '',
      detailPageURL: item.detailPageUrl || '',
    }));

    return res.status(200).json({ apiAccessPending: false, items });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error', detail: err.message });
  }
};
