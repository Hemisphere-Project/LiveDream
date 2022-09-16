/**
 * Interpret 16 bit buffer to an Int 32
 * 
 * @param  {ArrayBuffer} buffer
 * @return {Number}
 */
 export const from16bitToInt32 = function(buffer){
	let array = new Uint8Array(buffer);
	return (array[0] << 8) | array[1];
}

/**
 * Interpret 24 bit buffer to an Int 32
 * 
 * @param  {ArrayBuffer} buffer
 * @return {Number}
 */
export const from24bitToInt32 = function(buffer){
	let array = new Uint8Array(buffer);
	let prefix = array[0] > 127 ? 255 : 0;
	return (prefix << 24) | (array[0] << 16) | (array[1] << 8) | array[2];
}