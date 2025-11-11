/**
 * POST /rdp/mem/search
 *
 * Smart Memories search endpoint - searches Qripto KB and user memories
 */

import { Request, Response } from 'express';
import qriptoKB from '../config/qripto-kb.json';

interface SearchRequest {
  shards: string[];
  q: string;
  k?: number;
  filters?: any;
}

interface SearchResult {
  memo_id: string;
  score: number;
  snippet: string;
  data?: any;
}

/**
 * Simple text similarity scoring (case-insensitive substring matching + keyword overlap)
 */
function scoreText(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match = high score
  if (t.includes(q)) return 1.0;

  // Keyword overlap scoring
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  const tWords = t.split(/\s+/).filter(w => w.length > 2);

  if (qWords.length === 0) return 0;

  const matches = qWords.filter(qw => tWords.some(tw => tw.includes(qw) || qw.includes(tw)));
  return matches.length / qWords.length;
}

/**
 * Search the Qripto Knowledge Base
 */
function searchQriptoKB(query: string, k: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Search FAQs
  qriptoKB.faq.forEach((faq, idx) => {
    const qScore = scoreText(query, faq.q);
    const aScore = scoreText(query, faq.a);
    const score = Math.max(qScore, aScore * 0.8);

    if (score > 0.1) {
      results.push({
        memo_id: `qripto-kb:faq:${idx}`,
        score,
        snippet: `**Q:** ${faq.q}\n**A:** ${faq.a}`,
        data: { type: 'faq', question: faq.q, answer: faq.a }
      });
    }
  });

  // Search glossary
  Object.entries(qriptoKB.glossary).forEach(([term, definition]) => {
    const termScore = scoreText(query, term);
    const defScore = scoreText(query, definition);
    const score = Math.max(termScore, defScore * 0.7);

    if (score > 0.1) {
      results.push({
        memo_id: `qripto-kb:glossary:${term}`,
        score,
        snippet: `**${term}:** ${definition}`,
        data: { type: 'glossary', term, definition }
      });
    }
  });

  // Search use cases
  if (qriptoKB.use_cases.qriptomedia) {
    const qm = qriptoKB.use_cases.qriptomedia;
    const score = scoreText(query, qm.title + ' ' + qm.flows.join(' ') + ' ' + qm.why_qc);
    if (score > 0.1) {
      results.push({
        memo_id: 'qripto-kb:usecase:qriptomedia',
        score,
        snippet: `**${qm.title}**\n${qm.flows.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\n*Why Qc:* ${qm.why_qc}`,
        data: { type: 'use_case', ...qm }
      });
    }
  }

  if (qriptoKB.use_cases.hft) {
    const hft = qriptoKB.use_cases.hft;
    const score = scoreText(query, hft.title + ' ' + hft.features.join(' '));
    if (score > 0.1) {
      results.push({
        memo_id: 'qripto-kb:usecase:hft',
        score,
        snippet: `**${hft.title}**\n${hft.features.slice(0, 3).map(f => `• ${f}`).join('\n')}`,
        data: { type: 'use_case', ...hft }
      });
    }
  }

  // Search metaKnyts
  const mk = qriptoKB.metaknyts;
  const mkScore = scoreText(query, mk.overview + ' ' + mk['21_sats'] + ' ' + mk.transmissions);
  if (mkScore > 0.1) {
    results.push({
      memo_id: 'qripto-kb:metaknyts',
      score: mkScore,
      snippet: `**metaKnyts:** ${mk.overview}\n**21 Sats:** ${mk['21_sats']}\n**Funding:** ${mk.funding}`,
      data: { type: 'metaknyts', ...mk }
    });
  }

  // Search audience messages
  Object.entries(qriptoKB.audience_messages).forEach(([audience, message]) => {
    const score = scoreText(query, audience + ' ' + message);
    if (score > 0.1) {
      results.push({
        memo_id: `qripto-kb:audience:${audience}`,
        score,
        snippet: `**For ${audience}:** ${message}`,
        data: { type: 'audience', audience, message }
      });
    }
  });

  // Sort by score descending and return top k
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

/**
 * Mock user memory search (placeholder for future Smart Memories implementation)
 */
function searchUserMemories(shard: string, query: string, k: number): SearchResult[] {
  // For now, return empty - this would search user's profile aggregates, trading history, etc.
  // Example shard formats:
  // - mem://profile-aggregates/qripto/did:qripto:alice:...
  // - mem://trading-history/qripto/did:qripto:alice:...

  // TODO: Implement actual user memory search when Smart Memories backend is ready
  return [];
}

export async function rdpMemSearch(req: Request, res: Response) {
  try {
    const payload = req.body as SearchRequest;

    if (!payload.q?.trim()) {
      return res.status(400).json({ error: 'query (q) is required' });
    }

    const k = payload.k || 8;
    const allResults: SearchResult[] = [];

    // Search each shard
    for (const shard of payload.shards || []) {
      if (shard === 'mem://glossary/finance' || shard.includes('glossary')) {
        // Search Qripto KB
        const kbResults = searchQriptoKB(payload.q, k);
        allResults.push(...kbResults);
      } else if (shard.startsWith('mem://profile-aggregates/') || shard.startsWith('mem://trading-history/')) {
        // Search user memories (placeholder)
        const userResults = searchUserMemories(shard, payload.q, k);
        allResults.push(...userResults);
      }
    }

    // Deduplicate and sort
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      if (seen.has(r.memo_id)) return false;
      seen.add(r.memo_id);
      return true;
    });

    unique.sort((a, b) => b.score - a.score);

    return res.json(unique.slice(0, k));
  } catch (error: any) {
    console.error('rdp/mem/search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
    });
  }
}
