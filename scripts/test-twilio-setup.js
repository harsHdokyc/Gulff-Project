// Test script for Twilio WhatsApp setup
// Run with: node test-twilio-setup.js

import twilio from 'twilio';

// Your actual Twilio credentials
const accountSid = 'ACa4a3c82c2522ccc311b6329574514c73';
const authToken = '5d8b3e2eb82c67c4cda9c04061e4a5d1';
const twilioNumber = 'whatsapp:+14155238886';
const yourNumber = 'whatsapp:+917742054087';

const client = twilio(accountSid, authToken);

async function testWhatsApp() {
  try {
    console.log('Testing Twilio WhatsApp setup...');
    console.log('From:', twilioNumber);
    console.log('To:', yourNumber);
    
    // Test with content template (as you provided)
    const message = await client.messages.create({
      from: twilioNumber,
      contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
      contentVariables: '{"1":"12/1","2":"3pm"}',
      to: yourNumber
    });

    console.log('✅ Success! Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('Check your WhatsApp for the test message.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 21614) {
      console.log('💡 Tip: Make sure you joined the WhatsApp sandbox first');
    }
    
    if (error.code === 21211) {
      console.log('💡 Tip: Check if the phone number format is correct (whatsapp:+countrycode+number)');
    }
    
    if (error.code === 21610) {
      console.log('💡 Tip: Content template not found or not approved');
    }
  }
}

// Check credentials function
function checkCredentials() {
  if (accountSid === 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' || authToken === 'your_auth_token') {
    console.log('❌ Please update your credentials in this file');
    return false;
  }
  return true;
}

if (checkCredentials()) {
  testWhatsApp();
}
