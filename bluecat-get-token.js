// bluecat-get-token.js
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

// Ignore self-signed certificates (remove in production or use proper CA)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

async function getBlueCatTokens() {
    try {
        const username = await question('Enter username: ');
        const password = await question('Enter password: ');

        console.log('\n🔑 Logging in to BlueCat...');

        // 1. Get API Token (v2 /sessions endpoint)
        const loginUrl = `${BASE_URL}/api/v2/sessions`;
        
        const response = await axios.post(loginUrl, {
            username: username,
            password: password
        }, {
            httpsAgent: httpsAgent,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        const apiToken = data.apiToken || data.token;

        console.log('\n✅ Login Successful!');
        console.log('🔑 API Token (Bearer):');
        console.log(apiToken);

        // 2. Basic Auth Token (Base64 encoded username:password)
        const basicAuthString = Buffer.from(`${username}:${password}`).toString('base64');
        console.log('\n🔑 Basic Auth Token:');
        console.log(`Basic ${basicAuthString}`);

        // Optional: Show full response
        console.log('\n📋 Full Response:');
        console.dir(data, { depth: null });

        return { apiToken, basicAuth: `Basic ${basicAuthString}` };

    } catch (error) {
        console.error('\n❌ Error:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        rl.close();
    }
}

// Run the script
getBlueCatTokens();
