import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { requireApiKey } from "./middleware/auth";
import { requireHmacSignature } from "./middleware/hmac";
import {
  getConfig,
  getQuotes,
  postProposeIntent,
  postSetParam,
  postAigentZWebhook,
  postRecommendationsApply,
  getSimStream,
  chatAnswer,
  rdpMemSearch,
  rdpMemPrefsGet,
  rdpMemPrefsSet,
  rdpMemTradingSummary
} from "./routes";
import {
  rdpBucketsInit,
  rdpBucketsUploadToken,
  rdpBucketsUpload,
  rdpBucketsList,
  rdpBucketsDelete
} from "./routes/rdp_buckets";
import {
  rdpProfileGetAggregates,
  rdpProfileComputeAggregate,
  rdpProfileApplyToConsole
} from "./routes/rdp_profile";

const app = express();

// Enable CORS for all origins (in production, restrict to specific origins)
app.use(cors());

// Use JSON everywhere except webhook (which needs raw body for HMAC)
app.use((req, res, next) => (req.path.startsWith("/webhooks/aigentz") ? next() : express.json()(req, res, next)));

// Health check
app.get("/health", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Config endpoint
app.get("/config", requireApiKey, getConfig);

// Quotes endpoint
app.get("/quotes", requireApiKey, getQuotes);

// P&L endpoint (stub)
app.get("/pnl", requireApiKey, (req, res) => {
  const window = req.query.window || "24h";
  // Stub implementation
  res.json({
    window,
    pnl_usd: 0,
    capture_bps: 0,
    turnover: 0,
    win_rate: 0,
    message: "P&L tracking coming soon"
  });
});

// Inventory endpoint (stub)
app.get("/inventory", requireApiKey, (req, res) => {
  // Stub implementation
  res.json({
    chains: [],
    message: "Inventory tracking coming soon"
  });
});

// Propose intent endpoint
app.post("/propose_intent", requireApiKey, postProposeIntent);

// Set parameter endpoint
app.post("/set_param", requireApiKey, postSetParam);

// Recommendations apply endpoint
app.post("/recommendations/apply", requireApiKey, postRecommendationsApply);

// Simulation stream endpoint
app.get("/sim/stream", requireApiKey, getSimStream);

// MoneyPenny chat endpoint
app.post("/chat/answer", chatAnswer);

// RDP Smart Memories endpoints
app.post("/rdp/mem/search", rdpMemSearch);
app.get("/rdp/mem/prefs", rdpMemPrefsGet);
app.post("/rdp/mem/prefs", rdpMemPrefsSet);
app.get("/rdp/mem/trading/summary", rdpMemTradingSummary);

// RDP Smart Buckets endpoints
app.post("/rdp/buckets/init", rdpBucketsInit);
app.post("/rdp/buckets/upload-token", rdpBucketsUploadToken);
app.put("/rdp/buckets/upload/:bucket_id/:file_id", rdpBucketsUpload);
app.get("/rdp/buckets/list", rdpBucketsList);
app.post("/rdp/buckets/delete", rdpBucketsDelete);

// RDP Profile endpoints
app.get("/rdp/profile/aggregates", rdpProfileGetAggregates);
app.post("/rdp/profile/aggregate", rdpProfileComputeAggregate);
app.post("/rdp/profile/apply", rdpProfileApplyToConsole);

// Webhook endpoint with HMAC verification
app.post(
  "/webhooks/aigentz",
  bodyParser.raw({ type: "*/*" }),
  (req: any, _r, next) => {
    req.rawBody = req.body;
    next();
  },
  requireHmacSignature,
  postAigentZWebhook
);

const PORT = process.env.PORT || 8787;

// For Vercel serverless
export default app;

// For local/traditional hosting
if (require.main === module) {
  app.listen(PORT, () => console.log(`aa-api-gateway listening on port ${PORT}`));
}
