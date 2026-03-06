// GET /api/leaderboard - Public endpoint for dashboard
// Uses Vercel Blob for persistent storage

const { list, put, head } = require('@vercel/blob');

const BLOB_KEY = 'clawedoff-leaderboard.json';

async function loadData() {
  try {
    // List blobs to find our data file
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return { competitors: {} };
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return { competitors: {} };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const data = await loadData();
  const competitors = Object.values(data.competitors)
    .map(c => ({
      name: c.name,
      revenue: c.revenue || 0,
      spend: c.spend || 0,
      profit: (c.revenue || 0) - (c.spend || 0),
      products: c.products || [],
      status: c.status || 'offline',
      project: c.project || '',
      openclaw_url: c.openclaw_url || '',
      last_updated: c.last_updated
    }))
    .sort((a, b) => b.profit - a.profit);

  const totalRevenue = competitors.reduce((s, c) => s + c.revenue, 0);
  const totalSpend = competitors.reduce((s, c) => s + c.spend, 0);
  const deployed = competitors.filter(c => c.status === 'live').length;

  res.status(200).json({
    competitors,
    totals: { revenue: totalRevenue, spend: totalSpend, competitors: competitors.length, deployed },
    updated: new Date().toISOString()
  });
};
