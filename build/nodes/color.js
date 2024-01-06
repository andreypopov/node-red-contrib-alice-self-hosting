"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const status_1 = require("../lib/status");
module.exports = (RED) => {
    RED.nodes.registerType('alice-sh-color', function (config) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        self.config = config;
        RED.nodes.createNode(this, config);
        // var
        const device = RED.nodes.getNode(config.device);
        const ctype = 'devices.capabilities.color_setting';
        const retrievable = true;
        const reportable = config.response; // reportable = response
        const color_support = config.color_support;
        const scheme = config.scheme;
        const temperature_k = config.temperature_k;
        const temperature_min = parseInt(config.temperature_min);
        const temperature_max = parseInt(config.temperature_max);
        const color_scene = config.color_scene || [];
        // helpers
        self.statusHelper = new status_1.Status(self);
        if (!color_support && !temperature_k && color_scene.length < 1) {
            const error = 'Least one parameter must be enabled';
            self.error(error);
            self.statusHelper.set({
                fill: 'red',
                shape: 'dot',
                text: error
            });
            return;
        }
        // device not init
        if (!device || !device.init)
            return;
        // init
        let instance;
        const parameters = {};
        let value;
        if (color_support) {
            instance = scheme;
            parameters.color_model = scheme;
            value = scheme == 'hsv' ? { h: 0, s: 0, v: 0 } : Number(0.0);
        }
        if (temperature_k) {
            instance = 'temperature_k';
            parameters.temperature_k = {
                min: temperature_min,
                max: temperature_max
            };
            value = Number(4500);
        }
        if (color_scene.length > 0) {
            instance = 'scene';
            const scenes = [];
            color_scene.forEach((s) => {
                scenes.push({ id: s });
            });
            parameters.color_scene = {
                scenes: scenes
            };
            value = color_scene[0];
        }
        const keyCache = `${self.id}-${ctype}-${instance}`;
        value = device.cache.get(keyCache) || value;
        // init
        try {
            self.statusHelper.clear();
            device.setCapability({
                type: ctype,
                reportable: reportable,
                retrievable: retrievable,
                state: {
                    instance: instance,
                    value: value
                },
                parameters
            }, ctype, instance);
        }
        catch (error) {
            self.error(error);
            self.statusHelper.set({
                fill: 'red',
                shape: 'dot',
                text: error
            });
            return;
        }
        device.updateInfoDevice().catch((error) => {
            self.error(`updateInfoDevice: ${error}`);
            self.statusHelper.set({
                fill: 'red',
                shape: 'dot',
                text: error
            }, 5000);
        });
        self.on('input', (msg) => __awaiter(this, void 0, void 0, function* () {
            if (typeof msg.payload !== 'object' && typeof msg.payload !== 'number' && typeof msg.payload !== 'string') {
                self.statusHelper.set({
                    fill: 'red',
                    shape: 'dot',
                    text: 'Wrong type! msg.payload type is unsupported'
                }, 3000);
                return;
            }
            const payload = msg.payload;
            if (value == payload)
                return;
            self.statusHelper.set({ fill: 'yellow', shape: 'dot', text: payload }, 3000);
            device.updateState(payload, ctype, instance);
            try {
                yield device.updateStateDevice();
                value = payload;
                device.cache.set(keyCache, value);
                setTimeout(() => self.statusHelper.set({
                    fill: 'blue',
                    shape: 'ring',
                    text: 'Ok'
                }, 3000), 3000);
            }
            catch (error) {
                device.updateState(value, ctype, instance);
                self.error(`updateStateDevice: ${error}`);
                self.statusHelper.set({
                    fill: 'red',
                    shape: 'dot',
                    text: error
                }, 5000);
            }
        }));
        const onState = (object) => {
            var _a, _b, _c;
            if ((object === null || object === void 0 ? void 0 : object.type) == ctype && ((_a = object === null || object === void 0 ? void 0 : object.state) === null || _a === void 0 ? void 0 : _a.instance) == instance) {
                value = (_b = object === null || object === void 0 ? void 0 : object.state) === null || _b === void 0 ? void 0 : _b.value;
                device.updateState(value, ctype, instance);
                device.cache.set(keyCache, value);
                self.send({
                    payload: value,
                    type: object === null || object === void 0 ? void 0 : object.type,
                    instance: (_c = object === null || object === void 0 ? void 0 : object.state) === null || _c === void 0 ? void 0 : _c.instance
                });
                self.statusHelper.set({ fill: 'yellow', shape: 'dot', text: value }, 3000);
                if (reportable) {
                    device.updateStateDevice().catch(error => self.error(`updateStateDevice: ${error}`));
                }
            }
        };
        device.on('onState', onState);
        self.on('close', (removed, done) => __awaiter(this, void 0, void 0, function* () {
            device.removeCapability(ctype, instance);
            if (removed) {
                device.cache.del(keyCache);
                try {
                    yield device.updateInfoDevice();
                }
                catch (_) {
                    /* empty */
                }
                try {
                    yield device.updateStateDevice();
                }
                catch (_) {
                    /* empty */
                }
            }
            device.removeListener('onState', onState);
            done();
        }));
    });
};
//# sourceMappingURL=color.js.map