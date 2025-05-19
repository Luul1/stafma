const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staffpesa', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Demo Request Schema
const demoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'contacted', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const DemoRequest = mongoose.model('DemoRequest', demoSchema);

// Constants
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'lulyabdy@gmail.com';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  debug: true, // Enable debug logging
  logger: true  // Enable logger
});

// Verify SMTP configuration
console.log('SMTP Configuration:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD ? 'Set' : 'Not Set',
  companyEmail: COMPANY_EMAIL
});

// Test SMTP connection
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});

// Demo request endpoint
app.post('/api/request-demo', async (req, res) => {
  const { name, email, phone, company, message } = req.body;

  try {
    // Save to database
    const demoRequest = new DemoRequest({
      name,
      email,
      phone,
      company,
      message
    });
    await demoRequest.save();
    console.log('Demo request saved to database');

    try {
      // Email to the company
      console.log('Sending email to company...');
      const companyMailOptions = {
        from: `"StaffMa Demo Request" <${process.env.SMTP_USER}>`,
        to: COMPANY_EMAIL,
        subject: 'New StaffMa Demo Request',
        html: `
          <h2>New Demo Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      };
      console.log('Company email options:', {
        from: companyMailOptions.from,
        to: companyMailOptions.to,
        subject: companyMailOptions.subject
      });
      const companyResult = await transporter.sendMail(companyMailOptions);
      console.log('Company email sent successfully:', companyResult);

      // Confirmation email to the user
      console.log('Sending confirmation email to user...');
      const userMailOptions = {
        from: `"StaffMa" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Thank you for requesting a StaffMa demo',
        html: `
          <h2>Thank you for your interest in StaffMa!</h2>
          <p>Dear ${name},</p>
          <p>We have received your demo request and will contact you shortly to schedule a personalized demonstration of our platform.</p>
          <p>In the meantime, if you have any questions, please don't hesitate to contact us at info@staffma.com
</p>
          <p>Best regards,<br>The StaffMa Team</p>
        `,
      };
      console.log('User email options:', {
        from: userMailOptions.from,
        to: userMailOptions.to,
        subject: userMailOptions.subject
      });
      const userResult = await transporter.sendMail(userMailOptions);
      console.log('User confirmation email sent successfully:', userResult);

      res.status(200).json({ message: 'Demo request sent successfully' });
    } catch (emailError) {
      console.error('Email Error:', emailError);
      // Still return success since the data was saved to database
      res.status(200).json({ 
        message: 'Demo request saved, but email sending failed',
        error: emailError.message 
      });
    }
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ 
      message: 'Failed to save demo request',
      error: error.message 
    });
  }
});

// Get all demo requests (for admin panel)
app.get('/api/demo-requests', async (req, res) => {
  try {
    const requests = await DemoRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching demo requests', error: error.message });
  }
});

// Update demo request status (for admin panel)
app.patch('/api/demo-requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const request = await DemoRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error updating demo request', error: error.message });
  }
});

// Add better error logging
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message 
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/request-demo`);
}); 