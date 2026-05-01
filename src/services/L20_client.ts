import { FX_1_TRACK_ID, FX_2_TRACK_ID, MASTER_TRACK_ID } from "@/constants";
import * as net from "node:net";

class L20_client {
    mixes: {
        [channel_id: number]: {
            monitor: L20_Fader;
            fx_tracks: { [track_id: number]: L20_Fader }
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

        for (let i = 0; i < 7; i++) {
            const tracks: L20_Track[] = []

            for (let i = 0; i < 18; i++) {
                tracks.push({
                    mute: false,
                    solo: false,
                    volume: 0,
                    track_id: i
                })
            }

            this.mixes[i] = {
                monitor: {
                    mute: false,
                    solo: false,
                    volume: 60
                },
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
                tracks: [...tracks]
            };
        }
        
        this.connect();
    }

    private async connect() {
        const port = 30012;

        while (true) {
            try {
                const client = new net.Socket();
                var readBuffer = Buffer.alloc(0);

                await new Promise((resolve, reject) => {
                    client.connect(port, '127.0.0.1', () => resolve(null))
                    client.on('error', reject)
                })

                client.on('data', (data) => {
                    readBuffer = Buffer.concat([readBuffer, data]);
                    let nullIndex: number = readBuffer.indexOf(0);

                    while (nullIndex !== -1) {
                        const messageBuffer = readBuffer.subarray(0, nullIndex);

                        try {
                            const message = JSON.parse(messageBuffer.toString()) as TCP_Message

                            if (message.event === "track_info") {
                                const trackInfo = message as TCP_Track_Info

                                for (const channel_id in trackInfo.mixes) {
                                    if (channel_id == '0') {
                                        this.master = trackInfo.mixes[channel_id].master
                                    }

                                    if (trackInfo.mixes[channel_id].master.volume === null) {
                                        trackInfo.mixes[channel_id].master.volume = this.mixes[parseInt(channel_id)]?.monitor.volume ?? 0
                                    }
                                    
                                    this.mixes[parseInt(channel_id)] = {
                                        monitor: trackInfo.mixes[channel_id].master,
                                        fx_tracks: trackInfo.mixes[channel_id].fx_tracks,
                                        tracks: trackInfo.mixes[channel_id].tracks
                                    }
                                }

                                this.invokeEvent("track_info", trackInfo)
                            } else if (message.event === "change_volume") {
                                const volumeChange = message as TCP_Volume_Change
                                let consumerVolumeChange: Consumer_Volume_Change | null = null

                                if (volumeChange.type === "master") {
                                    if (volumeChange.channel_id === null) {
                                        this.master.volume = volumeChange.volume
                                        volumeChange.channel_id = 0
                                    }
                                    this.mixes[volumeChange.channel_id].monitor.volume = volumeChange.volume

                                    consumerVolumeChange = {
                                        track_id: MASTER_TRACK_ID,
                                        channel_id: volumeChange.channel_id,
                                        volume: volumeChange.volume
                                    }
                                } else if (volumeChange.type === "fx") {
                                    this.mixes[volumeChange.channel_id!].fx_tracks[volumeChange.track_id].volume = volumeChange.volume

                                    consumerVolumeChange = {
                                        track_id: volumeChange.track_id == 0 ? FX_1_TRACK_ID : FX_2_TRACK_ID,
                                        channel_id: volumeChange.channel_id!,
                                        volume: volumeChange.volume
                                    }
                                } else if (volumeChange.type === "track") {
                                    this.mixes[volumeChange.channel_id!].tracks[volumeChange.track_id].volume = volumeChange.volume

                                    consumerVolumeChange = {
                                        track_id: volumeChange.track_id,
                                        channel_id: volumeChange.channel_id!,
                                        volume: volumeChange.volume
                                    }
                                }

                                if (consumerVolumeChange) {
                                    this.invokeEvent("change_volume", consumerVolumeChange)
                                }
                            } else if (message.event === "connection_status") {
                                const connectionStatus = message as TCP_Connection_Status
                                this.isConnected = connectionStatus.status === "connected";
                                this.invokeEvent("connection_status", { isConnected: this.isConnected })
                            }
                        } catch (error) {
                            console.error("Error parsing message from L-20 controller:", error)
                        }
                        
                        readBuffer = readBuffer.subarray(nullIndex + 1);
                        nullIndex = readBuffer.indexOf(0);
                    }
                })

                await new Promise((resolve) => {
                    client.on('close', resolve)
                    client.on('error', resolve)
                })
                
                client.destroy();
                this.isConnected = false;
                this.invokeEvent("connection_status", { isConnected: this.isConnected })
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
            fx_tracks: this.mixes[channelId].fx_tracks,
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