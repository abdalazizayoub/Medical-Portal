const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();
const FormData = require('form-data');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set("io", io);

// === Socket.IO Event Handlers ===
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle patient joining their specific room
  socket.on('joinPatientRoom', (patientId) => {
    console.log(`Patient ${patientId} joined room: patient_${patientId}`);
    socket.join(`patient_${patientId}`);
    
    // Confirm the patient has joined their room
    socket.emit('patientRoomJoined', { patientId, roomId: `patient_${patientId}` });
  });

  // Handle patient leaving their room
  socket.on('leavePatientRoom', (patientId) => {
    console.log(`Patient ${patientId} left room: patient_${patientId}`);
    socket.leave(`patient_${patientId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// === Keys and MongoDB Setup ===
const encKey = process.env.ENCRYPTION_KEY;
const sigKey = process.env.SIGNING_KEY;
const dbURI = process.env.DBURI;

mongoose.connect(dbURI)
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log("MongoDB error:", err));

// === Middleware ===
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// === Multer for Memory Storage ===
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// === Patient Schema ===
const Schema = mongoose.Schema;
const PatientsSchema = new Schema({
  FirstName: { type: String, required: true, trim: true },
  LastName: { type: String, required: true, trim: true },
  Age: { type: Number, required: true, min: 0, max: 150 },
  Phone: {
    type: String,
    required: true,
    validate: {
      validator: v => /\d{10}/.test(v),
      message: 'Phone number must be 10 digits'
    }
  },
  AppointmentDate: Date,
  AppointmentTime: {
    type: String,
    validate: {
      validator: v => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: 'Time must be in HH:MM format'
    }
  },
  ScanType: { type: String, required: true },
  ScanMetadata: {
    hasFile: { type: Boolean, default: false },
    filename: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  },
  Gender: { type: String, enum: ['Male', 'Female'] },
  MedicalHistory: { type: String, default: '' },
  ClassificationResult: {
    type: String,
    enum: ['Healthy', 'Tumor Detected', 'Pending'],
    default: 'Pending'
  },
  ConfidenceScore: { type: Number, min: 0, max: 1, default: null }
}, { timestamps: true });

PatientsSchema.plugin(encrypt, {
  encryptionKey: encKey,
  signingKey: sigKey,
  encryptedFields: ['FirstName', 'MedicalHistory', 'ClassificationResult', 'ScanType']
});

const Patients = mongoose.model("patient", PatientsSchema);

// === In-memory file storage ===
const fileStorage = new Map();

// === Endpoints ===

// Get all patients
app.get("/patients", async (req, res) => {
  try {
    const FetchedPatients = await Patients.find();
    res.json(FetchedPatients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: "Failed to fetch patients", details: error.message });
  }
});

// New patient registration
app.post("/NewRegistration", upload.single("patient-scan"), async (req, res) => {
  const body = req.body;
  const scan = req.file;

  try {
    const scanMetadata = scan ? {
      hasFile: true,
      filename: scan.originalname,
      mimetype: scan.mimetype,
      size: scan.size,
      uploadDate: new Date()
    } : { hasFile: false };

    const newPatient = new Patients({
      FirstName: body.Patientfirstname,
      LastName: body.Patientlastname,
      Age: body.Patientage,
      Phone: body.patientphone,
      AppointmentDate: body.patientappointmentdate,
      AppointmentTime: body.patientappointmenttime,
      ScanType: body.Patientscanoption,
      ScanMetadata: scanMetadata,
      Gender: body.gender,
      MedicalHistory: body.patientmedicalhistory
    });

    const savedPatient = await newPatient.save();

    if (scan) {
      fileStorage.set(savedPatient._id.toString(), {
        buffer: scan.buffer,
        mimetype: scan.mimetype,
        originalname: scan.originalname
      });
    }

    const io = req.app.get("io");
    io.emit("newPatient", {
      id: savedPatient._id,
      name: `${savedPatient.FirstName} ${savedPatient.LastName}`
    });

    res.redirect(process.env.PATIENTS_RECORD_URL);
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({ error: "Failed to register patient", details: error.message });
  }
});

// Classify scan
app.post("/Classify/:id", async (req, res) => {
  const patientID = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(patientID)) {
    return res.status(400).json({ error: "Invalid patient ID format" });
  }

  try {
    const patient = await Patients.findById(patientID);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    if (!patient.ScanMetadata.hasFile || patient.ScanType !== "Brain-ct") {
      return res.status(400).json({ error: "No valid Brain CT scan available" });
    }

    const fileData = fileStorage.get(patientID);
    if (!fileData) {
      return res.status(404).json({ error: "Scan file not found in memory" });
    }

    const formData = new FormData();
    formData.append('file', fileData.buffer, {
      filename: fileData.originalname,
      contentType: fileData.mimetype
    });

    const response = await axios.post(process.env.MODEL_API, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    patient.ClassificationResult = response.data.prediction;
    patient.ConfidenceScore = response.data.confidence;
    await patient.save();

    const io = req.app.get("io");
    
    io.emit("classificationDone", {
      id: patient._id,
      prediction: response.data.prediction,
      confidence: response.data.confidence
    });

    io.to(`patient_${patient._id}`).emit("resultsReady", {
      id: patient._id,
      prediction: response.data.prediction,
      confidence: response.data.confidence,
      message: "Your scan results are ready! Please contact your doctor."
    });

    res.status(200).json({
      success: true,
      prediction: response.data.prediction,
      confidence: response.data.confidence,
      patientId: patient._id
    });
  } catch (error) {
    console.error('Classification error:', error);
    let status = 500;
    let message = 'Classification failed';

    if (error.response) {
      status = error.response.status;
      message = error.response.data.detail || error.response.statusText;
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Unable to connect to model API service';
    }

    res.status(status).json({ error: message, details: error.message });
  }
});

// Delete patient
app.delete("/delete/:id", async (req, res) => {
  const id = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid patient ID format" });
    }

    const deletedPatient = await Patients.findByIdAndDelete(id);

    if (!deletedPatient) return res.status(404).json({ error: "Patient not found" });

    fileStorage.delete(id);

    // Emit patient deletion event
    const io = req.app.get("io");
    io.emit("patientDeleted", {
      id: deletedPatient._id,
      patient: deletedPatient
    });

    res.status(200).json({ message: "Patient deleted successfully", patient: deletedPatient });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: "Failed to delete patient", details: error.message });
  }
});

app.post("/patientlogin", async (req, res) => {
  const { LastName, Phone } = req.body;

  try {
    const possiblepatient = await Patients.findOne({
      LastName: { $regex: new RegExp(`^${LastName}$`, 'i') },
      Phone: Phone
    });
    if (!possiblepatient) {
      return res.status(404).json({ error: "Patient not found with provided credentials" });
    }

    res.status(200).json({ patient: possiblepatient });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
})

// Optional: Endpoint to get scan image (for viewing purposes)
app.get("/scan/:id", async (req, res) => {
  const patientID = req.params.id;

  try {
    const patient = await Patients.findById(patientID);
    if (!patient || !patient.ScanMetadata.hasFile) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const fileData = fileStorage.get(patientID);
    if (!fileData) {
      return res.status(404).json({ error: "Scan file not found in memory" });
    }

    res.set({
      'Content-Type': fileData.mimetype,
      'Content-Length': fileData.buffer.length
    });
    res.send(fileData.buffer);
  } catch (error) {
    console.error('Error retrieving scan:', error);
    res.status(500).json({ error: "Failed to retrieve scan" });
  }
});

module.exports = { app, server };