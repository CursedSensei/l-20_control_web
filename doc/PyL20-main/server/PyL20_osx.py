import traceback
import argparse
import asyncio
import logging
import platform
from bleak import BleakScanner
from bleak import BleakClient
from bleak import BleakGATTCharacteristic
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from mido import Message
import threading
import http.server
import socketserver

from _spec import *
from _decode import *
from _ws import *
from _json_messages import *

logging.basicConfig(format="%(asctime)s %(levelname)-5s %(module)-8s:%(lineno)d %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

device_status={
    "requested_device_name": "L-20",
    "connected": False
}
message_queue = asyncio.Queue()
response_queue = asyncio.Queue()
sysex_mode = False
ws_task = Ws()

debug_received = True

## sysEx message to set channel name:
async def testme2(client):
    print("Set Channel2")
    data = b"\x80\x80\xf0\x52\x00\x00\x31\x02\x02\x09\x00" + b"\x45\x45\x45\x65\x63\x74\x73\x00\x00\xf7"
    print("sending: ", data)
    await client.write_gatt_char(BLE_MIDI_UUID, data)
	#00000000: 5212 0080 80F0 5200 0031 0202 0900 4566  R.....R..1....Ef
	#00000010: 6665 6374 7300 00                        fects..

async def cmd_testme3():
    return {"raw": b"\xf0\x52\x00\x00\x31\x02\x02\x09\x00\x45\x45\x45\x65\x63\x74\x73\x00\x00\xf7"}

async def testme(client):
    print("Set Channel1")
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x10")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x21")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x31")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x41")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x51")
    await asyncio.sleep(1.0)
    await client.write_gatt_char(BLE_MIDI_UUID, b"\x80\x80\xB0\x3C\x78")
    await asyncio.sleep(1.0)
#//  Value: b"\x80\x80\xB0\x3C \x12\x3C\x13"
#// channel for B0

async def send_midi_message_to_mixer(client, message):
    if not client or not client.is_connected:
        logger.info("send_midi_message_to_mixer: Not connected")
        return
    
    data=bytearray()

    if message.get("raw"):
        await send_raw_message(client, message)
        return
    elif message.get("context") == "track-settings":
        # with prefix here:
        data = bytearray(DATA_PREFIX) + convert_to_bytes(message)
    else:
        logger.info("Sending message to mixer: %s", str(message))
        data = bytearray(DATA_PREFIX) + convert_to_bytes(message)

    print("send_midi_message_to_mixer:", data)
    await client.write_gatt_char(BLE_MIDI_UUID, data)
    d = " ".join(hex(n) for n in data)
    logger.info("Sent: %s", d)
    if need_sysex_end_message(message):
        data = bytearray(DATA_PREFIX) + bytearray(MIDI_SYSEX_END)
        await client.write_gatt_char(BLE_MIDI_UUID, bytearray(DATA_PREFIX) + bytearray(MIDI_SYSEX_END))
        d = " ".join(hex(n) for n in data)
        logger.info("Sent: %s", d)

async def send_raw_message(client: BleakClient, message):
    d = " ".join(hex(n) for n in message.get("raw"))
    logger.info("Sending raw message: %s", d)
    data = bytearray(DATA_PREFIX) + message.get("raw")
    print("send_raw_message:", data)
    await client.write_gatt_char(BLE_MIDI_UUID, data)


async def on_connected_to_device(client):
    device_status["connected"] = True
    await ws_task.send_to_clients({"status": "ready"})

def is_cmd_disconnect(msg):
    return msg.get("command") and msg.get("command").get("function") and msg.get("command").get("function") == "disconnect"
def is_cmd_connect(msg):
    return msg.get("command") and msg.get("command").get("function") and msg.get("command").get("function") == "connect"

async def ws_process_request(data):
    if data.get("cmd"):
        if data.get("cmd") == "track_info":
            await cmd_track_info()
        if data.get("cmd") == "testme3":
            await cmd_testme3()
        return
    if device_status["connected"] != True:
        logger.error("Discard message, because device is not connected: %s", str(data))
        return False
    if data["context"] in WS_INPUT_VALID_CONTEXTS:
        message_queue.put_nowait(data)
    return True

async def cmd_track_info():
    return {"raw": CMD_TRACK_INFO}

async def on_sysex_message_end(midi_sysex_buffered):
    buffer = b""
    while not response_queue.empty():
        msg = response_queue.get_nowait()
        buffer = buffer + msg
        await asyncio.sleep(0)

    if midi_sysex_buffered:
        buffer = buffer[:-1]

    #print("SysEx Data received: ", buffer)
    try:
        message = decode_sysex_message(buffer[1:])
        if message:
            if message.get("command") and (message.get("command").get("function") == "track_info" or message.get("command").get("function") == "recall_track_info"):
                data = json.dumps(message, indent=4)
                with open(message['command']['function'] + ".json", "w") as f:
                    f.write(data)
            elif message is not None:
                print(message)
    except Exception as e:
        traceback.print_exc()
    finally:
        return
    
        # also copy a raw version to make a diff on the client:
        raw = raw_decode_sysex_message(buffer)
        # await ws_task.send_to_clients({"command": {"raw": raw}})
        print(json.dumps(raw, indent=2))

async def cmd_track_info_raw():
    buffer = b""
    while not response_queue.empty():
        msg = response_queue.get_nowait()
        buffer = buffer + msg
        await asyncio.sleep(0)
    print("Data received: ",buffer)

receiving_midi_sysex = False

