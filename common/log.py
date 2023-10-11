import adafruit_logging as logging

from datetime import datetime


class MyHandler(logging.StreamHandler):
    def __init__(self, name, stream=None):
        super().__init__(stream)
        self.name = name

    def format(self, record):
        """Generate a string to log.

        :param record: The record (message object) to be logged
        """
        return f"{datetime.utcnow().strftime('%a %d %b %Y %H:%M:%S.%f')[:-3]} +00:00: [{record.levelname}] [{self.name}]: {record.msg}"
