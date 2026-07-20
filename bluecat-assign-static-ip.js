// bluecat-assign-static-ip.js
const axios = require('axios');
const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// ====================== CONFIG ======================
const BASE_URL = 'https://your-bluecat-bam.example.com';   // ← CHANGE THIS

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function main() {
    try {
        const username = await question('Enter username: ');
        const password = await question('Enter password: ');

        console.log('\n🔑 Logging in...');
        const token = await login(username, password);

        // === USER INPUTS ===
        const networkId = parseInt(await question('Enter Network Collection ID: '));
        const ipAddress = await question('Enter Static IP Address: ');
        const hostname = await question('Enter Hostname: ');
        const domain = await question('Enter Domain (optional): ') || '';
        const comment = await question('Enter Comment (optional): ') || 'Assigned via API';

        // Assign IP and create DNS only on success
        const ipSuccess = await assignStaticIP(token, networkId, ipAddress, hostname, comment);

        if (ipSuccess) {
            await createDNSRecord(token, hostname, domain, ipAddress, comment);
        } else {
            console.log('\n⚠️ Skipping DNS creation due to IP assignment failure.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        rl.close();
    }
}

async function login(username, password) {
    const url = `${BASE_URL}/api/v2/sessions`;
    const res = await axios.post(url, { username, password }, { httpsAgent });
    
    const token = res.data.apiToken || res.data.token;
    if (!token) throw new Error('No token received');

    console.log('✅ Login successful');
    return token;
}

async function assignStaticIP(token, networkId, ipAddress, hostname, comment) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log(`\n📌 Assigning Static IP ${ipAddress} ...`);

    const ipPayload = {
        address: ipAddress,
        name: hostname,
        type: "IP4Address",
        properties: {
            state: "STATIC",
            comments: comment
        }
    };

    const ipUrl = `${BASE_URL}/api/v2/networks/${networkId}/ipAddresses`;

    try {
        await axios.post(ipUrl, ipPayload, { headers, httpsAgent });
        console.log('✅ Static IP assigned successfully');
        return true;
    } catch (err) {
        console.error('❌ Failed to assign IP:', err.response?.status || err.message);
        if (err.response?.data) console.dir(err.response.data, { depth: 1 });
        return false;
    }
}

async function createDNSRecord(token, hostname, domain, ipAddress, comment) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log(`\n🌐 Creating DNS Host Record for ${hostname}...`);

    const dnsPayload = {
        type: "HostRecord",
        name: hostname,
        properties: {
            absoluteName: domain ? `${hostname}.${domain}`.replace(/\.+$/, '') : hostname,
            addresses: [ipAddress],
            reverseRecord: true,
            ttl: 3600,
            comments: comment
        }
    };

    const dnsUrl = `${BASE_URL}/api/v2/resourceRecords`;

    try {
        await axios.post(dnsUrl, dnsPayload, { headers, httpsAgent });
        console.log('✅ DNS Record created successfully');
        return true;
    } catch (err) {
        console.error('❌ Failed to create DNS record:', err.response?.status || err.message);
        if (err.response?.data) console.dir(err.response.data);
        return false;
    }
}

// Run
main();
