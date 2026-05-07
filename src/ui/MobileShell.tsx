import React from "react";
import "@/ui/mobile.css";

export default function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-root">
      <div className="phone-viewport">
        <div className="phone-safe">{children}</div>
      </div>
    </div>
  );
}

