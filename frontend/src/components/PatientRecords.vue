<template>
  <section>
    <fieldset class="fieldset">
      <legend><b>Patients Table</b></legend>
      <div class="summary-stats">
        <div class="stat-card">
          <h3>{{ patients.length }}</h3>
          <p>Total Patients</p>
        </div>
        <div class="stat-card">
          <h3>{{ todayAppointments }}</h3>
          <p>Today's Appointments</p>
        </div>
        <div class="stat-card">
          <h3>{{ pendingClassifications }}</h3>
          <p>Pending Classifications</p>
        </div>
      </div>

      <div class="table-container">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Phone</th>
              <th>Appointment Date</th>
              <th>Appointment Time</th>
              <th>Scan Type</th>
              <th>Scan Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(patient, index) in patients" :key="`patient-${index}`" class="patient-row">
              <td class="patient-id">{{ String(index + 1).padStart(3, '0') }}</td>
              <!-- <td class="patient-name">
                <strong>{{ patient.FirstName }} {{ patient.LastName }}</strong>
              </td> -->
              <td>
                <span class="gender-badge" :class="patient.Gender ? patient.Gender.toLowerCase() : 'unknown'">
                  {{ patient.Gender || 'N/A' }}
                </span>
              </td>
              <td>{{ patient.Age }}</td>
              <td class="phone-number">{{ formatPhone(patient.Phone) }}</td>
              <td>{{ formatDate(patient.AppointmentDate) }}</td>
              <td>{{ formatTime(patient.AppointmentTime) }}</td>
              <td>
                <span class="scan-type" :class="getScanTypeClass(patient.ScanType)">
                  {{ patient.ScanType || 'No scan' }}
                </span>
              </td>
              <td>
                <template v-if="patient.ClassificationResult && patient.ClassificationResult !== 'Pending'">
                  <span class="scan-result" :class="getResultClass(patient.ClassificationResult)">
                    {{ patient.ClassificationResult }}
                    <span v-if="patient.ConfidenceScore" class="confidence-score">
                      ({{ (patient.ConfidenceScore * 100).toFixed(1) }}%)
                    </span>
                  </span>
                </template>
                <button v-else-if="isClassifiable(patient)"
                        @click="classifyScan(index)"
                        class="classify-btn"
                        :disabled="isLoading">
                  <span v-if="isLoading">⏳ Processing...</span>
                  <span v-else>Classify Scan</span>
                </button>
                <span v-else class="no-result">N/A</span>
              </td>
              <td class="actions">
                <button
                  type="button"
                  @click="viewDetails(index)"
                  class="view-details-btn"
                  :title="`View details for ${patient.FirstName} ${patient.LastName}`"
                >
                  View Details
                </button>
                <button
                  type="button"
                  @click="DeletePatient(index)"
                  class="view-details-btn"
                >
                  Delete Patient
                </button>
              </td>
            </tr>
            <tr v-if="!patients || patients.length === 0" class="no-data-row">
              <td colspan="9" class="no-data">
                <div class="no-data-content">
                  <p>📋 No patients registered yet</p>
                  <router-link to="/Form" class="register-link">Register your first patient</router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      <div v-if="selectedPatient" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Patient Details</h3>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <strong>Name:</strong> {{ selectedPatient.FirstName }} {{ selectedPatient.LastName }}
              </div>
              <div class="detail-item">
                <strong>Age:</strong> {{ selectedPatient.Age }}
              </div>
              <div class="detail-item">
                <strong>Phone:</strong> {{ formatPhone(selectedPatient.Phone) }}
              </div>
              <div class="detail-item">
                <strong>Appointment:</strong> {{ formatDate(selectedPatient.AppointmentDate) }} at {{ formatTime(selectedPatient.AppointmentTime) }}
              </div>
              <div class="detail-item">
                <strong>Scan Type:</strong> {{ selectedPatient.ScanType || 'No scan' }}
              </div>
              <div class="detail-item" v-if="selectedPatient.ClassificationResult">
                <strong>Scan Result:</strong>
                <span :class="getResultClass(selectedPatient.ClassificationResult)">
                  {{ selectedPatient.ClassificationResult }}
                  <span v-if="selectedPatient.ConfidenceScore" class="confidence-score">
                    ({{ (selectedPatient.ConfidenceScore * 100).toFixed(1) }}%)
                  </span>
                </span>
              </div>
              <div class="detail-item full-width" v-if="selectedPatient.MedicalHistory">
                <strong>Medical History:</strong>
                <p>{{ selectedPatient.MedicalHistory }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  </section>
</template>

<script>
import axios from 'axios'

export default {
  name: 'PatientRecords',
  data() {
    return {
      patients: [],
      selectedPatient: null,
      isLoading: false
    }
  },
  computed: {
    todayAppointments() {
      const today = new Date().toISOString().split('T')[0]
      return this.patients.filter(patient => {
        return patient.AppointmentDate && patient.AppointmentDate.split('T')[0] === today
      }).length
    },
    pendingClassifications() {
      return this.patients.filter(patient => {
        return this.isClassifiable(patient)
      }).length
    }
  },
  async created() {
    await this.GetPatients()
  },
  methods: {
    async GetPatients() {
      this.isLoading = true
      try {
        const response = await axios.get('http://localhost:3000/patients')
        this.patients = Array.isArray(response.data) ? response.data : []
      } catch (error) {
        console.error('Error fetching patients:', error)
        alert('Failed to load patient data')
      } finally {
        this.isLoading = false
      }
    },

    isClassifiable(patient) {
      return (patient.ScanType &&
             (patient.ScanType.includes('Brain') ||
              patient.ScanType.includes('Chest')) &&
             (!patient.ClassificationResult ||
              patient.ClassificationResult === 'Pending'))
    },

    async classifyScan(index) {
      this.isLoading = true
      try {
        const patient = this.patients[index]

        if (!this.isClassifiable(patient)) {
          alert('Scan not available for classification')
          return
        }

        const response = await axios.post(`http://localhost:3000/Classify/${patient._id}`)

        await this.GetPatients()

        this.$notify({
          title: 'Classification Complete',
          text: `Result: ${response.data.prediction} (${(response.data.confidence * 100).toFixed(1)}% confidence)`,
          type: 'success'
        })
      } catch (error) {
        console.error('Classification failed:', error)
        this.$notify({
          title: 'Classification Failed',
          text: error.response?.data?.message || 'An error occurred during classification',
          type: 'error'
        })
      } finally {
        this.isLoading = false
      }
    },

    viewDetails(index) {
      this.selectedPatient = this.patients[index]
    },

    closeModal() {
      this.selectedPatient = null
    },
    async DeletePatient(index){
      try{
        const patient = this.patients[index]
        const response = await axios.delete(`http://localhost:3000/delete/${patient._id}`)
        await this.GetPatients()

      }catch(error){
        console.error({"Deletion error":error})
      }
    },

    formatPhone(phone) {
      if (!phone) return 'N/A'
      const cleaned = String(phone).replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0,2)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
      }
      return phone
    },

    formatDate(date) {
      if (!date) return 'Not scheduled'
      const dateObj = new Date(date)
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
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
      }[result] || ''
    }
  }
}
</script>
<style scoped>
.fieldset {
  border: 2px solid #2c3e50;
  border-radius: 8px;
  padding: 25px;
  margin: 20px auto;
  max-width: 1200px;
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

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #2c3e50, #1a2530);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-family: Garamond;
}

