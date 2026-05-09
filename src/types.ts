// Define Types for L20 Mixer State
interface L20_Fader {
    mute: boolean;
    solo: boolean;
    volume: number;
}

interface L20_Track extends L20_Fader {
    track_id: number;
    // eq: {
    //     phase: boolean;
    //     eq_off: boolean;
    //     low_cut: boolean;
    //     low: number;
    //     mid: number;
    //     mid_freq: number;
    //     high: number;
    //     efx1: number;
    //     efx2: number;
    //     pan: number;
    // };
}

// TODO: Add Efx & CC Tracks


// Define Types for Websocket Communication
interface Websocket_Message {
    command: Websocket_Events;
}

interface Websocket_Volume_Change extends Websocket_Message {
    command: Websocket_Events;
    track_id: number;
    volume: number;
}

interface Websocket_Change_Channel extends Websocket_Message {
    command: Websocket_Events;
    channel_id: number;
}

interface Websocket_Track_Info extends Websocket_Message {
    command: Websocket_Events;
    tracks: L20_Track[];
    fx_tracks: { [track_id: number]: L20_Fader };
    master: L20_Fader;
}

interface Websocket_Connection_Status extends Websocket_Message {
    command: Websocket_Events;
    status: "connected" | "disconnected";
}


interface TCP_Message {
    event: TCP_Events;
}

interface TCP_Volume_Change extends TCP_Message {
    event: TCP_Events;
    track_id: number;
    channel_id: number | null;
    volume: number;
    type: "track" | "fx" | "master";
}

interface TCP_Track_Info extends TCP_Message {
    event: TCP_Events;
    mixes: {
        [channel_id: number]: {
            tracks: L20_Track[];
            fx_tracks: { [track_id: number]: L20_Fader };
            master: L20_Fader;
        }
    }
}

interface TCP_Connection_Status extends TCP_Message {
    event: TCP_Events;
    status: "connected" | "disconnected";
}


// Define Types Fader & Track JSON Configuration
interface FaderJsonType {
    id: number,
    name: string,
    shown: boolean,
    persist: boolean
}

interface TrackJsonType {
    id: number,
    name: string,
    shown: boolean,
    icon: IconName
}


interface Consumer_Parameter_Type {}

interface Consumer_Connection_Status extends Consumer_Parameter_Type {
    isConnected: boolean;
}

interface Consumer_Track_Info extends Consumer_Parameter_Type {}

interface Consumer_Volume_Change extends Consumer_Parameter_Type {
    track_id: number;
    channel_id: number;
    volume: number;
}

type Consumer_Function = (parameters: Consumer_Parameter_Type) => void;

// Extra Types
type Websocket_Events = "track_info" | "change_volume" | "change_channel" | "connection_status";
type TCP_Events = "change_volume" | "connection_status" | "track_info" | "recall_track_info";
type IconName = "Drum" | "Guitar" | "Keyboard" | "Mic" | "Speaker" | "Headphone" | "None";