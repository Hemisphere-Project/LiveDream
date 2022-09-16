/* ----------------------------------------------------------------------------------------------------
 * Web Bluetooth Device Management, 2021
 * Created: 18/08/21 by Bastien DIDIER, Mentalista
 * 
 * device.js allows a simplified connection with ble peripheral
 *
 * TODO
 * - Add a methode to set the scale factor
 * 
 * Update: 28/03/22 Current V.1.1.3
 * ----------------------------------------------------------------------------------------------------
 */

import { DSP } from "/assets/dsp.js";
import { filters } from "/assets/filters.js";
import * as convert from "/assets/bits-interpreter.js";

export class Device {

	/**
	 * @return {Device}
	 */
	constructor(){
		
		const self = this;

		this.id;
		this.name;
		this.device;
		this.busy = false;
		this.isReady = false;

		this.isStreaming = false;
		this.play = () => {};
		this.pause = () => {};
		this.toggle = () => {
			this.isStreaming ? this.pause() : this.play();
		};

		this.battery = async () => {};

		//this.index = 0; /Usefull ?
		this.connect();

		this.dsp = new DSP();

		this.sampleRate = 256;
		
		this.Vref;
		this.gain;
		this.scaleFactor;

		this.channels; // auto filled at device connection
		this.frame = 5;
		
		this.chanKeys;

		this.widgets = new Object(); // Handle widgets

		this.sampleIndex = 0;
		this.eventCount = () => {
			console.warn(this.name+" : "+this.sampleIndex+" ("+this.sampleIndex*this.frame+"Hz)");
			this.sampleIndex = 0;
		};

		this.handle = {
			data : (value) => {

				//console.log( value );

				// In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
				value = value.buffer ? value : new DataView(value);

				let sample = new Object();
					sample.timestamp = Date.now();
					sample.data = new Object();
					for (let i = 0; i < this.channels; i++) {
					  sample.data[i.toString()] = new Array()
					};

				let idx = 0; //Buffer index

				// Add a count in the data
				//const label = this.interpret16bitAsInt32(value.buffer.slice(idx, idx+2));
				//idx += 2;

				for (let p = 0; p < this.frame; p++) {
					for (let c = 0; c < this.channels; c++) {

						//check if it's usefull
						if(typeof sample.data[c] == undefined) sample.data[c] = new Array();

						const rawVal = convert.from24bitToInt32(value.buffer.slice(idx, idx+3));
						const uV = this.scaleFactor() * rawVal;

						sample.data[c].push( uV );
						idx += 3;
					}
				}

				//Monitor frame rate
				this.sampleIndex++;

				this.dsp.populate(sample, this.scaleFactor);

				return self.onDataChange( sample );
			},
			log : (value) => {

				// In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
				value = value.buffer ? value : new DataView(value);

				console.log( this.interpret24bitAsInt32( value.buffer.slice(0,3) ) );
				
				this.sampleIndex++;
				return;
			}
		}
	}

