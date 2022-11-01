export async function autoConnect () {
    return await navigator.bluetooth.getDevices();
}
