import React, { useEffect, useRef, useState } from "react";
import { Drawer, SectionHeader, Button, Badge, ScrollArea } from "../ui/ui";
import { RDP } from "../../lib/rdp";

type Msg = { role: "user" | "assistant" | "system"; text: string; ts: string };

export default function MoneyPennyDrawer() {
  // Load persona from localStorage directly instead of using context
  const [tenantId, setTenantId] = useState("qripto");
  const [personaDid, setPersonaDid] = useState("");

  useEffect(() => {
    // Load persona from localStorage
    try {
      const raw = localStorage.getItem("qripto.persona");
      if (raw) {
        const p = JSON.parse(raw);
        setTenantId(p.tenantId || "qripto");
        setPersonaDid(p.personaDid || "");
      }
    } catch (e) {
      console.error("Failed to load persona:", e);
    }

    // Listen for persona changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "qripto.persona" && e.newValue) {
        try {
          const p = JSON.parse(e.newValue);
          setTenantId(p.tenantId || "qripto");
          setPersonaDid(p.personaDid || "");
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  const [open, setOpen] = useState(false);

  // Debug: log when open state changes
  useEffect(() => {
    console.log('MoneyPennyDrawer: open state changed to', open);
  }, [open]);
  const [consent, setConsent] = useState(false);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<Msg[]>([
    { role: "assistant", text: "Hi — I'm MoneyPenny. Ask me anything about Q¢ micro-slippage, your trading performance, or general HFT concepts. I'll use your non-PII aggregates and trading memories.", ts: new Date().toISOString() }
  ]);
  const [insights, setInsights] = useState<{ capture_bps_24h: number; fills_24h: number; chains: string[] }|null>(null);
  const [metaVatarMode, setMetaVatarMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const avatarContainerRef = useRef<HTMLDivElement>(null);

  // Listen for open/close events from the page
  useEffect(() => {
    console.log('MoneyPennyDrawer: Component mounted, setting up event listeners');
    const handleOpen = () => {
      console.log('MoneyPennyDrawer: Received moneypenny:open event, opening drawer');
      setOpen(true);
    };
    const handleClose = () => {
      console.log('MoneyPennyDrawer: Received moneypenny:close event, closing drawer');
      setOpen(false);
    };
    window.addEventListener('moneypenny:open', handleOpen);
    window.addEventListener('moneypenny:close', handleClose);
    console.log('MoneyPennyDrawer: Event listeners attached successfully');

    // Test if we can access the event
    window.dispatchEvent(new CustomEvent('test-event'));

    return () => {
      console.log('MoneyPennyDrawer: Cleaning up event listeners');
      window.removeEventListener('moneypenny:open', handleOpen);
      window.removeEventListener('moneypenny:close', handleClose);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const prefs = await RDP.mem.prefsGet(tenantId, personaDid).catch(()=>({doc_level_excerpts:false}));
      setConsent(!!prefs.doc_level_excerpts);
      const s = await RDP.trading.sessionSummary(tenantId, personaDid).catch(()=>null);
      if (s) setInsights(s);
    })();
  }, [tenantId, personaDid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [chat, open]);

  async function send() {
    const q = input.trim(); if (!q) return;
    setInput("");
    setChat(c => [...c, { role:"user", text:q, ts:new Date().toISOString() }]);

    // 1) Search memories (aggregates, trading history, glossary)
    const shards = [
      `mem://profile-aggregates/${tenantId}/${personaDid}`,
      `mem://trading-history/${tenantId}/${personaDid}`,
      `mem://glossary/finance`
    ];
    const memHits = await RDP.mem.search(shards, q, 6).catch(()=>[]);
    const memSummary = memHits.slice(0,3).map(h => h.snippet).join("\n— ");

    // 2) Build LLM context request (Venice behind your backend)
    const base = import.meta.env.PUBLIC_MONEYPENNY_BASE;
    const payload = {
      tenant_id: tenantId,
      persona_id: personaDid,
      question: q,
      consent: { doc_level_excerpts: consent },
      context: { mem_snippets: memSummary },
    };
    // You can swap this for a streaming endpoint if desired
    const r = await fetch(`${base}/chat/answer`, {
      method: "POST",
      headers: { "content-type":"application/json" },
      body: JSON.stringify(payload),
    });
    let reply = "Sorry — I couldn't reach MoneyPenny LLM.";
    if (r.ok) {
      const j = await r.json();
      reply = j.answer || reply;
    }
    setChat(c => [...c, { role:"assistant", text: reply, ts: new Date().toISOString() }]);
  }

  async function toggleDocLevel() {
    const next = !consent;
    setConsent(next);
    await RDP.mem.prefsSet(tenantId, personaDid, { doc_level_excerpts: next });
  }

  function toggleMetaVatar() {
    const willBeMetaVatar = !metaVatarMode;
    console.log(`Toggling metaVatar: ${metaVatarMode} -> ${willBeMetaVatar}`);
    setMetaVatarMode(willBeMetaVatar);
  }

  // Load D-ID avatar script when metaVatar mode is activated
  useEffect(() => {
    if (metaVatarMode && avatarContainerRef.current) {
      console.log('metaVatar mode activated, avatarContainerRef:', avatarContainerRef.current);

      // Remove any existing script and agent elements
      const existingScript = document.querySelector('script[src*="agent.d-id.com"]');
      if (existingScript) {
        console.log('Removing existing D-ID script');
        existingScript.remove();
      }
      const existingAgent = document.querySelector('[data-name="did-agent"]');
      if (existingAgent) {
        console.log('Removing existing D-ID agent');
        existingAgent.remove();
      }

      // Wait a bit for the container to be properly rendered
      setTimeout(() => {
        if (!avatarContainerRef.current) {
          console.error('Avatar container ref lost after timeout');
          return;
        }

        console.log('Creating D-ID script element...');
        // Create and append the D-ID script
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://agent.d-id.com/v2/index.js';
        script.setAttribute('data-mode', 'fabio');
        script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcyNjU3ODI2NjQ5ODgyODU4MDk6YkoxSDdROEp5S2Q1Mk1CbEx0ODE2');
        script.setAttribute('data-agent-id', 'v2_agt_K6rQNYxY');
        script.setAttribute('data-name', 'did-agent');
        script.setAttribute('data-monitor', 'true');
        script.setAttribute('data-orientation', 'horizontal');
        script.setAttribute('data-position', 'right');

        script.onload = () => {
          console.log('D-ID script loaded successfully');
        };
        script.onerror = (err) => {
          console.error('D-ID script failed to load:', err);
        };

        console.log('Appending script to container...');
        avatarContainerRef.current.appendChild(script);
        console.log('D-ID script appended, script element:', script);
      }, 100);

      return () => {
        console.log('Cleaning up D-ID avatar...');
        // Cleanup when unmounting or switching back
        const scriptToRemove = document.querySelector('script[src*="agent.d-id.com"]');
        if (scriptToRemove) {
          console.log('Removing script in cleanup');
          scriptToRemove.remove();
        }
        // Remove all agent elements
        const agents = document.querySelectorAll('[data-name="did-agent"]');
        console.log('Removing agent elements, found:', agents.length);
        agents.forEach(el => el.remove());
      };
    }
  }, [metaVatarMode]);

  return (
    <Drawer open={open} onClose={() => setOpen(false)}
            title={<div><div style={{ fontWeight: 600 }}>MoneyPenny</div><div style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--ui-text-weak)' }}>Private Trading Chat</div></div>}
            right={<Badge>{consent ? "Doc-level: ON" : "Aggregates only"}</Badge>}
            style={{ maxWidth: metaVatarMode ? '1200px' : '600px', width: metaVatarMode ? '90vw' : 'auto' }}>
      <div className="ui-col ui-gap-2" style={{ height: metaVatarMode ? '80vh' : 'auto' }}>
        {/* Session insights */}
        <div className="ui-row ui-gap-2" style={{ flexWrap: 'wrap' }}>
          <Badge variant="claims">24h Capture: {insights ? insights.capture_bps_24h.toFixed(2) : "—"} bps</Badge>
          <Badge variant="custody">Fills: {insights ? insights.fills_24h : "—"}</Badge>
          <Badge>Chains: {insights ? insights.chains.join(", ") : "—"}</Badge>
        </div>

        {/* Consent toggle */}
        {!metaVatarMode && (
          <div className="ui-row ui-gap-2">
            <input id="docT" type="checkbox" checked={consent} onChange={toggleDocLevel} />
            <label htmlFor="docT" className="ui-text-11 ui-text-weak">
              Allow <b>redacted statement excerpts</b> for specific answers (off by default)
            </label>
          </div>
        )}

        {/* metaVatar mode - D-ID agent will be injected here */}
        {metaVatarMode && (
          <div
            ref={avatarContainerRef}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '600px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1e293b',
              borderRadius: '8px',
              position: 'relative'
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading avatar...</div>
          </div>
        )}

        {/* Text chat mode - show chat history and input */}
        {!metaVatarMode && (
          <>
            {/* Chat history */}
            <ScrollArea maxHeight={360} className="ui-p-2 ui-ring ui-rounded">
              <div className="ui-col ui-gap-2" ref={scrollRef}>
                {chat.map((m,i)=>(
                  <div key={i} className="ui-card ui-card-ring">
                    <div className="ui-text-11 ui-text-weak">{m.role === "user" ? "You" : "MoneyPenny"} — {new Date(m.ts).toLocaleTimeString()}</div>
                    <div className="ui-mt-2" style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="ui-row ui-gap-2">
              <input className="ui-input" placeholder="Ask about Q¢ trading, HFT terms, or your performance…"
                     value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") send(); }} />
              <Button onClick={send}>Send</Button>
            </div>
          </>
        )}

        {/* Toggle button between text chat and metaVatar */}
        <Button onClick={toggleMetaVatar} variant="ghost" style={{ width: '100%', marginTop: '8px' }}>
          {metaVatarMode ? '💬 Text Chat' : '🤖 metaVatar'}
        </Button>
      </div>
    </Drawer>
  );
}
