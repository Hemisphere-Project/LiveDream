/* ----------------------------------------------------------------------------------------------------
 * Mentalista Devices Management, 2022
 * Created: 31/04/22 by Bastien DIDIER, Mentalista
 * 
 * devices.js allows to handle a series of devices to manage their actions
 * 
 * Update: 06/22/22 Current V.1.0
 * ----------------------------------------------------------------------------------------------------
 */

//TODO : Global Widgets controller
//TODO : import { Widgets } from "./modules/widgets/widgets.js";
import { Device }      from "./device.js";
import { Synthetic }   from "./synthetic.js";
import { autoConnect } from "./modules/autoConnect.js";

export class Devices {
	constructor(options){
		this.d = new Object();

		this.widgets = options.widgets || new Array();

		const self = this;
		window.onresize = function(){
			const w = window.innerWidth;
			const h = window.innerHeight;
			self.onresize(w,h);
		}
	}

	new(type){

		let sensor;

		if(type == 'M0'){
			sensor = new Device();
			this.eventHandler(sensor);
		} else if(type == 'Synthetic'){
			sensor = new Synthetic();
			this.eventHandler(sensor);
		} else if(type == 'Auto'){
			autoConnect().then(devices => {
				devices.forEach(device => {
					//sensor = new Device();
					console.log(device);
				});
			});
		} else {
			console.error("Unkonw type : "+type);
			return;
		}
	}
	
	eventHandler(sensor){
		sensor.ready(async () => 
		{
			// destroy already existing device
			if(this.d[sensor.id]) {
				// this.d[sensor.id].disconnect();
				if (document.getElementById(sensor.id)) document.getElementById(sensor.id).remove()
				delete this.d[sensor.id];
			}

			this.d[sensor.id] = sensor; //for multi-device

			//Dynamic import widgets
			//const widgets = ['timeseries', 'fft', 'alpha'/*, 'record', 'compare', 'memorization', 'powerbands'*/]; // Todo move this to the main script
			for (const widget of this.widgets) {
				const m = await import(`../widgets/${widget}.js`);
				sensor.widgets[widget] = new m[widget.charAt(0).toUpperCase() + widget.slice(1)](sensor);
			}

			//TODO : if no widgetsâ€¦
			
			this.onReadyStateChange(sensor);

		});

		sensor.onData((samples) => {
			this.onDataChange( sensor, samples );
		});

		//Remove device from the devices (list) object
		sensor.onDisconnected(id => {
			// delete this.d[id];
			this.onDisconnectedChange( id );
		});
	}

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

	add(){

	}
	
	all(){

	}

	first(){
		return this.d[Object.keys(this.d)[0]];
	}

	last(){
		return this.d[Object.keys(this.d)[Object.keys(this.d).length - 1]];
	}

	select(id){
		//if(Number.isInteger(id)){
		//	console.log("number");
			return this.d[id];
		//} else if(typeof id === "string"){
		//	console.log("string");
		//}
	}

	update(){
		for(let id in this.d){
    		if(!this.d[id].dsp.isStarted) return;
    		this.d[id].dsp.process();
    		for(let widget in this.d[id].widgets){
      			this.d[id].widgets[widget].update(this.d[id].dsp);
    		}
		}
	}

	stop(){
		for(let id in this.d){
			this.d[id].stop();
		}
	}

	start(){
		for(let id in this.d){
			this.d[id].start();
		}
	}

	//TODO
	areStreaming(){
		let areStreaming = false;
		for(let id in this.d){
			areStreaming = this.d[id].isStreaming;
		}
		return areStreaming;
	}

	//toggle(){
	//	for(let id in this.d){
	//		this.d[id].toggle();
	//	}
	//}

	destroy(){

	}

	onresize(w,h){
		for(let id in this.d){
			for(let widget in this.d[id].widgets){
      			if (typeof this.d[id].widgets[widget].resize === "function") {
      				this.d[id].widgets[widget].resize(w,h);
      			}
    		}
		}
	}
}
