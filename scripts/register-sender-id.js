const axios = require('axios');
require('dotenv').config();

async function registerSenderId() {
    const apiUrl = process.env.DOJAH_API_URL;
    const appId = process.env.DOJAH_APP_ID;
    const privateKey = process.env.DOJAH_PRIVATE_KEY;
    const senderId = 'PROMISEPTA'; // Max 10 characters (shortened from PROMISEPOINT)

    console.log('Registering Sender ID with Dojah...');
    console.log(`API URL: ${apiUrl}`);
    console.log(`App ID: ${appId}`);
    console.log(`Sender ID: ${senderId}`);
    console.log(`Private Key (first 15 chars): ${privateKey?.substring(0, 15)}...`);

    try {
        const response = await axios.post(
            `${apiUrl}/api/v1/messaging/sender_id`,
            {
                sender_id: senderId
            },
            {
                headers: {
                    'Authorization': privateKey,
                    'AppId': appId,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('\n✅ SUCCESS! Sender ID registered successfully');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('\n❌ ERROR registering Sender ID');
        console.error('Error message:', error.message);

        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }

        process.exit(1);
    }
}

// Run the script
registerSenderId();
