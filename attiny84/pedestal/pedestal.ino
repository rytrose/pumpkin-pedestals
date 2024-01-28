// Using range 48 - 63 (0x30 - 0x3f)
#define I2C_PERIPHERAL_ADDRESS 48 // 0x30
// #define I2C_PERIPHERAL_ADDRESS 49 // 0x31
// #define I2C_PERIPHERAL_ADDRESS 50 // 0x32
// #define I2C_PERIPHERAL_ADDRESS 51 // 0x33
// #define I2C_PERIPHERAL_ADDRESS 52 // 0x34
// #define I2C_PERIPHERAL_ADDRESS 53 // 0x35
// #define I2C_PERIPHERAL_ADDRESS 54 // 0x36
// #define I2C_PERIPHERAL_ADDRESS 55 // 0x37
// #define I2C_PERIPHERAL_ADDRESS 56 // 0x38
// #define I2C_PERIPHERAL_ADDRESS 57 // 0x39
// #define I2C_PERIPHERAL_ADDRESS 58 // 0x3a
// #define I2C_PERIPHERAL_ADDRESS 59 // 0x3b
// #define I2C_PERIPHERAL_ADDRESS 60 // 0x3c
// #define I2C_PERIPHERAL_ADDRESS 61 // 0x3d
// #define I2C_PERIPHERAL_ADDRESS 62 // 0x3e
// #define I2C_PERIPHERAL_ADDRESS 63 // 0x3f

#include <TinyWireS.h>
#include <EEPROM.h>
#include <tinyNeoPixel_Static.h>

// LED used for debugging purposes
#define DEBUG_LED_PIN 1

#define UNKNOWN_COMMAND 0x00
#define COMMAND_GET_STATE 0x01
#define COMMAND_SET_COLOR 0x02
#define COMMAND_SET_BLINKING 0x03

// The command that determines the context of data requested or sent by the controller
uint8_t command = UNKNOWN_COMMAND;

#define EEPROM_RED_ADDR 10
#define EEPROM_GREEN_ADDR 11
#define EEPROM_BLUE_ADDR 12
#define EEPROM_BLINKING_ADDR 13

// The LED color state, loaded from EEPROM
uint8_t red = EEPROM.read(EEPROM_RED_ADDR);
uint8_t green = EEPROM.read(EEPROM_GREEN_ADDR);
uint8_t blue = EEPROM.read(EEPROM_BLUE_ADDR);

// Maintain previous state to write to EEPROM on changes outside of the
// I2C interrupts, which seems to cause issues (too slow?)
uint8_t prevRed = red;
uint8_t prevGreen = green;
uint8_t prevBlue = blue;

// The LED blinking state, loaded from EEPROM
uint8_t blinking = EEPROM.read(EEPROM_BLINKING_ADDR);
uint8_t prevBlinking = blinking;

#define NUM_PIXELS 1
#define LED_PIN 2
#define LED_PERIOD 16

// The LED pixel array (3 channels per pixel)
byte pixels[NUM_PIXELS * 3];

// The LED interface
tinyNeoPixel led = tinyNeoPixel(1, LED_PIN, NEO_GRB, pixels);

// Counter for last LED update
long lastLEDUpdate = 0;

// Blink speed in milliseconds
#define BLINK_SPEED 500

// Whether the LED should be on or off while blinking
bool blinkState = false;

// Counter for last blink update
long lastBlinkUpdate = 0;

void setup()
{
  TinyWireS.begin(I2C_PERIPHERAL_ADDRESS);
  TinyWireS.onReceive(receiveEvent);
  TinyWireS.onRequest(requestEvent);

  pinMode(LED_PIN, OUTPUT);
  pinMode(DEBUG_LED_PIN, OUTPUT);
  debug(4);
}

void loop()
{
  // Update the LED every 16ms (62.5 Hz)
  long currentTime = millis();
  if (currentTime > lastLEDUpdate + 16)
  {
    lastLEDUpdate = currentTime;
    // Update the blink state
    if (blinking)
    {
      if (currentTime > lastBlinkUpdate + BLINK_SPEED)
      {
        blinkState = !blinkState;
        lastBlinkUpdate = currentTime;
      }
    }

    // Update the LED
    if (blinking && !blinkState)
    {
      // Set the LED to off
      led.setPixelColor(0, led.Color(0, 0, 0));
    }
    else
    {
      // Set the LED to the color
      led.setPixelColor(0, led.Color(red, green, blue));
    }

    led.show();
  }

  // Check for I2C stop bit
  TinyWireS_stop_check();

  // If state changed, write to EEPROM
  if (red != prevRed)
  {
    EEPROM.write(EEPROM_RED_ADDR, red);
    prevRed = red;
  }
  if (blue != prevBlue)
  {
    EEPROM.write(EEPROM_BLUE_ADDR, blue);
    prevBlue = blue;
  }
  if (green != prevGreen)
  {
    EEPROM.write(EEPROM_GREEN_ADDR, green);
    prevGreen = green;
  }
  if (blinking != prevBlinking)
  {
    EEPROM.write(EEPROM_BLINKING_ADDR, blinking);
    prevBlinking = blinking;
  }
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
    // Commands requesting data from the pedestal should not have any additional data from the controller
    drainRxBuffer();
    break;
  case COMMAND_SET_COLOR:
    if (TinyWireS.available() != 3)
      // Expect 3 bytes for the color values, if not drain the buffer
      drainRxBuffer();
    red = TinyWireS.read();
    green = TinyWireS.read();
    blue = TinyWireS.read();
    break;
  case COMMAND_SET_BLINKING:
    if (TinyWireS.available() != 1)
      // Expect 1 byte for the blinking state, if not drain the buffer
      drainRxBuffer();
    blinking = TinyWireS.read();
    break;
  }
}

// Reads and drops any unexpected data in the receive buffer
void drainRxBuffer()
{
  for (uint8_t i = 0; i < TinyWireS.available(); i++)
    TinyWireS.read();
}

// Flashes the debug LED the provided number of times
void debug(int num)
{
  for (int i = 0; i < num; i++)
  {
    // On for 50ms, (LOW/HIGH are reversed)
    digitalWrite(DEBUG_LED_PIN, LOW);
    delay(50);
    digitalWrite(DEBUG_LED_PIN, HIGH);
    delay(200);
  }
}