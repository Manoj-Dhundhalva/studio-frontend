import "@/boot";
import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider as StoreProvider } from "react-redux";
import { queryClient } from "@/lib/query-client";
import { store } from "@/store";
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
      <StoreProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <GlobalStateProvider>
            <App />
          </GlobalStateProvider>
        </QueryClientProvider>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
);
