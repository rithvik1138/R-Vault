import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ❌ DO NOT register any PWA or custom service worker here
// ❌ NO virtual:pwa-register
// ❌ NO registerSW
// ❌ NO navigator.serviceWorker.register

createRoot(document.getElementById("root")!).render(
  <App />
);
