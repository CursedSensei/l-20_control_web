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



type L20_Client_Events = "connect" | "disconnect";