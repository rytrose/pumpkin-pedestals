import os
import asyncio
import adafruit_logging as logging
from aiohttp import web

from log import MyHandler
from pedestal_cache import PedestalCache

routes = web.RouteTableDef()

# Set to True to mock the BLE interface for development purposes
MOCK = False

def absolute_path_relative_to_module_file(path):
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), path)

@routes.get("/healthcheck")
async def healthcheck(request):
    return web.Response(text="I'm up!")


@routes.get("/")
async def index(request):
    """Serves the built React app."""
    with open(absolute_path_relative_to_module_file("../build/index.html")) as f:
        return web.Response(text=f.read(), content_type="text/html")


@routes.get("/websocket")
async def websocket_handler(request):
    """Handles a single websocket connection."""
    logger = request.app["logger"]
    pedestal_cache = request.app["pedestal_cache"]
    socket = web.WebSocketResponse()
    await socket.prepare(request)

    # Update the client with the current state every second, in order to receive updates
    # made by other clients
    async def send_pedestal_updates(socket):
        while True:
            pedestals = await pedestal_cache.get_pedestals()
            await socket.send_json({"method": "getPedestals", "data": pedestals})
            await asyncio.sleep(1)

    update_task = asyncio.create_task(send_pedestal_updates(socket))

    # Handle any messages from the client
    async for message in socket:
        data = message.json()
        logger.debug("ws RX: %s", data)
        method = data.get("method")
        if method:
            if method == "healthcheck":
                await socket.send_json({"method": method, "data": {}})
            if method == "setPedestalsColor":
                method_data = data.get("data", [])
                new_pedestals = await pedestal_cache.set_pedestals_color(method_data)
                await socket.send_json({"method": method, "data": new_pedestals})
            if method == "blinkPedestals":
                method_data = data.get("data", [])
                new_pedestals = await pedestal_cache.blink_pedestals(method_data)
                await socket.send_json({"method": method, "data": new_pedestals})
            if method == "stopPedestalsBlinking":
                method_data = data.get("data", [])
                new_pedestals = await pedestal_cache.stop_pedestals_blinking(
                    method_data
                )
                await socket.send_json({"method": method, "data": new_pedestals})
    # Clean up the updating task
    update_task.cancel()

    return socket


async def setup_teardown(app):
    """Instantiates singletons such as a logger and the pedestal cache."""
    logger = logging.getLogger(app.__class__.__name__)
    logger.setLevel(logging.INFO)  # type: ignore
    logger.addHandler(MyHandler(app.__class__.__name__))
    app["logger"] = logger
    app["pedestal_cache"] = PedestalCache(mock=MOCK)
    yield


def main():
    app = web.Application()
    # Serve from the React app build folder
    routes.static("/", absolute_path_relative_to_module_file("../build"))
    app.add_routes(routes)
    app.cleanup_ctx.append(setup_teardown)
    return app


if __name__ == "__main__":
    web.run_app(main())
