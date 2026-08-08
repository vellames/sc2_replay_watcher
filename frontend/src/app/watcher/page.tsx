import type { Metadata } from "next";

import { ReplayViewer } from "@/components/replay-viewer";

export const metadata: Metadata = {
  title: "Replay Watcher · SC2 Replay Watcher",
  description: "Explore o estado da partida em um mapa tático 2D.",
};

export default function WatcherPage() {
  return <ReplayViewer />;
}
