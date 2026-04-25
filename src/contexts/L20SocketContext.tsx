'use client'

import { createContext, useContext, useState } from "react"

interface L20SocketContextType {
    isConnected: boolean
}

const L20SocketContext = createContext<L20SocketContextType | undefined>(undefined)

export function L20SocketProvider({children}: Readonly<{children: React.ReactNode}>) {
    const [isConnected, setIsConnected] = useState<boolean>(true)

    return (
        <L20SocketContext.Provider value={{isConnected}}>
            {children}
        </L20SocketContext.Provider>
    )
}

export function useL20Socket() {
    const context = useContext(L20SocketContext)

    if (context == undefined) {
        throw new Error("L20Socket must only be used inside L20SocketProvider component")
    }

    return context
}