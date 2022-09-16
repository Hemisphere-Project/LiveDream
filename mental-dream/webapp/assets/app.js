/* ----------------------------------------------------------------------------------------------------
 * Mental One, 2022
 * Created: 06/03/22 by Gille de Bast
 *
 * Update: 08/03/22 Current V.0.1
 * ----------------------------------------------------------------------------------------------------
 */

//Import modules & libraries
import { Devices }      from "/assets/devices.js";
import { UserRoutine }  from "/assets/userRoutine.js";

//Setup modules & libraries
let devices = new Devices();
let ui      = new UserRoutine();

const sendingRate = 1; // 1 ws send by second
let rate    = new UserRoutine(sendingRate);

//HTML element container
const el = {
	controls: document.getElementById('controls'),
};

//HTML button container
const btn = {
	connect:   () => { return document.getElementById('connect') },
	synthetic: () => { return document.getElementById('synthetic') },
	play:      () => { return document.getElementById('play') }
};

//App status
const status = {
	selected: false,
	ready:    false,
	play:     false,
	started:  false
};

/* ––––––––––––––––––––
	   WS CLIENT
–––––––––––––––––––– */

let ws = null

////Create websocket connection
function wsConnect() {

	ws = new WebSocket("ws://localhost:8080");

	//Triggered on websocket open connection
	ws.addEventListener("open", () =>{
		console.log("We are connected to the server");
		document.querySelector('.status').classList.remove('disconnected')
		document.querySelector('.status').classList.add('connected')
		document.querySelector('.status').innerHTML = 'connected'
	});

	ws.addEventListener("close", () =>{
		console.warn("Server disconnected !");
		document.querySelector('.status').classList.add('disconnected')
		document.querySelector('.status').classList.remove('connected')
		document.querySelector('.status').innerHTML = 'disconnected'
		setTimeout(function() { wsConnect(); }, 1000);
	});
	
	//Triggered on a new message send by the server
	ws.addEventListener('message', function (event) {
		console.warn(event.data);
	});

	return ws

}
wsConnect()

/* ––––––––––––––––––––
	   FAKE EVENT (MIDI/OSC LEARN)
–––––––––––––––––––– */

function fakeEvent(midiNote, oscPath) 
{
	if(ws.readyState == 1)
	{
		let data = {
			'type': 'test',
			'note': midiNote,
			'osc': oscPath
		}
		ws.send(JSON.stringify( data ));
	}
}
window.fakeEvent = fakeEvent;



/* ––––––––––––––––––––
  CONNECT NEW DEVICE
–––––––––––––––––––– */

//Is triggered when the user has clicked the `Bluetooth` button
function connect(){

	//Return if the user has already connected a device
	if(status.selected) return;

	//Create new `M0X` device
	devices.new('M0');
	status.selected = true;
}
window.connect = connect;

//Is triggered when the user has clicked the `Synthetic` button
function synthetic(){
	
	//Return if the user has already connected a device
	if(status.selected) return;

	//Create new `Synthetic` device
	devices.new('Synthetic');
	status.selected = true;
}
window.synthetic = synthetic;

/* ––––––––––––––––––––
	 STREAM DATA
–––––––––––––––––––– */

