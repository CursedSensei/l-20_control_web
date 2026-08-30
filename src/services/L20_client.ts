import { FX_1_TRACK_ID, FX_2_TRACK_ID, MASTER_TRACK_ID } from "@/constants";
import fs from 'node:fs';
import * as net from "node:net";

class L20_client {
    mixes: {
        [channel_id: number]: {
            monitor: L20_Fader;
            fx_tracks: { [track_id: number]: L20_Fader }
            tracks: L20_Track[],
            persist: boolean
        };
    };
    master: L20_Fader;

    fadersJson: FaderJsonType[] = []

    isConnected: boolean;
    client: net.Socket | null;
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
        this.client = null;

        try {
            const fadersData = fs.readFileSync('public/faders.json', 'utf-8');
            
            if (!fadersData) {
                throw new Error("Fader configuration file is empty or missing.");
            }

            this.fadersJson = JSON.parse(fadersData);
        } catch (error) {
            console.error("Error parsing fader configuration:", error);
        }

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
                tracks: [...tracks],
                persist: this.fadersJson[i]?.persist ?? false
            };
        }
        
        this.connect();
    }

    private async connect() {
        const port = 30012;

        while (true) {
            try {
                this.client = new net.Socket();
                var readBuffer = Buffer.alloc(0);

                await new Promise((resolve, reject) => {
                    this.client!.connect(port, '127.0.0.1', () => resolve(null))
                    this.client!.on('error', reject)
                })

                this.client.on('data', (data) => {
                    readBuffer = Buffer.concat([readBuffer, data]);
                    let nullIndex: number = readBuffer.indexOf(0);

                    while (nullIndex !== -1) {
                        const messageBuffer = readBuffer.subarray(0, nullIndex);

                        try {
                            const message = JSON.parse(messageBuffer.toString()) as TCP_Message

                            if (message.event === "track_info" || message.event === "recall_track_info") {
                                const trackInfo = message as TCP_Track_Info

                                for (const raw_channel_id in trackInfo.mixes) {
                                    const channel_id = parseInt(raw_channel_id)

                                    if (channel_id == 0) {
                                        this.master = trackInfo.mixes[channel_id].master
                                    }

                                    if (message.event === "recall_track_info") {
                                        trackInfo.mixes[channel_id].master.volume = this.mixes[channel_id]?.monitor.volume ?? 0;
                                        
                                        if (this.mixes[channel_id]?.persist) {
                                            trackInfo.mixes[channel_id].tracks.forEach((track) => {
                                                if (track.volume != this.mixes[channel_id].tracks[track.track_id].volume) {
                                                    this.setVolume(track.track_id, channel_id, this.mixes[channel_id].tracks[track.track_id].volume)
                                                    track.volume = this.mixes[channel_id].tracks[track.track_id].volume
                                                }
                                            })

                                            if (trackInfo.mixes[channel_id].fx_tracks[0].volume != this.mixes[channel_id].fx_tracks[0].volume) {
                                                this.setVolume(FX_1_TRACK_ID, channel_id, this.mixes[channel_id].fx_tracks[0].volume)
                                                trackInfo.mixes[channel_id].fx_tracks[0].volume = this.mixes[channel_id].fx_tracks[0].volume
                                            }

                                            if (trackInfo.mixes[channel_id].fx_tracks[1].volume != this.mixes[channel_id].fx_tracks[1].volume) {
                                                this.setVolume(FX_2_TRACK_ID, channel_id, this.mixes[channel_id].fx_tracks[1].volume)
                                                trackInfo.mixes[channel_id].fx_tracks[1].volume = this.mixes[channel_id].fx_tracks[1].volume
                                            }
                                        }
                                    }

                                    this.mixes[channel_id] = {
                                        monitor: trackInfo.mixes[channel_id].master,
                                        fx_tracks: trackInfo.mixes[channel_id].fx_tracks,
                                        tracks: trackInfo.mixes[channel_id].tracks,
                                        persist: this.fadersJson[channel_id]?.persist ?? false
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
                    this.client!.on('close', resolve)
                    this.client!.on('error', resolve)
                })
                
                this.isConnected = false;
                this.client!.destroy();
                this.client = null;
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

    private sendMessage(message: string) {
        if (this.isConnected) {
            this.client?.write(message + "\0");
        }
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
        if (this.isConnected) {

            // Don't change volume on channels not shown to users
            if (this.mixes[channelId] === undefined || this.fadersJson[channelId].shown === false) {
                return;
            }

            let track_id = trackId

            if (trackId === FX_1_TRACK_ID) {
                track_id = 0
            } else if (trackId === FX_2_TRACK_ID) {
                track_id = 1
            }

            const message: TCP_Volume_Change = {
                event: "change_volume",
                type: trackId === MASTER_TRACK_ID ? "master" : (trackId === FX_1_TRACK_ID || trackId === FX_2_TRACK_ID) ? "fx" : "track",
                track_id: track_id,
                channel_id: channelId,
                volume: volume
            };
            
            this.sendMessage(JSON.stringify(message));
        }
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