// api/webhook.js
const axios = require('axios');

module.exports = async (req, res) => {
  console.log('--- Webhook received:', req.method);

  if (req.method === 'GET') {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    }
    console.log('❌ Webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      console.log('Body snippet:', JSON.stringify(req.body).slice(0, 200), '...');
      const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!msg) {
        console.log('No messages to process');
        return res.status(200).end();
      }
      console.log('Incoming WhatsApp message:', msg);

      // Conversion API call
      const pixelId = process.env.PIXEL_ID;
      const url = `https://graph.facebook.com/v16.0/${pixelId}/events`;
      const payload = {
        data: [{
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'whatsapp'
        }]
      };

      const response = await axios.post(url, payload, {
        params: { access_token: process.env.CAPI_ACCESS_TOKEN }
      });

      console.log('✅ Lead recorded:', response.data);
      return res.status(200).end();
    } catch (err) {
      console.error('🔥 Internal error in webhook POST:', err);
      return res.status(500).send('Server error');
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method not allowed');
};
