import { SiteNav } from "@/components/SiteNav";
import { ResultView } from "./ResultView";
import "./result.css";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return (
    <>
      <SiteNav active="tool" />
      <ResultView jobId={jobId} />
    </>
  );
}
