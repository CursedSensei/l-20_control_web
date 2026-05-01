from .const import *

def decode_sysex_scene_change(sysex_data : bytearray):
    offset=8

    # active | inactive | blinking
    def scene_status(raw_status: bytearray):
        status = int(raw_status)

        if status == 0:
            return "inactive"
        elif status == 1:
            return "active"
        elif status == 2:
            return "blinking"
        else:
            return "unknown"

    scenes = {}
    for i in range(0, 9):
        scenes[i+1] = scene_status(sysex_data[offset + i])

    return {"command": {"function": "scene_change", "scenes": scenes}}

def decode_sysex_track_info(sysex_data : bytearray):
    sysex_type = sysex_data[1:5]
    num_tracks=18
    num_groups=7
    fx_tracks=2
    offset=9 if sysex_type == MIDI_SYSEX_TRACK_INFO else 31
    line_len=9
    i = offset

    if sysex_type == MIDI_SYSEX_RECALL_TRACK_INFO:
        command = {"function":"recall_track_info", "tracks": [], "master": {"value": 0, "mute": 0}}

        for i in range(0, num_tracks):
            command["tracks"].append({"number": i, "name": "", "color": 0 , "mute": 0, "values":[], "eq": {}})

        # FX
        command["tracks"].append({"number":18, "name": "FX1", "mute": 0, "values":[]})
        command["tracks"].append({"number":19, "name": "FX2", "mute": 0, "values":[]})
    else:
        command = {"function":"track_info", "tracks": [], "master": {"value": 0, "mute": 0}, "monitor": []}

        for i in range(0, num_tracks):
            command["tracks"].append({"number": i, "name": "", "color": 0 , "mute": 0, "solo": 0, "values":[], "eq": {}})

        # FX
        command["tracks"].append({"number":18, "name": "FX1", "mute": 0, "solo": 0, "values":[]})
        command["tracks"].append({"number":19, "name": "FX2", "mute": 0, "solo": 0, "values":[]})

    # track names:
    for i in range(0, num_tracks):
        f=offset + i*line_len
        t=f+line_len
        d=sysex_data[f:t]
        command["tracks"][i]["name"] = d.decode('ascii', errors='ignore').replace("\x00","")

    # track colors:
    offset += num_tracks*line_len #18 namedd tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["color"]=int(d)

    if sysex_type == MIDI_SYSEX_TRACK_INFO:
        # REC
        offset += num_tracks
        for i in range(0, num_tracks):
            f=offset + i
            d=sysex_data[f]
            command["tracks"][i]["rec"]=int(d)

    # mute
    offset += num_tracks #18 tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["mute"]=int(d)

    if sysex_type == MIDI_SYSEX_TRACK_INFO:
        # Solo
        offset += num_tracks
        for i in range(0, num_tracks):
            f=offset + i
            # if i == num_tracks+fx_tracks -1:
            #     print("Solo offset", f)
            d=sysex_data[f]
            command["tracks"][i]["solo"]=int(d)

    # EQ: phase
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        # if i == 0:
        #     print("EQ phase offset", f)
        d=sysex_data[f]
        command["tracks"][i]["eq"]["phase"]=int(d)
    # EQ: PAN
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["pan"]=int(d)

    # EQ: Off
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_off"]=int(d)
    # EQ: High
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_high"]=int(d)
    # EQ: MidFrq
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_mid_frq"]=int(d)
    # EQ: MidGain
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_mid"]=int(d)
    # EQ: Low
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_low"]=int(d)
    # EQ: LowCut
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["eq_lowcut"]=int(d)
    # EQ: EFX1
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["efx1"]=int(d)
    # EQ: EFX2
    offset += num_tracks
    for i in range(0, num_tracks):
        f=offset + i
        d=sysex_data[f]
        command["tracks"][i]["eq"]["efx2"]=int(d)

    # track volumes start on line 47
    offset += num_tracks
    for g in range(0, num_groups):
        for i in range(0, num_tracks):
            f=offset + i
            d=sysex_data[f]
            #print("track g=",g," i=", i, " d=", int(d))
            command["tracks"][i]["values"].append(int(d))
        offset+=num_tracks

    # FX effects
    d=sysex_data[offset]
    command['effects']=[{"effect": 0}, {"effect":0}];
    command['effects'][0]["effect"]=int(d)
    d=sysex_data[offset+1]
    command['effects'][1]["effect"]=int(d)

    # FX params
    p1=sysex_data[offset+3]
    p2=sysex_data[offset+6]
    command['effects'][0]["param1"]=int(p1)
    command['effects'][0]["param2"]=int(p2)
    p1=sysex_data[offset+5]
    p2=sysex_data[offset+9]
    command['effects'][1]["param1"]=int(p1)
    command['effects'][1]["param2"]=int(p2)

    # FX mute
    offset += line_len + 1
    for i in range(2):
        ti=num_tracks+i
        f=offset + i
        d=sysex_data[f]
        command["tracks"][ti]["mute"]= int(d)

    if sysex_type == MIDI_SYSEX_TRACK_INFO:
        # FX solo
        offset += 2
        for i in range(2):
            ti=num_tracks+i
            f=offset + i
            d=sysex_data[f]
            command["tracks"][ti]["solo"]= int(d)

    # FX levels on line 62
    offset += 2
    for g in range(0, num_groups):
        for i in range(2):
            ti=num_tracks+i
            f=offset + 2*g + i
            d=sysex_data[f]
            command["tracks"][ti]["values"].append(int(d))


    # master mute
    if sysex_type == MIDI_SYSEX_TRACK_INFO:
        offset += 15
    else:
        offset += 14
    d=sysex_data[offset]
    command['master']['mute']=int(d)

    # master volume (at line 64) followed by monitor volumes
    offset += 1
    d=sysex_data[offset]
    command['master']['value']=int(d)

    if sysex_type != MIDI_SYSEX_RECALL_TRACK_INFO:
        for i in range(1, num_groups):
            f=offset + i
            d=sysex_data[f]
            command['monitor'].append(int(d))

        scenes = decode_sysex_scene_change(sysex_data[offset + num_groups + 9:])
        command['scenes'] = scenes["command"]["scenes"]

    return { "command": command }

def decode_sysex_message(sysex_data : bytearray) -> dict | None:
    sysex_type=sysex_data[1:5]
    if sysex_type == MIDI_SYSEX_TRACK_INFO or sysex_type == MIDI_SYSEX_RECALL_TRACK_INFO:
        return decode_sysex_track_info(sysex_data)

    return None