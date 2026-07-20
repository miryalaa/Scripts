// bluecat-get-networks.js
const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const BASE_URL = 'https://your-bluecat-bam.example.com';   // ← CHANGE THIS

async function main() {
    const token = await question("Enter your API Token: ");

    console.log("\nFetching networks...");

    const options = {
        hostname: BASE_URL.replace(/^https?:\/\//, ''),
        path: '/api/v2/networks?limit=100',   // Increase limit if needed
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Content-Type': 'application/json'
        },
        rejectUnauthorized: false
    };

    https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`\nStatus: ${res.statusCode}`);

            if (res.statusCode === 200) {
                try {
                    const networks = JSON.parse(data);
                    if (Array.isArray(networks) && networks.length > 0) {
                        console.log(`\n✅ Found ${networks.length} Networks:\n`);
                        console.table(networks.map(n => ({
                            "Network ID": n.id,
                            "Name": n.name || "(No Name)",
                            "CIDR / Address": n.properties?.CIDR || n.properties?.address || "N/A"
                        })));
                    } else {
                        console.log("No networks found or empty response.");
                        console.log(data);
                    }
                } catch (e) {
                    console.log("Raw response:", data);
                }
            } else if (res.statusCode === 401) {
                console.log("❌ 401 Unauthorized - Token is invalid or expired");
            } else {
                console.log("Response:", data);
            }

            rl.close();
        });
    }).on('error', (err) => {
        console.error("Request error:", err.message);
        rl.close();
    });
}

main();
