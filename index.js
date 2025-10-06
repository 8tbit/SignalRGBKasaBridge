const net = require('net');

function sendToKasa(ip, command) {
    const client = new net.Socket();
    const encrypted = encrypt(command);
    client.connect(9999, ip, () => {
        client.write(encrypted);
        client.end();
    });
}