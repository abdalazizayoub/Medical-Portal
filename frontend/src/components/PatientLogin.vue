<template>
  <section>
    <fieldset class="fieldset" v-if="!loggedInPatient">
      <legend><b>Patient Login</b></legend>
      <form @submit.prevent="loginPatient">
        <div class="login-form">
          <div class="input-group">
            <label for="lastname">Last Name</label>
            <input
              type="text"
              id="lastname"
              v-model="loginData.lastName"
              required
              placeholder="Enter your last name"
            >
          </div>

          <div class="input-group">
            <label for="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              v-model="loginData.phone"
              pattern="[0-9]{10}"
              required
              placeholder="Enter your phone number"
              title="Please enter a valid 10-digit phone number"
            >
          </div>

          <div class="login-actions">
            <button type="submit" :disabled="isLoading">
              <span v-if="isLoading">🔍 Searching...</span>
              <span v-else>Login</span>
            </button>
          </div>
        </div>
      </form>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </fieldset>

    <fieldset class="fieldset" v-if="loggedInPatient">
      <legend><b>Your Patient Information</b></legend>

      <div class="patient-details">
        <div class="detail-header">
          <h2>Welcome, {{ loggedInPatient.FirstName }} {{ loggedInPatient.LastName }}</h2>
          <button @click="logout" class="logout-btn">Logout</button>
        </div>

        <div class="connection-status" :class="{ 'connected': socketConnected, 'disconnected': !socketConnected }">
          <span v-if="socketConnected">Connected</span>
          <span v-else>Disconnected</span>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <strong>Patient ID:</strong>
            <span>{{ loggedInPatient._id }}</span>
          </div>

          <div class="detail-item">
            <strong>Full Name:</strong>
            <span>{{ loggedInPatient.FirstName }} {{ loggedInPatient.LastName }}</span>
          </div>

          <div class="detail-item">
            <strong>Age:</strong>
            <span>{{ loggedInPatient.Age }} years old</span>
          </div>

          <div class="detail-item">
            <strong>Gender:</strong>
            <span class="gender-badge" :class="loggedInPatient.Gender ? loggedInPatient.Gender.toLowerCase() : 'unknown'">
              {{ loggedInPatient.Gender || 'Not specified' }}
            </span>
          </div>

          <div class="detail-item">
            <strong>Phone Number:</strong>
            <span>{{ formatPhone(loggedInPatient.Phone) }}</span>
          </div>

          <div class="detail-item">
            <strong>Appointment Date:</strong>
            <span>{{ formatDate(loggedInPatient.AppointmentDate) }}</span>
          </div>

          <div class="detail-item">
            <strong>Appointment Time:</strong>
            <span>{{ formatTime(loggedInPatient.AppointmentTime) }}</span>
          </div>

          <div class="detail-item">
            <strong>Scan Type:</strong>
            <span class="scan-type" :class="getScanTypeClass(loggedInPatient.ScanType)">
              {{ loggedInPatient.ScanType || 'No scan scheduled' }}
            </span>
          </div>
        </div>



        <div class="notifications-section" v-if="notifications.length > 0">
          <h3>Recent Notifications</h3>
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification"
            :class="notification.type"
          >
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.message }}</p>
            <small>{{ formatNotificationTime(notification.timestamp) }}</small>
          </div>
        </div>
        </div>

    </fieldset>
  </section>
</template>

<script>
import axios from 'axios'
import { io } from 'socket.io-client'

