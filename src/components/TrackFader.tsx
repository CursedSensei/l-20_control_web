'use client'

import { useL20Socket } from "@/contexts/L20SocketContext";
import { Volume, Volume2 } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";
import { FaderIcon } from "./FaderIcon";
import { MuteButton } from "./MuteButton";
import { FaderSlider } from "./ui/FaderSlider";

interface TrackFaderProps {
    track: TrackJsonType,
    maxVolume?: number,
    orientation?: "horizontal" | "vertical",
    fxTrack?: boolean,
    masterTrack?: boolean,
    first?: boolean
    last?: boolean,
    
    finalVolumeState?: [number, React.Dispatch<React.SetStateAction<number>>],
    newVolumeRef?: RefObject<number>
    isSendingState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    sendVolumeFunction?: () => Promise<void>
}

export default function TrackFader({track, maxVolume, orientation, first, last, masterTrack, newVolumeRef, isSendingState, sendVolumeFunction, finalVolumeState}: TrackFaderProps) {
    const {isProcessing, setTrackVolume, trackConsumers} = useL20Socket()

    const [volume, setVolume] = useState<number>(newVolumeRef?.current ?? 60)
    const [finalVolume, setFinalVolume] = finalVolumeState ?? useState<number>(60)
    const [lastVolume, setLastVolume] = useState<number>(5)
    const [isMuted, setIsMuted] = useState(true)
    const [isSettingVolume, setIsSettingVolume] = useState(false)
    const [isSending, setIsSending] = isSendingState ?? useState(false)

    const volumeTimeout = useRef<NodeJS.Timeout | null>(null)
    const newVolume = newVolumeRef ?? useRef<number>(60)

    async function sendVolume() {
        setIsSending(true)
        var lastUpdatedVolume = -1

        while (lastUpdatedVolume != newVolume.current) {
            lastUpdatedVolume = newVolume.current
            setTrackVolume({track_id: track.id, volume: lastUpdatedVolume, isMaster: masterTrack ?? false})
            await new Promise((r) => setTimeout(r, 100))
        }

        setIsSending(false)
    }


    
    useEffect(() => {
        if (newVolume.current == volume) return;

        newVolume.current = volume

        if (!isSending) {
            if (sendVolumeFunction) {
                sendVolumeFunction()
            } else {
                sendVolume()
            }
        }
    }, [volume])

    useEffect(() => {
        if (isSettingVolume) {
            if (volume == 0) setIsMuted(true);
            else setIsMuted(false);
        } else {
            if (finalVolume == 0) setIsMuted(true);
            else setIsMuted(false);
        }
    }, [volume, finalVolume, isSettingVolume])

    useEffect(() => {
        if (finalVolumeState) return;

        trackConsumers.current[track.id] = (volume: number) => {
            setFinalVolume(volume)
        }

        return () => {
            delete trackConsumers.current[track.id]
        }
    }, [])


    
    function startSettingVolumeState() {
        setIsSettingVolume(true)
        volumeTimeout.current && clearTimeout(volumeTimeout.current)
        volumeTimeout.current = null
    }

    function stopSettingVolumeState() {
        volumeTimeout.current = setTimeout(() => {
            setIsSettingVolume(false)
        }, 500)
    }



    function handleMute() {
        startSettingVolumeState()

        if (isMuted) {
            setVolume(lastVolume)
        }
        else {
            setLastVolume(volume)
            setVolume(0)
        }

        stopSettingVolumeState()
    }

    function handleInputVolume(val: number) {
        startSettingVolumeState()
        setVolume(val)
    }

    function handleCommitVolume(val: number) {
        stopSettingVolumeState()
        setVolume(val)
    }



    if (orientation == "vertical") {
        return (
            <div className={"w-full px-3 py-6 border border-accent border-b-0 border-x-0 md:border-x! flex flex-col items-center"}>
                <FaderIcon iconName={track.icon} />
                <h4 className="text-lg mb-7 text-center select-none">{track.name}</h4>

                <FaderSlider className="mb-7" disabled={isProcessing} max={maxVolume ?? 120} iconBackground="bg-sidebar" orientation="vertical" value={[isSettingVolume ? volume : finalVolume]} onValueChange={(val) => handleInputVolume(val[0])} onValueCommit={(val) => handleCommitVolume(val[0])} />
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
            <FaderSlider className="mb-2" iconBackground="bg-background" disabled={isProcessing} max={maxVolume ?? 120} value={[isSettingVolume ? volume : finalVolume]} onValueChange={(val) => handleInputVolume(val[0])} onValueCommit={(val) => handleCommitVolume(val[0])} />
        </div>
    )
}