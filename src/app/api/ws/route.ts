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
    function cleanup() {
        // Remove Listeners
    }

    client.on('message', (data) => {
        const command = JSON.parse(data.toString()) as Websocket_Message

        console.log("Received Command: " + command.command)

        if (command.command == "change_volume") {
            const volumeCommand = command as Websocket_Volume_Change
            console.log("Volume Change - Track ID: " + volumeCommand.track_id + ", Group ID: " + volumeCommand.group_id + ", Volume: " + volumeCommand.volume)
        }

        // Handle Commands
    })

    client.on('close', () => {
        cleanup()
    })

    client.on('error', (err) => {
        console.error(err)
        cleanup()
        client.close()
    })

    const data: Websocket_Track_Info = {
        command: "track_info",
        tracks: [],
        fx_tracks: [],
        master: {
            mute: false,
            volume: 0,
            solo: false,
        }
    } 

    client.send(JSON.stringify(data))
}