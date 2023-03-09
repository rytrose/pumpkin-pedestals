# Pumpkin Pedestals

Modular BLE-controlled LED pedestals for our collection of glass pumpkins.

## BLE Protocol

Communication across the BLE UART characteristic follows a simple ID-command-data protocol:

- An ID-command-data packet consists of:
  - An ID to be used in both a request and response
  - A command identifier indicating whether it is a request or response, the purpose of the packet, and the expected data format
  - Any data associated with a command
- ID-command-data packets are delimited by a newline (`\n`)
- The ID, command identifier, and data are delimited by a (`|`)
  - Every packet must contain two delimeters, even if no data is provided
- An ID is three ASCII bytes:
  - The first byte should be `0` if the command is a request, and `1` if the command is a response
  - The second and third bytes represent one hex byte of a counter
  - On a new connection, clients should begin with a counter value of `00` and every subsequent packet increase the counter by one, rolling over from `ff` to `00` when reached
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
- ID `01`
- Command Request, `01`
- Data: [1, 2, 3]

`101|01|1#2#3\n`
- Command type: response `1`
- ID `01`
- Command Response, `01`
- Data: [1, 2, 3]

## Commands

### Healthcheck

- Command: `00`
- Request
  - Data: None
- Response
  - Data: None

Healthchecks should be initiated by each client once per second. If a client does not receive a response within one second three consecutive times, the client should close the connection.