//Is triggered when a new device is ready to stream data
devices.ready(sensor => {

	//Remove the connection btn
	btn.connect().remove();
	btn.synthetic().remove();

	//Update app `ready` status
	status.ready = true;

	//Display the streaming controls
	el.controls.classList.toggle('connect');
	el.controls.classList.toggle('stream');
	el.controls.insertAdjacentHTML( 'afterbegin', '<div id="play" class="btn"><span class="play icon"></span></div>' );

	//Is triggered when the user has clicked the `Play/Pause` button
	btn.play().addEventListener('click', (e) => {
		
		//Toggle class Play/Pause
		btn.play().querySelector('.icon').classList.toggle('play');
		btn.play().querySelector('.icon').classList.toggle('pause');

		//Play/Pause the device streaming
		status.play ? sensor.pause() : sensor.play();

		//Update app `play` status
		status.play = !status.play;

		//Update app `started` status
		status.started = true;

	});

	//Is triggered when the user has hit the space bar
	document.addEventListener('keyup', event => {
		//console.log(event.code);
		if (event.code === 'Space') {

			//Trigger action only if the application is started
			if(!status.ready) return;

			//Update app `started` status
			status.started = true;

			//Toggle the Play/Pause button
			btn.play().querySelector('.icon').classList.toggle('play');
			btn.play().querySelector('.icon').classList.toggle('pause');

			//Play/Pause the device streaming
			status.play ? sensor.pause() : sensor.play();

			//Update app `play` status
			status.play = !status.play;

		} else if(event.code === 'KeyR' && status.final == false){

			//Helper to reset the canvas progress

			if(status.play){

				//Pause the device streaming
				sensor.pause();

				//Reset app status
				status.play  = false;

				//Toggle the Play/Pause button
				btn.play().querySelector('.icon').classList.toggle('play');
				btn.play().querySelector('.icon').classList.toggle('pause');
			}
			
			//Update app `started` status
			status.started = false;
			
			//Erase the data in the sensor buffer
			sensor.dsp.init();

			//Reset recorded data
			sensor.widgets.record.reset();
		
		//Triggered when the user hit 'a' key
		} else if(event.code === 'KeyQ'){

			//Toggle the timeseries autoscale mode
			sensor.widgets.timeseries.auto();

		//Triggered when the user hit 's' key
		} else if(event.code === 'KeyS'){

			//Stop auto mode
			sensor.widgets.timeseries.auto(false);

			//Change the timeseries scale amplitude
			sensor.widgets.timeseries.scale();
		}
	});

	//Get battery level
	updateBattery(sensor);

	//Start the user routine
	ui.start();
	rate.start();
});

//Is triggered when a device has sended a new sample
devices.onData((sensor, samples) => {
	//If data is streaming
	if(sensor.isStreaming){

		//Record eeg sample when the device is streaming
		sensor.widgets.record.onData(samples);

		//Send json stringify eeg samples
		//ws.send(JSON.stringify(samples));
	}
});

//Is triggered when a device is disconnected
devices.onDisconnected(id => {
	
	//Reset app status
	status.ready    = false;
	status.play     = false;
	status.selected = false;
	status.started  = false;

	//Remove the stream btn
	btn.play().remove();
	document.getElementById('timeseries').remove();

	//Display the connect controls
	el.controls.classList.toggle('stream');
	el.controls.classList.toggle('connect');
	el.controls.insertAdjacentHTML( 'beforeend', '<div id="connect" class="btn" onclick="connect()"><span class="fa-brands fa-bluetooth-b icon"></span></div>' );
	el.controls.insertAdjacentHTML( 'beforeend', '<div id="synthetic" class="btn" onclick="synthetic()"><span class="fa-solid fa-database icon"></span></div>' );

});

//Is triggered when the user routine is fired
ui.update(() => {
	//Update the devices widgets
	devices.update();
});

rate.update(() => {

	//Triggered if **the last** devices is streaming data
	if( devices.areStreaming() ){

		//Select the active DSP
		const dsp        = devices.first().dsp;
		const sampleRate = dsp.sampleRate;
		const selected   = dsp.selectedChan[0];
		const samples    = dsp.samples[selected]

		var data = {
			// 'raw': 			samples.raw.slice(-sampleRate),
			'filtered': samples.filtered.slice(-sampleRate),
			'fft': 			samples.fft.slice(-sampleRate),
			'bands': 		samples.bands

		}
		
		//Send websocket if the server is connected
		if(ws.readyState == 1)
		{
			//Send over websocket the sampleRate
			ws.send(JSON.stringify( data ));
		}
	}
});

function updateBattery(sensor){
	sensor.battery().then(level => {

		console.warn(`Battery Level is ${level}%`);

		//Update battery UI accordingly to the pourcentage
		if(level <= 10){
			document.querySelectorAll("#timeseries .battery").forEach(el => el.classList.replace("full", "low"));
		} else if (level <= 20){
			document.querySelectorAll("#timeseries .battery").forEach(el => el.classList.replace("full", "medium"));
		}
	});
}

/* ––––––––––––––––––––
	     LOGS
–––––––––––––––––––– */

console.log(`Welcome to Mental One!

Controls:
- 'space' : Play/Pause the sensor stream
- 'a' : Toggle timeseries autoscale mode
- 's' : Change the timeseries amplitude

Made with ❤️ by @gilledebast for @mentalistaHQ`);

