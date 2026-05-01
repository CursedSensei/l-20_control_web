'use client'

import { FX_1_TRACK_ID, FX_2_TRACK_ID, MASTER_TRACK_ID } from "@/constants";
import { createContext, RefObject, useContext, useEffect, useRef, useState } from "react";
import { useL20Channel } from "./L20ChannelContext";

interface Track_Volume_Parameters {
    track_id: number;
    volume: number;
    isMaster: boolean;
}

interface L20SocketContextType {
    isConnected: boolean,
    isProcessing: boolean,
    setTrackVolume: ({track_id, volume, isMaster}: Track_Volume_Parameters) => void,
    trackConsumers: RefObject<{[track_id: number]: (volume: number) => void}>
}

const L20SocketContext = createContext<L20SocketContextType | undefined>(undefined)

export function L20SocketProvider({children}: Readonly<{children: React.ReactNode}>) {
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [isProcessing, setIsProcessing] = useState<boolean>(true)
    const {channelId, setChannelId} = useL20Channel()
    const socket = useRef<WebSocket | null>(null)
    const channelIdRef = useRef<number | undefined>(undefined)
    const trackConsumers = useRef<{[track_id: number]: (volume: number) => void}>({})

    function switchChannel() {
        if (channelIdRef.current != null) {
            const channelMessage: Websocket_Change_Channel = {
                command: "change_channel",
                channel_id: channelIdRef.current
            }

            setIsProcessing(true)
            socket.current?.send(JSON.stringify(channelMessage))
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
            volume: volume
        }

        socket.current?.send(JSON.stringify(track))
    }

    function handleReceivedMessage(message: Websocket_Message) {
        switch (message.command) {
            case "track_info":
                const trackInfoMessage = message as Websocket_Track_Info
                trackInfoMessage.tracks.forEach((track, index) => {
                    if (trackConsumers.current[index]) {
                        trackConsumers.current[index](track.volume)
                    }
                })
                if (trackConsumers.current[FX_1_TRACK_ID]) {
                    trackConsumers.current[FX_1_TRACK_ID](trackInfoMessage.fx_tracks[0].volume)
                }
                if (trackConsumers.current[FX_2_TRACK_ID]) {
                    trackConsumers.current[FX_2_TRACK_ID](trackInfoMessage.fx_tracks[1].volume)
                }
                if (trackConsumers.current[MASTER_TRACK_ID] && trackInfoMessage.master.volume !== -1) {
                    trackConsumers.current[MASTER_TRACK_ID](trackInfoMessage.master.volume)
                }
                setIsProcessing(false)
                break
            case "change_volume":
                const volumeMessage = message as Websocket_Volume_Change
                if (trackConsumers.current[volumeMessage.track_id]) {
                    trackConsumers.current[volumeMessage.track_id](volumeMessage.volume)
                }
                break
            case "change_channel":
                const channelMessage = message as Websocket_Change_Channel
                if (channelMessage.channel_id == -1) {
                    setChannelId(undefined)
                }
                break
            case "connection_status":
                const connectionMessage = message as Websocket_Connection_Status
                if (connectionMessage.status == "connected") {
                    setIsConnected(true)
                } else {
                    setIsConnected(false)
                    setIsProcessing(true)
                }
                break
        }
    }

    function startWebsocket() {
        const newSocket = new WebSocket("api/ws")
        newSocket.onopen = () => {
            socket.current = newSocket
            switchChannel()
        }
        newSocket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            handleReceivedMessage(data)
        }
        newSocket.onclose = () => {
            setIsConnected(false)
            setIsProcessing(true)

            if (socket.current == newSocket) {
                socket.current = null
                setTimeout(startWebsocket, 1000)
            }
        }
        newSocket.onerror = () => {
            setIsConnected(false)
            setIsProcessing(true)

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
            switchChannel()
        }

        localStorage.setItem("channelId", channelId.toString())
    }, [channelId])

    return (
        <L20SocketContext.Provider value={{isConnected, isProcessing, setTrackVolume, trackConsumers}}>
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