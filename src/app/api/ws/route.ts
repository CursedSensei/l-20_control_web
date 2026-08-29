import { L20_client, L20_Client } from '@/services/L20_client';
import { WebSocket, WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

export function GET() {
    const headers = new Headers()
    headers.set("Upgrade", "websocket")
    headers.set("Connection", "Upgrade")

    return new Response("Websocket Access Point", {
        status: 101,
        headers
    })
}

export function UPGRADE(client: WebSocket, server: WebSocketServer) {
    var selectedChannel: number | null = null;
    var listeners: { event: Websocket_Events; callback: Consumer_Function }[] = []

    // This timeout is to ensure that the client authenticates within 20 seconds, otherwise the connection will be closed.
    const connectionTimeoutID = setTimeout(() => {
        client.close()
    }, 20000)



    function sendTrackInfo() {
        const trackInfo = L20_Client.websocketTrackInfoBychannelId(selectedChannel);

        if (trackInfo) {
            client.send(JSON.stringify(trackInfo))
        }
    }



    function handleConnectionStatus({isConnected}: Consumer_Connection_Status) {
        client.send(JSON.stringify({
            command: "connection_status",
            status: isConnected ? "connected" : "disconnected"
        } as Websocket_Connection_Status))

        if (isConnected) {
            sendTrackInfo()
        }
    }

    function handleTrackInfo() {
        sendTrackInfo()
    }

    function handleVolumeChange({track_id, channel_id, volume}: Consumer_Volume_Change) {
        if (selectedChannel === null || channel_id !== selectedChannel) return;

        const data: Websocket_Volume_Change = {
            command: "change_volume",
            track_id: track_id,
            volume: volume
        }
        client.send(JSON.stringify(data))
    }

    function handleOnMessage(data: WebSocket.RawData) {
        const command = JSON.parse(data.toString()) as Websocket_Message

        if (command.command == "change_volume") {
            const volumeCommand = command as Websocket_Volume_Change

            if (selectedChannel !== null) {
                L20_Client.setVolume(volumeCommand.track_id, selectedChannel, volumeCommand.volume)
            }
        } else if (command.command == "track_info") {
            sendTrackInfo()
        } else if (command.command == "change_channel") {
            const newSelectedChannel = (command as Websocket_Change_Channel).channel_id;
            selectedChannel = newSelectedChannel
            sendTrackInfo()
        }
    }

    // Copy of handleOnMessage but not connected to L20_Client.
    function handleUnauthenticatedOnMessage(data: WebSocket.RawData) {
        const command = JSON.parse(data.toString()) as Websocket_Message

        if (command.command == "change_volume") {
            const volumeCommand = command as Websocket_Volume_Change

            if (selectedChannel !== null) {
                handleVolumeChange({
                    track_id: volumeCommand.track_id,
                    channel_id: selectedChannel,
                    volume: volumeCommand.volume
                })
            }

            return;
        }
    
        var l20Client = new L20_client();
        const trackInfo = l20Client.websocketTrackInfoBychannelId(selectedChannel);

        if (command.command == "track_info") {
            if (trackInfo) {
                client.send(JSON.stringify(trackInfo))
            }
        } else if (command.command == "change_channel") {
            const newSelectedChannel = (command as Websocket_Change_Channel).channel_id;
            selectedChannel = newSelectedChannel
            if (trackInfo) {
                client.send(JSON.stringify(trackInfo))
            }
        } else {
            client.close();
        }
    }

    function handleInitialOnMessage(data: WebSocket.RawData) {
        clearTimeout(connectionTimeoutID)
        client.removeListener('message', handleInitialOnMessage)

        const auth = data.toString()

        if (auth === process.env.MIXER_SECRET_PASSWORD) {
            L20_Client.connectMixer(client)
            return;
        }

        jwt.verify(auth, process.env.JWT_SECRET as string, (err, decoded) => {
            const initialData: Websocket_Connection_Status = {
                command: "connection_status",
                status: L20_Client.isConnected ? "connected" : "disconnected"
            }

            if (err) {
                client.on('message', handleUnauthenticatedOnMessage)
                initialData.status = "connected"
            } else {
                client.on('message', handleOnMessage)
                initializeListeners()
            }

            client.send("Auth Complete")
            client.send(JSON.stringify(initialData))
        })
    }



    function initializeListeners() {
        if (listeners.length != 0) return;
        
        listeners = [
            {
                event: "connection_status",
                callback: handleConnectionStatus as Consumer_Function
            },
            {
                event: "track_info",
                callback: handleTrackInfo as Consumer_Function
            },
            {
                event: "change_volume",
                callback: handleVolumeChange as Consumer_Function
            }
        ]

        for (const { event, callback } of listeners) {
            L20_Client.on(event, callback as (parameters: Consumer_Parameter_Type) => void)
        }
    }

    function cleanupListeners() {
        for (const { event, callback } of listeners) {
            L20_Client.removeListener(event, callback as (parameters: Consumer_Parameter_Type) => void)
        }

        listeners = []
    }



    client.on('message', handleInitialOnMessage)

    client.on('close', () => {
        cleanupListeners()
        clearTimeout(connectionTimeoutID)
    })

    client.on('error', (err) => {
        console.error(err)
        cleanupListeners()
        clearTimeout(connectionTimeoutID)
        client.close()
    })
}