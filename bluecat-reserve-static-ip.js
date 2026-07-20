// bluecat-reserve-static-ip.js
const fetch = require('node-fetch'); // npm install node-fetch@2

async function reserveStaticIP(config) {
    const { bamUrl, username, password, zoneNameOrId, hostname, ipAddress, comments = '' } = config;

    // Login
    const loginRes = await fetch(`${bamUrl}/api/v2/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!loginRes.ok) throw new Error('Login failed');
    const { token } = await loginRes.json();

    // Resolve zone ID
    let zoneId = zoneNameOrId;
    if (isNaN(zoneNameOrId)) {
        const search = await fetch(`${bamUrl}/api/v2/zones?filter=name==${encodeURIComponent(zoneNameOrId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const zones = await search.json();
        if (zones.length === 0) throw new Error('Zone not found');
        zoneId = zones[0].id;
    }

    // Create HostRecord with STATIC IP
    const payload = {
        type: "HostRecord",
        name: hostname,
        addresses: [{ type: "IPv4Address", address: ipAddress, state: "STATIC" }]
    };

    if (comments) payload.properties = `comments=${comments}`;

    const res = await fetch(`${bamUrl}/api/v2/zones/${zoneId}/resourceRecords`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error ${res.status}: ${errText}`);
    }

    return await res.json();
}

// Usage example
async function main() {
    const result = await reserveStaticIP({
        bamUrl: 'https://your-bam.example.com',
        username: 'api-user',
        password: 'your-password',
        zoneNameOrId: 'example.com',   // or numeric zone ID
        hostname: 'server01',
        ipAddress: '10.0.0.55',
        comments: 'Reserved via automation script'
    });

    console.log('Success:', result);
}

main().catch(console.error);
