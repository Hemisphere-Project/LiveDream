


/* ––––––––––––––––––––
	   WS CLIENT
–––––––––––––––––––– */

let ws = null

////Create websocket connection
function wsConnect( wsRoutine, uiRoutine ) {

	ws = new WebSocket("wss://"+window.location.host.split(':')[0]+":3000");

	//Triggered on websocket open connection
	ws.addEventListener("open", () =>{
		console.log("We are connected to the server");
		// declare as interface
		ws.send(JSON.stringify( {'type': 'interface'} ));

		var status = document.getElementById('localStatus')
		status.classList.remove('disconnected')
		status.classList.add('connected')
		status.innerHTML = 'connected'
	});

	// Triggered server CLOSE
	ws.addEventListener("close", () =>
	{
		console.warn("Server disconnected !");
		var status = document.getElementsByClassName("cliStatus")
		for(var el of status) {
			el.classList.add('disconnected')
			el.classList.remove('connected')
			el.innerHTML = 'disconnected'
		}
		setTimeout(function() { wsConnect( wsRoutine, uiRoutine); }, 1000);
	});

	//Triggered on a new message send by the server
	ws.addEventListener('message', function (event) {
		// console.log(event.data);

		let data = JSON.parse(event.data)

		// Local IP
		if ('type' in data && data['type'] == 'localIP')
		{
			document.getElementById('localIP').innerHTML = data['ip']
		}
		
		// CONF received
		if ('type' in data && data['type'] == 'conf') 
		{
			console.log(data)
			if('remoteIP' in data) {
				document.getElementById('remoteIP').value = data['remoteIP']
				document.getElementById('remoteIP2').value = data['remoteIP']
				if (data['remoteIP'] == '')
					document.getElementById('rpiStatus').style.display = 'none'
				else
					document.getElementById('rpiStatus').style.display = 'block'
			}
			if('dataFPS' in data) {
				document.getElementById('dataFPS').value = data['dataFPS']

				// Start APP animation
				wsRoutine.setFPS(parseInt(data['dataFPS']))
				uiRoutine.setFPS(parseInt(data['dataFPS']))

			}
			if ('enableOSC' in data) {
					document.getElementById('enableOSC').checked = data['enableOSC']
			}
			if ('enableMIDI' in data) {
					document.getElementById('enableMIDI').checked = data['enableMIDI']
			}
			if ('midiRanges' in data) {
				// TODO: set midi ranges
			}
		}	

		// CLI state
		if ('type' in data && data['type'] == 'subscribed') 
		{
			var status = document.getElementById(data['name']+'Status')

			if (data['state'] != true) {
				status.classList.add('disconnected')
				status.classList.remove('connected')
				status.innerHTML = 'disconnected'
			} else {
				status.classList.remove('disconnected')
				status.classList.add('connected')
				status.innerHTML = 'connected'
			}
		}

		// CLI count
		if ('type' in data && data['type'] == 'subscribers') 
		{
			var count = document.getElementById('cliCount')
			count.innerHTML = data['count']
		}

		// IFACE count
		if ('type' in data && data['type'] == 'interfaces') 
		{
			var count = document.getElementById('ifaceCount')
			count.innerHTML = data['count']
		}

		// Averages
		if ('type' in data && data['type'] == 'averages')
		{
			document.getElementById('devCount').innerHTML = data['devCount']

			for(var band in data['avg'])
			{
				document.getElementById('avg'+band).innerHTML = Math.round( data['avg'][band]*100 )/100
			}

			for(var band in data['avgMIDI'])
			{
				document.getElementById('avgMIDI'+band).innerHTML = data['avgMIDI'][band]
			}

		}

	
	});

	return ws

}



/* ––––––––––––––––––––
	   FAKE EVENT (MIDI/OSC LEARN)
–––––––––––––––––––– */

function fakeEvent(band) 
{
	if(ws.readyState == 1)
	{
		let data = {'type': 'eeg', 'data': { "TEST": { 'bands': {}} }}
		data['data']['TEST']['bands'][band] = 100
		ws.send(JSON.stringify( data ));
	}
}


/* ––––––––––––––––––––
	  REMOTE DATA SOURCE
–––––––––––––––––––– */

function setRemote() {
	let ip = document.getElementById('remoteIP').value
	if(ws.readyState == 1)
	{
		ws.send(JSON.stringify( {
			'type': 'set',
			'key': 'remoteIP',
			'value': ip
		}));
	}
}


/* ––––––––––––––––––––
	  FPS
–––––––––––––––––––– */

function setFPS() {
	let fps = document.getElementById('dataFPS').value
	if(ws.readyState == 1)
	{
		ws.send(JSON.stringify( {
			'type': 'set',
			'key': 'dataFPS',
			'value': fps
		}));
	}
}

/* ––––––––––––––––––––
	  TOGGLES
–––––––––––––––––––– */

function toggleOSC() {
	let osc = document.getElementById('enableOSC').checked
	if(ws.readyState == 1)
	{
		ws.send(JSON.stringify( {
			'type': 'set',
			'key': 'enableOSC',
			'value': osc
		}));
	}
}

function toggleMIDI() {
	let midi = document.getElementById('enableMIDI').checked
	if(ws.readyState == 1)
	{
		ws.send(JSON.stringify( {
			'type': 'set',
			'key': 'enableMIDI',
			'value': midi
		}));
	}
}


/* ––––––––––––––––––––
	  MAIN CTRLS
–––––––––––––––––––– */

function playShow() {
	ws.send(JSON.stringify( {
		'type': 'show',
		'action': 'play'
	}));
}

function stopShow() {
	ws.send(JSON.stringify( {
		'type': 'show',
		'action': 'stop'
	}));
}