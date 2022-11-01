export class Chart {
	constructor(){}
	
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

	/**
	 * Remove d3 element
	 * @param  string||array  els  Class(es) name
	 * @param  string         id   chart identifier
	 */
	remove(els, id){
		if(Array.isArray(els)){
			els.forEach(el => {
				d3.selectAll('[id="'+id+'"] .'+el).remove();
			});
		} else {
			d3.selectAll('[id="'+id+'"] .'+els).remove();
		}
	}

	/**
	 * Returns a color from an array
	 * @param  {Number} i
	 * @return {String}
	 */
	color(i){
		const colors = ['#C51515','#8815C5','#1536C5','#15C5BA','#15C52D','#DBE911','#E97D11','#8C2A0E','#C51515','#8815C5','#1536C5','#15C5BA','#15C52D','#DBE911','#E97D11','#8C2A0E'];
		//return colors?.[i] ? colors[i] : '#000000';
		return '#888';
	}	
}