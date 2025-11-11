import React, { useState } from "react";
import { Card, Button } from "../ui/ui";
import BankingDocumentsCard from "./BankingDocumentsCard";
import PersonaDrawer from "../identity/PersonaDrawer";
import { usePersona } from "../../lib/personaStore";

export default function ProfilePage() {
  const { tenantId, personaDid, handle, setPersona, clearPersona } = usePersona();
  const [personaOpen, setPersonaOpen] = useState(false);

  function onAuth(ctx: { tenantId: string; personaDid: string; handle: string }) {
    setPersona(ctx);
    setPersonaOpen(false);
  }

  function goConsole() {
    window.location.href = "/moneypenny/console";
  }

  return (
    <main className="ui-col ui-gap-3 ui-px-4 ui-py-3" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="ui-between">
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Profile</h1>
          <div className="ui-text-xs ui-text-weak">Upload statements → non-PII aggregates → apply Q¢ limits.</div>
        </div>
        <div className="ui-row ui-gap-2">
          {personaDid
            ? <>
                <Button variant="ghost" onClick={() => setPersonaOpen(true)}>{handle}</Button>
                <Button variant="danger" onClick={clearPersona}>Sign out</Button>
              </>
            : <Button variant="ghost" onClick={() => setPersonaOpen(true)}>Sign in (@qripto)</Button>}
        </div>
      </div>

      {personaDid
        ? <BankingDocumentsCard tenantId={tenantId} personaId={personaDid} onApplied={goConsole} />
        : <Card title="Banking Documents">
            <div className="ui-text-xs ui-text-weak">
              Please <b>sign in with your @qripto persona</b> to attach your secure Smart Bucket and upload statements.
            </div>
            <Button variant="ghost" onClick={() => setPersonaOpen(true)} className="ui-mt-3">Sign in to continue</Button>
          </Card>
      }

      <PersonaDrawer open={personaOpen} onClose={() => setPersonaOpen(false)} onAuthenticated={onAuth} />
    </main>
  );
}
