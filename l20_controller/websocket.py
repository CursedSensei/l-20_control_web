import asyncio
import json
import logging
import websockets

from dotenv import load_dotenv
from os import getenv

load_dotenv()
logging.basicConfig(format="%(asctime)s %(levelname)-5s %(module)-8s:%(lineno)d %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSocketClient:
    isConnected: bool = False
    client: websockets.ClientConnection = None
    receiveCallback: callable = None
    continueClient: bool = True

    def __init__(self):
        asyncio.create_task(self.__worker())

    async def __worker(self):
        uri = f"{getenv('NEXT_PUBLIC_WEBSOCKET_PROTOCOL')}://{getenv('NEXT_PUBLIC_SERVER_URL')}/api/ws"

        while self.continueClient:
            logger.info(f"Attempting to connect to WebSocket server at {uri}")
            try:
                async with websockets.connect(uri) as websocket:
                    logger.info("Authenticating L20 Controller . . .")
                    await websocket.send(getenv("MIXER_SECRET_PASSWORD"))

                    self.client = websocket
                    self.isConnected = True
                    logger.info(f"WebSocket client connected to {uri}")

                    async for message in websocket:
                        if self.receiveCallback:
                            try:
                                if asyncio.iscoroutinefunction(self.receiveCallback):
                                    asyncio.create_task(self.receiveCallback(json.loads(message)))
                                else:
                                    self.receiveCallback(json.loads(message))
                            except Exception as e:
                                logger.error(f"Error in receive callback: {e}")
            except websockets.ConnectionClosed:
                logger.info("WebSocket connection closed")
            except KeyboardInterrupt:
                logger.info("WebSocket client interrupted by user")
                self.isConnected = False
                break
            except Exception as e:
                logger.error(f"WebSocket client encountered an error: {e}")
            finally:
                self.isConnected = False
                logger.info("WebSocket client disconnected")

            await asyncio.sleep(5)

    def onReceivedListener(self, callback: callable):
        self.receiveCallback = callback

    def send_message(self, message: dict):
        if self.isConnected:
            asyncio.create_task(self.client.send(json.dumps(message)))
        else:
            logger.warning("WebSocket client is not connected. Cannot send message.")

    async def close_client(self):
        if self.isConnected:
            self.continueClient = False
            await self.client.close()
            logger.info("WebSocket client closed")

    async def wait_for_client(self):
        while not self.isConnected:
            await asyncio.sleep(0.3)

    def __del__(self):
        if self.continueClient == True:
            self.continueClient = False
            asyncio.create_task(self.close_client())