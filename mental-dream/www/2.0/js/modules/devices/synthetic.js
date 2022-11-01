/* ----------------------------------------------------------------------------------------------------
 * Synthetic Device, 2022
 * Created: 04/03/22 by Bastien DIDIER, Mentalista
 * 
 * synthetic.js
 *
 * Update: 09/08/22 Current V.1.0
 * ----------------------------------------------------------------------------------------------------
 */

import { DSP } from "./dsp.js";
import { UserRoutine } from "../helpers/userRoutine.js";

export class Synthetic {

  /**
   * @return {Device}
   */
  constructor(){

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
    
    // Synthetic timing
    this.onDataEvent = 64;    //number of data event by second
    this.routine     = new UserRoutine(this.onDataEvent);

    /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ DATA HANDLER â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

    // Various function to handle the data processing
    this.handle = {
      data : (value) => {

        let sample = new Object();
            sample.timestamp = Date.now();
            sample.data = new Object();
            for (let i = 0; i < this.channels; i++) {
              const key = i.toString();
              sample.data[key] = new Array()
              
              for (let f = 0; f < this.frame; f++) {

                //V0
                
                //Generate synthetic rawVal
                //let rawVal = this.randomGaussian() * Math.sqrt(this.sampleRate/2.0);  // ensures that it has amplitude of one unit per sqrt(Hz) of signal bandwidth

                //if (i==0) rawVal *= 10;  //scale one channel higher

                //if (i==1) {
                //  //add sine wave at 10 Hz at 10 uVrms
                //  let phase = 2.0*Math.PI * 10.0 / this.sampleRate
                //  if (phase > 2.0*Math.PI) phase -= 2.0*Math.PI;
                //  rawVal += 10.0 * Math.sqrt(2.0)*Math.sin(phase);
                //
                //} else if (i==2) {
                //  //50 Hz interference at 50 uVrms
                //  let phase = 2.0*Math.PI * 50.0 / this.sampleRate;  //60 Hz
                //  if (phase > 2.0*Math.PI) phase -= 2.0*Math.PI;
                //  rawVal += 50.0 * Math.sqrt(2.0)*Math.sin(phase);    //20 uVrms
                //} else if (i==3) {
                //  //60 Hz interference at 50 uVrms
                //  let phase = 2.0*Math.PI * 60.0 / this.sampleRate;  //50 Hz
                //  if (phase > 2.0*Math.PI) phase -= 2.0*Math.PI;
                //  rawVal += 50.0 * Math.sqrt(2.0)*Math.sin(phase);  //20 uVrms
                //}
                //const uV = (0.5+ rawVal / this.scaleFactor()); //convert to counts, the 0.5 is to ensure rounding

                //sample.data[key].push(uV);

                //V1
                //https://github.com/brainflow-dev/brainflow/blob/ad7034b7b6741a9ed8e96be6b5f942fcdadb3739/src/board_controller/synthetic_board.cpp#L130
                
                let amplitude = 10.0 * (i + 1);
                let noise = 0.1 * (i + 1);
                let freq = 5.0 * (i + 1);
                let shift = 0.05 * i;
                let range = (amplitude * noise) / 2.0;
                //let sampling_rate = 256;
                
                let rawVal = 2.0 * Math.PI * freq / this.sampleRate;
                
                if (rawVal > 2.0 * Math.PI){
                    rawVal -= 2.0 * Math.PI;
                }
                                
                const uV = (amplitude + Math.getRandomArbitrary(-range, range) ) * Math.sqrt (2.0) * Math.sin (rawVal + shift);
                
                sample.data[key].push(uV / this.scaleFactor());

              }
            };

        //Monitor frame rate
        this.sampleIndex++;

        this.dsp.populate(sample, this.scaleFactor);

        return self.onDataChange( sample );

      }
    };

    /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ SAMPLE INDEX â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

    this.sampleIndex = 0;
    this.eventCount = () => {
      if(this.isStreaming){ console.warn(this.name+" : "+this.sampleIndex+" ("+this.sampleIndex*this.frame+"Hz)"); }
      this.sampleIndex = 0;
    };
  
    /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ DEVICE CONNECTION â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

    // Final step, connect the device 
    this.connect();
  }

