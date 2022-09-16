var megaMax = 100

console.log('\n.:: DREAM Server ::.')
console.log(' ')

var fs = require('fs');

function linearMap(x, in_range, out_range) {
  var out = (x - in_range[0]) * (out_range[1] - out_range[0]) / (in_range[1] - in_range[0]) + out_range[0]
  if (out > out_range[1]) return out_range[1]
  if (out < out_range[0]) return out_range[0]
  return out
}

let channels = {
  "raw": 1,
  "alpha": 2,
  "beta": 3,
  "gamma": 4,
  "theta": 5
}

/* ----------------------------------------------------------------------------------------------------
 * Virtual MIDI Device
 * Created: 16/06/22 by Thomas BOHL
 * ----------------------------------------------------------------------------------------------------
 */

var easymidi = require('easymidi');
var midi = new easymidi.Output('DreamMidi', true);

console.log('Virtual MIDI port "DreamMidi" created')
console.log('\traw data will be sent as velocity on channel=1 / note=64')
console.log('\tvalue is normalized between 0-127 using dynamic max value')

function delayedRawMidi(i, channel, value, cconly) 
{
  setTimeout(function() {
    
    // Note 
    if (!cconly)
    midi.send('noteon', {
      note: value,
      velocity: 100,
      channel: channel
    });

    // CC 64
    midi.send('cc', {
      controller: 64,
      value: value,
      channel: channel
    });

    // console.log(value)
  }, 1000/256 * i);
}

console.log(' ')

/* ----------------------------------------------------------------------------------------------------
 * OSC
 * Created: 16/06/22 by Thomas BOHL
 * ----------------------------------------------------------------------------------------------------
 */

var osc = require('osc');
var oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 3738,
  metadata: true
});

oscPort.on("message", function (oscMsg, timeTag, info) {
  console.log("An OSC message just arrived!", oscMsg);
  console.log("Remote info is: ", info);
});

// Open the socket.
oscPort.open();

console.log('OSC sender ready')
console.log('\traw data will be sent to local machine as /raw [float] on port 3737')

function delayedRawOSC(i, path, value) {
  setTimeout(function() {
    oscPort.send({
      address: path,
      args: [
          {
              type: "f",
              value: value
          }
      ]
    }, "127.0.0.1", 3737);
  }, 1000/256 * i);
}

console.log(' ')


/* ----------------------------------------------------------------------------------------------------
 * Express server => Serve WebApp locally
 * Created: 16/06/22 by Thomas BOHL
 * TODO => Check online if webapp has upgrades and replace locally
 * ----------------------------------------------------------------------------------------------------
 */

const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.sendFile(__dirname+'/webapp/index.html');
})

app.use(express.static('webapp'))

app.listen(port, () => {
  console.log(`Webapp ready on http://localhost:${port}/`)
})


/* ----------------------------------------------------------------------------------------------------
 * Websocket server, 2022
 * Created: 06/03/22 by Gille de Bast
 *
 * Updated: 08/03/22 Current V.1
 * ----------------------------------------------------------------------------------------------------
 */

const WebSocketServer = require('ws');

// Creating a new websocket server on port 8080
const wss = new WebSocketServer.Server({ port: 8080 })
 
// Creating connection using websocket
wss.on("connection", ws => {
    
    //Inform the user that a new client is connected
    console.log("- New webapp connected");

    // Loading MIDI ranges
    let ranges = JSON.parse(fs.readFileSync('../midi-ranges.json'));
    console.log("MIDI RANGES");
    console.log(ranges);

    // Receiving message
    ws.on("message", buffer => {

        //Parses receive data as json
        const data = JSON.parse(buffer)
        // console.log(data) 

        // TESTS
        if ('type' in data && data['type'] == 'test') 
        {
          if (data['band'] in channels)
            delayedRawMidi(0, channels[data['band']], data['value'], true)
          delayedRawOSC(0, '/'+data['band'], data['value'])
          return
        } 

        // Filtered values
        const filtered = data.filtered
        const bands = data.bands
      
        //Log the data in the console
        var max = Math.max( Math.abs(Math.min.apply(null, filtered)), Math.max.apply(null, filtered)  )
        console.log('raw: max=', max);
        console.log('bands: ', bands);
        megaMax = Math.max(max, megaMax)

        // MIDI/OSC OUT
        for (var i in filtered) {
          let value = Math.floor((Math.abs(filtered[i])/megaMax)*127)
          delayedRawMidi(i, channels['raw'], value)
          delayedRawOSC(i, '/raw', filtered[i])
        }

        for (var b in bands) 
        {
          if (b in channels) {
            let value = Math.round(linearMap(bands[b], ranges[b][0], ranges[b][1]))
            delayedRawMidi(i, channels[b], value)
            console.log('MIDI ch. '+channels[b]+' note + CC64: ', b, '\t', value)
          }

          delayedRawOSC(i, '/'+b, bands[b])
        }

        console.log("====================")
    });

    // Handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("👋 The client has disconnected");
    });
    
    // Handling client connection error
    ws.onerror = () => {
        console.log("Some Error occurred");
    }
});

//Inform the user that the server is active
console.log("WebSocket server running on port 8080");

////////
////////
////////

// const open = require('open');
// open(`http://localhost:${port}`)
