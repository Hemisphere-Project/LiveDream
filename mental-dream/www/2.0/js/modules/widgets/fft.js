import { Chart } from "./chart.js";

export class Fft extends Chart {

  constructor(sensor){

    super();

    this.container = sensor.id;
    this.id = this.uuid(this.container || 'chart');

    this.parent;

    this.margin = {
      top:     0,
      right:   0,
      bottom:  0,
      left:    20
    };

    this.width = (200) - this.margin.left - this.margin.right;
    this.height = (150) - this.margin.top - this.margin.bottom;

    this.x;
    this.y;

    this.yDomain = 0;
    //this.yDomainMin = 0;
    
    this.auto = false;

    this.amplitude = 150;

    this.line;
    this.svg;

    this.isScaleLog = false;

    //this.init();
  }

  /**
   * Create the svg element in the container
   */
  init(){

    const el = document.createElement("div");
          el.setAttribute("class", "fft");

    this.parent = document.getElementById(this.container);
    this.parent.querySelector('.data').appendChild(el);
    
    //this.width = this.parent.clientWidth - this.margin.left - this.margin.right;
    //this.height = this.parent.clientHeight - this.margin.left - this.margin.right;

    this.svg = d3.select('[id="'+this.container+'"] .fft').append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .attr("id", this.id)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    //this.update({samples:[{fft:[0]}],activeChan:[0]});
  }

  /**
   * Update chart with sample data
   * @param  {Object} data
   */
  update(dsp){

    const coord = this.data2coords(dsp.samples, dsp.activeChan);
    
    this.remove(['line', 'axis'], this.id);

    //const max = (array) => {
    //  return Math.max(...array.map(a => {
    //    return a.map(d => {return d.y})
    //  }).flat());
    //}
    //
    //const min = (array) => {
    //  return Math.min(...array.map(a => {
    //    return a.map(d => {return d.y})
    //  }).flat());
    //}

    const self = this;

    this.line = d3.line()
      .x(function(d) {
        return self.x(d.x);
      })
      .y(function(d) {
        return self.y(d.y);
      });

    this.x = d3.scaleLinear().range([0, this.width]).domain([0, coord[Object.keys(coord)[0]].length ]);

    // Y AXIS
    if(this.auto == true){
      coord.forEach(dta => {
        this.yDomain = Math.max(this.yDomain, dta.map(d => d.y).reduce((a, c) => Math.max(a, c)));  
      });
    }

    const min = this.isScaleLog ? 1 : 0;
    const domain = this.auto == true ? [min, this.yDomain] : [min, this.amplitude];
    
    //this.y = this.isScaleLog ? d3.scaleLog().domain(domain).range([this.height, 0]) : d3.scaleLinear().domain(domain).range([this.height, 0]);
    this.y = d3[this.isScaleLog ? 'scaleLog' : 'scaleLinear']().domain(domain).range([this.height, 0]);

    //Update bottom axis
    //this.svg.append("g")
    //  .attr("class", "x axis")
    //  .call(d3.axisBottom(this.x))
    //  .attr("transform", "translate(0," + this.height + ")");

    ////Update left axis
    //this.svg.append("g")
    //  .attr("class", "y axis")
    //  .call(d3.axisLeft(this.y))

    //let bisect = d3.bisector(function(d) { return d.x; }).left;

    // Create the circle that travels along the curve of chart
    //let focus = this.svg.append('g').append('circle')
    //  .style("fill", "none")
    //  .attr("stroke", "black")
    //  .attr('r', 8.5)
    //  .style("opacity", 0)

    //let focus = this.svg.append('g').append('line')
    //  .style("fill", "none")
    //  .attr("stroke", "black")
    //  .style("opacity", 0)

    //// Create the text that travels along the curve of chart
    //let focusText = this.svg.append('g').append('text')
    //  .style("opacity", 0)
    //  .attr("text-anchor", "left")
    //  .attr("alignment-baseline", "middle")

    //this.svg.append('rect')
    //.style("fill", "none")
    //.style("pointer-events", "all")
    //.attr('width', this.width)
    //.attr('height', this.height)
    //.on('mouseover', mouseover)
    //.on('mousemove', mousemove)
    //.on('mouseout', mouseout);

    //function mouseover() {
    //  focus.style("opacity", 1)
    //  focusText.style("opacity",1)

    //  // recover coordinate we need
    //  var x0 = self.x.invert(d3.mouse(this)[0]);
    //  var i = bisect(coord[Object.keys(coord)[0]], x0, 1);
    //  let selectedData = coord[Object.keys(coord)[0]][i];

    //  focus
    //    .attr("x1", self.x(selectedData.x))
    //    .attr("y1", self.height)
    //    .attr("x2", self.x(selectedData.x))
    //    .attr("y2", 0);
    //  focusText
    //    .html(selectedData.x+"Hz")
    //    .attr("x", self.x(selectedData.x)+10)
    //    .attr("y", self.height - 15)
    //}

    //function mousemove() {}

    //function mouseout() {
    //  focus.style("opacity", 0)
    //  focusText.style("opacity", 0)
    //}

    coord.forEach((dta, idx) => {

      this.svg.append("path")
        .datum(dta)
        .attr("class", "line line" + idx)
        .attr("clip-path", "url(#clip)")
        .style("stroke", this.color(idx))
        .attr("d", this.line);
    });
  }

  data2coords(data, active){
    let array = new Array();
    for (let i = 0; i < data.length; i++) {
      if( active.includes(i) ){
        let coords = new Array();
        if(data[i]?.fft){
          data[i].fft.forEach((cn, j) => {
            coords.push({x:j,y:cn < 0 ? 0 : cn});  
          });
          
          //coords.shift(); // Remove 0Hz ?
          
          coords = coords.splice(0, Math.ceil(coords.length / 2))
          array[i] = coords;
        }
      }
    }
    return array;
  }

  destroy(){
    const el = document.getElementById(this.id);
          el.remove();
  }

  resize(w,h){

    //this.width = this.parent.clientWidth - this.margin.left - this.margin.right;
    //this.height = this.parent.clientHeight - this.margin.left - this.margin.right;

    //this.svg.attr("width", this.width + this.margin.left + this.margin.right)
    //        .attr("height", this.height + this.margin.top + this.margin.bottom);
  }
}