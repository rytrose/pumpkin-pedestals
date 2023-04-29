class CommandType:
    REQUEST = "0"
    RESPONSE = "1"


class Command:
    HEALTHCHECK = 0
    GET_PEDESTALS = 1
    SET_PEDESTALS_COLOR = 2
    BLINK_PEDESTAL = 3


def int_to_ascii_byte(i):
    """Converts an integer into a 2 character hex string, mod 256"""
    return ("00" + "{0:x}".format(i))[-2:]


def parse_command(raw):
    """Parses an ID-command-data packet"""
    raw_split = raw.split("|")
    raw_id, command_id, raw_data = raw_split[0], raw_split[1], raw_split[2]
    command_type = raw_id[0]
    id = raw_id[1:]
    command = int(command_id, 16)
    if not "#" in raw_data:
        data = [raw_data] if len(raw_data) > 0 else []
    else:
        data = raw_data.split("#")

    return command_type, id, command, data
