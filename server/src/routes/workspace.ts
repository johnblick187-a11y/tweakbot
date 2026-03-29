import { Router } from "express";
import { listFiles, readFileSafe, writeFileSafe, deleteFile } from "./agent/workspace/fileTools";
import { runCommand } from "./agent/workspace/commandRunner";

const router = Router();

router.get("/:projectId/files", async (req, res) => {
  try {
    const files = await listFiles(req.params.projectId, (req.query.dir as string) || "");
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/:projectId/file", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  try {
    const content = await readFileSafe(req.params.projectId, filePath);
    res.json({ path: filePath, content });
  } catch (err) {
    res.status(404).json({ error: String(err) });
  }
});

router.put("/:projectId/file", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  try {
    const result = await writeFileSafe(req.params.projectId, filePath, req.body.content ?? "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/:projectId/file", async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) { res.status(400).json({ error: "path required" }); return; }
  try {
    await deleteFile(req.params.projectId, filePath);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/:projectId/run", async (req, res) => {
  const { command, cwd = "" } = req.body;
  if (!command) { res.status(400).json({ error: "command required" }); return; }
  try {
    res.json(runCommand(req.params.projectId, command, cwd));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
