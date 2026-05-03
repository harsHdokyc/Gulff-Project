// Test script for Twilio WhatsApp setup
// Run with: node test-twilio-setup.js

import twilio from 'twilio';

// Your Twilio credentials - use environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token';
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const yourNumber = process.env.YOUR_WHATSAPP_NUMBER;

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
  if (!accountSid || !authToken || !twilioNumber || !yourNumber) {
    console.log('❌ Please set all required environment variables:');
    console.log('   TWILIO_ACCOUNT_SID');
    console.log('   TWILIO_AUTH_TOKEN');
    console.log('   TWILIO_WHATSAPP_NUMBER');
    console.log('   YOUR_WHATSAPP_NUMBER');
    return false;
  }
  return true;
}

if (checkCredentials()) {
  testWhatsApp();
}
