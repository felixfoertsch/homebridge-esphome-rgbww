"use strict";
const mqtt = require("mqtt");

class ESPHomeRGBWWAccessory {
	static MAX_BRIGHTNESS = 255;

	constructor(platform, accessory, config) {
		this.platform = platform;
		this.accessory = accessory;
		this.config = config;
		this.currentState = {
			on: false,
			brightness: 100,
			hue: 0,
			saturation: 0,
			colorTemperature: 300,
		};

		this.accessory
			.getService(this.platform.Service.AccessoryInformation)
			.setCharacteristic(this.platform.Characteristic.Manufacturer, config.manufacturer || "ESPHome")
			.setCharacteristic(this.platform.Characteristic.Model, config.model || "RGBWW Light")
			.setCharacteristic(this.platform.Characteristic.SerialNumber, config.id);

		this.service =
			this.accessory.getService(this.platform.Service.Lightbulb) ||
			this.accessory.addService(this.platform.Service.Lightbulb);

		this.service.setCharacteristic(this.platform.Characteristic.Name, config.name);

		this.service
			.getCharacteristic(this.platform.Characteristic.On)
			.onSet(this.setOn.bind(this))
			.onGet(this.getOn.bind(this));

		this.service
			.getCharacteristic(this.platform.Characteristic.Brightness)
			.onSet(this.setBrightness.bind(this))
			.onGet(this.getBrightness.bind(this));

		this.service
			.getCharacteristic(this.platform.Characteristic.Hue)
			.onSet(this.setHue.bind(this))
			.onGet(this.getHue.bind(this));

		this.service
			.getCharacteristic(this.platform.Characteristic.Saturation)
			.onSet(this.setSaturation.bind(this))
			.onGet(this.getSaturation.bind(this));

		this.service
			.getCharacteristic(this.platform.Characteristic.ColorTemperature)
			.onSet(this.setColorTemperature.bind(this))
			.onGet(this.getColorTemperature.bind(this));

		this.mqttClient = mqtt.connect(config.mqtt_broker || "mqtt://localhost:1883");

		this.mqttClient.on("connect", () => {
			this.platform.log.info("Connected to MQTT broker");
			this.mqttClient.subscribe(config.state_topic);
		});

		this.mqttClient.on("message", (topic, message) => {
			if (topic === config.state_topic) {
				this.handleStateUpdate(message.toString());
			}
		});

		this.mqttClient.on("error", (error) => {
			this.platform.log.error("MQTT error:", error);
		});
	}

	rgbToHsv(r, g, b) {
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

	hsvToRgb(h, s, v) {
		s /= 100;
		v /= 100;

		const c = v * s;
		const x = c * (1 - Math.abs((h / 60) % 2 - 1));
		const m = v - c;

		let r = 0;
		let g = 0;
		let b = 0;

		if (h >= 0 && h < 60) {
			r = c;
			g = x;
			b = 0;
		} else if (h < 120) {
			r = x;
			g = c;
			b = 0;
		} else if (h < 180) {
			r = 0;
			g = c;
			b = x;
		} else if (h < 240) {
			r = 0;
			g = x;
			b = c;
		} else if (h < 300) {
			r = x;
			g = 0;
			b = c;
		} else {
			r = c;
			g = 0;
			b = x;
		}

		return {
			r: Math.round((r + m) * 255),
			g: Math.round((g + m) * 255),
			b: Math.round((b + m) * 255),
		};
	}

	handleStateUpdate(message) {
		try {
			const state = JSON.parse(message);

			this.currentState.on = state.state === "ON";
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
			this.platform.log.error("Failed to parse state update:", error);
		}
	}

	publishCommand(payload) {
		this.mqttClient.publish(this.config.command_topic, JSON.stringify(payload));
	}

	async setOn(value) {
		this.currentState.on = value;
		this.publishCommand({ state: value ? "ON" : "OFF" });
		this.platform.log.debug("Set On ->", value);
	}

	async getOn() {
		return this.currentState.on;
	}

	async setBrightness(value) {
		this.currentState.brightness = value;
		const brightness = Math.round(((value) / 100) * ESPHomeRGBWWAccessory.MAX_BRIGHTNESS);
		this.publishCommand({ brightness });
		this.platform.log.debug("Set Brightness ->", value);
	}

	async getBrightness() {
		return this.currentState.brightness;
	}

	async setHue(value) {
		this.currentState.hue = value;
		this.updateRGBColor();
		this.platform.log.debug("Set Hue ->", value);
	}

	async getHue() {
		return this.currentState.hue;
	}

	async setSaturation(value) {
		this.currentState.saturation = value;
		this.updateRGBColor();
		this.platform.log.debug("Set Saturation ->", value);
	}

	async getSaturation() {
		return this.currentState.saturation;
	}

	async setColorTemperature(value) {
		this.currentState.colorTemperature = value;
		this.publishCommand({ color_temp: value });
		this.platform.log.debug("Set ColorTemperature ->", value);
	}

	async getColorTemperature() {
		return this.currentState.colorTemperature;
	}

	updateRGBColor() {
		const rgb = this.hsvToRgb(this.currentState.hue, this.currentState.saturation, this.currentState.brightness);

		this.publishCommand({
			color: {
				r: rgb.r,
				g: rgb.g,
				b: rgb.b,
			},
		});
	}
}

module.exports = { ESPHomeRGBWWAccessory };
