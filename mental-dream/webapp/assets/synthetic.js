/* ----------------------------------------------------------------------------------------------------
 * Synthetic Device, 2022
 * Created: 04/03/22 by Bastien DIDIER, Mentalista
 * 
 * synthetic.js
 *
 * Update: 48/03/22 Current V.0.1
 * ----------------------------------------------------------------------------------------------------
 */

import { DSP } from "/assets/dsp.js";
import { UserRoutine } from "/assets/userRoutine.js";

export class Synthetic {

  constructor(){

    const self = this;

    this.id;
    this.name;
    this.device;
    this.busy = false;
    this.isReady = false;

    this.onDataEvent = 64; //number of data event by second
    this.routine = new UserRoutine(this.onDataEvent);

    this.isStreaming = false;
    this.play = () => {
      this.routine.play();
      this.isStreaming = true;
    };
    this.pause = () => {
      this.routine.pause();
      this.isStreaming = false;
    };
    this.toggle = () => {
      this.isStreaming ? this.stop() : this.start();
    };

    this.battery = async () => { return 100; };

    this.dsp = new DSP();

    this.sampleRate = 256;

    this.Vref = 4.5;
    this.gain = 24;
    this.scaleFactor = () => { return ((self.Vref / self.gain) / (Math.pow(2, 23) - 1)) * 1000000; };

    this.channels = 8;
    this.frame = 4;

    this.chanKeys = [...Array(this.channels).keys()];

    this.widgets = new Object(); // Handle widgets
    
    this.sampleIndex = 0;
    this.eventCount = () => {
      console.warn(this.name+" : "+this.sampleIndex+" ("+this.sampleIndex*this.frame+"Hz)");
      this.sampleIndex = 0;
    };

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

    this.connect();
  }

  connect(){
    const self = this;
    setTimeout(function(){

      self.id = Date.now();
      self.name = self.uuid("S02");
      self.busy = false;
      self.isReady = true;

      //self.routine.start();
  
      //TO IMPROVE
      self.dsp.adcinterval = 4; //ms   
      self.dsp.chanCount = 8;
      self.dsp.activeChan = self.dsp.isChannelFillAuto ? self.chanKeys : self.dsp.selectedChan;
      self.dsp.init();
      
      self.onReadyStateChange();

      //self.isStreaming = true;

      self.routine.update(() => {
        self.handle.data(null);
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