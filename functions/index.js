const functions = require('firebase-functions/v1')
const admin = require('firebase-admin')
const twilio = require('twilio')
const cors = require('cors')

admin.initializeApp()

const accountSid = functions.config().twilio.accountsid
const authToken = functions.config().twilio.authtoken
const twilioNumber = functions.config().twilio.phonenumber

const client = new twilio(accountSid, authToken)

exports.sendSmsHttp = functions.region('northamerica-northeast1').https.onRequest((req, res) => {
  // ✅ Handle preflight OPTIONS manually
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    return res.status(204).send('')
  }

  // ✅ Use cors() only for POST
  const corsHandler = cors({ origin: true })

  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Only POST allowed' })
    }

    const { phoneNumber, message } = req.body

    if (!phoneNumber || !message) {
      return res.status(400).json({ success: false, message: 'Missing phone number or message' })
    }

    const e164Regex = /^\+?[1-9]\d{1,14}$/
    if (!e164Regex.test(phoneNumber)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid phone number format (E.164 required)' })
    }

    try {
      const twilioResponse = await client.messages.create({
        body: message,
        to: phoneNumber,
        from: twilioNumber,
      })

      return res.status(200).json({ success: true, sid: twilioResponse.sid })
    } catch (err) {
      console.error('Twilio error:', err.message)
      return res.status(500).json({ success: false, message: err.message })
    }
  })
})
