import "@/boot";
import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { GlobalStateProvider } from "@/contexts/global";
import ErrorFallback from "@/components/ErrorFallback";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error('Root element "#root" not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <GlobalStateProvider>
          <App />
        </GlobalStateProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
