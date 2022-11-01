/* ----------------------------------------------------------------------------------------------------
 * Hyper Widget, 2022
 * Created: 10/04/22 by Gille de Bast
 *
 * Update: 10/04/22 Current V.0.0
 * ----------------------------------------------------------------------------------------------------
 */

//Import modules & libraries
import { UserRoutine } from "./modules/helpers/userRoutine.js";
import { Devices }     from "./modules/devices/devices.js";

////Setup modules & libraries
let devices = new Devices({
	widgets: ['fft']
});
let uiRoutine      = new UserRoutine(30);

//HTML element container
const el = {
	hyperHolder: document.getElementById('device-hyper-widget-holder'),
};

//HTML button container
const btn = {
	add:           () => { return document.getElementById('add-device') }
};

/* ––––––––––––––––––––
	   WS CLIENT
–––––––––––––––––––– */

let sendRoutine = new UserRoutine(30); 

wsConnect( sendRoutine, uiRoutine )
// //Create websocket connection
// let ws = new WebSocket("ws://localhost:8080");

// //Triggered on websocket open connection
// ws.addEventListener("open", () =>{
//   console.log("We are connected to the server");
// });
 
// //Triggered on a new message send by the server
// ws.addEventListener('message', function (event) {
// 	console.warn(event.data);
// });

/* ––––––––––––––––––––
  CONNECT NEW DEVICE
–––––––––––––––––––– */
 
//Is triggered when the user has clicked the `Bluetooth` button
function connect(){

	//Create new `M0X` device
	devices.new('M0');
	//status.selected = true;
}
window.connect = connect;

/* ––––––––––––––––––––
	 STREAM DATA
–––––––––––––––––––– */

//Is triggered when a new device is ready to stream data
devices.ready(sensor => {

	el.hyperHolder.insertAdjacentHTML( 'afterbegin', 
		`<div class="hyper-widget" id="${sensor.id}">
			<div class="head">
				<div class="status"></div>
				<p class="name">{{name}}</p>
			</div>
			<div class="data"></div>
			<div class="footer">
				<div class="uv"><p><span class="val">{{0}}</span> uV</p></div>
				<div class="freq"><p><span  class="val">{{0}}</span> Hz</p></div>
			</div>
		</div>`
	);

	sensor.play();

	const container = document.getElementById(sensor.id);
	const name      = container.querySelector(".name");
	//const uv      = container.querySelector(".uv .val");
	//const freq    = container.querySelector(".freq .val");

	name.textContent = sensor.name;

	//Init the widget after device ready
	for(let widget in sensor.widgets){ sensor.widgets[widget].init(); }

	//Start the user sendRoutine
	uiRoutine.start();
	sendRoutine.start();
});

////Is triggered when a device has sended a new sample
devices.onData((sensor, samples) => {
	//If data is streaming
	if(sensor.isStreaming){
		
		const container = document.getElementById(sensor.id);
		const uv        = container.querySelector(".uv .val");

		if(!sensor.dsp.samples[0].isRailed){
			uv.textContent = sensor.dsp.samples[0].std.toFixed(2);
			uv.style.color = 'black';
		} else {
			uv.textContent = 'Railed';
			uv.style.color = 'red';
		}
	}
});

setInterval(() => {

	if( Object.keys(devices.d).length === 0 ) return;

	for(let id in devices.d){
		
		const sensor        = devices.d[id];
		const container     = document.getElementById(sensor.id);
		const freq          = container.querySelector(".freq .val");
		const hz            = sensor.sampleIndex * sensor.frame;

		freq.textContent    = hz;

		const freqContainer = container.querySelector(".freq");

		const status = hz > 245 ? '#28F728' : hz > 240 ? '#FF9929' : '#E42320';
		freqContainer.style.backgroundColor = status;

		sensor.eventCount();

		// Update batterie

		const battery = container.querySelector('.status');

		sensor.battery().then(level => {
			//console.warn(`battery level: ${level}%`);
			const bat = level > 20 ? '#28F728' : level > 10 ? '#FF9929' : '#E42320';
			battery.style.backgroundColor = bat;
		});
	}

}, 1000);


//Is triggered when a device is disconnected
devices.onDisconnected(id => {
	
	//Remove Hyper Widget container
	const container = document.getElementById(id);
		  container.remove();

});

//Is triggered when the user sendRoutine is fired
uiRoutine.update(() => {
	//Update the devices widgets
	devices.update();
});

sendRoutine.update(() => 
{
	//Triggered if **the last** devices is streaming data
	if( devices.areStreaming() ){

		const output = new Object();

		for(let id in devices.d){		
			if(!devices.d[id].dsp.isStarted) continue;

			
			//Select the active DSP
			const name       = devices.d[id].name;
			const dsp        = devices.d[id].dsp;
			const sampleRate = dsp.sampleRate;
			const samples    = dsp.samples[0];
			
			output[name] = {}
			// output[name]['raw'] = samples.filtered.slice(-sampleRate/sendRoutine.fps);
			output[name]['bands'] = samples.bands;

		}

		//Send websocket if the server is connected
		if(ws.readyState == 1){
			//Send over websocket the sampleRate
			// console.log(output)
			ws.send(JSON.stringify( {'type': 'eeg', 'data':output} ));
		}
	}

	//PING
	if(ws.readyState == 1){
		ws.send(JSON.stringify( {'type': 'push'} ));
	}
});
