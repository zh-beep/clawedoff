// POST /api/register - Register a new competitor, returns API key
// Uses Vercel Blob for persistent storage

const { list, put } = require('@vercel/blob');
const crypto = require('crypto');

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
    const { name, email, twitter, venmo, openclaw_url } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const data = await loadData();

    if (data.competitors[name]) {
      return res.status(409).json({ error: 'Name already registered' });
    }

    const api_key = 'co_' + crypto.randomBytes(18).toString('base64url');

    data.competitors[name] = {
      name,
      email,
      twitter: twitter || '',
      venmo: venmo || '',
      api_key,
      openclaw_url: openclaw_url || '',
      revenue: 0,
      spend: 0,
      profit: 0,
      products: [],
      status: 'offline',
      project: '',
      transactions: [],
      registered: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    await saveData(data);

    res.status(200).json({
      ok: true,
      api_key,
      message: `Welcome ${name}! Save your API key -- your OpenClaw skill needs it to report to the dashboard.`
    });
  } catch (e) {
    res.status(400).json({ error: 'Invalid request: ' + e.message });
  }
};
