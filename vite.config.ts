import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const clientDemo = mode === "client-demo";
  return {
    plugins: [react()],
    root: clientDemo ? "client-demo" : ".",
    publicDir: clientDemo ? "../public" : "public",
    build: clientDemo
      ? { outDir: "../dist-demo", emptyOutDir: true }
      : { outDir: "dist", emptyOutDir: true },
  };
});
