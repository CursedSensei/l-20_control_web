'use client'

import { useEffect, useState } from "react"
import TrackFader from "./TrackFader"

export interface TrackType {
    id: number,
    name: string,
    shown: boolean
}

export default function TrackFaderList() {
    const [tracks, setTracks] = useState<TrackType[]>([])

    useEffect(() => {
        const fetchTracks = () => {
            fetch("/tracks.json")
                .then(data => data.json())
                .then((data) => {
                    const fetchedtracks= data as TrackType[]

                    setTracks(fetchedtracks.filter((track) => track.shown))
                })
                .catch(async () => {
                    await new Promise(r => setTimeout(r, 1000))
                    fetchTracks()
                })
        }

        fetchTracks()
    }, [])

    return (
        <section className="min-h-screen flex flex-col gap-1 py-5">
            {tracks.map((track, _) => (
                <TrackFader key={track.id} track={track} />
            ))}
        </section>
    )
}