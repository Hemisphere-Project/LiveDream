var megaMax = 100

console.log('\n.:: DREAM Server ::.')
console.log(' ')

var fs = require('fs');
var request = require('request');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

 


/*
  Utils
*/
function linearMap(x, in_range, out_range) {
  var out = (x - in_range[0]) * (out_range[1] - out_range[0]) / (in_range[1] - in_range[0]) + out_range[0]
  if (out > out_range[1]) return out_range[1]
  if (out < out_range[0]) return out_range[0]
  return Math.round(out)
}

/*
  Channels
*/
let channels = {
  "raw": 1,
  "delta": 2,
  "theta": 3,
  "alpha": 4,
  "beta": 5,
  "gamma": 6,
}

/*
  OSC destination
*/
let oscDest = '127.0.0.1'

/* ----------------------------------------------------------------------------------------------------
 * CONF
 * ----------------------------------------------------------------------------------------------------
 */

class Conf extends EventEmitter {
  constructor(path, defaults) {
    super();
    this.config = {};
    this.path = path;
    this.defaults = defaults;
  }

  load() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, (err, data) => 
      {
        var loadedConf = null
        

        if (err) {
          console.log('No configuration file found, creating default one');
          loadedConf = {}
        } else {
          try {
            loadedConf = JSON.parse(data)
          } catch (e) {
            console.log('Error parsing configuration file..');
          }
        }

        if (loadedConf != null)
        {
          var doSave = false

          // merge loadedConf with defaults
          loadedConf = Object.assign({}, this.defaults, loadedConf)

          for (var key in loadedConf)
            if (!this.config.hasOwnProperty(key) || JSON.stringify(this.config[key]) != JSON.stringify(loadedConf[key])) 
            {
              if (!this.config.hasOwnProperty(key)) doSave = true

              this.config[key] = loadedConf[key];
              this.emit('set-'+key, this.config[key]);
              console.log('set-'+key, '=' , this.config[key]);
            }
          
          this.emit('loaded');
          if (doSave) this.save()
          resolve();
        }
        else reject();

      });
    });
  }

  save() {
    var self = this;
    fs.writeFile(this.path, JSON.stringify(this.config, null, 2), function (err) {
      if (err) return console.log(err);
      self.emit('saved');
    });
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
    this.emit('set-'+key, value)
  }
}

// DEFAULT CONF
//

var conf = new Conf('../config.json', {
  'remoteIP': '',
  'dataFPS': 10,
  'enableOSC': false,
  'enableMIDI': false,
  'midiRanges': {
    "raw":   [ 
      [0, 300],   
      [0, 127]
    ],
    "delta":  [ 
      [0, 30],
      [0, 127]
    ],
    "theta": [ 
      [0, 30],
      [0, 127]
    ],
    "alpha": [ 
      [0, 30],
      [0, 127]
    ],
    "beta":  [ 
      [0, 30],
      [0, 127]
    ],
    "gamma": [ 
      [20, 50],
      [0, 127]
    ]
  }
})

/* ----------------------------------------------------------------------------------------------------
 * Virtual MIDI Device
 * ----------------------------------------------------------------------------------------------------
 */

var easymidi = require('easymidi');
var midi = null

function midiSend(channel, value, cconly) 
{
  if (midi == null) return

  // Note
  if (!cconly) {
    midi.send('noteon', {
      note: value,
      velocity: 100,
      channel: channel-1
    });
    console.log('== MIDI NOTE ch.'+channel, value)
  }

  // CC 64
  midi.send('cc', {
    controller: 64,
    value: value,
    channel: channel-1
  });
  console.log('== MIDI CC64 ch.'+channel, value)
}

var resetTimout = null

function midiStop() {
  if (midi == null) return
  midi.send('cc', { controller: 100, value: 0, channel: 0 });
  midi.send('cc', { controller: 100, value: 127, channel: 0 });
  if (resetTimout) clearTimeout(resetTimout)
  resetTimout = setTimeout(()=>{
    midi.send('cc', { controller: 100, value: 0, channel: 0 });
    midi.send('cc', { controller: 100, value: 127, channel: 0 });
  }, 300)
  console.log('== MIDI STOP')
}

