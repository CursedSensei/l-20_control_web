import FaderSelect from "@/components/FaderSelect";
import TrackFaderList from "@/components/TrackFaderList";
import { L20SocketProvider } from "@/contexts/L20SocketContext";

export default function Home() {
  return (
    <L20SocketProvider>
      <FaderSelect />

      <TrackFaderList />
    </L20SocketProvider>
  );
}
