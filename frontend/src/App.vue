<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div >
    <header>
      <h1>Doctor's Portal</h1>
      <nav>
        <router-link to="/Form">Patient Registration</router-link>
        <router-link to="/Patient-Records">Patient Records</router-link>
        <router-link to="/patient-login">Patient Login</router-link>
      </nav>
    </header>

   <div>
    <RouterView />
  </div>

    <footer>
      <hr />
      <p>May God bless us all with health and wealth.</p>
    </footer>
  </div>
</template>
