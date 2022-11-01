/**
 * Filters used to return only devices that match some advertised Bluetooth GATT services and/or the device name.
 * @type {Object}
 */
export const filters = {
	filters: [{namePrefix: 'M0'}],
    optionalServices: ['12345678-1234-5678-1234-56789abcdef0', 'battery_service', 'device_information'],
	multiple: true
};