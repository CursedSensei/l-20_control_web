import { WebSocket, WebSocketServer } from 'ws';

interface CommandType {
    command: "volume",
    parameters: unknown
}

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
        const command = JSON.parse(data.toString()) as CommandType

        if (command.command == "volume") {
            // L20_Client.setVolume()
        }

        // TODO: Add more commands
    })

    client.on('close', () => {
        cleanup()
    })

    client.on('error', (err) => {
        console.error(err)
        cleanup()
        client.close()
    })
}