	connect(){

		const self = this;
		navigator.bluetooth.requestDevice(filters).then(device => {

			const id = device.id;

			//TODO : check if this device `id` is already connected

			if(self.isReady) throw new Error(`device already connected`);

			self.id = id;
			self.device = device;
			self.device.addEventListener('gattserverdisconnected', (event) => {

				for(let widget in self.widgets){
				  if(Array.isArray(self.widgets[widget])){
				    self.widgets[widget].forEach(widget => {
				      widget.destroy();
				    })
				  } else {
				    self.widgets[widget].destroy();
				  }
				}

				const device = event.target;
				self.onDisconnectedChange( device.id );
				console.log(`Device ${device.id} is disconnected.`);
			});
			self.busy = true;

			//Configure ADS type
			self.name = device.name;
			const _name = device.name.split("-");

			if(_name[0] == "M01"){

				//ADS131E08 = https://www.ti.com/lit/ds/symlink/ads131e08.pdf Table 7
				const ADS131E08_Vref = 2.5;
				const ADS131E08_gain =  12;
				const ADS131E08scaleFactor = () => { return ((self.Vref / self.gain) / Math.pow(2, 23)) * 1000000; }

				self.Vref        = ADS131E08_Vref;
				self.gain        = ADS131E08_gain;
				self.scaleFactor = ADS131E08scaleFactor;

				self.dsp.adcinterval = 4; //ms

				console.log("Mentalista M01 Auto detected");

			} else if(_name[0] == "M02"){

				//ADS1299 = https://www.ti.com/lit/ds/symlink/ads1299.pdf Table 9
				const ADS1299_Vref = 4.5;
				const ADS1299_gain = 24;
				const ADS1299scaleFactor = () => { return ((self.Vref / self.gain) / (Math.pow(2, 23) - 1)) * 1000000; }

				self.Vref        = ADS1299_Vref;
				self.gain        = ADS1299_gain;
				self.scaleFactor = ADS1299scaleFactor;

				self.dsp.adcinterval = 3.846; //ms

				console.log("Mentalista M02 Auto detected");
			}

			//Configure Channels Count
			self.channels = parseInt(_name[1]);

			//Configure Channels Keys
			self.chanKeys = [...Array(self.channels).keys()];

			//TO IMPROVE  
			self.dsp.chanCount = self.channels;    
      		self.dsp.activeChan = self.dsp.isChannelFillAuto ? self.chanKeys : self.dsp.selectedChan;
      		self.dsp.init();

			return device.gatt.connect();

		}).then(async g => {

			//Get `eeg_measurement` Characteristic
			//self.setNotification(g, '12345678-1234-5678-1234-56789abcdef0', '12345678-1234-5678-1234-56789abcdef3', 'data');
			
			const eeg = {
				service: '12345678-1234-5678-1234-56789abcdef0',
				characteristic: {
					stream:   '12345678-1234-5678-1234-56789abcdef3',
					controls: '12345678-1234-5678-1234-56789abcdef2'
				}	
			};

			g.getPrimaryService(eeg.service).then(function(s) {
				s.getCharacteristic(eeg.characteristic.stream).then(function(c) {
					c.startNotifications().then(() => {
						c.addEventListener('characteristicvaluechanged', (e) => {
							self.handleNotifications(e, 'data');
						});
					});
				});

				s.getCharacteristic(eeg.characteristic.controls).then(function(c) {
					self.play = () => {
						const play = Uint8Array.of(1);
						c.writeValue(play);
						self.isStreaming = true;
					}
					self.pause = () => {
						const pause = Uint8Array.of(0);
						c.writeValue(pause);
						self.isStreaming = false;
					}
				});
			});

			//Get `battery_level` Characteristic
			const s = await g.getPrimaryService('battery_service')
			const c = await s.getCharacteristic('battery_level')

			//Populate async `this.battery()` function
			self.battery = async () => {
				const  value = await c.readValue();
				return value.getUint8(0)
			}
			
			return;

		}).then(function() {

			self.busy = false;
			self.isReady = true;

			self.onReadyStateChange();

			console.log(`Device ${self.id} is initialized !`);

		}).catch(function(error) {
			console.error(error);
		});
	}

	onDisconnectedChange(){}
  	onDisconnected(listener){
    	this.onDisconnectedChange = listener;
  	}

	disconnect(){
		this.device.gatt.disconnect();
	}

	onReadyStateChange(){}
	ready(listener){
		this.onReadyStateChange = listener;
	}

	onDataChange(){}
	onData(listener){
		this.onDataChange = listener;
	}

	/**
	 * @param  {Object} characteristic Characteristic used to send the string
	 * @param  {String} value          Value to send to ble device
	 */
	send(characteristic, value){
		
		const encoder = new TextEncoder('utf-8');
		const v = encoder.encode(value);
	
		characteristic.writeValue(v).then(function() {
			console.log("try to send : \""+value+"\" | encoded value : "+v);
		});
	}

	handleNotifications(event, characteristic){
		const value = this.handle[characteristic](event.target.value);
	}

	/**
	 * @param {Object} gatt           Gatt server object
	 * @param {String} service        Service name
	 * @param {String} characteristic Characteristic name
	 * @param {String} handler        Handler name
	 */
	setNotification(gatt, service, characteristic, handler){
		const self = this;
		gatt.getPrimaryService(service).then(function(s) {
			s.getCharacteristic(characteristic).then(function(c) {
				c.startNotifications().then(() => {
					c.addEventListener('characteristicvaluechanged', (e) => {
						self.handleNotifications(e, handler);
					});
				});
			});
		});
	}
}