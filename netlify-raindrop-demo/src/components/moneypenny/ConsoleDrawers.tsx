import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { PersonaProvider, usePersona } from "../../lib/personaStore";
import PersonaDrawer from "../identity/PersonaDrawer";
import MoneyPennyDrawer from "./MoneyPennyDrawer";

function DrawersInner() {
  const { tenantId, personaDid, setPersona } = usePersona();
  const [personaOpen, setPersonaOpen] = useState(false);
  const [moneypennyOpen, setMoneypennyOpen] = useState(false);

  useEffect(() => {
    const handlePersonaOpen = () => setPersonaOpen(true);
    const handleMoneypennyOpen = () => setMoneypennyOpen(true);

    window.addEventListener('persona:open', handlePersonaOpen);
    window.addEventListener('moneypenny:open', handleMoneypennyOpen);

    return () => {
      window.removeEventListener('persona:open', handlePersonaOpen);
      window.removeEventListener('moneypenny:open', handleMoneypennyOpen);
    };
  }, []);

  function onAuth(ctx: { tenantId: string; personaDid: string; handle: string }) {
    setPersona(ctx);
    setPersonaOpen(false);
    // Trigger page to reload persona state
    window.dispatchEvent(new StorageEvent('storage', { key: 'qripto.persona' }));
  }

  return (
    <>
      <PersonaDrawer
        open={personaOpen}
        onClose={() => setPersonaOpen(false)}
        onAuthenticated={onAuth}
      />
      <MoneyPennyDrawer
        tenantId={tenantId}
        personaId={personaDid}
      />
    </>
  );
}

export function mountConsoleDrawers() {
  const personaRoot = document.getElementById('persona-drawer-root');
  const moneypennyRoot = document.getElementById('moneypenny-drawer-root');

  if (personaRoot && moneypennyRoot) {
    const root = createRoot(personaRoot);
    root.render(
      <PersonaProvider>
        <DrawersInner />
      </PersonaProvider>
    );
  }
}

// Auto-mount when script loads
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountConsoleDrawers);
  } else {
    mountConsoleDrawers();
  }
}
