// Netlify serverless function for MoneyPenny backend API
// Handles RDP buckets, profile, and memory endpoints

// In-memory storage for demo
const buckets = new Map();
const files = new Map();
const aggregates = new Map();
const memories = new Map();
const preferences = new Map();

function getBucketKey(tenant_id, persona_id) {
  return `${tenant_id}::${persona_id}`;
}

function getMemKey(tenant_id, persona_id) {
  return `${tenant_id}::${persona_id}`;
}

// RDP Buckets endpoints
function handleBucketsInit(body) {
  const { tenant_id, persona_id } = body;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  const key = getBucketKey(tenant_id, persona_id);
  if (!buckets.has(key)) {
    const bucket_id = `bucket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    buckets.set(key, { bucket_id, tenant_id, persona_id, created_at: new Date().toISOString() });
    files.set(bucket_id, []);
  }

  const bucket = buckets.get(key);
  return { statusCode: 200, body: JSON.stringify({ bucket_id: bucket.bucket_id }) };
}

function handleBucketsUploadToken(body) {
  const { bucket_id, file_name } = body;
  if (!bucket_id || !file_name) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bucket_id and file_name required' }) };
  }

  const file_id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const upload_url = `/api?action=upload&bucket_id=${bucket_id}&file_id=${file_id}`;

  return { statusCode: 200, body: JSON.stringify({ file_id, upload_url }) };
}

function handleBucketsUpload(bucket_id, file_id, body) {
  if (!bucket_id || !file_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bucket_id and file_id required' }) };
  }

  const bucketFiles = files.get(bucket_id) || [];

  const newFile = {
    file_id,
    name: `statement_${bucketFiles.length + 1}.pdf`,
    size: Math.floor(Math.random() * 500000) + 100000,
    uploaded_at: new Date().toISOString(),
    content_type: 'application/pdf'
  };

  bucketFiles.push(newFile);
  files.set(bucket_id, bucketFiles);

  return { statusCode: 200, body: JSON.stringify({ file_id, uploaded_at: newFile.uploaded_at }) };
}

function handleBucketsList(query) {
  const { tenant_id, persona_id } = query;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  const key = getBucketKey(tenant_id, persona_id);
  const bucket = buckets.get(key);

  if (!bucket) {
    return { statusCode: 200, body: JSON.stringify({ files: [] }) };
  }

  const bucketFiles = files.get(bucket.bucket_id) || [];
  return { statusCode: 200, body: JSON.stringify({ files: bucketFiles }) };
}

function handleBucketsDelete(body) {
  const { bucket_id, file_id } = body;
  if (!bucket_id || !file_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'bucket_id and file_id required' }) };
  }

  const bucketFiles = files.get(bucket_id) || [];
  const filtered = bucketFiles.filter(f => f.file_id !== file_id);
  files.set(bucket_id, filtered);

  return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
}

// RDP Profile endpoints
function handleProfileGetAggregates(query) {
  const { tenant_id, persona_id } = query;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  const key = getMemKey(tenant_id, persona_id);
  const agg = aggregates.get(key);

  if (!agg) {
    return { statusCode: 200, body: JSON.stringify({ aggregate: null, monthCount: 0 }) };
  }

  return { statusCode: 200, body: JSON.stringify({ aggregate: agg.aggregate, monthCount: agg.monthCount }) };
}

function handleProfileComputeAggregate(body) {
  const { tenant_id, persona_id, bucket_id } = body;
  if (!tenant_id || !persona_id || !bucket_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id, persona_id, and bucket_id required' }) };
  }

  const bucketFiles = files.get(bucket_id) || [];
  const monthCount = bucketFiles.length;

  // Mock financial aggregates
  const avgIncome = 8500 + Math.random() * 3000;
  const avgExpenses = 6200 + Math.random() * 2000;
  const closingBalance = 12000 + Math.random() * 10000;
  const cashBufferDays = Math.floor(closingBalance / (avgExpenses / 30));

  const aggregate = {
    avg_income: avgIncome,
    avg_expenses: avgExpenses,
    avg_daily_expenses: avgExpenses / 30,
    closing_balance_last: closingBalance,
    cash_buffer_days: cashBufferDays,
    proposed_overrides: {
      inventory_band: Math.min(closingBalance * 0.05, 2000),
      min_edge_bps_baseline: cashBufferDays > 60 ? 3.0 : cashBufferDays > 30 ? 4.0 : 5.0,
      max_notional_usd_day: Math.min(closingBalance * 0.2, 5000),
      daily_loss_limit_bps: cashBufferDays > 60 ? 50 : cashBufferDays > 30 ? 30 : 20
    }
  };

  const key = getMemKey(tenant_id, persona_id);
  aggregates.set(key, { aggregate, monthCount });

  return { statusCode: 200, body: JSON.stringify({ aggregate, monthCount }) };
}

function handleProfileApplyToConsole(body) {
  const { tenant_id, persona_id } = body;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ applied: true }) };
}

// RDP Memory endpoints
function handleMemPrefsGet(query) {
  const { tenant_id, persona_id } = query;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  const key = getMemKey(tenant_id, persona_id);
  const prefs = preferences.get(key) || { doc_level_excerpts: false };

  return { statusCode: 200, body: JSON.stringify(prefs) };
}

function handleMemPrefsSet(body) {
  const { tenant_id, persona_id, ...prefs } = body;
  if (!tenant_id || !persona_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tenant_id and persona_id required' }) };
  }

  const key = getMemKey(tenant_id, persona_id);
  preferences.set(key, prefs);

  return { statusCode: 200, body: JSON.stringify({ updated: true }) };
}

function handleMemSearch(body) {
  const { shards, query, top_k } = body;

  // Mock search results
  const results = [
    {
      shard_uri: shards[0],
      snippet: `Cash buffer: ${Math.floor(Math.random() * 90 + 30)} days. Monthly income: $${Math.floor(Math.random() * 5000 + 5000)}.`,
      score: 0.95
    },
    {
      shard_uri: shards[1] || shards[0],
      snippet: "Recent trading performance shows consistent positive edge capture across venues.",
      score: 0.88
    }
  ];

  return { statusCode: 200, body: JSON.stringify(results.slice(0, top_k || 6)) };
}

// MoneyPenny Chat endpoint
function handleChatAnswer(body) {
  const { question } = body;

  // Mock AI response
  const responses = [
    `Based on your trading history, you've been capturing an average of ${(Math.random() * 3 + 1).toFixed(2)} bps of edge across your recent fills.`,
    "Q¢ micro-slippage refers to the sub-basis-point price improvements captured through optimal routing and timing.",
    `Your current cash buffer of ${Math.floor(Math.random() * 60 + 30)} days suggests a ${Math.random() > 0.5 ? 'moderate' : 'conservative'} risk profile.`,
    "High-frequency trading (HFT) strategies focus on capturing small edges repeatedly, typically measured in basis points (bps)."
  ];

  const answer = responses[Math.floor(Math.random() * responses.length)];

  return { statusCode: 200, body: JSON.stringify({ answer }) };
}

