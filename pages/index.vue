<script setup lang="ts">
import { scalarConfig } from "~~/scalar.config";

definePageMeta({ layout: false });
</script>

<template>
  <ScalarApiReference :configuration="scalarConfig" />
</template>