export default {
  name: 'PatientLogin',
  data() {
    return {
      loginData: {
        lastName: '',
        phone: '',
        backendUrl: import.meta.env.VITE_BACKEND_URL

      },
      loggedInPatient: null,
      isLoading: false,
      errorMessage: '',
      socket: null,
      socketConnected: false,
      notifications: [],
      notificationCounter: 0
    }
  },
  methods: {
    async loginPatient() {
      this.isLoading = true
      this.errorMessage = ''
      this.clearNotifications()

      try {
        const response = await axios.post(this.backendUrl+'/patientlogin', {
          LastName: this.loginData.lastName.trim(),
          Phone: this.loginData.phone.trim()
        })

        this.loggedInPatient = response.data.patient
        this.resetLoginForm()

        this.initSocket()

      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.errorMessage = 'No patient found with the provided last name and phone number.'
        } else {
          this.errorMessage = 'Unable to connect to the server. Please try again later.'
        }
        console.error('Login error:', error)

      } finally {
        this.isLoading = false
      }
    },

    logout() {
      this.loggedInPatient = null
      this.resetLoginForm()
      this.errorMessage = ''
      this.clearNotifications()
      this.disconnectSocket()
    },

    resetLoginForm() {
      this.loginData = {
        lastName: '',
        phone: ''
      }
    },

    clearNotifications() {
      this.notifications = []
      this.notificationCounter = 0
    },

    addNotification(type, title, message) {
      this.notifications.unshift({
        id: ++this.notificationCounter,
        type: type,
        title: title,
        message: message,
        timestamp: new Date()
      })

      // Keep only last 5 notifications
      if (this.notifications.length > 5) {
        this.notifications = this.notifications.slice(0, 5)
      }
    },

    formatNotificationTime(timestamp) {
      return timestamp.toLocaleTimeString()
    },

    cleanPhone(phone) {
      return String(phone).replace(/\D/g, '')
    },

    formatPhone(phone) {
      if (!phone) return 'Not provided'
      const cleaned = this.cleanPhone(phone)
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0,2)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
      }
      return phone
    },

    formatDate(date) {
      if (!date) return 'Not scheduled'
      const dateObj = new Date(date)
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },

    formatTime(time) {
      if (!time) return 'Not scheduled'
      const [hours, minutes] = time.split(':')
      const hour12 = hours % 12 || 12
      const ampm = hours < 12 ? 'AM' : 'PM'
      return `${hour12}:${minutes} ${ampm}`
    },

    getScanTypeClass(scanType) {
      if (!scanType || scanType === 'no scan') return 'no-scan'
      if (scanType.includes('Brain')) return 'brain-scan'
      if (scanType.includes('Chest')) return 'chest-scan'
      return 'other-scan'
    },

    getResultClass(result) {
      return {
        'Healthy': 'result-healthy',
        'Tumor Detected': 'result-tumor',
        'Pending': 'result-pending'
      }[result] || 'result-pending'
    },

    initSocket() {
      if (this.socket) {
        this.disconnectSocket()
      }

      this.socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      })

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id)
        this.socketConnected = true
        this.addNotification('info', 'Connected', 'Real-time updates are now active')
        this.socket.emit('joinPatientRoom', this.loggedInPatient._id)
      })

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected')
        this.socketConnected = false
        this.addNotification('warning', 'Disconnected', 'Real-time updates are not available')
      })

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        this.socketConnected = false
        this.addNotification('error', 'Connection Error', 'Unable to connect to real-time updates')
      })

      this.socket.on('patientRoomJoined', (data) => {
        console.log('Joined patient room:', data.roomId)
        this.addNotification('success', 'Room Joined', `Connected to your personal updates room`)
      })

      this.socket.on('resultsReady', (data) => {
        console.log('Results ready:', data)
        if (data.id === this.loggedInPatient._id) {
          this.loggedInPatient.ClassificationResult = data.prediction
          this.loggedInPatient.ConfidenceScore = data.confidence

          this.addNotification('success', 'Results Ready!', data.message)
        }
      })

      this.socket.on('profileUpdated', (data) => {
        console.log('Profile updated:', data)
        if (data.patient._id === this.loggedInPatient._id) {
          this.loggedInPatient = { ...this.loggedInPatient, ...data.patient }
          this.addNotification('info', 'Profile Updated', data.message)
        }
      })

      this.socket.on('newPatient', (data) => {
        console.log('New patient registered:', data)
        this.addNotification('info', 'New Patient', `${data.name} has been registered`)
      })

      this.socket.on('classificationDone', (data) => {
        console.log('Classification completed:', data)
        if (data.id !== this.loggedInPatient._id) {
          this.addNotification('info', 'Classification Complete', 'A patient\'s results have been processed')
        }
      })
    },

    disconnectSocket() {
      if (this.socket) {
        if (this.loggedInPatient) {
          this.socket.emit('leavePatientRoom', this.loggedInPatient._id)
        }
        this.socket.disconnect()
        this.socket = null
        this.socketConnected = false
      }
    }
  },

  beforeUnmount() {
    this.disconnectSocket()
  }
}
</script>

