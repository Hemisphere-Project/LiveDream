/* ----------------------------------------------------------------------------------------------------
 * Websocket server, 2022
 * Created: 06/03/22 by Gille de Bast
 *
 * Updated: 08/03/22 Current V.1
 * ----------------------------------------------------------------------------------------------------
 */

// Importing the required modules
const WebSocketServer = require('ws');

// Creating a new websocket server on port 8080
const wss = new WebSocketServer.Server({ port: 8080 })
 
// Creating connection using websocket
wss.on("connection", ws => {
    
    //Inform the user that a new client is connected
    console.log("💻 New client connected\n");

    // Receiving message
    ws.on("message", buffer => {

        //Parses receive data as json
        const data = JSON.parse(buffer);
        
        //Log the data in the console
        console.log(data);

    });

    // Handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("👋 The client has disconnected");
    });
    
    // Handling client connection error
    ws.onerror = () => {
        console.log("Some Error occurred");
    }
});

//Inform the user that the server is active
console.log("🚀 The WebSocket server is running on port 8080");