// /api/get-sanity-data.js
// Fetches products, articles, and brands from Sanity CMS.
// Called once on page load — replaces the hardcoded PRODUCTS,
// ARTICLES, and BRANDS arrays in index.html.
//
// Required Vercel environment variables:
//   SANITY_PROJECT_ID   → 6fogodef
//   SANITY_DATASET      → production
//   SANITY_API_TOKEN    → read-only token from sanity.io/manage

const PROJECT_ID = process.env.SANITY_PROJECT_ID || '6fogodef';
const DATASET = process.env.SANITY_DATASET || 'production';
const API_TOKEN = process.env.SANITY_API_TOKEN;
const API_VERSION = '2024-01-01';

async function runQuery(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodedQuery}`;

  const headers = { 'Content-Type': 'application/json' };
  if (API_TOKEN) headers['Authorization'] = `Bearer ${API_TOKEN}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Sanity query failed (${response.status}): ${err}`);
  }
  const data = await response.json();
  return data.result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all three data types in parallel
    const [products, articles, brands] = await Promise.all([

      // Products — all active, ordered by sort order
      runQuery(`
        *[_type == "product" && active == true] | order(order asc) {
          "id": _id,
          "cat": category,
          "brand": coalesce(brand->name, brand),
          "monogram": monogram,
          name,
          model,
          "price": price,
          "raw": priceRaw,
          "comm": commissionDisplay,
          "commPct": commissionPct,
          rating,
          "desc": description,
          "specs": specs[]{
            "0": label,
            "1": value
          },
          badge,
          "bg": backgroundGradient,
          "link": affiliateLink,
          "img": select(
            defined(image.asset) => image.asset->url,
            defined(imageUrl) => imageUrl,
            ""
          ),
          amazonAsin,
          featured,
        }
      `),

      // Articles — published only, newest first
      runQuery(`
        *[_type == "article" && status == "published"] | order(publishedAt desc) {
          "id": _id,
          status,
          tag,
          title,
          "date": coalesce(
            publishedAt,
            _createdAt
          ),
          readTime,
          aiAssisted,
          "body": coalesce(bodyPlaintext, ""),
          "img": coalesce(heroImageUrl, heroImage.asset->url, ""),
          "slug": slug.current,
        }
      `),

      // Brands — active only, alphabetical
      runQuery(`
        *[_type == "brand" && active == true] | order(name asc) {
          name
        }
      `),
    ]);

    // Format articles date for display
    const formattedArticles = (articles || []).map(a => ({
      ...a,
      date: a.date
        ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recent',
      specs: undefined, // articles don't have specs
    }));

    // Format products specs from {0: label, 1: value} to [label, value] arrays
    const formattedProducts = (products || []).map(p => ({
      ...p,
      specs: (p.specs || []).map(s => [s['0'], s['1']]),
      link: p.link || 'PASTE_AFFILIATE_LINK_HERE',
      img: p.img || '',
    }));

    // Brand names as flat array matching original BRANDS format
    const brandNames = (brands || []).map(b => b.name);

    return res.status(200).json({
      products: formattedProducts,
      articles: formattedArticles,
      brands: brandNames,
    });

  } catch (err) {
    console.error('Sanity fetch error:', err.message);
    // Return empty arrays on error — front end falls back to hardcoded data
    return res.status(500).json({
      error: err.message,
      products: [],
      articles: [],
      brands: [],
    });
  }
};
