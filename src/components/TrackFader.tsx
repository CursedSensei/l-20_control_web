'use client'

import { useL20Socket } from "@/contexts/L20SocketContext"
import { useEffect, useState } from "react"
import { TrackType } from "./TrackFaderList"

interface TrackFaderProps {
    track: TrackType
}

export default function TrackFader({track}: TrackFaderProps) {
    const {isConnected} = useL20Socket()
    const [volume, setVolume] = useState<number>(-1)
    const [isSending, setIsSending] = useState(false)

    async function sendVolume() {
        var newVolume = volume
        setVolume(-1)

        while (newVolume != -1) {
            // send
            await new Promise((r) => setTimeout(r, 300))

            setVolume((val) => {
                newVolume = val
                return -1
            })
        }

        setIsSending(false)
    }

    useEffect(() => {
        if (volume == -1 || isSending) return

        setIsSending(true)
        sendVolume()
    }, [volume])

    return (
        <div className="w-full bg-secondary h-30 px-3 py-2 rounded-md grid-cols-1 grid-rows-2">
            <h4 className="text-md md:text-xl mb-5">{track.name}</h4>

            <input disabled={!isConnected} type="range" min={0} max={120} onInput={(e) => {
                if (e.target instanceof HTMLInputElement) {
                    setVolume(e.target.value as unknown as number)
                }
            }} className="w-full mt-auto" />
        </div>
    )
}