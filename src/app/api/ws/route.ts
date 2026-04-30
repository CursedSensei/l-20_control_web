import { L20_Client } from '@/services/L20_client';
import { WebSocket, WebSocketServer } from 'ws';

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


    
    const listeners: { event: Websocket_Events; callback: Consumer_Function }[] = [
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

    function initializeListeners() {
        for (const { event, callback } of listeners) {
            L20_Client.on(event, callback as (parameters: Consumer_Parameter_Type) => void)
        }
    }

    function cleanupListeners() {
        for (const { event, callback } of listeners) {
            L20_Client.removeListener(event, callback as (parameters: Consumer_Parameter_Type) => void)
        }
    }



    client.on('message', (data) => {
        const command = JSON.parse(data.toString()) as Websocket_Message

        console.log("Received Command: " + command.command)

        if (command.command == "change_volume") {
            const volumeCommand = command as Websocket_Volume_Change
            console.log("Volume Change - Track ID: " + volumeCommand.track_id + ", Group ID: " + selectedChannel +  ", Volume: " + volumeCommand.volume)

            if (selectedChannel !== null) {
                L20_Client.setVolume(volumeCommand.track_id, selectedChannel, volumeCommand.volume)
            }
        } else if (command.command == "track_info") {
            sendTrackInfo()
        } else if (command.command == "change_channel") {
            const newSelectedChannel = (command as Websocket_Change_Channel).channel_id;
            console.log("Change Channel - From: " + selectedChannel + ", To: " + newSelectedChannel)
            selectedChannel = newSelectedChannel;
            sendTrackInfo()
        }
    })

    client.on('close', () => {
        cleanupListeners()
    })

    client.on('error', (err) => {
        console.error(err)
        cleanupListeners()
        client.close()
    })


    
    initializeListeners()

    const data: Websocket_Connection_Status = {
        command: "connection_status",
        // status: L20_Client.isConnected ? "connected" : "disconnected"
        status: "connected"
    }

    client.send(JSON.stringify(data))
}