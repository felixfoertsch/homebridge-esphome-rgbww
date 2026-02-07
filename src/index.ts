import { API } from 'homebridge';
import { ESPHomeRGBWWPlatform } from './platform';

export = (api: API) => {
  api.registerPlatform('homebridge-esphome-rgbww', 'ESPHomeRGBWW', ESPHomeRGBWWPlatform);
};
