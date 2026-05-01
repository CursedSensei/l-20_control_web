import asyncio
import logging

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from bleak import BleakGATTCharacteristic
from mido import Message

from .protocol import L20_Track, Raw_Track_Info, TCP_Message, TCP_Track_Info, TCP_Volume_Change
from .decode import decode_sysex_message
from .json_messages import create_json_message, parse_non_midi_message
from .json_messages import create_json_message
from .const import BLE_MIDI_UUID, CMD_TRACK_INFO, DATA_PREFIX, MIDI_CC, MIDI_CC_BASE, MIDI_CC_FX_GROUPS, MIDI_CC_MONITOR, MIDI_CC_TRACK_GROUPS, MIDI_CC_TRACK_ST_GROUPS, MIDI_CHAN_FX1, MIDI_CHAN_FX_GROUPS, MIDI_SYSEX_END, MIDI_SYSEX_START
from .tcpsocket import TCPSocketServer

logging.basicConfig(format="%(asctime)s %(levelname)-5s %(module)-8s:%(lineno)d %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

response_queue = []
receiving_midi_sysex = False
mixerListener = None

async def findMixerDevice(socket: TCPSocketServer) -> BLEDevice:
    while socket.isConnected:
        logger.info("Scanning for L-20 mixer devices for 5 seconds...")

        devices: list[tuple[BLEDevice, AdvertisementData]] = (await BleakScanner.discover(
            timeout=5, return_adv=True, cb=dict(use_bdaddr=True)
        )).values()

        for dev in devices:
            dev = dev[0]

            if dev.name and dev.name.startswith("L-20"):
                logger.info(f"Found L-20 mixer device: {dev.name} ({dev.address})")
                return dev
    return None

async def request_track_info(client: BleakClient):
    data = bytearray(DATA_PREFIX) + CMD_TRACK_INFO
    await client.write_gatt_char(BLE_MIDI_UUID, data)


def on_sysex_message_end() -> TCP_Track_Info | None:
    buffer = b""
    while len(response_queue) > 0:
        msg = response_queue.pop(0)
        buffer = buffer + msg

    # if midi_sysex_buffered:
    #     buffer = buffer[:-1]
    try:
        message: Raw_Track_Info | None = decode_sysex_message(buffer[1:])
        if message:
            command = message.get("command")

            if command and command['function']:
                func = command['function']

                track_info: TCP_Track_Info = {
                    "event": "track_info",
                    "mixes": {}
                }

                if func == "track_info" or func == "recall_track_info":
                    for i in range(0, 7):
                        channel_id = i
                        tracks: list[L20_Track] = []
                        for track_id in range(0, 18):
                            tracks.append({
                                "track_id": track_id,
                                "volume": command['tracks'][track_id]['values'][i],
                                "mute": False,
                                "solo": False
                            })

                        masterVolume = command['master']['value'] if i == 0 else None
                        if masterVolume == None and func == "track_info":
                            masterVolume = command['monitor'][i - 1]
                        
                        track_info['mixes'][channel_id] = {
                            "master": {
                                "volume": masterVolume,
                                "mute": False,
                                "solo": False
                            },
                            "fx_tracks": {
                                0: {
                                    "volume": command['tracks'][18]["values"][i],
                                    "mute": False,
                                    "solo": False
                                },
                                1: {
                                    "volume": command['tracks'][19]["values"][i],
                                    "mute": False,
                                    "solo": False
                                }
                            },
                            "tracks": tracks
                        }
                else:
                    return None
                
                return track_info
    except Exception as e:
        logger.error("Error occurred while processing track info message: %s", e)

    return None

async def addMessageListeners(socket: TCPSocketServer, client: BleakClient):
    global mixerListener

    async def socketMessageListener(message: TCP_Message):
        if not client.is_connected:
            return
        
        if message['event'] == "change_volume":
            volumeChangeMessage: TCP_Volume_Change = message
            data = None

            if volumeChangeMessage['type'] == "track":
                channel = volumeChangeMessage['channel_id']
                control = None

                if channel < 16:
                    control = MIDI_CC_TRACK_GROUPS[channel]
                else:
                    channel -= 16
                    control = MIDI_CC_TRACK_ST_GROUPS[channel]

                data = bytearray([MIDI_CC_BASE + volumeChangeMessage['track_id'], control, volumeChangeMessage['volume']])
            elif volumeChangeMessage['type'] == "fx":
                channel = volumeChangeMessage['channel_id']
                control = MIDI_CC_FX_GROUPS[channel]

                data = bytearray([MIDI_CC_BASE + MIDI_CHAN_FX_GROUPS[channel] + volumeChangeMessage['track_id'], control, volumeChangeMessage['volume']])
            elif volumeChangeMessage['type'] == "master":
                # TODO: Handle for Master Volume Changes
                data = bytearray([MIDI_CC_BASE + volumeChangeMessage['channel_id'] - 1, MIDI_CC_MONITOR, volumeChangeMessage['volume']])

            if data:
                await client.write_gatt_char(BLE_MIDI_UUID, DATA_PREFIX + data)
        

        
    def mixerMessageListener(sender: BleakGATTCharacteristic, data: bytearray):
        global receiving_midi_sysex

        if not socket.isConnected:
            return
        
        try:
            msg = Message.from_bytes(data[2:])
            message = create_json_message(msg)['command']

            if message['type'] == MIDI_CC and message['function'] == "volume":
                volumeChangeMessage: TCP_Volume_Change | None = None

                if message['context'] == "track":
                    volumeChangeMessage = {
                        "event": "change_volume",
                        "track_id": message['channel'] if message['channel'] != 18 else message['channel'] - 1,
                        "channel_id": message['group'],
                        "volume": message['value'],
                        "type": "track"
                    }
                elif message['context'] == "FXtrack":
                    volumeChangeMessage = {
                        "event": "change_volume",
                        "track_id": message['channel'],
                        "channel_id": message['group'],
                        "volume": message['value'],
                        "type": "fx"
                    }
                elif message['context'] == "master":
                    volumeChangeMessage = {
                        "event": "change_volume",
                        "track_id": 0,
                        "channel_id": None,
                        "volume": message['value'],
                        "type": "master"
                    }
                elif message['context'] == "monitor":
                    volumeChangeMessage = {
                        "event": "change_volume",
                        "track_id": 0,
                        "channel_id": message['channel'] + 1,
                        "volume": message['value'],
                        "type": "master"
                    }

                if volumeChangeMessage:
                    socket.send_message(volumeChangeMessage)
            return
        except Exception as e:
            if parse_non_midi_message(data):
                # print("Non-midi message: %s" % parse_non_midi_message(data))
                return

        midi_sysex_buffered = False

        if data[2:3] == MIDI_SYSEX_START:
            # print("SysEx START")
            receiving_midi_sysex = True
            midi_sysex_buffered = True
            response_queue.append(data[1:])

        if receiving_midi_sysex:
            if data[-1:] == MIDI_SYSEX_END:
                # print("SysEx END")
                receiving_midi_sysex = False

                if not midi_sysex_buffered:
                    response_queue.append(data[1:])

                try:
                    message = on_sysex_message_end()
                    if message:
                        socket.send_message(message)
                except Exception as e:
                    logger.error("decoding sysex message: %s", str(e))
            elif not midi_sysex_buffered:
                response_queue.append(data[1:])

    socket.onReceivedListener(socketMessageListener)
    mixerListener = mixerMessageListener

async def main():
    socket = TCPSocketServer()

    while True:
        await socket.wait_for_client()
        
        while socket.isConnected:
            mixer = await findMixerDevice(socket)
            if mixer == None:
                continue

            try:
                async with BleakClient(mixer) as client:
                    await client.start_notify(BLE_MIDI_UUID, lambda sender, data: mixerListener(sender, data) if mixerListener else None)

                    logger.info(f"Connected to {mixer.name} ({mixer.address})")

                    await addMessageListeners(socket, client)
                    socket.send_message({"event": "connection_status", "status": "connected"})
                    await request_track_info(client)


                    while client.is_connected and socket.isConnected:
                        await asyncio.sleep(0.5)
            except Exception as e:
                logger.error("Error occurred while waiting for client: %s", e)

            socket.send_message({"event": "connection_status", "status": "disconnected"})
        
        await socket.close_client()

if __name__ == "__main__":
    asyncio.run(main())