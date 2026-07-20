// bluecat-reserve-ip-dns-fixed.js
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const BASE_URL = 'https://your-bluecat-bam.example.com';   // ← CHANGE THIS
const IGNORE_SSL_ERRORS = true;

async function main() {
    console.log("=== BlueCat IP + DNS Reservation (Fixed) ===\n");

    const token = await question("Paste your fresh API Token: ");
    const networkId = parseInt(await question("\nNetwork Collection ID: "));
    const ipAddress = await question("Static IP Address: ");
    const hostname = await question("Server Hostname: ");
    const domain = await question("Domain (optional): ") || "";
    const comment = await question("Comment (optional): ") || "Reserved via API";

    await reserveIPAndDNS(token.trim(), networkId, ipAddress, hostname, domain, comment);
}

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 401) {
                    console.log("401 Unauthorized - Check token format or permissions");
                }
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function reserveIPAndDNS(token, networkId, ipAddress, hostname, domain, comment) {
    const baseOptions = {
        hostname: BASE_URL.replace(/^https?:\/\//, ''),
        headers: {
            'Content-Type': 'application/json'
        },
        rejectUnauthorized: !IGNORE_SSL_ERRORS
    };

    // Try with Bearer prefix first (most common)
    console.log("\nTrying with Bearer token...");
    baseOptions.headers.Authorization = `Bearer ${token}`;

    // Step 1: Reserve IP
    const ipOptions = { ...baseOptions, path: `/api/v2/networks/${networkId}/ipAddresses`, method: 'POST' };

    try {
        console.log("Reserving IP...");
        await makeRequest(ipOptions, {
            address: ipAddress,
            name: hostname,
            type: "IP4Address",
            properties: { state: "STATIC", comments: comment }
        });
        console.log("✅ IP Reserved Successfully");
    } catch (e) {
        console.error("IP failed:", e.message);
        return;
    }

    // Step 2: DNS
    console.log("\nCreating DNS record...");
    const dnsOptions = { ...baseOptions, path: '/api/v2/resourceRecords', method: 'POST' };

    try {
        await makeRequest(dnsOptions, {
            type: "HostRecord",
            name: hostname,
            properties: {
                absoluteName: domain ? `${hostname}.${domain}`.replace(/\.+$/, '') : hostname,
                addresses: [ipAddress],
                reverseRecord: true
            }
        });
        console.log("✅ DNS Record Created");
    } catch (e) {
        console.error("DNS failed:", e.message);
    }
}

main();
