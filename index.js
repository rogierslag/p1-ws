const express = require('express');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const P1Reader = require('p1-reader');
const page = fs.readFileSync('./index.html').toString()
	.replace('%WSS_URL%', process.env.WSS_URL || 'ws://localhost:3000');

const app = express();
app.get('/', function (req, res) {
	console.log('Sending down our HTML');
	res.type('text/html').send(page);
})

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({server});
wss.on('connection', (ws) => {
	ws.isAlive = true;

	ws.on('pong', () => {
		ws.isAlive = true;
	});

	ws.send(JSON.stringify({connected : true}));
});

// Clear anyone who didn't respond to ping in 10 seconds
setInterval(() => {
	wss.clients.forEach(ws => {
		if (!ws.isAlive) {
			console.log('Terminating a non responding connection');
			return ws.terminate();
		}

		ws.isAlive = false;
		ws.ping(null, false, true);
	});
}, 10000);

function startP1() {
	try {
		const p1Options = process.env.WSS_URL ? {
			debug : Boolean(process.env.DEBUG),
			port : '/dev/ttyUSB0',
			baudRate : process.env.BAUD_RATE ? Number(process.env.BAUD_RATE) : 115200,
			parity : process.env.PARITY ?? 'none',
			dataBits : process.env.DATA_BITS ? Number(process.env.DATA_BITS) : 8,
			stopBits : process.env.STOP_BITS ? Number(process.env.STOP_BITS) : 1,
		} : {emulator : true, emulatorOverrides : {interval : 2}};

		const p1Reader = new P1Reader(p1Options);

		p1Reader.on('connected', data => console.log('connected', data));
		p1Reader.on('error', data => console.error('error', data));
		p1Reader.on('close', data => console.warn('close', data));

		p1Reader.on('reading', data => {
			wss.clients.forEach(ws => ws.send(JSON.stringify(data.electricity.instantaneous.power)));
			if (data.electricity.instantaneous.power.positive.L1.reading === null && data.electricity.instantaneous.power.positive.L1.unit === null) {
				// Something is off
				console.error('Not getting any values, probably incorrect connection made to meter. Restarting');
				process.exit(2);
			}
		});
	} catch (e) {
		console.error('Something threw, restarting', e);
		process.exit(1); // Exit uncleanly, and let docker restart instead
	}
}

// Start slightly delayed so Docker will be all ready
setTimeout(startP1, 2500);

// Handle all uncaught errors without crashing
process.on('uncaughtException', error => {
	console.error('Uncaught error occurred', error);
	process.exit(1); // Exit uncleanly, and let docker restart instead
});

//start our server
server.listen(process.env.PORT || 3000, () => {
	console.log(`Server started on port ${server.address().port} :)`);
});