function midiStart() {
  if (midi == null) return
  if (resetTimout) clearTimeout(resetTimout)
  midi.send('cc', { controller: 101, value: 0, channel: 0 });
  midi.send('cc', { controller: 101, value: 127, channel: 0 });

  console.log('== MIDI START')
}

function delayedRawMidi(i, channel, value, cconly) 
{
  setTimeout(function() {
    midiSend(channel, value, cconly)
    // console.log(value)
  }, 1000/256 * i);
}

// Enable MIDI
conf.on('set-enableMIDI', (enable)=>{

  if (midi) midi.close()
  midi = null

  if (enable) {
    midi = new easymidi.Output('DreamMidi', true);

    console.log('\nVirtual MIDI port "DreamMidi" created')
    console.log('\tvalues are normalized between 0-127 using linear ranges from config.js\n') 
  }
  else console.log('MIDI disabled')

})


/* ----------------------------------------------------------------------------------------------------
 * OSC
 * ----------------------------------------------------------------------------------------------------
 */

var osc = require('osc');
var oscPort = null

function oscSend(path, value) 
{
  if (oscPort == null) return

  try {
    oscPort.send({
      address: path,
      args: [
          {
              type: "f",
              value: value
          }
      ]
    }, oscDest, 3737);
    console.log('== OSC', path, value)
  }
  catch(error) {
    console.warn('OSC send Error', error)
  }
}

function delayedRawOSC(i, path, value) {
  setTimeout(function() {
    oscSend(path, value)
  }, 1000/256 * i);
}

console.log(' ')

// Enable MIDI
conf.on('set-enableOSC', (enable)=>{

  if (oscPort) oscPort.close()
  oscPort = null

  if (enable) {
    oscPort = new osc.UDPPort({
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
    
    console.log('\nOSC sender ready')
    console.log('\tdata will be sent to local machine as /eeg/device/band [float] on port 3737\n')
  }
  else console.log('OSC disabled')

})


/* ----------------------------------------------------------------------------------------------------
 * Express server => Serve WebApp locally
 * ----------------------------------------------------------------------------------------------------
 */

const express = require('express')

const app = express()
const port = 3000

var version = "2.0"

app.get('/', (req, res) => {
  res.sendFile(__dirname+'/www/'+version+'/index.html');
})

app.use(express.static('www/'+version))

// handle 404 -> try to retrieve and store the file locally
app.use(function(req, res) {
  console.log('404: Page not Found', req.url);

  // retrieving remote ressource
  var rUrl = "https://app.mentalista.com/ddreams/v/"+version+req.url
  console.log('Retrieving remote ressource', rUrl)

  // get raw content at rUrl
  request(rUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('Remote ressource retrieved')
      res.send(body)

      // mkdir recursively
      var path = req.url.split('/')
      path.pop()
      path = path.join('/')
      console.log('Creating local folder', path)
      fs.mkdirSync(__dirname+'/www/'+version+path, { recursive: true }) 

      // save file
      var path = __dirname+'/www/'+version+req.url
      console.log('Saving file', path)
      fs.writeFile(path, body, function(err) {
        if(err) {
          return console.log(err);
        }
        console.log("File saved");
      })
    }
    else {
      console.log('Remote ressource not found', rUrl)
      res.status(404)
      res.send('404: Page not Found')
    }
  })

});

const https = require('https')
const key = fs.readFileSync('./key.pem')
const cert = fs.readFileSync('./cert.pem')

const server = https.createServer({key: key, cert: cert }, app);
server.listen(port, '0.0.0.0', () => { console.log(`Webapp ready on https://localhost:${port}/`) });


// app.listen(port, '0.0.0.0', () => {
//   console.log(`Webapp ready on http://localhost:${port}/`)
// })



