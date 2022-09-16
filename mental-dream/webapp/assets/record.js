import { Chart } from "./chart.js";

export class Record extends Chart {

  constructor(sensor){
  	super();

    this.recordings = new Object();

    this._sensor = {
      name:       sensor.name,
      sampleRate: sensor.sampleRate,
      count:      sensor.channels,
      active:     sensor.dsp.activeChan,
      widgets:    [...Object.keys(sensor.widgets), "record"]
    };

    //this.recordings = {
    //  metadata:{
    //    //id:         null, //For later
    //    app:          "mental-garden",
    //    version:      "1.0",
    //    started:      Date.now(),
    //    sensor: {
    //      name:       sensor.name,
    //      sampleRate: sensor.sampleRate
    //    },
    //    channel: {
    //      count:      sensor.channels,
    //      topology:   ["O1"],
    //      active:     sensor.dsp.activeChan
    //    },
    //    metrics:      ["EEG"],
    //    widgets:      [...Object.keys(sensor.widgets), "record"]
    //  },
    //  data: new Array()
    //};

    this.adcinterval = sensor.dsp.adcinterval;

    // Not useful in this experience
    //window.onbeforeunload = () => {
    //    let fd = new FormData(); 
    //        fd.append('data', JSON.stringify(this.recordings));
    //    navigator.sendBeacon('./js/modules/widgets/record.php', fd);
    //    return null;
    //};

    this.init();
  }

  init(){
    this.recordings = {
      metadata:{
        //id:         null, //For later
        app:          "mental-garden",
        version:      "1.0",
        started:      Date.now(),
        sensor: {
          name:       this._sensor.name,
          sampleRate: this._sensor.sampleRate
        },
        channel: {
          count:      this._sensor.count,
          topology:   ["O1"],
          active:     this._sensor.active
        },
        metrics:      ["EEG"],
        widgets:      this._sensor.widgets
      },
      data: new Array()
    };
  }

  onData(samples){
    const activeChan = 0;
    for (let s = 0; s < samples.data[activeChan].length; s++) {
      this.recordings.data.push({
        timestamp: samples.timestamp+(s*this.adcinterval),
        value: [samples.data[activeChan][s]]
      });
    }
  }

  update(dsp){}

  destroy(){}

  reset(){
    this.init();
  }

  // Not useful in this experience
  //save(){
  //  let fd = new FormData();
  //      fd.append("data", JSON.stringify(this.recordings));
  //  fetch(new Request('./js/modules/widgets/record.php', {
  //    method: 'POST',
  //    body: fd
  //  }))
  //  .then(response => console.log(response))
  //  .catch(e => console.error(e));
  //}

  download(){
    const fileName = `mental-app_data_${Date.now()}.json`;
    const blob = new Blob(
      [JSON.stringify(this.recordings)],
      { type: "application/json",name: fileName }
    );
    window.saveAs(blob, fileName);
  }
}