import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ESPHomeRGBWWPlatform } from './platform';
import * as mqtt from 'mqtt';

interface LightState {
  state: string;
  brightness: number;
  color?: {
    r: number;
    g: number;
    b: number;
  };
  color_temp?: number;
  color_mode?: string;
}

export class ESPHomeRGBWWAccessory {
  private service: Service;
  private mqttClient: mqtt.MqttClient;
  private static readonly MAX_BRIGHTNESS = 255;
  
  private currentState = {
    on: false,
    brightness: 100,
    hue: 0,
    saturation: 0,
    colorTemperature: 300,
  };

  constructor(
    private readonly platform: ESPHomeRGBWWPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: any,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, config.manufacturer || 'ESPHome')
      .setCharacteristic(this.platform.Characteristic.Model, config.model || 'RGBWW Light')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, config.id);

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) 
      || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, config.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))
      .onGet(this.getBrightness.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))
      .onGet(this.getHue.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))
      .onGet(this.getSaturation.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .onSet(this.setColorTemperature.bind(this))
      .onGet(this.getColorTemperature.bind(this));

    this.mqttClient = mqtt.connect(config.mqtt_broker || 'mqtt://localhost:1883');
    
    this.mqttClient.on('connect', () => {
      this.platform.log.info('Connected to MQTT broker');
      this.mqttClient.subscribe(config.state_topic);
    });

    this.mqttClient.on('message', (topic, message) => {
      if (topic === config.state_topic) {
        this.handleStateUpdate(message.toString());
      }
    });

    this.mqttClient.on('error', (error) => {
      this.platform.log.error('MQTT error:', error);
    });
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const v = max;

    if (delta > 0) {
      s = delta / max;
      
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      
      h *= 60;
      if (h < 0) {
        h += 360;
      }
    }

    return { h, s: s * 100, v: v * 100 };
  }

  private hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    s /= 100;
    v /= 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = 0; g = c; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = c;
    } else if (h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  private handleStateUpdate(message: string) {
    try {
      const state: LightState = JSON.parse(message);
      
      this.currentState.on = state.state === 'ON';
      this.currentState.brightness = Math.round((state.brightness / ESPHomeRGBWWAccessory.MAX_BRIGHTNESS) * 100);

      if (state.color && state.color.r !== undefined) {
        const hsv = this.rgbToHsv(state.color.r, state.color.g, state.color.b);
        this.currentState.hue = hsv.h;
        this.currentState.saturation = hsv.s;
      }

      if (state.color_temp) {
        this.currentState.colorTemperature = state.color_temp;
      }

      this.service.updateCharacteristic(this.platform.Characteristic.On, this.currentState.on);
      this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.currentState.brightness);
      this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.currentState.hue);
      this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.currentState.saturation);
      this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, this.currentState.colorTemperature);

    } catch (error) {
      this.platform.log.error('Failed to parse state update:', error);
    }
  }

  private publishCommand(payload: any) {
    this.mqttClient.publish(
      this.config.command_topic,
      JSON.stringify(payload),
    );
  }

  async setOn(value: CharacteristicValue) {
    this.currentState.on = value as boolean;
    this.publishCommand({ state: value ? 'ON' : 'OFF' });
    this.platform.log.debug('Set On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.currentState.on;
  }

  async setBrightness(value: CharacteristicValue) {
    this.currentState.brightness = value as number;
    const brightness = Math.round((value as number / 100) * ESPHomeRGBWWAccessory.MAX_BRIGHTNESS);
    this.publishCommand({ brightness });
    this.platform.log.debug('Set Brightness ->', value);
  }

  async getBrightness(): Promise<CharacteristicValue> {
    return this.currentState.brightness;
  }

  async setHue(value: CharacteristicValue) {
    this.currentState.hue = value as number;
    this.updateRGBColor();
    this.platform.log.debug('Set Hue ->', value);
  }

  async getHue(): Promise<CharacteristicValue> {
    return this.currentState.hue;
  }

  async setSaturation(value: CharacteristicValue) {
    this.currentState.saturation = value as number;
    this.updateRGBColor();
    this.platform.log.debug('Set Saturation ->', value);
  }

  async getSaturation(): Promise<CharacteristicValue> {
    return this.currentState.saturation;
  }

  async setColorTemperature(value: CharacteristicValue) {
    this.currentState.colorTemperature = value as number;
    this.publishCommand({ color_temp: value });
    this.platform.log.debug('Set ColorTemperature ->', value);
  }

  async getColorTemperature(): Promise<CharacteristicValue> {
    return this.currentState.colorTemperature;
  }

  private updateRGBColor() {
    const rgb = this.hsvToRgb(
      this.currentState.hue,
      this.currentState.saturation,
      this.currentState.brightness,
    );

    this.publishCommand({
      color: {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
      },
    });
  }
}
