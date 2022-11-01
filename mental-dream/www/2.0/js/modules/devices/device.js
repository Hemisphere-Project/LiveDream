/* ----------------------------------------------------------------------------------------------------
 * Mentalista M0X Web Bluetooth Device Management, 2021
 * Created: 18/08/21 by Bastien DIDIER, Mentalista
 * 
 * device.js allows a simplified connection with the mentalista dev kits (M0X serie)
 *
 * TODO
 * - Move handlers in a module
 * 
 * Update: 09/07/22 Current V.1.4
 * ----------------------------------------------------------------------------------------------------
 */

import { DSP }      from "./dsp.js";
import { filters }  from "./modules/filters.js";
import * as convert from "./modules/bits-interpreter.js";
//import { handlers }  from "./modules/handlers.js";

export class Device {

	/**
	 * @return {Device}
	 */
	constructor(){ // Add options {filter:null or M03/M02/M01 ect.}
		
		const self = this;

		/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ GLOBAL VARIABLE â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

		// Device attributes
		this.id;                  // Device ID
		this.name;                // Device name
		this.device;              // Device object
		this.index;               // Device index (unused for the moment)

		// Device states
		this.busy        = false; // Boolean defining if a bluetooth action is in progress
		this.isReady     = false; // Boolean defining if the device is ready
		this.isStreaming = false; // Boolean defining if the device is streaming (duplicate with the ble cmd `this.isDeviceStreaming()`)

		// Widgets
		this.widgets = new Object();

		/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ DATA HANDLER â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

		// Various function to handle the data processing
		this.handle = {
			data: (value) => {

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

				for (let p = 0; p < this.frame; p++) {
					for (let c = 0; c < this.channels; c++) {

						//check if it's usefull
						if(typeof sample.data[c] == undefined) sample.data[c] = new Array();

						//if(this.chanArray[c] == 1){

							const rawVal = convert.from24bitToInt32(value.buffer.slice(idx, idx+3));
							const uV = this.scaleFactor() * rawVal;

							sample.data[c].push( uV );

							idx += 3;

						//} else {
						//	sample.data[c].push(0);
						//}
					}
				}

				//Monitor frame rate
				this.sampleIndex++;

				this.dsp.populate(sample, this.scaleFactor);

				//console.log(sample);
				
				return self.onDataChange( sample );
			},
			timestamp: (value) => {

				console.log( value );

				// In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
				value = value.buffer ? value : new DataView(value);

				const adcCount = 2;

				let chan = adcCount == 2 ? this.channels / 2 : this.channels;

				let sample = new Object();
					sample.timestamp = Date.now();
					sample.data = new Object();
					for (let i = 0; i < chan * adcCount; i++) {
					  sample.data[i.toString()] = new Array()
					};

				const tempTimestamp = new Array();

				let idx = 0; //Buffer index

				// Add a count in the data
				//const label = this.interpret16bitAsInt32(value.buffer.slice(idx, idx+2));
				//idx += 2;

				
				let timestamp = 0;

				for (let a = 0; a < adcCount; a++) {

					//console.log(adcCount, this.frame, chan);

					for (let p = 0; p < this.frame; p++) {
						
						//Get timestamp
						if(this.hasTimestamp){

							timestamp = convert.from64bitToInt32(value.buffer.slice(idx, idx+8));

							console.log(timestamp);
							
							idx+=8;

						}

						for (let c = 0; c < chan; c++) {

							//check if it's usefull
							if(typeof sample.data[c] == undefined) sample.data[c] = new Array();

							const rawVal = convert.from24bitToInt32(value.buffer.slice(idx, idx+3));
							
							const uV = this.scaleFactor() * rawVal;

							const s = a == 1 ? 8 : 0;
							sample.data[c+s].push( uV );
							idx += 3;

							//console.log(s+c);
						}
					}
				}

				//console.log(timestamp, sample.timestamp, timestamp - sample.timestamp);

				//Monitor frame rate
				this.sampleIndex++;

				//console.log(sample);

				this.dsp.populate(sample, this.scaleFactor);

				return self.onDataChange( sample );
			},
			log: (value) => {

				// In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
				value = value.buffer ? value : new DataView(value);

				console.log( this.interpret24bitAsInt32( value.buffer.slice(0,3) ) );
				
				this.sampleIndex++;
				return;
			},
			battery: (value) => {
				return value.getUint8(0);
			}
		}

		/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ SAMPLE INDEX â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

		this.sampleIndex = 0;
		this.eventCount = () => {
			//if(this.isStreaming){ console.warn(this.name+" : "+this.sampleIndex+" ("+this.sampleIndex*this.frame+"Hz)"); }
			this.sampleIndex = 0;
		};
	
		/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ DEVICE CONNECTION â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

		// Final step, connect the device 
		this.connect();
	}

