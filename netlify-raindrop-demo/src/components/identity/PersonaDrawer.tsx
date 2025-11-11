import React, { useState, useEffect } from "react";
import { Drawer, Button, Input, Badge, SectionHeader } from "../ui/ui";

export default function PersonaDrawer({
  open: openProp,
  onClose: onCloseProp,
  onAuthenticated: onAuthenticatedProp,
}: {
  open?: boolean;
  onClose?: () => void;
  onAuthenticated?: (ctx: { tenantId: string; personaDid: string; handle: string }) => void;
} = {}) {
  const [open, setOpen] = useState(openProp ?? false);
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Listen for open events from vanilla JS
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('persona:open', handleOpen);
    return () => window.removeEventListener('persona:open', handleOpen);
  }, []);

  // Sync with prop if provided
  useEffect(() => {
    if (openProp !== undefined) setOpen(openProp);
  }, [openProp]);

  const onClose = () => {
    setOpen(false);
    onCloseProp?.();
  };

  async function signIn() {
    if (!handle.trim()) {
      setError("Please enter a handle");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For demo: simulate authentication
      // In production, this would call your DID/persona service
      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Generate a demo DID
      const personaDid = `did:qripto:${cleanHandle.toLowerCase()}:${Date.now().toString(36)}`;

      const ctx = {
        tenantId: "qripto",
        personaDid,
        handle: `@${cleanHandle}`,
      };

      // Save to localStorage
      localStorage.setItem("qripto.persona", JSON.stringify(ctx));

      // Trigger storage event for same-page updates
      window.dispatchEvent(new StorageEvent('storage', { key: 'qripto.persona' }));

      onAuthenticatedProp?.(ctx);

      setHandle("");
      setMode("signin");
      setOpen(false);
    } catch (e: any) {
      setError(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function createPersona() {
    if (!handle.trim()) {
      setError("Please enter a handle");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For demo: simulate persona creation
      // In production, this would call your DID/persona creation service
      const cleanHandle = handle.startsWith("@") ? handle.slice(1) : handle;

      if (cleanHandle.length < 3) {
        throw new Error("Handle must be at least 3 characters");
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Generate a new DID
      const personaDid = `did:qripto:${cleanHandle.toLowerCase()}:${Date.now().toString(36)}`;

      const ctx = {
        tenantId: "qripto",
        personaDid,
        handle: `@${cleanHandle}`,
      };

      // Save to localStorage
      localStorage.setItem("qripto.persona", JSON.stringify(ctx));

      // Trigger storage event for same-page updates
      window.dispatchEvent(new StorageEvent('storage', { key: 'qripto.persona' }));

      onAuthenticatedProp?.(ctx);

      setHandle("");
      setMode("signin");
      setOpen(false);
    } catch (e: any) {
      setError(e.message || "Failed to create persona");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      mode === "signin" ? signIn() : createPersona();
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="@qripto Persona"
      right={<Badge variant="claims">DiD-based Identity</Badge>}
    >
      <div className="ui-col ui-gap-3">
        {/* Mode Toggle */}
        <div className="ui-row ui-gap-2">
          <Button
            variant={mode === "signin" ? "primary" : "ghost"}
            onClick={() => { setMode("signin"); setError(""); }}
            className="ui-text-xs"
            style={{ flex: 1 }}
          >
            Sign In
          </Button>
          <Button
            variant={mode === "create" ? "primary" : "ghost"}
            onClick={() => { setMode("create"); setError(""); }}
            className="ui-text-xs"
            style={{ flex: 1 }}
          >
            Create New
          </Button>
        </div>

        {/* Sign In Mode */}
        {mode === "signin" && (
          <div className="ui-col ui-gap-3">
            <SectionHeader title="Sign in with your @qripto handle" />
            <div className="ui-text-11 ui-text-weak">
              Enter your existing @qripto persona handle to access your Smart Buckets, aggregates, and trading history.
            </div>

            <Input
              type="text"
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            {error && <div className="ui-text-11" style={{ color: "rgb(var(--error))" }}>{error}</div>}

            <Button onClick={signIn} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="ui-text-10 ui-text-weak ui-mt-2">
              🔒 Privacy-first: Your persona DID stays local. Only non-PII aggregates are shared with MoneyPenny.
            </div>
          </div>
        )}

        {/* Create Mode */}
        {mode === "create" && (
          <div className="ui-col ui-gap-3">
            <SectionHeader title="Create a new @qripto persona" />
            <div className="ui-text-11 ui-text-weak">
              Choose a unique handle for your new persona. This will create a DiD-based identity for secure, privacy-preserving trading.
            </div>

            <Input
              type="text"
              placeholder="@newhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            {error && <div className="ui-text-11" style={{ color: "rgb(var(--error))" }}>{error}</div>}

            <Button onClick={createPersona} disabled={loading}>
              {loading ? "Creating..." : "Create Persona"}
            </Button>

            <div className="ui-card ui-rounded-xs ui-p-2 ui-mt-2">
              <div className="ui-text-10 ui-text-weak">
                <strong>What you get:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  <li>Decentralized identifier (DiD)</li>
                  <li>Secure Smart Bucket for documents</li>
                  <li>Private Smart Memories storage</li>
                  <li>Non-PII aggregate profiles</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Demo Info */}
        <div className="ui-card ui-rounded-xs ui-p-2" style={{ background: "rgba(var(--accent-cyan), 0.05)" }}>
          <div className="ui-text-10 ui-text-weak">
            <strong>Demo Mode:</strong> This is a simplified authentication flow. In production, this would integrate with a full DiD resolver, credential verification, and secure key management.
          </div>
        </div>
      </div>
    </Drawer>
  );
}
