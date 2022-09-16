
//TODO : Global Widgets controller
//TODO : import { Widgets } from "./modules/widgets/widgets.js";

import { Device } from "./device.js";
import { Synthetic } from "./synthetic.js";

export class Devices {
	constructor(){
		this.d = new Object();
	}

	new(type){

		let sensor;

		if(type == 'M0'){
			sensor = new Device();
		} else if(type == 'Synthetic'){
			sensor = new Synthetic();
		} else {
			console.error("Unkonw type : "+type);
			return;
		}

		sensor.ready(async () => {
			this.d[sensor.id] = sensor; //for multi-device
			
			//Dynamic import widgets
			const widgets = ['timeseries', /*'fft', 'spectrogram',*/ 'record'];
			for (const widget of widgets) {
				const m = await import(`./${widget}.js`);
				sensor.widgets[widget] = new m[widget.charAt(0).toUpperCase() + widget.slice(1)](sensor);
			}

			//TODO : if no widgetsâ€¦
			
			console.log(sensor, sensor.widgets);

			this.onReadyStateChange(sensor);

		});

		sensor.onData((samples) => {
			this.onDataChange( sensor, samples );
		});

		//Remove device from the devices (list) object
		sensor.onDisconnected(id => {
			delete this.d[id];
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

	update(){
		for(let id in this.d){
    		if(!this.d[id].dsp.isStarted) return;
    		this.d[id].dsp.process();
    		for(let widget in this.d[id].widgets){
      			this.d[id].widgets[widget].update(this.d[id].dsp);
    		}

			//TODO : Alpha detection
			//const _id = device[id].dsp.activeChan[0];
			//device[id].widgets.concentration.update(device[id].dsp.samples[_id].bands.alpha, device[id].dsp.samples[_id].timestamps.slice(-1));
			//if( device[id].dsp.samples[_id].bands.alpha > 10 ){
			//  console.log("concentrated !!!");
			//} 
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

	areStreaming(){
		let areStreaming = false;
		for(let id in this.d){
			areStreaming = this.d[id].isStreaming;
		}
		return areStreaming;
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

	//toggle(){
	//	for(let id in this.d){
	//		this.d[id].toggle();
	//	}
	//}

	destroy(){

	}
}