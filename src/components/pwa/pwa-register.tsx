"use client";

import * as React from "react";

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV === "development") {
              console.log("[PWA] Service Worker registered with scope:", registration.scope);
            }
          })
          .catch((err) => {
            if (process.env.NODE_ENV === "development") {
              console.warn("[PWA] Service Worker registration failed:", err);
            }
          });
      });
    }
  }, []);

  return null;
}
