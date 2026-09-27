require('dotenv').config(); // Încarcă variabilele din fișierul .env

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ dest: 'uploads/' });

// Citim valorile din fișierul .env (sau folosim 3000 ca fallback)
const PORT = process.env.PORT || 8080;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// Configurare Gmail SMTP folosind datele din .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

app.use(express.static(__dirname));

app.post('/api/send-email', upload.single('attachment'), async (req, res) => {
  const { to, subject, message } = req.body;
  const file = req.file;

  const mailOptions = {
    from: `"SYMETRIX - MedMeet" <${GMAIL_USER}>`,
    to: to,
    subject: subject,
    text: message,
    attachments: file ? [{ filename: file.originalname, path: file.path }] : []
  };

  try {
    // Încercare trimitere online
    const info = await transporter.sendMail(mailOptions);
    console.log('🌐 [ONLINE] Email trimis pe internet:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Email expediat cu succes pe adresa reală!' 
    });

  } catch (error) {
    // Fallback Offline dacă nu există conexiune sau datele din .env sunt invalide
    console.log('⚠️ [OFFLINE] Nu s-a putut efectua trimiterea online. Se salvează local...');

    const emailRecord = {
      id: Date.now(),
      dataTrimitere: new Date().toLocaleString('ro-RO'),
      destinatar: to || 'Nespecificat',
      subiect: subject || '(Fără subiect)',
      mesaj: message || '',
      fisierAtasat: file ? file.originalname : 'Fără atașament',
      status: 'Salvat Offline'
    };

    let history = [];
    if (fs.existsSync('emails_salvate.json')) {
      const content = fs.readFileSync('emails_salvate.json', 'utf8');
      history = content ? JSON.parse(content) : [];
    }
    history.push(emailRecord);
    fs.writeFileSync('emails_salvate.json', JSON.stringify(history, null, 2));

    return res.status(200).json({ 
      success: true, 
      message: 'Mod Offline: Email-ul a fost salvat local în emails_salvate.json!' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server pornit pe portul ${PORT}: http://localhost:${PORT}`);
});