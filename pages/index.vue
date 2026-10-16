<script setup lang="ts">
import { scalarConfig } from "~~/scalar.config";

definePageMeta({ layout: false });

const { data: branding } = await useBranding();

const configuration = computed(() => ({
  ...scalarConfig,
  metaData: {
    ...scalarConfig.metaData,
    title: branding.value.name
  }
}));

useHead({ title: () => branding.value.name });
</script>

<template>
  <ScalarApiReference :configuration="configuration" />
</template>
