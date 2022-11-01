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

/**
 * Interpret long to a ByteArray
 * 
 * @param  {Number} long (8 bytes)
 * @return {Array}
 */
export const longToByteArray = function(long){

	let byteArray = [0, 0, 0, 0, 0, 0, 0, 0];

	for ( let i = 0; i < byteArray.length; i++) {
	    let byte = long & 0xff;
	    byteArray [ i ] = byte;
	    long = (long - byte) / 256 ;
	}
	return byteArray;
};

/**
 * Interpret int to a ByteArray
 * 
 * @param  {Number} int (4 bytes)
 * @return {Array}
 */
export const intToByteArray = function(int){

	let byteArray = [0, 0, 0, 0];

	for ( let i = 0; i < byteArray.length; i++) {
	    let byte = int & 0xff;
	    byteArray [ i ] = byte;
	    int = (int - byte) / 256 ;
	}
	return byteArray;
};

