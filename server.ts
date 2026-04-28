import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock KB endpoints
  app.post("/api/kb/upload", (req, res) => {
    res.json({ kb_id: `kb_${Date.now()}`, chunks: 47, tokens: 18320, status: "ready" });
  });

  app.get("/api/kb/list", (req, res) => {
    res.json([{ id: "kb_example123", title: "Example Document", status: "ready" }]);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", agents: { retriever: "ready", proposer: "ready", adversary_a: "ready", adversary_b: "ready", nil: "ready", judge: "ready" }, cache: { type: "fakeredis", hit_rate: 0.62 }, kb_count: 1, version: "2.0.0" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
