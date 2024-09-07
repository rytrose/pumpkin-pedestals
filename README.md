# Pumpkin Pedestals

Modular BLE-controlled LED pedestals for our collection of glass pumpkins.

## Development

### Server
To run the server:

- On WSL, ensure the web app has been built recently
  - `cd projects/pumpkin-pedestals/web`
  - `npm run build`
- If needed, update the pi's IP address in `copy_to_pi.sh`
  - WSL seems to have issues resolving the .local IP, so if needed run `ping rytrose-pi-zero-w.local` in a command prompt on Windows to get the IP and use it directly
- SSH into `rytrose@rytrose-pi-zero-w.local`
  - Again, replacing the .local address with the explicit address if needed
- `cd projects/pumpkin-pedestals/web/backend`
- Run `PYTHONPATH=$HOME/projects/pumpkin-pedestals/common python main.py`
- The web app should now be accessible at http://rytrose-pi-zero-w.local:8080

### Peripheral
To work with the peripheral (aka the hub):

- Plug the XIAO into the computer via USB
- On Windows in a command prompt with administrator privileges run `usbipd list`
  - Take note of the USB Serial Device, likely associated with a COM port, and note its bus ID
- To view the logs:
  - In the command prompt run `usbipd bind --busid <BUSID>`, replacing `BUSID` with the value from before
  - In the command prompt run `usbipd attach --wsl --busid <BUSID>`, replacing `BUSID` with the value from before
    - This should detach the USB device from Windows to make it avaiable in WSL
  - In WSL run `sudo screen /dev/ttyACM0`
    - Press Ctrl+C if needed to bring up the CircuitPython prompt, or Ctrl+D to reload

## BLE Protocol

Communication across the BLE UART characteristic follows a simple ID-command-data protocol:

- An ID-command-data packet consists of:
  - An ID to be used in both a request and response
  - A command identifier indicating whether it is a request or response, the purpose of the packet, and the expected data format
  - Any data associated with a command
- ID-command-data packets are delimited by a newline (`\n`)
- The ID, command identifier, and data are delimited by a pipe (`|`)
  - Every packet must contain two pipe delimiters, even if no data is provided
- An ID is three ASCII bytes:
  - The first byte should be `0` if the command is a request, and `1` if the command is a response
  - The second and third bytes represent one hex byte of a counter
  - Clients should begin with a counter value of `00` and every subsequent packet increase the counter by one, rolling over from `ff` to `00` when reached
  - IDs should be echoed back on the response to a request
  - Every request should receive a response
- A command identifier is three ASCII bytes: 
  - The second and third bytes represent one hex byte
- Data has no length specifications
- Multiple data values for a command are delimited by an octothorp (`#`)
- The expected data format is defined by the command identifier
- Packets are expected to be sent serially

Examples:

`000|00|\n`
- Command type: request `0`
- ID: `00`
- Command Request, `00`
- Data: None

`100|00|\n`
- Command type: response `1`
- ID: `00`
- Command Response, `00`
- Data: None

`001|01|1#2#3\n`
- Command type: request `0`
- ID: `01`
- Command Request, `01`
- Data: [1, 2, 3]

`101|01|1#2#3\n`
- Command type: response `1`
- ID: `01`
- Command Response, `01`
- Data: [1, 2, 3]

## Commands

### Healthcheck

A command to test client-server connectivity. Healthchecks should be initiated by each client once per second. If a client does not receive a response within one second three consecutive times, the client should close the connection.

- Command: `00`
- Request
  - Data: None
- Response
  - Data: None

### Get Pedestals

Retrieves the currently connected pedestal addresses and their current LED color. Pedestal addresses are the I2C device address of the pedestal, aside from the hub which is always `00`.

- Command: `01`
- Request
  - Data: None
- Response
  - Data:
    - An array of all currently connected pedestal addresses, color combinations, and blinking state. The first 8 characters are ASCII character pairs representing 4 bytes in hex, followed by the blinking state `0` or `1`:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The red value of the pedestal LED
      - Byte 3: The green value the pedestal LED
      - Byte 4: The blue value the pedestal LED
      - Character 9: `0` if the pedestal is solid and `1` if blinking