async def received_data(sender: BleakGATTCharacteristic, data: bytearray):
    global receiving_midi_sysex

    if debug_received:
        print(f"[DEBUG]: ", end="")
        print_hex_line(data)
    
    if not receiving_midi_sysex:
        try:
            msg=Message.from_bytes(data[2:])
            
            # logger.info("decoded incoming message: %s" % msg)
            print(create_json_message(msg))
            # await ws_task.send_to_clients(create_json_message(msg))
            return
        except Exception as e:
            # no midi message
            if parse_non_midi_message(data):
                # await ws_task.send_to_clients(parse_non_midi_message(data))
                print("Non-midi message: %s" % parse_non_midi_message(data))
                return
            
            logger.error("No MIDI message or parse error: "+ str(e))
            #traceback.print_exc()
            # print_hex_line(data)

    midi_sysex_buffered = False

    if data[2:3] == MIDI_SYSEX_START:
        print("SysEx START")
        receiving_midi_sysex = True
        midi_sysex_buffered = True
        await response_queue.put(data[1:])

    if receiving_midi_sysex:
        if data[-1:] == MIDI_SYSEX_END:
            print("SysEx END")
            receiving_midi_sysex = False

            if not midi_sysex_buffered:
                await response_queue.put(data[1:])

            try:
                await on_sysex_message_end(False)
            except Exception as e:
                logger.error("decoding sysex message: %s", str(e))
                traceback.print_exc()
        elif not midi_sysex_buffered:
            await response_queue.put(data[1:])
        
    


async def ble_main(): #args: argparse.Namespace):
    global debug_received

    do_connect = True
    while do_connect:

        if do_connect:
            logger.info("Searching for 5 seconds, please wait...")
            # await ws_task.send_to_clients({"status": "searching"})
            devices: list[tuple[BLEDevice, AdvertisementData]] = (await BleakScanner.discover(
                timeout=2, return_adv=True, cb=dict(use_bdaddr=True) #args.macos_use_bdaddr)
            )).values()

            found = None
            device_status["connected"] = False

            for dev in devices:
                # print("platform_data:", dev[1].platform_data)
                # print("manufacturer_data:", dev[1].manufacturer_data)
                # print("service_uuids:", dev[1].service_uuids)
                # print("service_data:", dev[1].service_data)
                # print("local_name:", dev[1].local_name)
                # print(dev[1])
                dev = dev[0]

                f=" "
                if dev.name and dev.name.startswith(device_status["requested_device_name"]):
                    found = dev
                    f="*"    
                logger.info("%s %s - %s" % (f, dev.address, dev.name)) 

            if found:
                # await ws_task.send_to_clients({"status": "found"})
                async with BleakClient(found) as client:
                    logger.info(f"Connected: {client.is_connected}")
                    model_number = await client.read_gatt_char(MODEL_NBR_UUID)
                    logger.info("Model Number: {0}".format("".join(map(chr, model_number))))

                    # pairing not needed in MacOS:
                    print("System: ", platform.system())
                    # paired = await client.pair(protection_level=2)
                    # print(f"Paired: {paired}")

                    await client.start_notify(BLE_MIDI_UUID, received_data)
                    logger.info("start_notify for BLE MIDI done")

                    # await testme(client)
                    #await testme2(client)
                    device_status["connected"] = True
                    # await on_connected_to_device(client)

                    # print("cmd_track_info:")
                    # await cmd_track_info()

                    do_disconnect = False
                    while client.is_connected and not do_disconnect:
                        #await send_midi_message_to_mixer(client, msg)
                        #message_queue.task_done()
                        
                        command = await asyncio.to_thread(input)

                        if command == "exit" or command == "quit" or command == "disconnect":
                            do_disconnect = True
                            do_connect = False# close connection
                            break
                        elif command == "track_info":
                            await send_midi_message_to_mixer(client, await cmd_track_info())
                        elif command == "testme3":
                            await send_midi_message_to_mixer(client, await cmd_testme3())
                        elif command == "testme2":
                            await testme2()
                        elif command == "testme":
                            await testme(client)
                        elif command == "debug":
                            debug_received = not debug_received
                        continue

                        while not message_queue.empty():
                            msg = await message_queue.get()
                            if is_cmd_disconnect(msg):
                                do_disconnect = True
                                do_connect = False
                                break
                            try:
                                await send_midi_message_to_mixer(client, msg)
                            except Exception as e:
                                logger.error("Error sending message to mixer: %s", str(e))
                                traceback.print_exc()
                        await asyncio.sleep(0.1)

                    device_status["connected"] = False
                    # await ws_task.send_to_clients({"status": "disconnected"})
            else:
                logger.info("Device not found :( waiting...")
                await asyncio.sleep(5.0)
        else: # else if do_connect
            while not message_queue.empty():
                msg = await message_queue.get()
                if is_cmd_connect(msg):
                    do_connect = True

def web_main(PORT : int):
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        logger.info( f"HTTP server at port {PORT}")    
        httpd.serve_forever()

async def main(args: argparse.Namespace):
    #ws = Ws(args, ws_process_request)
    # ws_task.set_port(args.port)
    # ws_task.set_callback(ws_process_request)
    # ws_task.set_device_status_obj(device_status)

    # #if web_support and args.w > 0:
    # if int(args.w) > 0:
    #     #    tasks.append(task3)
    #     t=threading.Thread(target=web_main, args=[int(args.w)])
    #     t.start()

    # task1 = asyncio.create_task(ws_task.run())
    task2 = asyncio.create_task(ble_main())
    #task3 = asyncio.create_task(web_main(args)) # internal webserver

    # tasks=[task1, task2]

  

    await asyncio.wait([task2])

if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--macos-use-bdaddr",
        action="store_true",
        help="when true use Bluetooth address instead of UUID on macOS",
    )
    parser.add_argument('--port', required=False, default="5885", help="websocket port")
    parser.add_argument('-w', required=False, default=0, help="Enable internal webserver by defining a port")

    args = parser.parse_args()

    asyncio.run(main(args))
    
