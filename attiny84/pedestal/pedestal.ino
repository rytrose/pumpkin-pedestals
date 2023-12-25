// Using range 112 - 127 (0x70 - 0x7F)
#define I2C_PERIPHERAL_ADDRESS 0x70 // 112
// #define I2C_PERIPHERAL_ADDRESS 0x71 // 113
// #define I2C_PERIPHERAL_ADDRESS 0x72 // 114
// #define I2C_PERIPHERAL_ADDRESS 0x73 // 115
// #define I2C_PERIPHERAL_ADDRESS 0x74 // 116
// #define I2C_PERIPHERAL_ADDRESS 0x75 // 117
// #define I2C_PERIPHERAL_ADDRESS 0x76 // 118
// #define I2C_PERIPHERAL_ADDRESS 0x77 // 119
// #define I2C_PERIPHERAL_ADDRESS 0x78 // 120
// #define I2C_PERIPHERAL_ADDRESS 0x79 // 121
// #define I2C_PERIPHERAL_ADDRESS 0x7A // 122
// #define I2C_PERIPHERAL_ADDRESS 0x7B // 123
// #define I2C_PERIPHERAL_ADDRESS 0x7C // 124
// #define I2C_PERIPHERAL_ADDRESS 0x7D // 125
// #define I2C_PERIPHERAL_ADDRESS 0x7E // 126
// #define I2C_PERIPHERAL_ADDRESS 0x7F // 127

#include <TinyWireS.h>

#define UNKNOWN_COMMAND 0x00
#define COMMAND_GET_STATE 0x01
#define COMMAND_SET_COLOR 0x02
#define COMMAND_SET_BLINKING 0x03

// The command that determines the context of data requested or sent by the controller
uint8_t command = UNKNOWN_COMMAND;

// The LED color state, default to white
uint8_t red = 0xff;
uint8_t green = 0xff;
uint8_t blue = 0xff;

// The LED blinking state
uint8_t blinking = 0x00;

void setup()
{
  TinyWireS.begin(I2C_PERIPHERAL_ADDRESS);
  TinyWireS.onReceive(receiveEvent);
  TinyWireS.onRequest(requestEvent);
}

void loop()
{
  // Check for I2C stop bit
  TinyWireS_stop_check();
}

// Called on peripheral read, peripheral should write bytes to the controller
void requestEvent()
{
  switch (command)
  {
  case COMMAND_GET_STATE:
  case COMMAND_SET_COLOR:
  case COMMAND_SET_BLINKING:
    writeState();
    break;
  }
}

// Write pedestal state to the controller
void writeState()
{
  // Writes the LED color state
  TinyWireS.write(red);
  TinyWireS.write(green);
  TinyWireS.write(blue);
  // Writes the LED blinking state
  TinyWireS.write(blinking);
}

// Called on peripheral write, peripheral should read bytes from the controller
void receiveEvent(uint8_t available)
{
  // Not sure if this can happen, but short circuit if no bytes available to read
  if (available == 0)
    return;

  // First byte is the expected command
  command = TinyWireS.read();

  switch (command)
  {
  case UNKNOWN_COMMAND:
  case COMMAND_GET_STATE:
    // Commands requesting data from the pedestal should not have any additional data from the controller.
    // Read and drop any unexpected data.
    drainRxBuffer();
    break;
  case COMMAND_SET_COLOR:
    if (TinyWireS.available() != 3)
      // Expect 3 bytes for the color values, if not drain the buffer
      drainRxBuffer();
    red = TinyWireS.read();
    green = TinyWireS.read();
    blue = TinyWireS.read();
  case COMMAND_SET_BLINKING:
    if (TinyWireS.available() != 1)
      // Expect 1 byte for the blinking state, if not drain the buffer
      drainRxBuffer();
    blinking = TinyWireS.read();
  }
}

void drainRxBuffer()
{
  for (uint8_t i = 0; i < TinyWireS.available(); i++)
    TinyWireS.read();
}
