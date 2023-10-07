from aiohttp import web
import asyncio

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
    app = web.Application()
    app.add_routes(routes)
    app.add_routes([web.get("/websocket", websocket_handler)])
    return app
