import React from "react";
import ReactDOM from "react-dom/client";
import ClientDemoApp from "../../src/ui/ClientDemoApp";
import "../../src/ui/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClientDemoApp />
  </React.StrictMode>,
);
