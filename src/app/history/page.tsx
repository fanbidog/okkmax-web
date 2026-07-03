import { SiteNav } from "@/components/SiteNav";
import { HistoryList } from "./HistoryList";
import "./history.css";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  return (
    <>
      <SiteNav active="tool" />
      <HistoryList />
    </>
  );
}
