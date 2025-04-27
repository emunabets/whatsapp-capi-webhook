// api/webhook.js
const axios  = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // ==== 1) Verificación del webhook por GET ====
  if (req.method === 'GET') {
    const mode       = req.query['hub.mode'];
    const token      = req.query['hub.verify_token'];
    const challenge  = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      // Respondemos con el challenge que envía Meta
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  // ==== 2) Recepción de mensajes entrantes por POST ====
  if (req.method === 'POST') {
    try {
      const entry   = req.body.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const msg     = changes?.messages?.[0];

      if (msg?.from && msg.type === 'text') {
        // Hash SHA256 del teléfono
        const phoneHash = crypto
          .createHash('sha256')
          .update(msg.from)
          .digest('hex');

        // Preparamos el payload para Conversion API
        const capiPayload = {
          data: [{
            event_name:    'Lead',
            event_time:    Math.floor(Date.now()/1000),
            action_source: 'whatsapp',
            user_data:     { ph: phoneHash }
          }]
        };

        // Llamamos a Facebook Conversion API
        await axios.post(
          `https://graph.facebook.com/v16.0/${process.env.PIXEL_ID}/events`,
          capiPayload,
          { params: { access_token: process.env.CAPI_ACCESS_TOKEN } }
        );
      }

      return res.sendStatus(200);
    } catch (err) {
      console.error('Error en webhook POST:', err.response?.data || err.message);
      return res.sendStatus(500);
    }
  }

  // Si llega otro método HTTP
  res.setHeader('Allow', 'GET, POST');
  res.sendStatus(405);
};