.stat-card h3 {
  font-size: 2.5em;
  margin: 0 0 10px 0;
  font-family: Garamond;
}

.stat-card p {
  margin: 0;
  opacity: 0.9;
  font-family: Garamond;
}

.table-container {
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.patient-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 14px;
  font-family: arial, sans-serif;
}

.patient-table th {
  background-color: #2c3e50;
  color: #f8f9fa;
  padding: 15px 10px;
  text-align: left;
  font-weight: bold;
  border: 1px solid #dddddd;
}

.patient-table td {
  padding: 12px 10px;
  border: 1px solid #dddddd;
  text-align: left;
}

.patient-row:hover {
  background-color: #f5f7fa;
}

.patient-id {
  font-family: monospace;
  font-weight: bold;
  color: #6c757d;
}

.patient-name {
  min-width: 150px;
  font-family: Garamond;
}

.gender-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.gender-badge.male {
  background-color: #4b6170;
  color: white;
}

.gender-badge.female {
  background-color: #94b4d3;
  color: white;
}

.phone-number {
  font-family: monospace;
}

.scan-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
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

.actions {
  white-space: nowrap;
}

.send-results-btn,
.view-details-btn {
  padding: 6px 12px;
  margin: 2px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.3s;
  font-family: Garamond;
}

.send-results-btn {
  background-color: #2c3e50;
  color: white;
}

.send-results-btn:hover {
  background-color: #E4EFE7;
  color: black;
}

.view-details-btn {
  background-color: #67869b;
  color: white;
}

.view-details-btn:hover {
  background-color: #E4EFE7;
  color: black;
}

.no-data-row {
  height: 200px;
}

.no-data {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  font-family: Garamond;
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.no-data-content p {
  font-size: 1.2em;
  margin: 0;
  font-family: Garamond;
}

.register-link {
  background-color: #2c3e50;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s;
  font-family: Garamond;
}

.register-link:hover {
  background-color: #E4EFE7;
  color: black;
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid #2c3e50;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dddddd;
  background-color: #2c3e50;
  color: white;
  border-radius: 8px 8px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: white;
  font-family: Garamond;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: white;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #E4EFE7;
}

.modal-body {
  padding: 20px;
  background-color: #f5f7fa;
  font-family: Garamond;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.detail-item {
  padding: 10px;
  background-color: #ecf0f1;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item strong {
  color: #2c3e50;
  font-family: Garamond;
}

.detail-item p {
  margin: 5px 0 0 0;
  color: #333;
  font-family: Garamond;
}


.classify-btn {
  padding: 6px 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: Garamond;
  margin-right: 5px;
}

.classify-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.classify-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.scan-result {
  padding: 4px 8px;
  background-color: #2196F3;
  color: white;
  border-radius: 4px;
  font-weight: bold;
}

.no-result {
  color: #888;
  font-style: italic;
}


.scan-result {
  padding: 4px 8px;
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
  font-size: 0.8em;
  opacity: 0.8;
}

.no-result {
  color: #888;
  font-style: italic;
}

.classify-btn {
  padding: 6px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: Garamond;
  margin-right: 5px;
  transition: all 0.3s;
}

.classify-btn:hover:not(:disabled) {
  background-color: #0b7dda;
}

.classify-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  .summary-stats {
    grid-template-columns: 1fr;
  }

  .patient-table {
    font-size: 12px;
  }

  .patient-table th,
  .patient-table td {
    padding: 8px 6px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .fieldset {
    padding: 10px;
    margin: 5px;
  }

  .send-results-btn,
  .view-details-btn {
    width: 100%;
    padding: 10px;
    margin-top: 5px;
  }
}
</style>
