require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

const app = express();
app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error) return res.status(500).send(error);
        res.json({ url: result.secure_url });
      }
    );

    result.end(req.file.buffer);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(5000, () => console.log('Server running on port 5000 🚀'));