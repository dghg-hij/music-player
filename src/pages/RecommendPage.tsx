import { useState, useCallback } from "react";
import RecommendPageContent from "../components/RecommendPageContent";
import PullToRefresh from "../components/PullToRefresh";

export default function RecommendPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <RecommendPageContent key={refreshKey} />
    </PullToRefresh>
  );
}
