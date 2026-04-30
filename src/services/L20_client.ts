import * as net from "node:net";

class L20_client {
    mixes: {
        [channel_id: number]: {
            monitor: L20_Fader;
            tracks: L20_Track[]
        };
    };
    master: L20_Fader;

    isConnected: boolean;
    private eventListeners: {
        [event: string]: ((parameters: Consumer_Parameter_Type) => void)[];
    } = {};

    constructor() {
        this.mixes = {}
        this.master = {
            mute: false,
            solo: false,
            volume: 0,
        };
        this.isConnected = false;

        const tracks: L20_Track[] = []

        for (let i = 0; i < 18; i++) {
            tracks.push({
                mute: false,
                solo: false,
                volume: 0,
                track_id: i,
                eq: {
                    phase: false,
                    eq_off: false,
                    low_cut: false,
                    low: 0,
                    mid: 0,
                    mid_freq: 0,
                    high: 0,
                    efx1: 0,
                    efx2: 0,
                    pan: 0
                }
            })
        }

        for (let i = 0; i < 7; i++) {
            this.mixes[i] = {
                monitor: {
                    mute: false,
                    solo: false,
                    volume: 60
                },
                tracks: [...tracks]
            };
        }
        
        // this.connect();
    }

    private async connect() {
        const socketPath = process.env.L20_SOCKET_PATH || "\\\\.\\pipe\\l20_control_socket";

        while (true) {
            console.log("Connecting to L-20...")

            try {
                const client = net.createConnection(socketPath)

                await new Promise((resolve, reject) => {
                    client.on('connect', resolve)
                    client.on('error', reject)
                })

                console.log("Connected to L-20")
                this.isConnected = true;
                this.invokeEvent("connection_status", { command: "connection_status", status: "connected" })

                client.on('data', (data) => {
                    const command = JSON.parse(data.toString()) as Websocket_Message
                })

                await new Promise((resolve) => {
                    client.on('close', resolve)
                    client.on('error', resolve)
                })
                
                client.destroy();
                this.isConnected = false;
                this.invokeEvent("connection_status", { command: "connection_status", status: "disconnected" })
            } catch (error) {
                console.error("Error connecting to L-20:", error)
            }

            await new Promise((r) => setTimeout(r, 1000))
        }
    }

    private invokeEvent(event: Websocket_Events, parameters: Consumer_Parameter_Type) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach((callback) => callback(parameters));
    }

    on(event: Websocket_Events, callback: (parameters: Consumer_Parameter_Type) => void): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    // Always remove listener when component unmounts to prevent memory leaks
    removeListener(event: Websocket_Events, callback: (parameters: Consumer_Parameter_Type) => void): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(
            (cb) => cb !== callback
        );
    }


    setVolume(trackId: number, channelId: number, volume: number) {
        // TODO: Implement Send Volume Change Command to L-20
        
        const data: Consumer_Volume_Change = {
            track_id: trackId,
            channel_id: channelId,
            volume: volume
        }

        this.invokeEvent("change_volume", data)
    }

    websocketTrackInfoBychannelId(channelId: number | null): Websocket_Track_Info | null {
        if (channelId === null || this.mixes[channelId] === undefined) {
            return null;
        }

        const data: Websocket_Track_Info = {
            command: "track_info",
            tracks: this.mixes[channelId].tracks,
            fx_tracks: {
                0: {
                    mute: false,
                    solo: false,
                    volume: 0,
                },
                1: {
                    mute: false,
                    solo: false,
                    volume: 0,
                }
            },
            master: this.mixes[channelId].monitor
        }

        return data
    }
}

interface L20GlobalClient {
    L20_client?: L20_client;
}

const globalClient = global as typeof globalThis & L20GlobalClient;

export const L20_Client = globalClient.L20_client ?? new L20_client();

if (process.env.NODE_ENV !== "production") {
    globalClient.L20_client = L20_Client;
}