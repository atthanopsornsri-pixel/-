"use client";

import { useEffect } from "react";

export function OfflineRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Expose a global kill-switch function for debugging/emergency unregistration
      (window as any).killServiceWorker = () => {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
          console.warn("All service workers unregistered.");
          // Clear caches
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
          window.location.reload();
        });
      };

      // Check if emergency URL parameter is present (?killsw=1)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("killsw")) {
        console.warn("Emergency Service Worker unregistration triggered via URL.");
        (window as any).killServiceWorker();
        return;
      }

      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered successfully with scope:", registration.scope);

            // Handle updates automatically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      console.log("New content is available; post skipWaiting.");
                      installingWorker.postMessage({ action: "skipWaiting" });
                    } else {
                      console.log("Content is cached for offline use.");
                    }
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
      }

      // Handle controller change (reloads page to activate new service worker immediately)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