/* ----------------------------------------------------------------------------------------------------
 * Local storage
 * ----------------------------------------------------------------------------------------------------
 */

class LocalStorage {
  constructor() {
    this.lastdata = {}
  }

  clear() {
    this.lastdata = {}
  }

  push(newset) {
    for (var dev in newset) 
    {
      if (!this.lastdata.hasOwnProperty(dev)) this.lastdata[dev] = {}
      this.lastdata[dev] = newset[dev]
    }
  }

  get() {
    return this.lastdata
  }

  average() {
    // average init
    var avgBands = {}
    var cntBands = {}

    // each Device
    for(var dev in this.lastdata)
    {
      // each band
      for(var band in this.lastdata[dev]['bands']) {
        if (!avgBands.hasOwnProperty(band)) {
          avgBands[band] = 0
          cntBands[band] = 0
        }
        avgBands[band] += this.lastdata[dev]['bands'][band]
        cntBands[band] += 1
      }          
    }

    // calc average
    for(var band in avgBands)
      avgBands[band] /= cntBands[band]

    return avgBands
  }

  averageNormalized() 
  {
    var avgBands = this.average()

    // normalize
    for (var band in avgBands) {
      var range = conf.get('midiRanges')[band]
      avgBands[band] = linearMap(avgBands[band], range[0], range[1])
    }

    return avgBands
  }
}

var localStorage = new LocalStorage()


/* ----------------------------------------------------------------------------------------------------
 * Websocket client (REMOTE SUBSCRIBE), connect when remoteIP is set
 * ----------------------------------------------------------------------------------------------------
 */

const WebSocket = require('ws');

var firstCli = null

class wsClient extends EventEmitter { 

  constructor(_name) {
    super();
    this.name = _name
    this.cli = null
    this.reco = null
    this.ping = null
  }

  connect(_ip) {

    if (_ip !== undefined) this.ip = _ip

    if (this.cli && this.cli.readyState == 1){
      this.cli.close()
      return
    }

    if (!this.ip) return

    console.log('Subscribing to', this.name)
    this.cli = new WebSocket('wss://'+this.ip+':3000',  { rejectUnauthorized: false });
    
    // Connection opened
    this.cli.on('open', () => {

      if (this.ping) clearInterval(this.ping)
      this.ping = setInterval(() => { this.ping() }, 1000)

      // console.log('Subscribing to ', this.ip)
      this.cli.send('{"type":"subscribe"}');
      
      // Inform interfaces
      for (var i=0; i<interfaces.length; i++)
        interfaces[i].send( JSON.stringify({ 'type': 'subscribed', 'name': this.name, 'ip':this.ip, 'state': this.state() }) )

    });

    // Listen for messages
    this.cli.on('message', (buffer) => 
    {
      var data = JSON.parse(buffer)
      
      // EEG received !
      if ('type' in data && data['type'] == 'eeg') 
      {
        // console.log('REMOTE DATA', data['data'])
        localStorage.push(data['data'])

        // Forward to remote cli
        for (var i=0; i<subscribers.length; i++)
          subscribers[i].send(buffer)
      }

      // SHOW CTRLS
      if ('type' in data && data['type'] == 'show') 
      {
        if (data['action'] == 'play') {
          console.log("SHOW PLAY")
          midiStart()
          oscSend('/start')

        }
        else if (data['action'] == 'stop') {
          console.log("SHOW STOP")
          midiStop()
          oscSend('/wait')
        }

        // Forward to remote cli
        for (var i=0; i<subscribers.length; i++)
          subscribers[i].send(buffer)

        return
      } 

    });

    // Connection closed
    this.cli.on('close', () => {
      if (this.ping) clearInterval(this.ping)
      console.log('Disconnected from', this.name)

      // Inform interfaces
      for (var i=0; i<interfaces.length; i++)
        interfaces[i].send(JSON.stringify({ 'type': 'subscribed', 'name': this.name, 'ip':this.ip, 'state': this.state() }))

      // Reconnect
      clearTimeout(this.reco)
      this.reco = setTimeout(()=>{ this.connect() }, 1000)
    })
    
    // Connection error
    this.cli.on('error', (e) => {
      console.log('Error with remote', e)
    })
  }

