import React from "react";
import { Card, Button } from "../ui/ui";
import { usePersona } from "../../lib/personaStore";

export default function RequirePersona({ children, onOpenPersona }: { children: React.ReactNode; onOpenPersona: ()=>void }) {
  const { personaDid } = usePersona();
  if (!personaDid) {
    return (
      <Card title="Sign in required">
        <div className="ui-row ui-gap-2 ui-between">
          <div className="ui-text-xs ui-text-weak">Sign in with your <b>@qripto</b> persona to continue.</div>
          <Button variant="ghost" onClick={onOpenPersona}>Sign in</Button>
        </div>
      </Card>
    );
  }
  return <>{children}</>;
}
