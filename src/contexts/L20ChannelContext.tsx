'use client'

import { fetchFaders } from "@/services/fetchFaders";
import { createContext, useContext, useEffect, useState } from "react";

interface L20ChannelContextType {
    channelId: string | undefined,
    allChannels: FaderJsonType[],
    setChannelId: (id: string | undefined) => void
}

const L20ChannelContext = createContext<L20ChannelContextType | undefined>(undefined)

export function L20ChannelProvider({children}: Readonly<{children: React.ReactNode}>) {
    const [channelId, setChannelId] = useState<string | undefined>(undefined)
    const [allChannels, setAllChannels] = useState<FaderJsonType[]>([])

    useEffect(() => {
        fetchFaders().then((fetchedFaders) => {
            setAllChannels(fetchedFaders.filter((fader) => fader.shown))

            const storedChannelId = localStorage.getItem("channelId")
            if (storedChannelId && fetchedFaders.some((fader) => fader.id == parseInt(storedChannelId))) {
                setChannelId(storedChannelId)
            }
        })
    }, [])

    return (
        <L20ChannelContext.Provider value={{channelId, allChannels, setChannelId}}>
            {children}
        </L20ChannelContext.Provider>
    )
}

export function useL20Channel() {
    const context = useContext(L20ChannelContext)
    if (context === undefined) {
        throw new Error("useL20Channel must be used within a L20ChannelProvider")
    }
    return context
}