// Trading session summary
function handleTradingSessionSummary(query) {
  const { tenant_id, persona_id } = query;

  const summary = {
    capture_bps_24h: (Math.random() * 4 + 1).toFixed(2),
    fills_24h: Math.floor(Math.random() * 50 + 10),
    chains: ['Ethereum', 'Arbitrum', 'Base'].slice(0, Math.floor(Math.random() * 3) + 1)
  };

  return { statusCode: 200, body: JSON.stringify(summary) };
}

// Propose Intent endpoint (mock)
function handleProposeIntent(body) {
  const { intent_id, tenant_id, details, limits } = body;

  if (!intent_id || !tenant_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'intent_id and tenant_id required' }) };
  }

  if (!limits || !limits.min_edge_bps) {
    return { statusCode: 400, body: JSON.stringify({ error: 'limits required with min_edge_bps' }) };
  }

  // Mock fee and gas calculations
  const feesBps = 2.0;
  const gasUsd = 0.5;
  const notional = details?.size?.notional || 100;
  const gasBps = (gasUsd / notional) * 10000;
  const floor = feesBps + gasBps + 0.5;

  // Check if edge is above floor
  if (limits.min_edge_bps < floor) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'edge_too_low',
        floor_bps: parseFloat(floor.toFixed(4)),
        fees_bps: parseFloat(feesBps.toFixed(4)),
        gas_bps: parseFloat(gasBps.toFixed(4))
      })
    };
  }

  // Accept the intent
  return {
    statusCode: 202,
    body: JSON.stringify({
      accepted: true,
      requires_human_confirm: false,
      policy_floor_bps: parseFloat(floor.toFixed(4)),
      forwarded: false
    })
  };
}

