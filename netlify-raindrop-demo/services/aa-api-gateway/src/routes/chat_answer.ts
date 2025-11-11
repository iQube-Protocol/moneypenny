/**
 * POST /chat/answer
 *
 * MoneyPenny chat endpoint - uses Venice LLM with system prompt + user context
 */

import { Request, Response } from 'express';
import { venice } from '../providers/venice';
import { buildMoneyPennyMessages } from '../config/moneypenny-prompt';

interface ChatAnswerRequest {
  tenant_id: string;
  persona_id: string;
  question: string;
  consent?: {
    doc_level_excerpts?: boolean;
  };
  context?: {
    mem_snippets?: string;
    session_insights?: {
      capture_bps_24h: number;
      fills_24h: number;
      chains: string[];
    };
  };
}

export async function chatAnswer(req: Request, res: Response) {
  try {
    const payload = req.body as ChatAnswerRequest;

    if (!payload.question?.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }

    // Build messages with system prompt + user context
    const messages = buildMoneyPennyMessages({
      question: payload.question,
      memSnippets: payload.context?.mem_snippets || '',
      sessionInsights: payload.context?.session_insights,
      consent: {
        doc_level_excerpts: payload.consent?.doc_level_excerpts ?? false,
      },
    });

    // Call Venice LLM
    const answer = await venice.chat(messages as any, {
      temperature: 0.7,
      max_tokens: 1500,
    });

    return res.json({
      ok: true,
      answer,
      meta: {
        tenant_id: payload.tenant_id,
        persona_id: payload.persona_id,
        model: 'llama-3.3-70b',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('chat/answer error:', error);
    return res.status(500).json({
      error: 'Failed to generate answer',
      details: error.message,
    });
  }
}
