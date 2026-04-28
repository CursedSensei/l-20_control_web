interface L20_Fader {
    mute: boolean;
    solo: boolean;
    volume: number;
}

interface L20_Track extends L20_Fader {
    track_id: number;
    name: string;
    eq: {
        phase: boolean;
        eq_off: boolean;
        low_cut: boolean;
        low: number;
        mid: number;
        mid_freq: number;
        high: number;
        efx1: number;
        efx2: number;
        pan: number;
    };
}

// TODO: Add Efx & CC Tracks

interface L20_Monitor {
    monitor_id: number;
    name: string;
    volume: number;
}

interface Websocket_Message {
    command: Websocket_Events;
}

interface Websocket_Volume_Change extends Websocket_Message {
    command: Websocket_Events;
    track_id: number;
    group_id: number | null;
    volume: number;
}

interface Websocket_Change_Channel extends Websocket_Message {
    command: Websocket_Events;
    channel_id: number;
}

interface Websocket_Track_Info extends Websocket_Message {
    command: Websocket_Events;
    tracks: L20_Track[];
    fx_tracks: L20_Track[];
    master: L20_Fader;
}


interface FaderJsonType {
    id: number,
    name: string,
    shown: boolean
}

interface TrackJsonType {
    id: number,
    name: string,
    shown: boolean,
    icon: IconName
}


type Websocket_Events = "track_info" | "change_volume" | "change_channel";
type IconName = "Drum" | "Guitar" | "Keyboard" | "Mic" | "Speaker" | "Headphone" | "None";