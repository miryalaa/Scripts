// bluecat-reserve-ip-dns.js
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// ====================== CONFIG ======================
const BASE_URL = 'https://your-bluecat-bam.example.com';   // ← CHANGE THIS
const IGNORE_SSL_ERRORS = true;   // Set to false in production

async function main() {
    console.log("=== BlueCat Static IP + DNS Reservation (Pure Node.js) ===\n");

    try {
        const username = await question("Username: ");
        const password = await question("Password: ");

        const token = await login(username, password);

        const networkId = parseInt(await question("\nNetwork Collection ID: "));
        const ipAddress = await question("Static IP Address: ");
        const hostname = await question("Server Hostname: ");
        const domain = await question("Domain (optional): ") || "";
        const comment = await question("Comment (optional): ") || "Reserved via API";

        await reserveIPAndDNS(token, networkId, ipAddress, hostname, domain, comment);

    } catch (error) {
        console.error("\n❌ Error:", error.message);
    } finally {
        rl.close();
    }
}

function makeRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data || 'No response'}`));
                    }
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function login(username, password) {
    const options = {
        hostname: BASE_URL.replace(/^https?:\/\//, ''),
        path: '/api/v2/sessions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        rejectUnauthorized: !IGNORE_SSL_ERRORS
    };

    console.log("🔑 Logging in...");
    const data = await makeRequest(options, { username, password });
    const token = data.apiToken || data.token;

    if (!token) throw new Error("Failed to get API token");
    console.log("✅ Login successful");
    return token;
}

async function reserveIPAndDNS(token, networkId, ipAddress, hostname, domain, comment) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const baseOptions = {
        hostname: BASE_URL.replace(/^https?:\/\//, ''),
        headers,
        rejectUnauthorized: !IGNORE_SSL_ERRORS
    };

    // 1. Reserve Static IP
    console.log(`\n📌 Reserving Static IP ${ipAddress}...`);
    const ipOptions = { ...baseOptions, path: `/api/v2/networks/${networkId}/ipAddresses`, method: 'POST' };

    try {
        await makeRequest(ipOptions, {
            address: ipAddress,
            name: hostname,
            type: "IP4Address",
            properties: { state: "STATIC", comments: comment }
        });
        console.log("✅ Static IP reserved successfully");
    } catch (err) {
        console.error("❌ IP Reservation failed:", err.message);
        return;
    }

    // 2. Create DNS Record
    console.log(`\n🌐 Creating DNS Host Record for ${hostname}...`);
    const dnsOptions = { ...baseOptions, path: '/api/v2/resourceRecords', method: 'POST' };

    try {
        await makeRequest(dnsOptions, {
            type: "HostRecord",
            name: hostname,
            properties: {
                absoluteName: domain ? `${hostname}.${domain}`.replace(/\.+$/, '') : hostname,
                addresses: [ipAddress],
                reverseRecord: true,
                ttl: 3600,
                comments: comment
            }
        });
        console.log("✅ DNS Host Record created successfully");
    } catch (err) {
        console.error("❌ DNS creation failed:", err.message);
    }

    console.log("\n🎉 Operation completed!");
}

// Run
main();
