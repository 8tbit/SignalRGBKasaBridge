//const net = require('net');
import net from 'net';

function encrypt(payload) {
    let key = 171; // ✅ use let so it can be reassigned
    const buffer = Buffer.alloc(payload.length + 4);
    buffer.writeUInt32BE(payload.length, 0);
    for (let i = 0; i < payload.length; i++) {
        buffer[i + 4] = payload.charCodeAt(i) ^ key;
        key = buffer[i + 4]; // ✅ reassigning key is now legal
    }
    
    return buffer;
}


function decrypt(buffer) {
    let key = 171;
    const decrypted = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        decrypted[i] = buffer[i] ^ key;
        key = buffer[i];
    }

    return decrypted.toString();
}

function sendToKasa(ip, payload) {
    const encrypted = encrypt(payload);

    const client = new net.Socket();
    client.connect(9999, ip, () => {
        client.write(encrypted);
    });

    client.on('data', (data) => {
        const decrypted = decrypt(data.slice(4)); // skip length header    
        console.log("Response:", decrypted);

        client.destroy();
    });

    client.on('error', (err) => {
        console.error("Connection error:", err.message);
    });
}

function rgbToHsb(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b-r) / delta + 2;
        } else {
            h = (r-g) / delta + 4;
        }

        h *= 60;
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return {
        h: Math.round(h),
        s: Math.round(s * 100),
        b: Math.round(v * 100)
    };
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

const kasaIP = "10.0.0.93"; // Replace with your bulb's IP

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildKasaCommand(rgb) {
    const hsb = rgbToHsb(rgb.r, rgb.g, rgb.b);

    return {
        "smartlife.iot.smartbulb.lightingservice": {
            "transition_light_state": {
                "on_off": 1,
                "hue": hsb.h,
                "saturation": hsb.s,
                "brightness": hsb.b,
                "color_temp": 0,
                "mode": "normal",
                "transition_period": 0
            }
        }
    };
}


const devices = [
    {
        name: "Office Bulb 1",
        id: "kasa-1",
        ip: "10.0.0.93",
        zones: [0],
        capabilities: ["color"],
        type: "light"
    },
    {
        name: "Office Bulb 2",
        id: "kasa-2",
        ip: "10.0.0.238",
        zones:[1],
        capabilities: ["color"],
        type: "light"
    }
];

const updateInterval = 100; // ms
const lastUpdate = {};


async function onFrame() {
    const now = Date.now();

    for (const device of devices) {
        if (!lastUpdate[device.id] || now - lastUpdate[device.id] >= updateInterval) {
            const rgb = canvas.getColorAtZone(device.zones[0]);
            const command = buildKasaCommand(rgb);
            sendToKasa(device.ip, command);
            lastUpdate[device.id] = now;
        }
    }
}

function onInit() {
    console.log("Kasa plugin initialized");
}

function onClose() {
    console.log("Kasa plugin shutting down");
}

module.exports = {
    name: "Kasa Bulb Plugin",
    author: "Austin Berry",
    devices,
    type: "light",
    capabilities: ["color"],
    onInit,
    onFrame,
    onClose
}