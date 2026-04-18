'use server'

class L20_client {
    monitors: L20_Monitor[] = [];
    mixes: {
        [mix_id: number]: L20_Track[];
    };
    master: L20_Fader;

    private isConnected: boolean;
    private eventListeners: {
        [event: string]: (() => void)[];
    } = {};

    constructor() {
        // Todo: Initialize mixes by config

        this.mixes = {}
        this.master = {
            mute: false,
            solo: false,
            volume: 0,
        };

        this.isConnected = false;

        this.connect();
    }

    private async connect() {
        console.log("Connecting to L-20...")
    }

    private invokeEvent(event: L20_Client_Events) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach((callback) => callback());
    }

    on(event: L20_Client_Events, callback: () => void): void {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeListener(event: L20_Client_Events, callback: () => void): void {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(
            (cb) => cb !== callback
        );
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