Example:
- Request
  - `000|01|`
- Response
  - `100|01|72FFE6000#734959E60#748C14241`
    - I2C address `0x72`, hex color #FFE600 (yellow), not blinking (`0`)
    - I2C address `0x73`, hex color #4959E6 (blue), not blinking (`0`)
    - I2C address `0x74`, hex color #8C1424 (red), blinking (`1`)
  
### Set Pedestals Color

Sets the LED color of the provided pedestals. Returns all currently connected pedestals.

- Command: `02`
- Request
  - Data:
    - An array of pedestal address and color combinations, where each entry in the array is 8 ASCII characters representing 4 bytes in hex:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The desired red value of the LED
      - Byte 3: The desired green value the LED
      - Byte 4: The desired blue value the LED
- Response
  - Data:
    - An array of all currently connected pedestal addresses, color combinations, and blinking state. The first 8 characters are ASCII character pairs representing 4 bytes in hex, followed by the blinking state `0` or `1`:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The red value of the pedestal LED
      - Byte 3: The green value the pedestal LED
      - Byte 4: The blue value the pedestal LED
      - Character 9: `0` if the pedestal is solid and `1` if blinking

Example:
- Request
  - `000|02|72FFE600#734959E6`
    - I2C address `0x72`, hex color #FFE600 (yellow)
    - I2C address `0x73`, hex color #4959E6 (blue)
- Response
  - `100|02|72FFE6000#734959E60#748C14241`
    - I2C address `0x72`, hex color #FFE600 (yellow), not blinking (`0`)
    - I2C address `0x73`, hex color #4959E6 (blue), not blinking (`0`)
    - I2C address `0x74`, hex color #8C1424 (red), blinking (`1`)

### Blink Pedestals

Starts blinking the LED of the pedestals at the provided addresses.

- Command: `03`
- Request
  - Data:
    - A list of 1 byte pedestal I2C address in hex
- Response
  - Data:
    - An array of all currently connected pedestal addresses, color combinations, and blinking state. The first 8 characters are ASCII character pairs representing 4 bytes in hex, followed by the blinking state `0` or `1`:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The red value of the pedestal LED
      - Byte 3: The green value the pedestal LED
      - Byte 4: The blue value the pedestal LED
      - Character 9: `0` if the pedestal is solid and `1` if blinking

Example:
- Request
  - `000|03|72#73`
    - I2C address `0x72`
    - I2C address `0x73`
- Response
  - `100|03|72FFE6001#734959E61#748C14241`
    - I2C address `0x72`, hex color #FFE600 (yellow), blinking (`1`)
    - I2C address `0x73`, hex color #4959E6 (blue), blinking (`1`)
    - I2C address `0x74`, hex color #8C1424 (red), blinking (`1`)

### Stop Pedestals Blinking

Stops blinking the LED of the pedestals at the provided addresses. If the pedestal is not blinking, then no operation is performed.

- Command: `04`
- Request
  - Data:
    - A list of 1 byte pedestal I2C address in hex
- Response
  - Data:
    - An array of all currently connected pedestal addresses, color combinations, and blinking state. The first 8 characters are ASCII character pairs representing 4 bytes in hex, followed by the blinking state `0` or `1`:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The red value of the pedestal LED
      - Byte 3: The green value the pedestal LED
      - Byte 4: The blue value the pedestal LED
      - Character 9: `0` if the pedestal is solid and `1` if blinking

Example:
- Request
  - `000|04|72#73`
    - I2C address `0x72`
    - I2C address `0x73`
- Response
  - `100|03|72FFE6000#734959E60#748C14241`
    - I2C address `0x72`, hex color #FFE600 (yellow), not blinking (`0`)
    - I2C address `0x73`, hex color #4959E6 (blue), not blinking (`0`)
    - I2C address `0x74`, hex color #8C1424 (red), blinking (`1`)
