// POST /api/update - Receives updates from OpenClaw skill cron webhooks
// Uses Vercel Blob for persistent storage

const { list, put } = require('@vercel/blob');

const BLOB_KEY = 'clawedoff-leaderboard.json';

async function loadData() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return { competitors: {} };
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return { competitors: {} };
  }
}

async function saveData(data) {
  await put(BLOB_KEY, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const update = req.body;

    if (!update.competitor || !update.api_key) {
      return res.status(400).json({ error: 'Missing competitor name or api_key' });
    }

    const data = await loadData();

    // Validate API key if competitor exists
    const existing = data.competitors[update.competitor];
    if (existing && existing.api_key !== update.api_key) {
      return res.status(403).json({ error: 'Invalid API key for this competitor' });
    }

    const spend = update.spend || 0;

    data.competitors[update.competitor] = {
      ...(existing || {}),
      name: update.competitor,
      api_key: update.api_key,
      openclaw_url: update.openclaw_url || existing?.openclaw_url || '',
      revenue: update.revenue || 0,
      spend,
      profit: (update.revenue || 0) - spend,
      products: update.products || existing?.products || [],
      status: spend > 250 ? 'disqualified' : (update.status || 'building'),
      project: update.project || existing?.project || '',
      transactions: (update.transactions || []).slice(-20),
      last_updated: new Date().toISOString()
    };

    await saveData(data);

    // Calculate rank
    const sorted = Object.values(data.competitors).sort((a, b) => b.profit - a.profit);
    const rank = sorted.findIndex(c => c.name === update.competitor) + 1;

    res.status(200).json({ ok: true, rank });
  } catch (e) {
    res.status(400).json({ error: 'Invalid request: ' + e.message });
  }
};
