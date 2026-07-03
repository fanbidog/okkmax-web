import { redirect } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { InviteLanding } from "@/components/InviteLanding";

export const dynamic = "force-dynamic";

export default async function InviteCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await getCurrentUser();
  if (me) redirect("/"); // 已登录用户点邀请链接无意义,回首页

  const inviter = await prisma.user.findUnique({ where: { inviteCode: code }, select: { name: true, email: true } });
  const inviterName = inviter ? (inviter.name || inviter.email.split("@")[0]) : null;

  return (
    <>
      <SiteNav />
      <InviteLanding code={code} inviterName={inviterName} />
    </>
  );
}
