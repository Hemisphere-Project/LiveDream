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
			<div class="close">
				<button data-id="${sensor.id}" class="close-button">x</button>
			</div>
		</div>`
	);

	
	
	sensor.writeGain(1);
	sensor.play();
	
	const container = document.getElementById(sensor.id);
	const name      = container.querySelector(".name");
	//const uv      = container.querySelector(".uv .val");
	//const freq    = container.querySelector(".freq .val");

	// .close-button click event
	const close = container.querySelector('.close-button');
	close.addEventListener('click', function() {
		devices.d[sensor.id].shuttingDown = true;
		devices.d[sensor.id].disconnect();
		delete devices.d[sensor.id];
		container.remove();
	});
	
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
		if (!container) {
			console.warn("WARNING: data received but widget not found", sensor)
			return
		}
		const uv        = container.querySelector(".uv .val");

		if(!sensor.dsp.samples[0].isRailed){
			uv.textContent = sensor.dsp.samples[0].std.toFixed(2);
			uv.style.color = 'black';
		} else {
			uv.textContent = 'Railed';
			uv.style.color = 'red';
		}	
	}

	sensor.lastDataStamp = Date.now();

});

setInterval(() => {

	if( Object.keys(devices.d).length === 0 ) return;

	for(let id in devices.d){
		
		const sensor        = devices.d[id];
		const container     = document.getElementById(sensor.id);
		if (!container) {
			console.warn("WARNING: sensor in array but widget not found", sensor)
			continue
		}

		const freq          = container.querySelector(".freq .val");
		const hz            = sensor.sampleIndex * sensor.frame;

		freq.textContent    = hz;

		const freqContainer = container.querySelector(".freq");

		const status = hz >= 135 ? '#3fdf3f' : hz >= 90 ? '#FF9929' : '#E42320';
		freqContainer.style.backgroundColor = status;

		container.querySelector('.name').style.backgroundColor = sensor.connected ? '#3fdf3f' : '#E42320';

		// sensor is connected
		if (sensor.connected) 
		{
				sensor.eventCount();

				// Update batterie
				const battery = container.querySelector('.status');

				sensor.battery().then(level => {
					//console.warn(`battery level: ${level}%`);
					const bat = level > 20 ? '#3fdf3f' : level > 10 ? '#FF9929' : '#E42320';
					battery.style.backgroundColor = bat;
				})
				.catch(function(e) {
					console.warn(`Device ${self.id} battery quering error.. device is probably disconnected.`);
				});

				// hide .close
				container.querySelector('.close').style.display = 'none';
		}

		// sensor is not connected -> try reconnect
		else if (!sensor.shuttingDown) 
		{
			sensor.reconnect( devices.d[id].device );
			console.warn(`Device ${sensor.id} is not connected.. trying to reconnect.`);
			
			// // log last seen distance
			// let missingtime = Date.now() - sensor.lastseen;
			// // console.warn(`Device ${sensor.id} last seen ${missingtime}ms ago.`);
			// if (missingtime > 10000) {
			// 	container.querySelector('.close').style.display = 'block';
			// }
		}

	}

}, 1000);



//Is triggered when a device is disconnected
devices.onDisconnected(id => {
	
	//Remove Hyper Widget container
	// const container = document.getElementById(id);
	// 	  container.remove();
	console.warn('Device disconnected', id);
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
