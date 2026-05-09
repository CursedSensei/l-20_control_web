from typing import TypedDict, Literal

class Raw_Track_Info(TypedDict):
    class Command(TypedDict):
        class Track(TypedDict):
            class EQ(TypedDict):
                phase: int
                pan: int
                eq_off: int
                eq_high: int
                eq_mid_frq: int
                eq_mid: int
                eq_low: int
                eq_lowcut: int
                efx1: int
                efx2: int
            number: int
            name: str
            color: int
            mute: int
            solo: int
            values: list[int]
            eq: EQ
            rec: int | None

        class Master(TypedDict):
            value: int
            mute: int

        function: str
        tracks: list[Track]
        master: Master
        monitor: list[int]
        fx_tracks: list[dict[str, int]] # TODO: Define a proper TypedDict for this
        scenes: dict[str, Literal["active", "inactive"]]

    command: Command



TCP_Events = Literal["change_volume", "connection_status", "track_info", "recall_track_info"]

class L20_Fader(TypedDict):
    volume: int
    mute: bool
    solo: bool

class L20_Track(L20_Fader):
    track_id: int

class TCP_Message(TypedDict):
    event: TCP_Events

class TCP_Volume_Change(TCP_Message):
    track_id: int
    channel_id: int | None
    volume: int
    type: Literal["track", "fx", "master"]

class TCP_Track_Info(TCP_Message):
    class TCP_Mix_Info(TypedDict):
        tracks: dict[int, L20_Track]
        fx_tracks: dict[int, L20_Fader]
        master: L20_Fader | None

    mixes: dict[int, TCP_Mix_Info]

class TCP_Connection_Status(TCP_Message):
    status: Literal["connected", "disconnected"]