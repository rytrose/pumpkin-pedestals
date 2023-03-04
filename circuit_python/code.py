# pyright: ignore
import asyncio
import board
import digitalio
import random

from peripheral import BLEClient

led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT
ble_client = BLEClient()


async def write_random(ble_client):
    while True:
        ble_client.write("{}".format(random.random()))
        await asyncio.sleep(5 * random.random())


async def main():
    asyncio.create_task(ble_client.connect())
    write_task = asyncio.create_task(write_random(ble_client))
    await asyncio.gather(write_task)

asyncio.run(main())
