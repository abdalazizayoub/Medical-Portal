<template>
  <section>
    <fieldset class="fieldset">
      <legend><b>Patient Information</b></legend>
        <form
          :action="backendUrl + '/NewRegistration'"
          method="POST"
          enctype="multipart/form-data"
        >
          <div class="block-display">
          <label for="Patientfirstname">Patient's first name</label>
          <input
            type="text"
            id="Patientfirstname"
            name="Patientfirstname"
            v-model="NewPatient.FirstName"
            required
          >

          <label for="Patientlastname">Patient's last name</label>
          <input
            type="text"
            id="Patientlastname"
            name="Patientlastname"
            v-model="NewPatient.LastName"
            required
          >
        </div>

        <div>
          <label for="Patientage">Patient age</label>
          <input
            type="number"
            id="Patientage"
            name="Patientage"
            min="0"
            v-model="NewPatient.Age"
            required
          >
        </div>

        <div>
          <label for="patientphone">Patient's phone number</label>
          <input
            type="tel"
            id="patientphone"
            name="patientphone"
            pattern="[0-9]{10}"
            v-model="NewPatient.Phone"
            title="Please enter a valid phone number"
            required
          >
        </div>

        <div>
          <label for="patientappointmentdate">Patient's appointment date</label>
          <input
            type="date"
            id="patientappointmentdate"
            name="patientappointmentdate"
            v-model="NewPatient.AppointmentDate"
          >
          <label for="patient-appointment-time">Patient's appointment time</label>
          <input
            type="time"
            id="patientappointmenttime"
            name="patientappointmenttime"
            v-model="NewPatient.AppointmentTime"
          >
        </div>

        <div>
          <label for="Patientscanoption">Scan type</label>
          <select id="Patientscanoption" name="Patientscanoption" v-model="NewPatient.ScanType">
            <option value="">Please choose a Scan</option>
            <option value="no scan">no scan</option>
            <option value="Brain-ct">Brain-ct</option>
            <option value="Chest-xray">Chest-xray</option>
          </select>
        </div>

        <div>
          <label for="patientscan">Patient's Scan</label>
          <input
            type="file"
            id="patient-scan"
            name="patient-scan"
            accept="image/*"
          >
        </div>

        <div class="radio-buttons">
          <label>Patient's Gender:</label>
          <label for="male">Male</label>
          <input
            type="radio"
            name="gender"
            id="male"
            value="Male"
            v-model="NewPatient.Gender"
          >
          <label for="female">Female</label>
          <input
            type="radio"
            name="gender"
            id="female"
            value="Female"
            v-model="NewPatient.Gender"
          >
        </div>

        <div>
          <label for="patientmedicalhistory" class="textarea-label">Patient's Medical History:</label>
          <textarea
            id="patientmedicalhistory"
            name="patientmedicalhistory"
            rows="3"
            cols="50"
            v-model="NewPatient.MedicalHistory"
          ></textarea>
        </div>

        <div>
          <br>
          <button type="submit">Submit</button>
        </div>
      </form>
    </fieldset>
  </section>
</template>

<script>
export default {
  name: 'PatientForm',
  data() {
    return {
      NewPatient: {
        FirstName: '',
        LastName: '',
        Age: '',
        Phone: '',
        AppointmentDate: '',
        AppointmentTime: '',
        ScanType: '',
        Gender: '',
        MedicalHistory: '',
        ScanFile: null
      },
      backendUrl: import.meta.env.VITE_BACKEND_URL
    }
  },
  methods: {
    resetForm() {
      this.NewPatient = {
        FirstName: '',
        LastName: '',
        Age: '',
        Phone: '',
        AppointmentDate: '',
        AppointmentTime: '',
        ScanType: '',
        Gender: '',
        MedicalHistory: '',
        ScanFile: null
      };
    }
  }
}

</script>
