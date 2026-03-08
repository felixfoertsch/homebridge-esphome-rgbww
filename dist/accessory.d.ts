import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ESPHomeRGBWWPlatform } from './platform';
export declare class ESPHomeRGBWWAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly config;
    private service;
    private mqttClient;
    private static readonly MAX_BRIGHTNESS;
    private currentState;
    constructor(platform: ESPHomeRGBWWPlatform, accessory: PlatformAccessory, config: any);
    private rgbToHsv;
    private hsvToRgb;
    private handleStateUpdate;
    private publishCommand;
    setOn(value: CharacteristicValue): Promise<void>;
    getOn(): Promise<CharacteristicValue>;
    setBrightness(value: CharacteristicValue): Promise<void>;
    getBrightness(): Promise<CharacteristicValue>;
    setHue(value: CharacteristicValue): Promise<void>;
    getHue(): Promise<CharacteristicValue>;
    setSaturation(value: CharacteristicValue): Promise<void>;
    getSaturation(): Promise<CharacteristicValue>;
    setColorTemperature(value: CharacteristicValue): Promise<void>;
    getColorTemperature(): Promise<CharacteristicValue>;
    private updateRGBColor;
}
//# sourceMappingURL=accessory.d.ts.map