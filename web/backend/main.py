import asyncio
from aiohttp import web

from central import BLEClient

routes = web.RouteTableDef()


@routes.get("/healthcheck")
async def hello(request):
    return web.Response(text="I'm up!")


async def websocket_handler(request):
    socket = web.WebSocketResponse()
    await socket.prepare(request)

    async for message in socket:
        data = message.json()
        print(data)
        await socket.send_json(["pong"])

    return socket


def main():
    ble_client = BLEClient()
    # TODO: figure out why scanning blocks the web server
    asyncio.create_task(ble_client.connect())

    app = web.Application()
    app.add_routes(routes)
    app.add_routes([web.get("/websocket", websocket_handler)])
    return app
