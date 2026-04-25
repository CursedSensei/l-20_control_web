'use client'

import { useL20Socket } from "@/contexts/L20SocketContext"
import { useEffect, useState } from "react"

interface FaderType {
    id: number,
    name: string,
    shown: boolean
}

export default function FaderSelect() {
    const [faders, setFaders] = useState<FaderType[]>([])
    const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
    const {isConnected} = useL20Socket()

    useEffect(() => {
        const fetchFaders = () => {
            fetch("/faders.json")
                .then(data => data.json())
                .then((data) => {
                    const fetchedFaders = data as FaderType[]

                    setFaders(fetchedFaders.filter((fader) => fader.shown))
                    
                    if (fetchedFaders.length > 0) {
                        setSelectedId(fetchedFaders[0].id)
                    }
                })
                .catch(async () => {
                    await new Promise(r => setTimeout(r, 1000))
                    fetchFaders()
                })
        }

        fetchFaders()
    }, [])

    useEffect(() => {
        if (selectedId == undefined) return

        // set fader id to controller
    }, [selectedId])

    return (
        <select disabled={!isConnected} className="w-full rounded-md px-2 py-3 text-xl outline-none border bg-secondary" onChange={(e) => setSelectedId(e.target.value as unknown as number)}>
            {faders.map((fader, _) => (
                <option key={fader.id} value={fader.id}>{fader.name}</option>
            ))}
        </select>
    )
}