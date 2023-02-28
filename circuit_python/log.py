import adafruit_logging as logging


class MyHandler(logging.StreamHandler):

    def __init__(self, name, stream=None):
        super().__init__(stream)
        self.name = name

    def format(self, record):
        """Generate a string to log.

        :param record: The record (message object) to be logged
        """
        return f"{record.created:<0.3f}: [{record.levelname}] [{self.name}]: {record.msg}"
