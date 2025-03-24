require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const util = require('util');

const dnsLookup = util.promisify(dns.lookup); // Promisify dns.lookup
const app = express();
const port = process.env.PORT || 3000;
const URI = process.env.MONGO_URI;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

// MongoDB Connection with proper error handling
mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Schema and Model for URLs
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const URL_Short = mongoose.model('URL_Short', urlSchema);

// Root Endpoint
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Counter for short_url generation
let counter = 1;

// POST Endpoint for URL shortening
app.post('/api/shorturl', async (req, res) => {
  const original_url = req.body.url;
  try {
    // Validate the URL
    const hostname = new URL(original_url).hostname;
    await dnsLookup(hostname); // Promisified version of dns.lookup

    // Save the new URL
    const newURL = new URL_Short({
      original_url: original_url,
      short_url: counter++
    });
    const savedURL = await newURL.save();
    res.json({ original_url: savedURL.original_url, short_url: savedURL.short_url });

  } catch (err) {
    res.json({ error: 'invalid url' }); // Catch DNS or any validation errors
  }
});

// GET Endpoint to retrieve original URL and redirect
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = Number(req.params.short_url); // Convert to number for query
  try {
    const data = await URL_Short.findOne({ short_url: shortUrl });
    if (!data) {
      return res.json({ error: 'No short URL found' });
    }
    res.redirect(data.original_url); // Redirect to the original URL
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Server Listening
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});