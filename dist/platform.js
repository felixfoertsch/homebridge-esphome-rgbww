"use strict";
const { ESPHomeRGBWWAccessory } = require("./accessory");

class ESPHomeRGBWWPlatform {
	constructor(log, config, api) {
		this.log = log;
		this.config = config;
		this.api = api;
		this.Service = this.api.hap.Service;
		this.Characteristic = this.api.hap.Characteristic;
		this.accessories = [];

		this.log.debug("Finished initializing platform:", this.config.name);
		this.api.on("didFinishLaunching", () => {
			this.discoverDevices();
		});
	}

	configureAccessory(accessory) {
		this.log.info("Loading accessory from cache:", accessory.displayName);
		this.accessories.push(accessory);
	}

	discoverDevices() {
		const devices = this.config.lights || [];

		for (const device of devices) {
			const uuid = this.api.hap.uuid.generate(device.id);
			const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

			if (existingAccessory) {
				this.log.info("Restoring existing accessory from cache:", existingAccessory.displayName);
				new ESPHomeRGBWWAccessory(this, existingAccessory, device);
			} else {
				this.log.info("Adding new accessory:", device.name);
				const accessory = new this.api.platformAccessory(device.name, uuid);
				accessory.context.device = device;
				new ESPHomeRGBWWAccessory(this, accessory, device);
				this.api.registerPlatformAccessories("homebridge-esphome-rgbww", "ESPHomeRGBWW", [accessory]);
			}
		}
	}
}

module.exports = { ESPHomeRGBWWPlatform };
