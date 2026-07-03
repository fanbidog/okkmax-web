import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(); // 允许匿名提交;登录则关联 userId
  const form = await req.formData();
  const s = (k: string, max: number) => String(form.get(k) || "").trim().slice(0, max);
  const name = s("name", 80);
  const url = s("url", 200);
  if (!name || !url) return NextResponse.json({ error: "站点名称和 URL 必填" }, { status: 400 });

  await prisma.submission.create({
    data: {
      userId: user?.id ?? null,
      name, url,
      intro: s("intro", 200) || null,
      contact: s("contact", 120) || null,
      models: form.getAll("models").map(String).slice(0, 10),
      payment: s("payment", 120) || null,
      invoice: s("invoice", 120) || null,
      refund: s("refund", 120) || null,
      promo: s("promo", 200) || null,
      note: s("note", 500) || null,
      probeAccount: s("probeAccount", 120) || null,
      probePassword: s("probePassword", 120) || null,
    },
  });
  return NextResponse.json({ ok: true });
}