// Main handler
export async function handler(event) {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    let path = event.path || '';
    if (path.startsWith('/.netlify/functions/api')) {
      path = path.slice('/.netlify/functions/api'.length);
    } else if (path.startsWith('/api')) {
      path = path.slice('/api'.length);
    }
    const method = event.httpMethod;
    const query = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    console.log('API Request:', method, path, query);

    // Route to handlers
    if (path === '/rdp/buckets/init' && method === 'POST') {
      const result = handleBucketsInit(body);
      return { ...result, headers };
    }

    if (path === '/rdp/buckets/upload-token' && method === 'POST') {
      const result = handleBucketsUploadToken(body);
      return { ...result, headers };
    }

    if (path.startsWith('/rdp/buckets/upload/') && method === 'PUT') {
      const parts = path.split('/');
      const bucket_id = parts[4];
      const file_id = parts[5];
      const result = handleBucketsUpload(bucket_id, file_id, body);
      return { ...result, headers };
    }

    if (path === '/rdp/buckets/list' && method === 'GET') {
      const result = handleBucketsList(query);
      return { ...result, headers };
    }

    if (path === '/rdp/buckets/delete' && method === 'POST') {
      const result = handleBucketsDelete(body);
      return { ...result, headers };
    }

    if (path === '/rdp/profile/aggregates' && method === 'GET') {
      const result = handleProfileGetAggregates(query);
      return { ...result, headers };
    }

    if (path === '/rdp/profile/aggregate' && method === 'POST') {
      const result = handleProfileComputeAggregate(body);
      return { ...result, headers };
    }

    if (path === '/rdp/profile/apply' && method === 'POST') {
      const result = handleProfileApplyToConsole(body);
      return { ...result, headers };
    }

    if (path === '/rdp/mem/prefs' && method === 'GET') {
      const result = handleMemPrefsGet(query);
      return { ...result, headers };
    }

    if (path === '/rdp/mem/prefs' && method === 'POST') {
      const result = handleMemPrefsSet(body);
      return { ...result, headers };
    }

    if (path === '/rdp/mem/search' && method === 'POST') {
      const result = handleMemSearch(body);
      return { ...result, headers };
    }

    if (path === '/chat/answer' && method === 'POST') {
      const result = handleChatAnswer(body);
      return { ...result, headers };
    }

    if (path === '/trading/session-summary' && method === 'GET') {
      const result = handleTradingSessionSummary(query);
      return { ...result, headers };
    }

    // Alias for RDP client path
    if (path === '/rdp/mem/trading/summary' && method === 'GET') {
      const result = handleTradingSessionSummary(query);
      return { ...result, headers };
    }

    if (path === '/propose_intent' && method === 'POST') {
      const result = handleProposeIntent(body);
      return { ...result, headers };
    }

    if (path === '/sim/stream' && method === 'GET') {
      const now = new Date().toISOString();
      const chains = (query.chains || 'ethereum').split(',');
      const k = Math.min(10, Math.max(3, (chains.length || 1) * 3));
      const messages = [];
      for (let i = 0; i < k; i++) {
        const chain = chains[i % chains.length] || 'ethereum';
        const mid = 1 + Math.random() * 0.01;
        const edge = +(Math.random() * 4 + 1).toFixed(2);
        const msg = {
          status: 'QUOTE',
          chain,
          symbol: 'QCT/USDC',
          price: mid,
          edge_bps: edge,
          ts: now
        };
        messages.push(`data: ${JSON.stringify(msg)}\n\n`);
      }
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        },
        body: messages.join('')
      };
    }

    // 404 for unknown endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: `Endpoint not found: ${method} ${path}` })
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
}
