import asyncio
import logging
import json

logging.basicConfig(format="%(asctime)s %(levelname)-5s %(module)-8s:%(lineno)d %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

class TCPSocketServer:
    port = 30012
    server = None
    isConnected = False
    receiveCallback: callable = None
    continueServer = True

    def __init__(self):
        asyncio.create_task(self.__start())

    async def __start(self):
        self.server: asyncio.Server = await asyncio.start_server(self.handle_client, host='127.0.0.1', port=self.port)
        logger.info(f"TCP socket server started at localhost:{self.port}")

    async def handle_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        if not self.continueServer:
            return

        self.server.close()
        self.writer = writer
        self.isConnected = True
        logger.info("Client connected")

        readBuffer = bytearray()

        try:
            while True:
                data = await reader.read(1024)
                if not data:
                    break

                readBuffer.extend(data)
                if b'\0' not in readBuffer:
                    continue

                while b'\0' in readBuffer:
                    raw_message = readBuffer.split(b'\0')[0]
                    readBuffer = readBuffer[len(raw_message) + 1:]
                    message = raw_message.decode()

                    if self.receiveCallback:
                        try:
                            if asyncio.iscoroutinefunction(self.receiveCallback):
                                asyncio.create_task(self.receiveCallback(json.loads(message)))
                            else:
                                self.receiveCallback(json.loads(message))
                        except Exception as e:
                            logger.error(f"Error in receive callback: {e}")
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            logger.info("Client disconnected")
            self.isConnected = False
            writer.close()
            self.writer = None

            await self.__start()

    def onReceivedListener(self, callback: callable):
        self.receiveCallback = callback

    def send_message(self, message: dict):
        try:
            if self.isConnected:
                self.writer.write(json.dumps(message).encode())
                self.writer.write(b'\0')
        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def close_client(self):
        if self.isConnected:
            self.writer.close()
            await self.writer.wait_closed()
            self.isConnected = False

    async def wait_for_client(self):
        while not self.isConnected:
            await asyncio.sleep(0.3)

    def stop(self):
        self.continueServer = False
        if self.server:
            self.server.close()
            self.writer.close()
            self.server = None
            self.writer = None
            logger.info("TCP socket server stopped")

    def __del__(self):
        asyncio.create_task(self.stop())