import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installBlocklyLocale } from "./blocks/locale";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

installBlocklyLocale();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
