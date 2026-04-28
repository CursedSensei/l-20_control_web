'use client'

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useL20Channel } from "./L20ChannelContext";

interface Track_Volume_Parameters {
    track_id: number;
    volume: number;
    isMaster: boolean;
}

interface L20SocketContextType {
    isConnected: boolean,
    isProcessing: boolean,
    setTrackVolume: ({track_id, volume, isMaster}: Track_Volume_Parameters) => void
}

const L20SocketContext = createContext<L20SocketContextType | undefined>(undefined)

export function L20SocketProvider({children}: Readonly<{children: React.ReactNode}>) {
    const [isConnected, setIsConnected] = useState<boolean>(true)
    const [isProcessing, setIsProcessing] = useState<boolean>(true)
    const {channelId, setChannelId} = useL20Channel()
    const socket = useRef<WebSocket | null>(null)
    const channelIdRef = useRef<number | undefined>(undefined)

    function handleReceivedMessage(message: Websocket_Message) {
        switch (message.command) {
            case "track_info":
                setIsProcessing(false)
                break
            case "change_volume":
                break
            case "change_channel":
                const channelMessage = message as Websocket_Change_Channel
                if (channelMessage.channel_id == -1) {
                    setChannelId(undefined)
                }
                break
        }
    }

    function switchChannel() {
        if (channelIdRef.current != null) {
            console.log("Requesting channel change to channel " + channelIdRef.current)
            const channelMessage: Websocket_Change_Channel = {
                command: "change_channel",
                channel_id: channelIdRef.current
            }

            socket.current?.send(JSON.stringify(channelMessage))

            const initMessage: Websocket_Message = {
                command: "track_info"
            }
            
            socket.current?.send(JSON.stringify(initMessage))
        }
    }

    function setTrackVolume({track_id, volume, isMaster}: Track_Volume_Parameters) {
        if (channelId == undefined && !isMaster) {
            console.error("Cannot change track volume without a selected channel")
            return
        }

        const track: Websocket_Volume_Change = {
            command: "change_volume",
            track_id: track_id,
            group_id: isMaster ? null : parseInt(channelId!),
            volume: volume
        }

        socket.current?.send(JSON.stringify(track))
    }

    function startWebsocket() {
        const newSocket = new WebSocket("api/ws")
        socket.current = newSocket
        socket.current.onopen = () => {
            setIsProcessing(true)
            setIsConnected(true)

            switchChannel()
        }
        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            handleReceivedMessage(data)
        }
        socket.current.onclose = () => {
            setIsConnected(false)

            if (socket.current == newSocket) {
                socket.current = null
                setTimeout(startWebsocket, 1000)
            }
        }
        socket.current.onerror = () => {
            setIsConnected(false)

            if (socket.current == newSocket) {
                socket.current = null
                setTimeout(startWebsocket, 1000)
            }
        }
    }

    useEffect(() => {
        startWebsocket()
    }, [])

    useEffect(() => {
        if (channelId == undefined) {
            channelIdRef.current = undefined
            return
        } else {
            channelIdRef.current = parseInt(channelId)

            if (isConnected) {
                switchChannel()
            }
        }

        localStorage.setItem("channelId", channelId.toString())
    }, [channelId])

    return (
        <L20SocketContext.Provider value={{isConnected, isProcessing, setTrackVolume}}>
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