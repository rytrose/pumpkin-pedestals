import adafruit_logging as logging

from adafruit_datetime import datetime


class MyHandler(logging.StreamHandler):
    def __init__(self, name, stream=None):
        super().__init__(stream)
        self.name = name

    def format(self, record):
        """Generate a string to log.

        :param record: The record (message object) to be logged
        """
        return f"{datetime.now().ctime()}: [{record.levelname}] [{self.name}]: {record.msg}"
