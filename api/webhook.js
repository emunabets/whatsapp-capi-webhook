// api/webhook.js
const express    = require('express');
const bodyParser = require('body-parser');
const axios      = require('axios');
const crypto     = require('crypto');

const app = express();
app.use(bodyParser.json());

// —————— CONFIGURA ESTO ——————
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN    = process.env.WHATSAPP_TOKEN;
const PIXEL_ID          = process.env.PIXEL_ID;
const CAPI_ACCESS_TOKEN = process.env.CAPI_ACCESS_TOKEN;
// ————————————————————————

// 1) Verificación del webhook
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// 2) Recepción de mensajes entrantes
app.post('/', async (req, res) => {
  try {
    const entry   = req.body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const msg     = changes?.messages?.[0];
    if (msg?.from && msg.type === 'text') {
      // Hash SHA-256 del teléfono
      const phoneHash = crypto.createHash('sha256')
                              .update(msg.from)
                              .digest('hex');

      // Payload para Conversions API
      const capiPayload = {
        data: [{
          event_name:    'Lead',
          event_time:    Math.floor(Date.now()/1000),
          action_source: 'whatsapp',
          user_data:     { ph: phoneHash }
        }]
      };

      // Envío a Facebook CAPI
      await axios.post(
        `https://graph.facebook.com/v16.0/${PIXEL_ID}/events`,
        capiPayload,
        { params: { access_token: CAPI_ACCESS_TOKEN } }
      );
    }
    res.sendStatus(200);
  } catch (e) {
    console.error('Webhook error:', e.response?.data || e.message);
    res.sendStatus(500);
  }
});

module.exports = app;
