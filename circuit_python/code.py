# pyright: ignore
import asyncio
import board
import digitalio

from peripheral import BLEClient

led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT
ble_client = BLEClient()


async def led_coro():
    while True:
        led.value = True
        await asyncio.sleep(0.2)
        led.value = False
        await asyncio.sleep(0.2)


async def main():
    print("it's blinkin time")
    led_task = asyncio.create_task(led_coro())

    asyncio.create_task(ble_client.connect())
    await asyncio.gather(led_task)

asyncio.run(main())
