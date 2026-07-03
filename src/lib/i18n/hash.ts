import { createHash } from "crypto";

export const sha = (s: string) =>
  createHash("sha256").update(s.trim()).digest("hex").slice(0, 16);
