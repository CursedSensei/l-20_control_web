'use client'

import { useL20Socket } from "@/contexts/L20SocketContext";
import { Volume, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FaderIcon } from "./FaderIcon";
import { MuteButton } from "./MuteButton";
import { FaderSlider } from "./ui/FaderSlider";

interface TrackFaderProps {
    track: TrackJsonType,
    orientation?: "horizontal" | "vertical",
    fxTrack?: boolean,
    masterTrack?: boolean,
    first?: boolean
    last?: boolean
}

export default function TrackFader({track, orientation, first, last, masterTrack}: TrackFaderProps) {
    const {isProcessing, setTrackVolume} = useL20Socket()
    const [volume, setVolume] = useState<number>(60)
    const [lastVolume, setLastVolume] = useState<number>(5)
    const [isMuted, setIsMuted] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const [isSettingVolume, setIsSettingVolume] = useState(false)

    const lastUpdatedVolume = useRef<number>(60)
    const newVolume = useRef<number>(60)

    async function sendVolume() {
        setIsSending(true)

        while (lastUpdatedVolume.current != newVolume.current) {
            lastUpdatedVolume.current = newVolume.current
            setTrackVolume({track_id: track.id, volume: lastUpdatedVolume.current, isMaster: masterTrack ?? false})
            await new Promise((r) => setTimeout(r, 100))
        }

        setIsSending(false)
    }

    useEffect(() => {
        if (volume == 0) setIsMuted(true);
        else setIsMuted(false);

        newVolume.current = volume

        if (!isSending) {
            sendVolume()
        }
    }, [volume])

    function handleMute() {
        if (isMuted) {
            setVolume(lastVolume)
        }
        else {
            setLastVolume(volume)
            setVolume(0)
        }
    }

    function handleInputVolume(val: number) {
        setVolume(val)
        setIsSettingVolume(true)
    }

    function handleCommitVolume(val: number) {
        setVolume(val)
        setIsSettingVolume(false)
    }

    if (orientation == "vertical") {
        return (
            <div className={"w-full px-3 py-6 border border-accent border-b-0 border-x-0 md:border-x! flex flex-col items-center"}>
                <FaderIcon iconName={track.icon} />
                <h4 className="text-lg mb-7 text-center select-none">{track.name}</h4>

                <FaderSlider className="mb-7" disabled={isProcessing} iconBackground="bg-sidebar" orientation="vertical" value={[volume]} onValueChange={(val) => handleInputVolume(val[0])} onValueCommit={(val) => handleCommitVolume(val[0])} />
                <MuteButton isMuted={isMuted} handleMute={handleMute} />
            </div>
        )
    }

    return (
        <div className={`w-full px-3 py-6 border border-accent border-b-0 border-x-0 md:border-x! ${first ? " md:rounded-tl-lg md:rounded-tr-lg" : ""} ${last ? " md:rounded-bl-lg md:rounded-br-lg md:border-b!" : ""}`}>
            <div className="flex w-full justify-between mb-5">
                <div className="flex gap-3">
                    <FaderIcon iconName={track.icon} />
                    <h4 className="text-lg select-none">{track.name}</h4>
                </div>
                <MuteButton isMuted={isMuted} handleMute={handleMute} />
            </div>

            <div className="flex w-full justify-between mb-5">
                <Volume />
                <Volume2 />
            </div>
            <FaderSlider className="mb-2" iconBackground="bg-background" disabled={isProcessing} value={[volume]} onValueChange={(val) => setVolume(val as unknown as number)} />
        </div>
    )
}