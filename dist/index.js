"use strict";
const { ESPHomeRGBWWPlatform } = require("./platform");

module.exports = (api) => {
	api.registerPlatform("homebridge-esphome-rgbww", "ESPHomeRGBWW", ESPHomeRGBWWPlatform);
};
