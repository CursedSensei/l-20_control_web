'use client'

import { ConnectionDialog } from "@/components/ConnectionDialog";
import { MainFaderDrawer } from "@/components/layout/MainFaderDrawer";
import { TopBar } from "@/components/layout/TopBar";
import TrackFaderList from "@/components/layout/TrackFaderList";
import { L20ChannelProvider } from "@/contexts/L20ChannelContext";
import { L20SocketProvider } from "@/contexts/L20SocketContext";
import { useState } from "react";

export default function Home() {
  const [isMainFaderOpen, setIsMainFaderOpen] = useState(false)

  return (
    <L20ChannelProvider>
      <L20SocketProvider>
        <TopBar setIsMainFaderOpen={setIsMainFaderOpen} />
        <ConnectionDialog />
        <TrackFaderList />
        <MainFaderDrawer open={isMainFaderOpen} setOpen={setIsMainFaderOpen} />
      </L20SocketProvider>
    </L20ChannelProvider>
  );
}
