import { createRouter, createWebHistory } from 'vue-router'
import PatientRecords from '../components/PatientRecords.vue'
import Form from '../components/Form.vue'
import PatientLogin from '../components/PatientLogin.vue'

// Add to your routes array:

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: PatientRecords,
    },
    {
      path: '/Form',
      name: 'Form',
      component: Form,
    },
    {
      path: '/Patient-Records',
      name: 'Patient-Records',
      component: PatientRecords,
    },
    {
    path: '/patient-login',
    name: 'PatientLogin',
    component: PatientLogin
    }
  ],
})

export default router
