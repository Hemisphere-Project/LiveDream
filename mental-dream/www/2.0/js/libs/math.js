/* ----------------------------------------------------------------------------------------------------
 * Math object extender, 2022
 * Created: 04/06/22 by Bastien DIDIER, Mentalista
 * 
 * Extends the functions of the Math object.
 * 
 * Update: 04/16/22 Current V.1.0
 * ----------------------------------------------------------------------------------------------------
 */


/**
 * Returns true if the given number is a power of two
 * @param  {Number}  x
 * @return {Boolean}
 */
Math.isPowerOfTwo = function(x){
    return Math.log2(x) % 1 === 0;
}

/**
 * Returns the next power of two of a given number
 * @param  {Number} x
 * @return {Number}
 */
Math.nextPowerOfTwo = function(x){
    let count = 0;
    if (x && !(x & (x - 1))) return x;
    while( x != 0){
        x >>= 1;
        count += 1;
    }
    return 1 << count;
}    

/**
 * Returns the nearest power of two of a given number
 * @param  {Number} x
 * @return {Number}
 */
Math.nearestPowerOfTwo = function(x){
   if(x < 0){ x *= -1; } // dealing only with non-negative numbers
   let base = 1;
   while(base < x){
      if(x - base < Math.floor(base / 2)) return base;
      base *= 2;
   };
   return base;
};

/**
 * Map given value in a range into another
 * @param   {number}  value    
 * @param   {number}  lowFrom  
 * @param   {number}  highFrom 
 * @param   {number}  lowTo    
 * @param   {number}  highTo   
 * @return  {number}           
 */
Math.map = function(value, lowFrom, highFrom, lowTo, highTo) {
    return lowTo + (highTo - lowTo) * (value - lowFrom) / (highFrom - lowFrom);
}

/**
 * Returns a universally unique identifier of 4 chars
 * @return {String}
 */
Math.uuid = function(){
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

/**
 * Returns the mean value of an array of numbers
 * @param  {Array}  array
 * @return {Number}
 */
Math.mean = function(array){
    const sum = array.reduce((a, b) => a + b, 0);
    return sum/array.length;
}

/**
 * Returns the median value of an array of numbers
 * @param  {Array}  array
 * @return {Number}
 */
Math.median = function(array){
    if(array.length === 0) return 0;
    array.sort(function(a,b){return a-b;});
    const half = Math.floor(array.length / 2);
    if (array.length % 2)return array[half];
    return (array[half - 1] + array[half]) / 2.0;
}

/**
 * Returns an arbitrary number inside a range
 * @param  {Number} min
 * @param  {Number} max
 * @return {Number}
 */
Math.getRandomArbitrary = function(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Returns an arbitrary number with a gausian distribution
 * @param  {Number} v
 * @return {Number}
 */
//Math.randomGaussian = function(v=1){
//  let r = 0;
//  for(let i = v; i > 0; i --){
//      r += Math.random();
//  }
//  return r / v;
//}
  
/**
   * Returns the standard deviation
   * @param  {Array}  array
   * @return {Number}
   */
Math.std = function(array){
  
  //calc mean
  const mean = Math.mean(array);

  //calc sum of squares relative to mean
  let val = 0;
  for (let i=0; i < array.length; i++) {
    val += Math.pow(array[i]-mean,2);
  }

  // divide by n to make it the average
  val /= array.length;

  //take square-root and return the standard
  return Math.sqrt(val);
}

Math.bandpass = function(raw, {Fs, F1, F2, order}){

  // Bandpass between F1 and F2 Hz      
  let firCalculator = new Fili.FirCoeffs();
  let coeffs = firCalculator.bandpass({order: order, Fs: Fs, F1: F1, F2: F2});
  let filter = new Fili.FirFilter(coeffs);

  // Bandpass filter the trial
  return filter.simulate(raw).slice(Fs);
}

Math.bandstop = function(raw, {Fs, stop, order}){

  // Bandstop between stop-1 and stop+1 Hz
  let firCalculator = new Fili.FirCoeffs();
  let coeffs = firCalculator.bandstop({order: order, Fs: Fs, F1: stop-1, F2: stop+1});
  let filter = new Fili.FirFilter(coeffs);

  // Bandstop filter the trial
  return filter.simulate(raw).slice(Fs);
}

Math.magnitude = function(buffer, sampleRate, windowFunction){
  const  fft = new Fili.Fft(sampleRate);
  // buffer.length must be greater or equal fft radix

  const  res = fft.forward(buffer.slice(-sampleRate), windowFunction);
  return fft.magnitude(res); // magnitude
}

Math.magToDb = function(buffer, sampleRate, windowFunction){
  const  fft = new Fili.Fft(sampleRate);
  // buffer.length must be greater or equal fft radix 
  const  res = fft.forward(buffer.slice(-sampleRate), windowFunction);
  
  return fft.magToDb( fft.magnitude(res) ); // magToDb
}

Math.psd = function(array){
  let p = new Array();
  for (let cnt = 0; cnt < array.length; cnt++) {
    p.push( Math.pow( array[cnt], 2 ) / cnt );
  }
  return p;
}