  connect(){
    const self = this;
    setTimeout(function(){

      self.busy   = true;
      self.device = new Object;
      self.id     = Date.now();
      self.name   = self.uuid("S02");

      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
           DEVICE INFO
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      self.device.manufacturer    = 'Mentalista';
      self.device.model           = 'S02';
      self.device.firmware        = 'SDK0.0';
      self.device.software        = 'V0.2';

      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
               BATTERY
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      // FUNCTION
      self.battery = async () => { return 100; };

      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
                ADC
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      // FUNCTIONS
      self.readStream             = async ()           => { return null; }

      self.isDeviceStreaming      = async ()           => { return self.isStreaming; }
      self.play                   =       ()           => { self.routine.play(); self.isStreaming = true; };
      self.pause                  =       ()           => { self.routine.pause(); self.isStreaming = false; }
      
      self.readTimestamp          = async ()           => { return null; }
      self.writeTimestamp         =       (_timestamp) => { return null; }

      self.isTimestampEnable      = async ()           => { return false; }
      self.enableTimestamp        =       ()           => { return null; /*self.hasTimestamp = true;*/  }
      self.disableTimestamp       =       ()           => { return null; /*self.hasTimestamp = false;*/ }

      self.readChannels           = async ()           => { return self.chanArray; }
      self.writeChannels          =       (_array)     => { return null; }
      self.activateChannel        =       (_chan)      => { self.chanArray[_chan] = 1; }
      self.deactivateChannel      =       (_chan)      => { self.chanArray[_chan] = 0; }
      
      self.readSampleCount        = async ()           => {}
      self.writeSamplesCount      =       (_count)     => { return null }

      self.getSampleRate          = async ()           => { return self.sampleRate; }
      self.setSampleRate          =       (_hz)        => { self.sampleRate = _hz; }

      self.getGain                = async ()           => { return self.gain; }
      self.setGain                =       (_gain)      => { self.gain = _gain; }

      self.frame                  = 4;
      self.hasTimestamp           = false;
      self.chanArray              = [1,1,1,1,1,1,1,1];
      self.channels               = self.chanArray.length; //(8)
      self.chanKeys               = [...Array(self.channels).keys()];
      self.sampleRate             = 256;
      self.gain                   = 24;

      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
            ACCELEROMETER
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      // TODO
      
      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
          CONFIG ADC & DSP
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      // Define DSP sample rate
      const dspSampleRate = Math.isPowerOfTwo(self.sampleRate) ? self.sampleRate : Math.nearestPowerOfTwo(self.sampleRate);
      
      // Create DSP object
      self.dsp = new DSP(dspSampleRate);

      // Define Scale factor
      self.Vref = 4.5;
      self.scaleFactor = () => { return ((self.Vref / self.gain) / (Math.pow(2, 23) - 1)) * 1000000; };

      // Virtual Board Type
      self.type = "S02";
      //console.log("Synthetic S02 Auto detected");
      
      //DSP
      self.dsp.adcinterval = self.frame;
      self.dsp.chanCount   = self.channels;
      self.dsp.activeChan  = self.dsp.isChannelFillAuto ? self.chanKeys : self.dsp.selectedChan;
      self.dsp.init();
      
      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
           NOTIFICATIONS
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      self.routine.update(() => {
        self.handle.data(null);
      });

      /* â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“
            DEVICE READY
      â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“â€“ */

      self.busy = false;
      self.isReady = true;
      self.onReadyStateChange();

      // Log
      console.log(`Device ${self.id} is initialized !`);
      console.table({
        name:          self.name,
        id:            self.id,
        type:          self.type,
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

    }, 500);
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

  disconnect(){
  
    for(let widget in this.widgets){
      if(Array.isArray(this.widgets[widget])){
        this.widgets[widget].forEach(widget => {
          widget.destroy();
        })
      } else {
        this.widgets[widget].destroy();
      }
    }

    this.onDisconnectedChange( this.id );

    console.log(`Device ${this.id} is disconnected.`);
  }

  /**
   * Generate an unique id
   * @param  string prefix of the generated id
   * @return string generated id
   */
  uuid(prefix){
    let id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    if(prefix){
      while (document.getElementById(prefix+"-"+id) !== null) {
        console.warn("#"+prefix+"-"+id+" already exist");
        id = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      }
      return prefix+"-"+id;
    } else {
      return id;
    }
  }
}
