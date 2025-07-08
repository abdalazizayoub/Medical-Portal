const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const Schema = mongoose.Schema;

const PatientsSchema = new Schema({
   FirstName: {
        type: String,
        required: true,
        trim: true
    },
    LastName: {
        type: String,
        required: true,
        trim: true
    },
    Age: {
        type: Number,
        required: true,
        min: 0,
        max: 150
    },
    Phone: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /\d{10}/.test(v);
            },
            message: 'Phone number must be 10 digits'
        }
    },
    AppointmentDate: {
        type: Date,
        //required: true
    },
    AppointmentTime: {
        type: String,
       // required: true,
        validate: {
            validator: function(v) {
                return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Time must be in HH:MM format'
        }
    },
    ScanType: {
        type: String,
        required: true,
        enum: ['Chest-xray', 'Brain-CT','no scan']
    },
    Scan: {
        type: String,
        unique: true,
        sparse: true
    },
    Gender: {
        type: String,
        //required: true,
        enum: ['Male', 'Female']

    },
    MedicalHistory: {
        type: String,
        default: ''
    }
},{ timestamps: true })

patients = mongoose.model("patient",PatientsSchema)
module.exports = patients 