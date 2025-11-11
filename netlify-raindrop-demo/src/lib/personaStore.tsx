import React, { createContext, useContext, useEffect, useState } from "react";

type PersonaCtx = {
  tenantId: string;
  personaDid: string;
  handle: string;
  setPersona: (p: { tenantId: string; personaDid: string; handle: string }) => void;
  clearPersona: () => void;
};

const Ctx = createContext<PersonaCtx | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenant] = useState("qripto");
  const [personaDid, setDid] = useState("");
  const [handle, setHandle] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("qripto.persona");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setTenant(p.tenantId || "qripto");
        setDid(p.personaDid || "");
        setHandle(p.handle || "");
      } catch {}
    }
  }, []);

  function setPersona(p: { tenantId: string; personaDid: string; handle: string }) {
    setTenant(p.tenantId);
    setDid(p.personaDid);
    setHandle(p.handle);
    localStorage.setItem("qripto.persona", JSON.stringify(p));
  }
  function clearPersona() {
    setDid(""); setHandle("");
    localStorage.removeItem("qripto.persona");
  }

  return (
    <Ctx.Provider value={{ tenantId, personaDid, handle, setPersona, clearPersona }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePersona() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePersona must be used within <PersonaProvider>");
  return v;
}