<style scoped>
.fieldset {
  border: 2px solid #2c3e50;
  border-radius: 8px;
  padding: 25px;
  margin: 20px auto;
  max-width: 800px;
  background-color: #ecf0f1;
  font-family: Garamond;
}

legend {
  padding: 0 15px;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: bold;
  font-family: Garamond;
  background-color: #2c3e50;
  color: white;
  border-radius: 5px;
  padding: 5px 15px;
}

/* Login Form Styles */
.login-form {
  max-width: 400px;
  margin: 0 auto;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #2c3e50;
  font-family: Garamond;
}

.input-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  font-family: Garamond;
  box-sizing: border-box;
}

.input-group input:focus {
  border-color: #2c3e50;
  outline: none;
  background-color: #f8f9fa;
}

.login-actions {
  text-align: center;
  margin-top: 20px;
}

.login-actions button {
  padding: 12px 30px;
  background-color: #2c3e50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  font-family: Garamond;
}

.login-actions button:hover:not(:disabled) {
  background-color: #E4EFE7;
  color: black;
}

.login-actions button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin-top: 20px;
  border: 1px solid #f5c6cb;
  font-family: Garamond;
}

/* Patient Details Styles */
.patient-details {
  max-width: 100%;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #2c3e50;
}

.detail-header h2 {
  margin: 0;
  color: #2c3e50;
  font-family: Garamond;
}

.logout-btn {
  padding: 8px 16px;
  background-color: #67869b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: Garamond;
  font-weight: bold;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background-color: #E4EFE7;
  color: black;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.detail-item {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item strong {
  color: #2c3e50;
  font-family: Garamond;
  display: block;
  margin-bottom: 5px;
}

.detail-item span {
  color: #333;
  font-family: Garamond;
  font-size: 16px;
}

.detail-item p {
  margin: 5px 0 0 0;
  color: #333;
  font-family: Garamond;
  line-height: 1.5;
}

/* Badge Styles */
.gender-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  display: inline-block;
}

.gender-badge.male {
  background-color: #4b6170;
  color: white;
}

.gender-badge.female {
  background-color: #94b4d3;
  color: white;
}

.gender-badge.unknown {
  background-color: #6c757d;
  color: white;
}

.scan-type {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  display: inline-block;
}

.scan-type.no-scan {
  background-color: #f5f7fa;
  color: #6c757d;
}

.scan-type.brain-scan {
  background-color: #67869b;
  color: white;
}

.scan-type.chest-scan {
  background-color: #1b2631;
  color: white;
}

.scan-type.other-scan {
  background-color: #1a2530;
  color: white;
}

.scan-result {
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.result-healthy {
  background-color: #4CAF50;
  color: white;
}

.result-tumor {
  background-color: #f44336;
  color: white;
}

.result-pending {
  background-color: #FFC107;
  color: black;
}

.confidence-score {
  font-size: 0.9em;
  opacity: 0.9;
}

/* Status Section */
.status-section {
  margin-top: 25px;
}

.status-message {
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-family: Garamond;
}

.status-message.info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-message.pending {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-message.complete {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

/* Responsive Design */
@media (max-width: 768px) {
  .fieldset {
    padding: 15px;
    margin: 10px;
  }

  .detail-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .detail-header h2 {
    font-size: 1.5em;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .login-form {
    max-width: 100%;
  }

  .input-group input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
