/* ----------------------------------------------------------------------------------------------------
 * DSP, 2022
 * Created: 01/01/22 by Bastien DIDIER, Mentalista
 * 
 * Update: 04/12/22 Current V.1
 * ----------------------------------------------------------------------------------------------------
 */

export class DSP {

	constructor(_sampleRate){

		this.sampleRate = _sampleRate; // Must be 2^n
		this.bufferLength = this.sampleRate * 5;

		this.isChannelFillAuto = true; // TODO From options
		this.selectedChan = [7]; // 0 - 7 // TODO From options

		this.chanCount;
		this.activeChan;
		
		this.isStarted = false;

		this.adcinterval; //populate at device init

		this.isFiltered = true;
		this.lowFreq = 1;
		this.highFreq = 70;
		this.filterOrder = 128;
		this.notch = 50;

		this.fftWindowFunctions = 'hanning';

		this.isFftFiltered = true;

		this.samples = new Array();

		this.find = {
		  delta: (real) => {
		    const from = 1;
		    const to = 4;
		    return this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to));
		  },
		  theta: (real) => {
		    const from = 4;
		    const to = 8;
		    return this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to));
		  },
		  alpha: (real) => {
		    const from = 9;
		    const to = 12;
		    //return this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to));
		    return 20 * Math.log10( this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to)) );
		  },
		  beta: (real) => {
		    const from = 12;
		    const to = 30;
		    //return this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to));
		    return 20 * Math.log10( this.findPeakFrequency(real, from, to) / Math.mean(real.slice(from, to)) );
		  },
		  gamma: (real) => {
		    const from = 30;
		    const to = 45;
		    return this.findPeakFrequency(real, from, to) - Math.mean(real.slice(from, to));
		  }
		}
	}

	init(){
		for(let chan = 0; chan < this.chanCount; chan++){
			this.samples[chan.toString()] = {
				timestamps: Array(this.bufferLength).fill().map((_,i) => Date.now() - (i*this.adcinterval) ).reverse(),
				raw:        Array(this.bufferLength).fill(0),
				filtered:   Array(this.bufferLength).fill(0),
				fft:        Array(this.bufferLength).fill(0),
				bands: {
					delta:  null,
					theta:  null,
					alpha:  null,
					beta:   null,
					gamma:  null
				},
				std:        0,
				count:      0,
				isRailed:   false
			}
		}
	}

	populate(sample, scaleFactor){

		if(!this.isStarted) this.isStarted = true;

		for (const chan in sample.data) {

			this.samples[chan].raw.push(...sample.data[chan]);
			this.samples[chan].count += sample.data[chan].length;

			this.samples[chan].isRailed = this.isRailed( this.samples[chan].raw.slice(-1), scaleFactor());

			//Move timestamp to global
			for(let l = 0; l < sample.data[chan].length; l++){
				this.samples[chan].timestamps.push(sample.timestamp+(l*this.adcinterval));
			}

			if(this.samples[chan].raw.length > this.bufferLength){
				this.samples[chan].raw = this.samples[chan].raw.slice(-this.bufferLength);
			}

			//TODO MERGE with RAW
			if(this.samples[chan].timestamps.length > this.bufferLength){
				this.samples[chan].timestamps = this.samples[chan].timestamps.slice(-this.bufferLength);
			}
		}
	}

	process(){
		for (const chan in this.samples) {
			if(!this.activeChan.includes(parseInt(chan))) continue;

			/* ––––––––––––––
			     BANDPASS
			–––––––––––––– */
			
			if(this.isFiltered){
				//this.samples[chan].filtered = Math.bandstop(this.samples[chan].raw, {Fs: this.sampleRate, stop: this.notch, order: this.filterOrder});
				this.samples[chan].filtered = Math.bandpass(this.samples[chan].raw, {Fs: this.sampleRate, F1: this.lowFreq, F2: this.highFreq, order: this.filterOrder});
			}

			//this.samples[chan].filtered = this.mean(this.samples[chan].filtered);

			/* ––––––––––––––
			       FFT
			–––––––––––––– */

			//FFT MAGNITUDE			
			//this.samples[chan].fft = Math.magnitude(this.isFftFiltered ? this.samples[chan].filtered : this.samples[chan].raw, this.sampleRate, this.fftWindowFunctions);
			//this.samples[chan].fft = Math.psd( Math.magnitude(this.isFftFiltered ? this.samples[chan].filtered : this.samples[chan].raw, this.sampleRate, this.fftWindowFunctions) );
			
			this.samples[chan].fft = Math.magToDb(this.isFftFiltered ? this.samples[chan].filtered : this.samples[chan].raw, this.sampleRate, this.fftWindowFunctions);
			
			//const scaleFactor = () => { return ((4.5 / 24) / (Math.pow(2, 23) - 1)) * 1000000; };
			//this.samples[chan].fft = this.samples[chan].fft.map(i => i * scaleFactor());
			
			/* ––––––––––––––
			       STD
			–––––––––––––– */

			this.samples[chan].std = Math.std(this.isFiltered ? this.samples[chan].filtered.slice(-this.sampleRate) : this.samples[chan].raw.slice(-this.sampleRate));

			/* ––––––––––––––
			   POWER BANDS
			–––––––––––––– */

			//TODO : POWER BANDS
			for(let rythm in this.samples[chan].bands){
				this.samples[chan].bands[rythm] = this.find[rythm](this.samples[chan].fft);
			}
		}
	}

	//smoothingFFT(fftBuff, prevFFTdata){
	//	
	//	//average the FFT with previous FFT data so that it makes it smoother in time
    //	let min_val = 0.01;
    //	let res = new Array();

    //	let smoothFac = [0.0, 0.5, 0.75, 0.9, 0.95, 0.98]; //used by FFT & Headplot
    //	let smoothFac_ind = 3;

	//	for (let i=0; i < fftBuff.length; i++) {   //loop over each fft bin
	//		if (prevFFTdata[i] < min_val) prevFFTdata[i] = min_val; //make sure we're not too small for the log calls
	//		let foo = fftBuff[i];
	//		if (foo < min_val) foo = min_val; //make sure this value isn't too small

	//		if (true) {
	//			//smooth in dB power space
	//			foo =   (1.0-smoothFac[smoothFac_ind]) * Math.log(Math.pow(foo, 2));
	//			foo += smoothFac[smoothFac_ind] * Math.log(Math.pow(prevFFTdata[i], 2));
	//			foo = Math.sqrt(Math.exp(foo)); //average in dB space
	//		} else {
	//			//smooth (average) in linear power space
	//			foo =   (1.0-smoothFac[smoothFac_ind]) * Math.pow(foo, 2);
	//			foo += smoothFac[smoothFac_ind] * Math.pow(prevFFTdata[i], 2);
	//			// take sqrt to be back into uV_rtHz
	//			foo = Math.sqrt(foo);
	//		}

	//		res[i] = foo;
	//		
	//		//fftBuff[Ichan].setBand(i, (float)foo); //put the smoothed data back into the fftBuff data holder for use by everyone else
	//		// fftBuff[ichan].setBand(i, 1.0f);  // test
	//	} //end loop over FFT bins

	//	return res;
	//}

	mean(array){
		const m = Math.mean(array);
		array.map(v => v - m);
		return array;
	}

	isRailed(_last, _scaleFactor){
		const last  = parseInt( Math.abs( _last ) )
		const scale = parseInt( ( _scaleFactor * Math.pow(2,24) ) /2 ) 
		return last == scale ? true : false;
	}

	findPeakFrequency(real, from, to){
	  if(real.length >= to){
	    const maxReducedValue = Math.max(...real.slice(from-1, to));
	    return maxReducedValue;
	  } else {
	    //console.warn('fft real lower than '+to);
	    return;
	  }
	}
}

