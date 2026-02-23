# homebridge-esphome-rgbww

A Homebridge plugin for ESPHome RGBWW lights with native HSV support and automatic RGB ↔ HSV conversion.

## Features

- ✅ Full RGB color support via HSV conversion
- ✅ Brightness control
- ✅ Color temperature (warm/cool white)
- ✅ Automatic RGB ↔ HSV conversion
- ✅ Native MQTT support
- ✅ Optimized for Xiaomi Yeelight Bedside Lamp 2 with ESPHome

## Installation

### Install from GitHub (Homebridge Docker/Unraid, persistent)

Run these commands inside the Homebridge container terminal:

```bash
cd /homebridge
npm uninstall homebridge-esphome-rgbww
npm install --save git+https://github.com/felixfoertsch/homebridge-esphome-rgbww.git
```

Then restart Homebridge:

```bash
hb-service restart
```

If `hb-service` is not available, restart the container from your Docker/Unraid UI.

Verify the runtime entrypoint exists:

```bash
ls -l /homebridge/node_modules/homebridge-esphome-rgbww/dist/index.js
```

Important:
- Install from `/homebridge` with `--save` so dependency metadata is persisted.
- Do not use `npm -g install` inside the container.

## Configuration

Add this to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "ESPHomeRGBWW",
      "name": "ESPHome RGBWW",
      "lights": [
        {
          "id": "bedside-lamp-4387-1962",
          "name": "Bedside Lamp Rechts",
          "manufacturer": "Yeelight",
          "model": "MJCTD02YL",
          "mqtt_broker": "mqtt://192.168.23.20:1883",
          "state_topic": "bedside-lamp-4387-1962/light/bedside_lamp_rechts/state",
          "command_topic": "bedside-lamp-4387-1962/light/bedside_lamp_rechts/command"
        }
      ]
    }
  ]
}
```

## ESPHome Configuration

Your ESPHome device should publish state to MQTT in this format:

```json
{
  "state": "ON",
  "brightness": 255,
  "color": {
    "r": 255,
    "g": 0,
    "b": 0
  },
  "color_temp": 300,
  "color_mode": "rgb"
}
```

And accept commands in the same format.

## Development

```bash
# Clone the repository
git clone https://github.com/felixfoertsch/homebridge-esphome-rgbww.git
cd homebridge-esphome-rgbww

# Install dependencies
npm install

# Build
npm run build

# Link for local development
npm link

# Watch mode
npm run watch
```

## License

MIT
