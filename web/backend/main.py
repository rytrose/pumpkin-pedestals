import asyncio
import adafruit_logging as logging
from aiohttp import web

from log import MyHandler
from central import BLEClient

routes = web.RouteTableDef()


@routes.get("/healthcheck")
async def healthcheck(request):
    return web.Response(text="I'm up!")


@routes.get("/")
async def index(request):
    with open("../build/index.html") as f:
        return web.Response(text=f.read(), content_type="text/html")


@routes.get("/websocket")
async def websocket_handler(request):
    logger = request.app["logger"]
    socket = web.WebSocketResponse()
    await socket.prepare(request)

    async for message in socket:
        data = message.json()
        logger.debug("ws RX: %s", data)
        method = data.get("method")
        if method:
            if method == "healthcheck":
                await socket.send_json({"method": "healthcheck", "data": {}})

    return socket


async def setup_teardown(app):
    logger = logging.getLogger(app.__class__.__name__)
    logger.setLevel(logging.DEBUG)
    logger.addHandler(MyHandler(app.__class__.__name__))
    app["logger"] = logger

    ble_client = BLEClient()
    asyncio.create_task(ble_client.connect())
    yield


def main():
    app = web.Application()
    routes.static("/", "../build")
    app.add_routes(routes)
    app.cleanup_ctx.append(setup_teardown)
    return app


if __name__ == "__main__":
    web.run_app(main())