	connect(){

		const self = this;
		navigator.bluetooth.requestDevice(filters).then(device => {

			//TODO : check if this device `id` is already connected

			if(self.isReady) throw new Error(`device already connected`);

			self.busy   = true;
			self.device = device;
			self.id     = device.id;
			self.name   = device.name;
			
			self.device.addEventListener('gattserverdisconnected', event => {

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

			return device.gatt.connect();

		}).then(async gatt => {

			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
				   DEVICE INFO
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

			// SERVICE
			const info                  = await gatt.getPrimaryService('device_information');

			// CHARACTERISTIC
			const manufacturerName      = await info.getCharacteristic('manufacturer_name_string');
			const modelNumber           = await info.getCharacteristic('model_number_string');
			const firmwareRevision      = await info.getCharacteristic('firmware_revision_string');
			const softwareRevision      = await info.getCharacteristic('software_revision_string');
			
			// CONSTANT
			let decoder                 = new TextDecoder('utf-8');
			self.device.manufacturer    = decoder.decode( await manufacturerName.readValue() );
			self.device.model           = decoder.decode( await modelNumber.readValue()      );
			self.device.firmware        = decoder.decode( await firmwareRevision.readValue() );
			self.device.software        = decoder.decode( await softwareRevision.readValue() );
			
			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
					BATTERY
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

			// SERVICE
			const battery               = await gatt.getPrimaryService('battery_service');

			// CHARACTERISTIC
			const batteryLevel          = await battery.getCharacteristic('battery_level');
			
			// FUNCTION
			self.battery                = async () => { return (await batteryLevel.readValue()).getUint8(0) }

			// NOTIFICATION
			//self.startNotification(batteryLevel, 'battery');

			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
					  ADC
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */
			
			/* TODO :
			 * - Simplify readChannels ?
			 * - Change isDeviceStreaming name ?
			 *
			 * - DebugRegistre (read)
			 * - Config        (read, write)
			 * 
			 */
			
			// SERVICE
			const adc                   = await gatt.getPrimaryService('12345678-1234-5678-1234-56789abcdef0');

			// CHARACTERISTIC
			const stream                = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef1'); // Notify //OLD : '12345678-1234-5678-1234-56789abcdef3'
			const controls              = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef2'); // Read, Write (1 octet)
			const timestamp             = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef3'); // Read, Write (8 octets)
			const timestampEnable       = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef4'); // Read, Write (1 octet)
			const channelEnable         = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef5'); // Read, Write (M03 = 1 octet / M02 = 16 octets)
			const samples               = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef6'); // Read, Write (1 octet [avec timestamp 1 > 3 / sans timestamp 1 > 5])
			const ksps                  = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef7'); // Read, Write (4 octets) (M03 = 250, 500, 1000, 2000, 4000, 8000 / M02 = 250, 500, 1000, 2000, 4000, 8000, 16000)
			const gain                  = await adc.getCharacteristic('12345678-1234-5678-1234-56789abcdef8'); // Read, Write (1 octets) (M03 = 1, 2, 4, 6, 8, 12 / M02 = 1, 2, 4, 6, 8, 12, 24)

			// FUNCTIONS
			self.isDeviceStreaming      = async ()           => { return (await controls.readValue()).getUint8(0); } // TODO change name ?
			self.play                   =       ()           => { controls.writeValue( Uint8Array.of(1) ); self.isStreaming = true;  }
			self.pause                  =       ()           => { controls.writeValue( Uint8Array.of(0) ); self.isStreaming = false; }
			
			self.readTimestamp          = async ()           => { return Number( (await timestamp.readValue()).getBigUint64(0, true) ); }
			self.writeTimestamp         = async (_timestamp) => { await timestamp.writeValue( Uint8Array.from( convert.longToByteArray(_timestamp) ) ); }

			self.isTimestampEnable      = async ()           => { return (await timestampEnable.readValue()).getUint8(0) == 1 ? true : false; }
			self.enableTimestamp        =       ()           => { timestampEnable.writeValue( Uint8Array.of(1) ); self.hasTimestamp = true;  }
			self.disableTimestamp       =       ()           => { timestampEnable.writeValue( Uint8Array.of(0) ); self.hasTimestamp = false; }

			self.readChannels           = async ()           => { const view = await channelEnable.readValue(); const c = new Array(); for(let i = 0; i < view.byteLength; i++){ c[i] = view.getUint8(i); } return c; } // TODO Simplify
			self.writeChannels          =       (_array)     => { channelEnable.writeValue( new Uint8Array( _array ) ); }
			self.activateChannel        =       (_chan)      => { console.log( self.chanArray ); self.chanArray[_chan] = 1; channelEnable.writeValue( new Uint8Array(self.chanArray) ); }
			self.deactivateChannel      =       (_chan)      => { console.log( self.chanArray ); self.chanArray[_chan] = 0; channelEnable.writeValue( new Uint8Array(self.chanArray) ); }
			
			self.readSampleCount        = async ()           => { return (await samples.readValue()).getUint8(0); }
			self.writeSamplesCount      = async (_count)     => { await samples.writeValue( Uint8Array.of(_count) ); self.frame = _count; }

			self.readSampleRate         = async ()           => { return (await ksps.readValue()).getUint32(0, true); }
			self.writeSampleRate        = async (_hz)        => { await ksps.writeValue( Uint8Array.from( convert.intToByteArray(_hz) ) ); self.sampleRate = _hz; }

			self.readGain               = async ()           => { return (await gain.readValue()).getUint8(0); }
			self.writeGain              = async (_gain)      => { await gain.writeValue( Uint8Array.of(_gain) ); self.gain = _gain; }

			self.frame                  = await self.readSampleCount();
			self.hasTimestamp           = (await timestampEnable.readValue()).getUint8(0) == 1 ? true : false;
			self.chanArray              = await self.readChannels();
			self.channels               = self.chanArray.length;
			self.chanKeys               = [...Array(self.channels).keys()];
			self.sampleRate             = await self.readSampleRate();
			self.gain                   = await self.readGain();

			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
				  ACCELEROMETER
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

			// SERVICE
			//const accelerometer = await gatt.getPrimaryService('???');
			
			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
				 CONFIG ADC & DSP
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

			// Define DSP sample rate
			const dspSampleRate = Math.isPowerOfTwo(self.sampleRate) ? self.sampleRate : Math.nearestPowerOfTwo(self.sampleRate);
			
			// Create DSP object
			self.dsp = new DSP(dspSampleRate);
			
			// Config ScaleFactor depend on the ADC	

			if(self.device.model == "M01") {

				//ADS131E08 = https://www.ti.com/lit/ds/symlink/ads131e08.pdf Table 7
				const ADS131E08_Vref   = 2.5;
				const ADS131E08scaleFactor = () => { return ((self.Vref / self.gain) / Math.pow(2, 23)) * 1000000; }

				self.Vref        = ADS131E08_Vref;
				self.scaleFactor = ADS131E08scaleFactor;

				self.dsp.adcinterval = 4; //ms

				//console.log("Mentalista M01 Auto detected");

			} else if(self.device.model == "M02") {

				//ADS1299 = https://www.ti.com/lit/ds/symlink/ads1299.pdf Table 9
				const ADS1299_Vref   = 4.5;
				const ADS1299scaleFactor = () => { return ((self.Vref / self.gain) / (Math.pow(2, 23) - 1)) * 1000000; }

				self.Vref        = ADS1299_Vref;
				self.scaleFactor = ADS1299scaleFactor;

				self.dsp.adcinterval = 3.846; //ms

				//console.log("Mentalista M02 Auto detected");
			
			} else if(self.device.model == "M03"){

				self.gain = self.gain * 2; // x2 due to OPA

				//ADS1291 = https://www.ti.com/lit/ds/symlink/ads1291.pdf Table 9
				const ADS1291_Vref   = 2.42;
				const ADS1291scaleFactor = () => { return ((self.Vref / self.gain) / (Math.pow(2, 23) - 1)) * 1000000; }

				self.Vref        = ADS1291_Vref;
				self.scaleFactor = ADS1291scaleFactor;

				self.dsp.adcinterval = 4; //ms

				//console.log("Mentalista M03 Auto detected");
			}
				
			//DSP
			self.dsp.chanCount  = self.channels;    
			self.dsp.activeChan = self.dsp.isChannelFillAuto ? self.chanKeys : self.dsp.selectedChan;
			self.dsp.init();

			/* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
				 NOTIFICATIONS
			â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */
			
			self.startNotification(stream,       'data');

			return;

		}).then(function() {

			self.busy = false;
			self.isReady = true;

			self.onReadyStateChange();

			// Log
			console.log(`Device ${self.id} is initialized !`);
			console.table({
				name:          self.name,
				id:            self.id,
				frame:         self.frame,
				channels:      self.channels,
				sampleRate:    self.sampleRate,
				dspSampleRate: self.dsp.sampleRate,
				gain:          self.gain,
				hasTimestamp:  self.hasTimestamp,
				manufacturer:  self.device.manufacturer,
				model:         self.device.model,
				firmware:      self.device.firmware,
				software:      self.device.software
			});

		}).catch(function(error) {
			console.error(error);
		});
	}

	/**
	 * Triggered when the device is ready to stream data
	 * @return {[type]} [description]
	 */
	onReadyStateChange(){}
	ready(listener){
		this.onReadyStateChange = listener;
	}

	onDataChange(){}
	onData(listener){
		this.onDataChange = listener;
	}

	onDisconnectedChange(){}
  	onDisconnected(listener){
    	this.onDisconnectedChange = listener;
  	}

	disconnect(){
		this.device.gatt.disconnect();
	}

	/**
	 * Start BLE notification
	 * 
	 * @param {Bluetooth characteristic} characteristic 
	 * @param {String}                   handler        Handler name
	 */
	startNotification(characteristic, handler){
		const self = this;
		characteristic.startNotifications().then(_ => {
			characteristic.addEventListener('characteristicvaluechanged', (event) => {
				self.handle[handler](event.target.value)
			});
		});
	}

	/**
	 * Stop BLE notification
	 * 
	 * @param {bluetooth characteristic} characteristic
	 */
	stopNotification(characteristic){
		const self = this;
		characteristic.stopNotifications().then(_ => {
			characteristic.removeEventListener('characteristicvaluechanged', (event) => {
				self.handle[handler](event.target.value)
			});
    	});
	}
}
