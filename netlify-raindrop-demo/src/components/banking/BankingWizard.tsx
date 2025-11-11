import React, { useState, useEffect } from "react";
import { Card, Button, Badge, ScrollArea, SectionHeader } from "../ui/ui";
import PersonaDrawer from "../identity/PersonaDrawer";
import EdgeGauge from "../EdgeGauge";
import { usePersona } from "../../lib/personaStore";
import { RDP } from "../../lib/rdp";

type FileRow = { file_id: string; name: string; month?: string; size: number; created_at: string; sha256?: string };

export default function BankingWizard() {
  const { tenantId, personaDid, handle, setPersona, clearPersona } = usePersona();
  const [personaOpen, setPersonaOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [bucketId, setBucketId] = useState<string|undefined>();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|undefined>();
  const [consent, setConsent] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Aggregate data
  const [agg, setAgg] = useState<any|undefined>();
  const [rec, setRec] = useState<any|undefined>();
  const [monthCount, setMonthCount] = useState<number>(0);

  function onAuth(ctx: { tenantId: string; personaDid: string; handle: string }) {
    setPersona(ctx);
    setPersonaOpen(false);
  }

  async function refreshList(bid = bucketId) {
    if (!bid) return;
    const list = await RDP.buckets.list(bid);
    setFiles(list);
  }

  useEffect(() => {
    if (!personaDid) return;
    (async () => {
      try {
        const { bucket_id } = await RDP.buckets.init(tenantId, personaDid);
        setBucketId(bucket_id);
        await refreshList(bucket_id);
        const prefs = await RDP.mem.prefsGet(tenantId, personaDid);
        setConsent(!!prefs.doc_level_excerpts);
        // Hydrate existing aggregates
        const aggResp = await RDP.profile.getAggregates(tenantId, personaDid).catch(()=>null);
        if (aggResp && aggResp.aggregate) {
          setAgg(aggResp.aggregate);
          setRec(aggResp.aggregate?.proposed_overrides);
          setMonthCount(aggResp.monthCount || files.length);
        }
      } catch (e:any) { setError(e.message || "init failed"); }
    })();
  }, [personaDid]);

  async function handleFileUpload() {
    if (!uploadedFiles.length || !bucketId) return;
    setBusy(true); setError(undefined);
    try {
      // Upload to Smart Bucket
      for (const file of uploadedFiles) {
        const { upload_url, headers } = await RDP.buckets.uploadToken(bucketId);
        await RDP.buckets.putFile(upload_url, headers, file);
      }
      await refreshList();

      // Clear uploaded files after successful upload
      setUploadedFiles([]);

      // COMPUTE aggregates from uploaded files
      const aggResp = await RDP.profile.computeAggregate(tenantId, personaDid, bucketId);
      if (aggResp && aggResp.aggregate) {
        setAgg(aggResp.aggregate);
        setRec(aggResp.aggregate?.proposed_overrides);
        setMonthCount(aggResp.monthCount || files.length);
        setCurrentStep(2);
      } else {
        setError("Failed to compute financial profile. Please try again.");
      }
    } catch (e:any) {
      setError(e.message || "upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteFile(file_id: string) {
    if (!bucketId) return;
    setBusy(true);
    try {
      await RDP.buckets.del(bucketId, file_id);
      await refreshList();
    } catch(e:any){
      setError(e.message || "delete failed");
    } finally{
      setBusy(false);
    }
  }

  async function toggleConsent() {
    const next = !consent;
    setConsent(next);
    await RDP.mem.prefsSet(tenantId, personaDid, { doc_level_excerpts: next });
  }

  async function applyLimits() {
    if (!rec) return;
    setBusy(true);
    setError(undefined);

    try {
      const inventoryBand = rec.inventory_band;
      const minEdge = rec.min_edge_bps_baseline || 1.0;

      // Apply via RDP
      const payload = {
        tenant_id: tenantId,
        persona_id: personaDid,
        inventory_band: inventoryBand,
        min_edge_bps: minEdge,
        advisory: {
          max_notional_usd_day: rec.max_notional_usd_day,
          daily_loss_limit_bps: rec.daily_loss_limit_bps
        }
      };

      await RDP.profile.applyToConsole(payload);

      // Store in localStorage for console
      localStorage.setItem('moneypenny_applied_config', JSON.stringify({
        inventoryBand,
        minEdge,
        maxNotional: rec.max_notional_usd_day,
        dailyLossLimit: rec.daily_loss_limit_bps,
        appliedAt: new Date().toISOString()
      }));

      // Redirect to console
      setTimeout(() => {
        window.location.href = '/moneypenny/console';
      }, 1500);

    } catch (e:any) {
      setError(e.message || "apply failed");
    } finally {
      setBusy(false);
    }
  }

  // Calculate cash buffer
  const cashBuffer = agg ? (
    agg.cash_buffer_days || agg.buffer_days ||
    (agg.closing_balance_last && agg.avg_daily_expenses ?
      Math.floor(agg.closing_balance_last / Math.abs(agg.avg_daily_expenses)) :
      (agg.closing_balance && agg.avg_expenses ?
        Math.floor(agg.closing_balance / Math.abs(agg.avg_expenses)) : 0))
  ) : 0;

  if (!personaDid) {
    return (
      <main className="ui-col ui-gap-3" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="ui-between">
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Banking Wizard</h1>
            <div className="ui-text-xs ui-text-weak">Connect your @qripto persona to begin</div>
          </div>
          <Button variant="ghost" onClick={() => setPersonaOpen(true)}>@Qripto Sign in</Button>
        </div>
        <Card title="Get Started">
          <div className="ui-text-xs ui-text-weak ui-mb-3">
            Sign in with your @qripto persona to upload bank statements, calculate personalized risk limits, and apply them to your trading console.
          </div>
          <Button onClick={() => setPersonaOpen(true)}>Sign in to continue</Button>
        </Card>
        <PersonaDrawer open={personaOpen} onClose={() => setPersonaOpen(false)} onAuthenticated={onAuth} />
      </main>
    );
  }

  return (
    <main className="ui-col ui-gap-3" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div className="ui-between">
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Banking Wizard</h1>
          <div className="ui-text-xs ui-text-weak">Upload statements → compute aggregates → apply limits</div>
        </div>
        <div className="ui-row ui-gap-2">
          <Button variant="ghost" onClick={() => setPersonaOpen(true)}>{handle}</Button>
          <Button variant="danger" onClick={clearPersona}>Sign out</Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="ui-row ui-gap-3" style={{ justifyContent: "center", marginBottom: 16 }}>
        <div className="ui-row ui-gap-2" style={{ alignItems: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: currentStep >= 1 ? "rgb(16, 185, 129)" : "rgb(209, 213, 219)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600
          }}>1</div>
          <span style={{ fontSize: 14, fontWeight: 500, color: currentStep >= 1 ? "rgb(55, 65, 81)" : "rgb(156, 163, 175)" }}>
            Upload & Consent
          </span>
        </div>
        <div style={{ width: 80, height: 2, backgroundColor: currentStep > 1 ? "rgb(16, 185, 129)" : "rgb(209, 213, 219)", alignSelf: "center" }} />
        <div className="ui-row ui-gap-2" style={{ alignItems: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: currentStep >= 2 ? "rgb(16, 185, 129)" : "rgb(209, 213, 219)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600
          }}>2</div>
          <span style={{ fontSize: 14, fontWeight: 500, color: currentStep >= 2 ? "rgb(55, 65, 81)" : "rgb(156, 163, 175)" }}>
            Review Profile
          </span>
        </div>
        <div style={{ width: 80, height: 2, backgroundColor: currentStep > 2 ? "rgb(16, 185, 129)" : "rgb(209, 213, 219)", alignSelf: "center" }} />
        <div className="ui-row ui-gap-2" style={{ alignItems: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: currentStep >= 3 ? "rgb(16, 185, 129)" : "rgb(209, 213, 219)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 600
          }}>3</div>
          <span style={{ fontSize: 14, fontWeight: 500, color: currentStep >= 3 ? "rgb(55, 65, 81)" : "rgb(156, 163, 175)" }}>
            Apply Limits
          </span>
        </div>
      </div>

      {/* Step 1: Upload & Consent */}
      {currentStep === 1 && (
        <Card title="Step 1: Connect & Upload">
          <div className="ui-card ui-p-3 ui-mb-3" style={{ backgroundColor: "rgb(239, 246, 255)", border: "1px solid rgb(191, 219, 254)" }}>
            <div className="ui-row ui-gap-2">
              <div style={{ fontSize: 20 }}>🔒</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "rgb(30, 64, 175)" }}>Your Privacy is Protected</div>
                <div className="ui-text-11" style={{ color: "rgb(30, 64, 175)", marginBottom: 8 }}>
                  Your statements are sealed in your <b>BlakQube</b> (encrypted storage).
                  We only compute feature summaries - your transactions remain private.
                </div>
                <div className="ui-text-11" style={{ color: "rgb(29, 78, 216)" }}>
                  ✓ Purpose: Suitability assessment (QC-v1)<br/>
                  ✓ Scope: Feature-level only (no transaction details)<br/>
                  ✓ Retention: 12 months<br/>
                  ✓ Revocation: Destroy tokenQube key anytime
                </div>
              </div>
            </div>
          </div>

          <div className="ui-row ui-gap-2 ui-mb-2" style={{ flexWrap: "wrap" }}>
            <Badge>{bucketId ? `Bucket: ${bucketId.slice(0, 8)}...` : "No bucket"}</Badge>
            <div className="ui-text-11 ui-text-weak">Upload 6+ monthly statements for accurate risk profiling</div>
          </div>

          <div className="ui-mb-3">
            <label className="ui-text-xs" style={{ fontWeight: 500, display: "block", marginBottom: 8 }}>
              Upload Bank Statements (PDF, CSV)
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.csv,.txt"
              onChange={(e)=>setUploadedFiles(Array.from(e.target.files || []))}
              className="ui-input"
            />
            {uploadedFiles.length > 0 && (
              <div className="ui-text-11 ui-text-weak ui-mt-2">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="ui-row ui-gap-2 ui-mb-3" style={{ alignItems: "flex-start" }}>
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={toggleConsent}
              style={{ marginTop: 2 }}
            />
            <label htmlFor="consent" className="ui-text-11">
              I consent to feature-level analysis of my bank statements for suitability assessment.
              I understand my transaction details remain private and encrypted.
            </label>
          </div>

          {/* Existing files */}
          {files.length > 0 && (
            <>
              <SectionHeader title="Uploaded Files" />
              <ScrollArea maxHeight={200} className="ui-mb-3">
                <table className="ui-text-xs" style={{ width:"100%" }}>
                  <thead>
                    <tr>
                      <th style={{textAlign:"left"}}>File</th>
                      <th>Month</th>
                      <th>Size</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(f=>(
                      <tr key={f.file_id}>
                        <td>{f.name}</td>
                        <td style={{textAlign:"center"}}>{f.month || "-"}</td>
                        <td style={{textAlign:"right"}}>{(f.size/1024).toFixed(1)} KB</td>
                        <td style={{textAlign:"right"}}>
                          <Button variant="ghost" onClick={()=>deleteFile(f.file_id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </>
          )}

          {error && <div className="ui-text-11 ui-mb-2" style={{ color: "rgb(var(--error))" }}>{error}</div>}

          <div className="ui-row ui-gap-2" style={{ justifyContent: "flex-end" }}>
            <Button
              onClick={handleFileUpload}
              disabled={!consent || uploadedFiles.length === 0 || busy}
            >
              {busy ? "Analyzing..." : "Upload & Analyze"}
            </Button>
            {agg && (
              <Button onClick={() => setCurrentStep(2)}>
                Skip to Review →
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Review Profile */}
      {currentStep === 2 && agg && (
        <Card title="Step 2: Review Your Financial Profile">
          <div className="ui-card ui-p-3 ui-mb-3" style={{ backgroundColor: "rgb(240, 253, 244)", border: "1px solid rgb(187, 247, 208)" }}>
            <div className="ui-text-11" style={{ color: "rgb(21, 128, 61)" }}>
              <b>✓ Analysis Complete</b> - Features extracted from {monthCount} month{monthCount > 1 ? 's' : ''} of statements.
              No transaction details are stored.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div className="ui-card ui-p-3">
              <div className="ui-text-11 ui-text-weak">Avg Daily Surplus</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                ${agg.avg_surplus_daily?.toFixed(2) || agg.avg_daily_surplus?.toFixed(2) || '0'}
              </div>
              <div className="ui-text-11 ui-text-weak ui-mt-1">Typical daily cashflow</div>
            </div>

            <div className="ui-card ui-p-3">
              <div className="ui-text-11 ui-text-weak">Surplus Volatility</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                ${agg.surplus_volatility_daily?.toFixed(2) || agg.surplus_volatility?.toFixed(2) || '0'}
              </div>
              <div className="ui-text-11 ui-text-weak ui-mt-1">Daily cashflow variation</div>
            </div>

            <div className="ui-card ui-p-3">
              <div className="ui-text-11 ui-text-weak">Cash Buffer</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {cashBuffer} days
              </div>
              <div className="ui-text-11 ui-text-weak ui-mt-1">Days of expenses covered</div>
            </div>

            <div className="ui-card ui-p-3">
              <div className="ui-text-11 ui-text-weak">Closing Balance</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                ${agg.closing_balance_last?.toFixed(2) || agg.closing_balance?.toFixed(2) || '0'}
              </div>
              <div className="ui-text-11 ui-text-weak ui-mt-1">Statement end balance</div>
            </div>
          </div>

          <SectionHeader title="Risk Profile" />
          <EdgeGauge
            floorBps={0.5}
            minEdgeBps={rec?.min_edge_bps_baseline ?? 1.0}
            currentEdgeBps={1.0}
          />

          <div className="ui-row ui-gap-2 ui-mt-3" style={{ justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>← Back</Button>
            <Button onClick={() => setCurrentStep(3)}>Continue to Apply Limits →</Button>
          </div>
        </Card>
      )}

      {/* Step 3: Apply Limits */}
      {currentStep === 3 && rec && (
        <Card title="Step 3: Apply Personalized Limits">
          <div className="ui-card ui-p-3 ui-mb-3" style={{ backgroundColor: "rgb(254, 252, 232)", border: "1px solid rgb(253, 224, 71)" }}>
            <div className="ui-text-11" style={{ color: "rgb(133, 77, 14)" }}>
              <b>⚠ Review Carefully</b> - These limits will be applied to your MoneyPenny trading profile.
            </div>
          </div>

          <div className="ui-col ui-gap-3 ui-mb-3">
            <div className="ui-card ui-p-3">
              <div className="ui-between ui-mb-2">
                <span style={{ fontWeight: 600 }}>Max Notional / Day</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>${rec.max_notional_usd_day?.toFixed(2) || '0'}</span>
              </div>
              <div className="ui-text-11 ui-text-weak ui-mb-2">
                Maximum trade size per day (35% of daily surplus, capped at 20% of balance)
              </div>
              <Badge>Advisory limit - enforced by treasury</Badge>
            </div>

            <div className="ui-card ui-p-3">
              <div className="ui-between ui-mb-2">
                <span style={{ fontWeight: 600 }}>Daily Loss Limit</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{rec.daily_loss_limit_bps || 0} bps</span>
              </div>
              <div className="ui-text-11 ui-text-weak ui-mb-2">
                Max tolerable daily loss (scaled by volatility, 8-40 bps range)
              </div>
              <Badge>Advisory limit - enforced by treasury</Badge>
            </div>

            <div className="ui-card ui-p-3" style={{ backgroundColor: "rgb(240, 253, 244)", border: "1px solid rgb(187, 247, 208)" }}>
              <div className="ui-between ui-mb-2">
                <span style={{ fontWeight: 600, color: "rgb(21, 128, 61)" }}>Inventory Band</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "rgb(21, 128, 61)" }}>{rec.inventory_band?.toFixed(2) || '0'}</span>
              </div>
              <div className="ui-text-11 ui-mb-2" style={{ color: "rgb(22, 101, 52)" }}>
                Working capital buffer for market making (will be applied via /set_param)
              </div>
              <Badge style={{ backgroundColor: "rgb(134, 239, 172)", color: "rgb(20, 83, 45)" }}>
                ✓ This will be applied to your account
              </Badge>
            </div>
          </div>

          {error && <div className="ui-text-11 ui-mb-2" style={{ color: "rgb(var(--error))" }}>{error}</div>}

          <div className="ui-row ui-gap-2" style={{ justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => setCurrentStep(2)}>← Back</Button>
            <Button
              className="ui-btn-success"
              onClick={applyLimits}
              disabled={busy}
            >
              {busy ? "Applying..." : "Apply to MoneyPenny"}
            </Button>
          </div>
        </Card>
      )}

      <PersonaDrawer open={personaOpen} onClose={() => setPersonaOpen(false)} onAuthenticated={onAuth} />
    </main>
  );
}
