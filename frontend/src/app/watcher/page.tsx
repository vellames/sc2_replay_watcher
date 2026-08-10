import type { Metadata } from "next";

import { ReplayViewer } from "@/components/replay-viewer";

export const metadata: Metadata = {
  title: "Replay Watcher · SC2 Replay Watcher",
  description: "Explore match state on an interactive 2D tactical map.",
};

export default function WatcherPage() {
  return <ReplayViewer />;
}
