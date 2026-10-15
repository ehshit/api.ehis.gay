<script setup lang="ts">
import { onMounted, ref } from "vue";

const messages = [
  "Nothing to see here!",
  "Do you exist? Because i don't!",
  "This page is gone",
  "Page decided to do not exist.",
  "Eh?",
  "Insert ghost sounds here.",
  "this page is in another place!",
  "Dead end!",
  "there must be a page but it's not here",
  "Sorry i cannot fulfill this request. This page does not exist.",
  "Did you made a typo?",
  "Nothing else here but silly four zero and four number :(",
  "Wrong way bro",
];

const msg = ref("");
onMounted(() => {
  msg.value = messages[Math.floor(Math.random() * messages.length)];
});
</script>

<template>
  <v-sheet border rounded="0" class="pa-5 text-center">
    <p class="nope">404</p>
    <p class="text-body-1 mb-1">this page does not exist</p>
    <p class="text-body-2 text-medium-emphasis mb-5">{{ msg }}</p>
    <v-btn variant="outlined" block to="/">take me home</v-btn>
  </v-sheet>
</template>

<style scoped>
.nope {
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1;
  margin-bottom: 0.75rem;
  color: #8a7f74;
}
</style>