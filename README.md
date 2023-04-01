# Pumpkin Pedestals

Modular BLE-controlled LED pedestals for our collection of glass pumpkins.

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
    - An array of all currently connected pedestal addresse and color combinations, where each index is 8 ASCII characters representing 4 bytes in hex:
      - Byte 1 (MSB): The I2C address of the pedestal
      - Byte 2: The red value of the pedestal LED
      - Byte 3: The green value the pedestal LED
      - Byte 4: The blue value the pedestal LED

Example:
- Request
  - `000|01|`
- Response
  - `100|01|72FFE600#734959E6#748C1424`
    - I2C address `0x72`, hex color #FFE600 (yellow)
    - I2C address `0x73`, hex color #4959E6 (blue)
    - I2C address `0x74`, hex color #8C1424 (red)
  
### Set Pedestals Color

Sets the LED color of the provided pedestals. If blinking, setting a pedestal's LED color with this command will stop blinking.

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
    - An array of updated pedestal I2C addresses

Example:
- Request
  - `000|02|72FFE600#734959E6`
    - I2C address `0x72`, hex color #FFE600 (yellow)
    - I2C address `0x73`, hex color #4959E6 (blue)
- Response
  - `100|02|72#73`
    - I2C address `0x72`
    - I2C address `0x73`

### Blink Pedestal

Starts blinking the LED of the pedestal at the provided address.

- Command: `03`
- Request
  - Data:
    - A 1 byte pedestal I2C address in hex
- Response
  - Data:
    - The I2C address from the request if present, otherwise no data.

Example:
- Request
  - `000|03|72`
    - I2C address `0x72`
- Response (success)
  - `100|03|72`
    - I2C address `0x72`
- Response (failure)
  - `100|03|`
