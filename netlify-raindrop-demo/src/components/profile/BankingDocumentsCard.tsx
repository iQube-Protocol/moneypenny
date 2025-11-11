import React, { useEffect, useState } from "react";
import { Card, Button, Badge, ScrollArea, SectionHeader } from "../ui/ui";
import { RDP } from "../../lib/rdp";
import EdgeGauge from "../EdgeGauge";

type FileRow = { file_id: string; name: string; month?: string; size: number; created_at: string; sha256?: string };

export default function BankingDocumentsCard({
  tenantId, personaId, onApplied
}: { tenantId: string; personaId: string; onApplied?: () => void }) {
  const [bucketId, setBucketId] = useState<string|undefined>();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [agg, setAgg] = useState<any|undefined>();
  const [rec, setRec] = useState<any|undefined>();
  const [consent, setConsent] = useState<boolean>(false);

  async function refreshList(bid = bucketId) {
    if (!bid) return;
    const list = await RDP.buckets.list(bid);
    setFiles(list);
  }

  useEffect(() => {
    (async () => {
      try {
        const { bucket_id } = await RDP.buckets.init(tenantId, personaId);
        setBucketId(bucket_id);
        await refreshList(bucket_id);
        const prefs = await RDP.mem.prefsGet(tenantId, personaId);
        setConsent(!!prefs.doc_level_excerpts);
        // hydrate aggregates for this persona
        const aggResp = await RDP.profile.getAggregates(tenantId, personaId).catch(()=>null);
        if (aggResp && aggResp.aggregate) {
          setAgg(aggResp.aggregate);
          setRec(aggResp.aggregate?.proposed_overrides);
        }
      } catch (e:any) { setError(e.message || "init failed"); }
    })();
  }, []);

  async function onUpload(filesToUpload: FileList|null) {
    if (!filesToUpload || !bucketId) return;
    setBusy(true); setError(undefined);
    try {
      for (const file of Array.from(filesToUpload)) {
        const { upload_url, headers } = await RDP.buckets.uploadToken(bucketId);
        await RDP.buckets.putFile(upload_url, headers, file);
      }
      await refreshList();
      // After worker ingests, aggregates endpoint will reflect updates; poll once
      const aggResp = await RDP.profile.getAggregates(tenantId, personaId).catch(()=>null);
      if (aggResp && aggResp.aggregate) {
        setAgg(aggResp.aggregate);
        setRec(aggResp.aggregate?.proposed_overrides);
      }
    } catch (e:any) { setError(e.message || "upload failed"); }
    finally { setBusy(false); }
  }

  async function del(file_id: string) {
    if (!bucketId) return;
    setBusy(true);
    try { await RDP.buckets.del(bucketId, file_id); await refreshList(); }
    catch(e:any){ setError(e.message || "delete failed"); }
    finally{ setBusy(false); }
  }

  async function applyToConsole() {
    if (!rec) return;
    const payload = {
      tenant_id: tenantId,
      persona_id: personaId,
      inventory_band: rec.inventory_band,
      min_edge_bps: rec.min_edge_bps_baseline ?? 1.0,
      advisory:{ max_notional_usd_day: rec.max_notional_usd_day, daily_loss_limit_bps: rec.daily_loss_limit_bps }
    };
    const j = await RDP.profile.applyToConsole(payload);
    if (j.ok && onApplied) onApplied();
  }

  async function toggleConsent() {
    const next = !consent;
    setConsent(next);
    await RDP.mem.prefsSet(tenantId, personaId, { doc_level_excerpts: next });
  }

  return (
    <Card title="Banking Documents">
      <div className="ui-row ui-gap-2 ui-mb-2" style={{ flexWrap: "wrap" }}>
        <Badge>{bucketId ? "Bucket attached" : "No bucket"}</Badge>
        <div className="ui-text-11 ui-text-weak">Upload statements (PDF/CSV). Raw docs stay sealed; we compute non-PII aggregates.</div>
      </div>

      <div className="ui-row ui-gap-2 ui-mb-3" style={{ flexWrap: "wrap" }}>
        <input type="file" multiple accept=".pdf,.csv" onChange={(e)=>onUpload(e.target.files)} className="ui-input" />
        <Button disabled={busy}>{busy ? "Working…" : "Refresh"}</Button>
      </div>

      {error && <div className="ui-text-11" style={{ color: "rgb(var(--error))" }}>{error}</div>}

      <ScrollArea maxHeight={220} className="ui-mb-3">
        {files.length===0 ? <div className="ui-text-11 ui-text-weak">No files yet.</div> : (
          <table className="ui-text-xs" style={{ width:"100%" }}>
            <thead>
              <tr><th style={{textAlign:"left"}}>File</th><th>Month</th><th>Size</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {files.map(f=>(
                <tr key={f.file_id}>
                  <td>{f.name}</td>
                  <td style={{textAlign:"center"}}>{f.month || "-"}</td>
                  <td style={{textAlign:"right"}}>{(f.size/1024).toFixed(1)} KB</td>
                  <td style={{textAlign:"right"}}>{new Date(f.created_at).toLocaleString()}</td>
                  <td style={{textAlign:"right"}}><Button variant="ghost" onClick={()=>del(f.file_id)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>

      {/* Consent toggle */}
      <div className="ui-row ui-gap-2 ui-mb-3" style={{ alignItems: "center" }}>
        <input id="docconsent" type="checkbox" checked={consent} onChange={toggleConsent} />
        <label htmlFor="docconsent" className="ui-text-11 ui-text-weak">
          Allow <b>redacted excerpts</b> for specific Q&A in MoneyPenny (off by default).
        </label>
      </div>

      {/* Aggregates & Recommendations */}
      {agg && (
        <>
          <SectionHeader title="Aggregates" />
          <div className="ui-row ui-gap-2 ui-mb-3" style={{ flexWrap:"wrap" }}>
            <div className="ui-card ui-rounded-xs ui-p-2"><div className="ui-text-11 ui-text-weak">Avg Surplus (daily)</div><div style={{fontWeight:600}}>{agg.avg_surplus_daily?.toFixed(2)}</div></div>
            <div className="ui-card ui-rounded-xs ui-p-2"><div className="ui-text-11 ui-text-weak">Volatility (daily)</div><div style={{fontWeight:600}}>{agg.surplus_volatility_daily?.toFixed(2)}</div></div>
            <div className="ui-card ui-rounded-xs ui-p-2"><div className="ui-text-11 ui-text-weak">Closing Balance (last)</div><div style={{fontWeight:600}}>${agg.closing_balance_last?.toFixed(2)}</div></div>
          </div>
          <EdgeGauge floorBps={0.5} minEdgeBps={(rec?.min_edge_bps_baseline ?? 1.0)} currentEdgeBps={1.0} />
          <div className="ui-row ui-gap-2 ui-mt-3" style={{ justifyContent:"flex-end" }}>
            <Button className="ui-btn-success" onClick={applyToConsole} disabled={!rec}>Apply to Trading Console</Button>
          </div>
        </>
      )}
    </Card>
  );
}
