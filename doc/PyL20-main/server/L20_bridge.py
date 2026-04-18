import asyncio
from bleak import BleakClient, BleakScanner
from bless import (
    BlessServer,
    GATTCharacteristicProperties,
    GATTAttributePermissions
)

# Configuration from your XML
L20_ADDRESS = "XX:XX:XX:XX:XX:XX"  # Replace with your L-20's actual BLE address
CUSTOM_CHAR_UUID = "7772e5db-3868-4112-a1a9-f2669d106bf3"

async def run_bridge():
    found = None
    while found is None:
        devices = (await BleakScanner.discover(
            timeout=2, return_adv=True, cb=dict(use_bdaddr=True) #args.macos_use_bdaddr)
        )).values()

        for dev in devices:
            dev = dev[0]

            if dev.name and dev.name.startswith("L-20"):
                found = dev
                break

        if found is None:
            await asyncio.sleep(1)

    # 1. Connect to the L-20 via Bleak (The "Southbound" connection)
    print(f"Connecting to L-20 ...")
    async with BleakClient(found) as l20_client:
        print(f"Connected to L-20: {l20_client.is_connected}")

        # 2. Define the callback for the iPad (The "Northbound" connection)
        # This triggers when your iPad sends data to your Python script
        def on_ipad_write(characteristic, data):
            print(f"iPad sent data: {data.hex()}. Forwarding to L-20...")
            # We use loop.create_task because callbacks are usually sync
            asyncio.create_task(l20_client.write_gatt_char(CUSTOM_CHAR_UUID, data))

        # 3. Setup the Bless Server (What the iPad sees)
        server = BlessServer(name="L-20_1234567891231234")
        
        # Add Service
        svc_uuid = "03b80e5a-ede8-4b33-a751-6ce34ec4c700"
        await server.add_new_service(svc_uuid)

        # Add Characteristic with the write callback attached
        await server.add_new_characteristic(
            svc_uuid,
            CUSTOM_CHAR_UUID,
            (GATTCharacteristicProperties.read | 
             GATTCharacteristicProperties.write_without_response | 
             GATTCharacteristicProperties.notify),
            None, # Initial value
            (GATTAttributePermissions.readable | GATTAttributePermissions.writeable),
        )

        # # ==========================================
        # # SERVICE 2: Device Information (180A)
        # # ==========================================
        # dev_info_svc_uuid = "0000180a-0000-1000-8000-00805f9b34fb"
        # await server.add_new_service(dev_info_svc_uuid)
        
        # # Reusable properties/permissions for the static read-only strings
        # read_only_props = GATTCharacteristicProperties.read
        # read_only_perms = GATTAttributePermissions.readable
        
        # # 2A29: Manufacturer Name String ("ZOOM")
        # await server.add_new_characteristic(
        #     dev_info_svc_uuid,
        #     "00002a29-0000-1000-8000-00805f9b34fb",
        #     read_only_props,
        #     "ZOOM".encode("utf-8"),
        #     read_only_perms
        # )
        
        # # 2A24: Model Number String ("L-20")
        # await server.add_new_characteristic(
        #     dev_info_svc_uuid,
        #     "00002a24-0000-1000-8000-00805f9b34fb",
        #     read_only_props,
        #     "L-20".encode("utf-8"),
        #     read_only_perms
        # )
        
        # # 2A26: Firmware Revision String ("1.00")
        # await server.add_new_characteristic(
        #     dev_info_svc_uuid,
        #     "00002a26-0000-1000-8000-00805f9b34fb",
        #     read_only_props,
        #     "1.00".encode("utf-8"),
        #     read_only_perms
        # )
        
        # # 2A28: Software Revision String ("1.00")
        # await server.add_new_characteristic(
        #     dev_info_svc_uuid,
        #     "00002a28-0000-1000-8000-00805f9b34fb",
        #     read_only_props,
        #     "1.00".encode("utf-8"),
        #     read_only_perms
        # )
        
        # Assign the write request handler
        server.write_request_func = on_ipad_write

        # 4. Handle L-20 Notifications (L-20 -> Script -> iPad)
        async def l20_notification_handler(sender, data):
            print(f"L-20 updated: {data.hex()}. Notifying iPad...")
            server.get_characteristic(CUSTOM_CHAR_UUID).value = data
            server.update_value(svc_uuid, CUSTOM_CHAR_UUID)

        await l20_client.start_notify(CUSTOM_CHAR_UUID, l20_notification_handler)

        # Start advertising to the iPad
        await server.start()
        print("Bridge is active. Connect your iPad to 'L-20 Bridge'.")

        # Keep everything running
        while True:
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run_bridge())