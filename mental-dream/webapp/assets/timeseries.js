import { Chart } from "./chart.js";

export class Timeseries {

  constructor(sensor){

    this.timeseries = new Array();

    this.container = "timeseries";
    
    const container = document.createElement("div");
          container.setAttribute("id", this.container);
    
    document.getElementById('controls').appendChild(container);

    for (let i = 0; i < sensor.channels; i++) {
      this.timeseries.push(new Timeserie({container:this.container, index: i}));
    }

    this.timeseries.update = function(_dsp){
      this.forEach((ts, i) => {
        if(_dsp.activeChan.includes(i)){
          
          //Use timestamp
          //ts.update(_dsp.isFiltered == true ? _dsp.samples[i].filtered : _dsp.samples[i].raw, _dsp.samples[i].timestamps, _dsp.samples[i].isRailed);

          //Use count
          ts.update(_dsp.isFiltered == true ? _dsp.samples[i].filtered : _dsp.samples[i].raw, _dsp.samples[i].count, _dsp.samples[i].isRailed);

        } else {
          ts.clear();
        }
      });
    }

    this.timeseries.init = function(){
      this.forEach((ts, i) => {
        if(sensor.dsp.activeChan.includes(i)){
          ts.update(Array(256 * 5).fill(0), 0, false);  
        } else {
          ts.clear();
        }
      });
    }

    this.timeseries.auto = function(status = null){
      this.forEach((ts, i) => {
        ts.auto = status == null ? !ts.auto : status;        
      });
    }

    this.scaleIndex = 1;
    const self = this;
    this.timeseries.scale = function(){
      const scales = [50,100,500,1000]; // options
      this.forEach((ts, i) => {
        ts.amplitude = scales[self.scaleIndex];
      });
      self.scaleIndex++;
      if(self.scaleIndex == scales.length) self.scaleIndex=0;
    }

    this.timeseries.init();

    return this.timeseries;
  }

}

class Timeserie extends Chart {

  constructor(options){

    super();

    this.container = options.container;
    this.containerEl = document.getElementById(this.container);

    this.id = this.uuid(this.container || 'chart');

    this.margin = {
      top:    30,
      right:  0,
      bottom: 30,
      left:   0
    };
    
    this.width  = (options.width  || 450) - this.margin.left - this.margin.right;
    this.height = (options.height || 75) - this.margin.top  - this.margin.bottom;

    this.x;
    this.y;

    this.auto = false;

    this.xDomain = 0;
    this.yDomain = 0;
    this.xDomainMin = 0;
    this.yDomainMin = 0;

    this.amplitude = 500;

    this.index = options.index || 0;

    this.line;
    this.svg;

    this.visible = true;

    this.init();
  }

  init(){

    this.svg = d3.select('#'+this.container).append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .attr("id", this.id)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.uvrmsLabel = document.createElement('div');
    this.uvrmsLabel.setAttribute('class', 'uvrmsLabel');
    this.uvrmsLabelContent = document.createTextNode('132.45 ÂµV');
    this.uvrmsLabel.appendChild(this.uvrmsLabelContent);

    this.batteryLabel = document.createElement('div');
    this.batteryLabel.setAttribute('class', 'battery full');

    this.containerEl.appendChild(this.uvrmsLabel);
    this.containerEl.appendChild(this.batteryLabel);
  }

  //update(samples, timestamps, isRailed){
  update(samples, count, isRailed){

    //const coord = this.data2coords(samples, timestamps);
    const coord = this.data2coords(samples, count);
            
    if(coord.length == 0) return; //No initial value

    if(!this.visible){
      document.getElementById(this.id).style.display = 'block';
    }

    this.remove(['line', 'axis', 'label'], this.id);

    this.uvrmsLabel.style.display = 'block';
    this.batteryLabel.style.display = 'block';

    const self = this;

    this.line = d3.line()
      .x(function(d) {
        return self.x(d.x);
      })
      .y(function(d) {
        return self.y(d.y);
      });

    // X AXIS
    this.xDomain    = coord.map(d => d.x).reduce((a, c) => Math.max(a, c));
    this.xDomainMin = coord.map(d => d.x).reduce((a, c) => Math.min(a, c));

    this.x = d3.scaleLinear().range([0, this.width]).domain([this.xDomainMin, this.xDomain]);

    // Y AXIS
    if(this.auto == true){
      this.yDomain    = coord.map(d => d.y).reduce((a, c) => Math.max(a, c));  
      this.yDomainMin = coord.map(d => d.y).reduce((a, c) => Math.min(a, c));
    }

    const domain = this.auto == true ? [this.yDomainMin, this.yDomain] : [-this.amplitude, this.amplitude];
    this.y = d3.scaleLinear().range([this.height, 0]).domain(domain);

    //Append bottom axis
    //this.svg.append("g")
    //  .attr("class", "x axis")
    //  .call(d3.axisBottom(this.x).ticks(5).tickFormat(d3.timeFormat("%I:%M:%S.%L")))
    //  .attr("transform", "translate(0," + this.height + ")");

    //Append left axis
    //this.svg.append("g")
    //  .attr("class", "y axis")
    //  .call(d3.axisLeft(this.y).ticks(5))

    //Append line path
    this.svg.append("path")
      .datum(coord)
      .attr("class", "line line" + this.index)
      .attr("clip-path", "url(#clip)")
      .style("stroke", this.color(this.index))
      .attr("d", this.line);

    //TITLE
        
    let label = isRailed ? 'RAILED' : Math.std(samples.slice(-256)).toFixed(2)+" uVrms";
    let _color = isRailed ? 'red' : 'white';
    
    this.uvrmsLabel.textContent = label;
    this.uvrmsLabel.style.color = _color;

    //this.svg.append("text")
    //    .attr("class", "label")
    //    .attr("x", 10)             
    //    .attr("y", this.margin.top)
    //    .attr("text-anchor", "left")  
    //    .style("font-size", "14px")
    //    .style("fill", _color)
    //    .text("chan #"+(this.index+1)+" - "+label);

  }

  clear(){
    this.remove(['line', 'axis'], this.id);
    document.getElementById(this.id).style.display = 'none';
    this.visible = false;
  }

  //data2coords(samples, timestamps){
  //  let coords = new Array();
  //  samples.forEach((sample, i) => {
  //    coords.push({x:timestamps[i],y:sample});
  //  });
  //  return coords;
  //}

  data2coords(samples, count){
    let coords = new Array();
    samples.forEach((sample, i) => {
      coords.push({x:count+i,y:sample});
    });
    return coords;
  }
  
  destroy(){
    const el = document.getElementById(this.id);
          el.remove();
  }
}