  ping() {
    this.cli.send('{"type":"ping"}');
  }

  state() {
    return this.cli?(this.cli.readyState == 1):false
  }
}

var wsClientRemote = new wsClient('remote')

// Connect Remote
conf.on('set-remoteIP', (remoteIP)=>{
  wsClientRemote.connect(remoteIP)
})



/* ----------------------------------------------------------------------------------------------------
 * Websocket server
 * ----------------------------------------------------------------------------------------------------
 */

var subscribers = []
var interfaces = []

const WebSocketServer = require('ws');

// Creating a new websocket server on port 8080
// const ws = new WebSocketServer.Server({ port: 8080, host: '0.0.0.0' })

const ws = new WebSocketServer.Server({ server: server }) 


// Creating connection using websocket
ws.on("connection", ws => {

    /*
      Local IP
    */

    setInterval(()=>{
      var localIP = null
      const { networkInterfaces } = require('os');
      nets = networkInterfaces()
      if (nets['eth0']) nets = nets['eth0']
      else if (nets['en0']) nets = nets['en0']
      else nets = null

      if (nets)
      for (n of nets)
        if (n.family == 'IPv4') {
          localIP = n.address
          break
        }
      
      // Send local IP
      ws.send(JSON.stringify({ 'type': 'localIP', 'ip': localIP }))
      
      console.log('Local IP:', localIP)
    }, 5000)


    // Receiving message
    ws.on("message", buffer => {

        //Parses receive data as json
        const data = JSON.parse(buffer)
        // console.log(data) 

        // WEB INTERFACE
        if ('type' in data && data['type'] == 'interface') 
        {
          interfaces.push(ws)

          // Reload config and send
          conf.load().then( () => {
            ws.send(JSON.stringify(Object.assign(conf.config, { 'type': 'conf' })))
          })

          // Send subscribed status
          ws.send(JSON.stringify({ 'type': 'subscribed', 'name': wsClientRemote.name, 'ip':wsClientRemote.ip, 'state': wsClientRemote.state() }))
          ws.send(JSON.stringify({ 'type': 'subscribers', 'count': subscribers.length }))
          
          console.log('New interface connected')

          // Infomr interfaces
          for (var i=0; i<interfaces.length; i++)
            interfaces[i].send(JSON.stringify({ 'type': 'interfaces', 'count': interfaces.length }))
            
          return
        } 

        // SUBSCRIBE from wsClient
        if ('type' in data && data['type'] == 'subscribe') 
        {
          subscribers.push(ws)
          console.log('New remote bridge subscribed, total=', subscribers.length)

          // Infomr interfaces
          for (var i=0; i<interfaces.length; i++)
            interfaces[i].send(JSON.stringify({ 'type': 'subscribers', 'count': subscribers.length }))

          return
        } 

        // TESTS
        if ('type' in data && data['type'] == 'test') 
        {
          if (data['band'] in channels)
            delayedRawMidi(0, channels[data['band']], data['value'], true)
          delayedRawOSC(0, '/'+data['band'], data['value'])
          return
        } 

        // SET CONF
        if ('type' in data && data['type'] == 'set') 
        {
          conf.set(data['key'], data['value'])
          ws.send(JSON.stringify(Object.assign(conf.config, { 'type': 'conf' })))
          return
        } 

        // SHOW CTRLS
        if ('type' in data && data['type'] == 'show') 
        {
          if (data['action'] == 'play') {
            console.log("SHOW PLAY")
            midiStart()
            oscSend('/start')

          }
          else if (data['action'] == 'stop') {
            console.log("SHOW STOP")
            midiStop()
            oscSend('/wait')
          }

          // Forward to remote cli
          for (var i=0; i<subscribers.length; i++)
            subscribers[i].send(buffer)

          return
        } 

        

        // EEG
        if ('type' in data && data['type'] == 'eeg')
        {        
          // Store data
          // console.log('LOCAL DATA', data['data'])
          localStorage.push(data['data'])

          // Forward to remote cli
          for (var i=0; i<subscribers.length; i++)
            subscribers[i].send(buffer)      
        }

        // PUSH data (triggered only from interface[0])
        if ('type' in data && data['type'] == 'push' && ws == interfaces[0])
        {
          
          var avgBands = localStorage.average()
          var avgMIDIBands = localStorage.averageNormalized()
          var devData = localStorage.get()
          
          // Inform interfaces
          for (var i=0; i<interfaces.length; i++) {
            interfaces[i].send( JSON.stringify({ 'type': 'averages', 'avg': avgBands, 'avgMIDI': avgMIDIBands, 'devCount': Object.keys(devData).length}) )
          }

          // Averages MIDI/OSC
          // if (Object.keys(avgMIDIBands).length) console.log("AVERAGES:")

          for (var band in avgMIDIBands) 
          {
            midiSend(channels[band], avgMIDIBands[band])
            oscSend('/eeg/avg/'+band, avgBands[band])

            // console.log("   ", band.padEnd(5, ' '), " \tMIDI ch:", channels[band], " = ", avgMIDIBands[band], " \tOSC:", '/eeg/avg/'+band.padEnd(5, ' '), " = ", avgBands[band])
          }

          // Devices OSC
          for (var dev in devData) {
            for (var band in devData[dev]['bands']) {
              oscSend('/eeg/'+dev+'/'+band, devData[dev]['bands'][band])
            }
          }

          // Clear local storage
          localStorage.clear()

          // if (Object.keys(avgMIDIBands).length) console.log("====================")
        }


    });

    // Handling what to do when clients disconnects from server
    ws.on("close", (e) => {
        // remove client from list
        subscribers = subscribers.filter(e => e !== ws)
        interfaces = interfaces.filter(e => e !== ws)
        console.log("A client is gone", subscribers.length, interfaces.length);

        // Infomr interfaces
        for (var i=0; i<interfaces.length; i++)
          interfaces[i].send(JSON.stringify({ 'type': 'subscribers', 'count': subscribers.length }))

        // Infomr interfaces
        for (var i=0; i<interfaces.length; i++)
          interfaces[i].send(JSON.stringify({ 'type': 'interfaces', 'count': interfaces.length }))
    });
    
    // Handling client connection error
    ws.onerror = () => {
        console.log("Some Error occurred");
    }
});

//Inform the user that the server is active
console.log("WebSocket server running on port 3000");

var isPi = require('detect-rpi');

if (isPi()) {
  const { spawn } = require('child_process');

  var args = ['--url', `https://localhost:3000`, '--rotate', '90' ]
  
  console.log('kiosk', ...args)
  var kioskprocess = spawn('kiosk', args)
}
else {
  console.log('kiosk', 'not a pi')

  var childProc = require('child_process');

  childProc.exec('killall "Google Chrome"');
  childProc.exec('killall "TouchDesigner"');

  childProc.exec('open -a "Ableton Live 11 Suite" /Users/livedream_emard/Desktop/LiveDream/SON/LiveDream-MacMini/LiveDream-MacMini.als');

  setTimeout(()=>{  
    childProc.exec('open -a "TouchDesigner" /Users/livedream_emard/Desktop/LiveDream/LIVE_DREAMER/LIVE_DREAMER.toe');
  }, 1000)
  
  setTimeout(()=>{
    childProc.exec('open -a "Google Chrome" --args --incognito --disable-features=InfiniteSessionRestore --ignore-certificate-errors --test-type --autoplay-policy=no-user-gesture-required --disable-infobars https://localhost:3000');
  }, 2000)

}

////////
////////
////////

conf.load()







