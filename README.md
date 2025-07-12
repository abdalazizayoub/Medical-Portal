Brain Tumor Classification System

A comprehensive medical imaging system that uses deep learning to classify brain CT scans for tumor detection. The system provides real-time patient management, secure data handling, and automated classification results.
Project Overview:

This system combines a web-based patient management interface with an AI-powered brain tumor classification service. Healthcare professionals can register patients, upload CT scans, and receive automated classification results indicating whether a tumor is present or if the brain appears healthy.
Architecture:

The project consists of two main services:
1. Backend Service (Node.js/Express)

    Patient Management: Complete CRUD operations for patient records
    Real-time Communication: WebSocket integration for live updates
    Secure Data Storage: MongoDB with field-level encryption
    File Handling: In-memory storage for medical images
    API Integration: Communicates with AI model service

2. AI Model Service (FastAPI/Python)

    Deep Learning Model: ResNet-based neural network for tumor classification
    Image Processing: Automated preprocessing and normalization
    Prediction API: RESTful endpoint for classification requests
    Confidence Scoring: Provides prediction confidence levels
