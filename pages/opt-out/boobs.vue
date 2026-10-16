<script setup lang="ts">
const route = useRoute();

const uuid = computed(() => String(route.query.uuid || ""));
const token = computed(() => String(route.query.token || ""));

const state = ref<"idle" | "loading" | "done" | "error">("idle");
const errorMessage = ref("");

const uuidLooksValid = computed(() =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.value)
);

async function optOut() {
  if (state.value === "loading") return;
  state.value = "loading";
  errorMessage.value = "";

  try {
    await $fetch(`/v1/boobs?uuid=${encodeURIComponent(uuid.value)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.value}` }
    });
    state.value = "done";
  } catch (e: any) {
    errorMessage.value =
      e?.data?.message || e?.status === 401
        ? "that uuid/token pair didn't match, the token is case-sensitive, copy it again from the mod."
        : "something went wrong on our end, try again in a bit.";
    state.value = "error";
  }
}

const { data: branding } = await useBranding();

useHead({
  title: () => `boobs opt-out - ${branding.value.name}`
});
</script>

<template>
  <v-sheet border rounded="0" class="pa-5">
    <template v-if="state === 'done'">
      <p class="text-body-1 mb-1">you're opted out</p>
      <p class="text-body-2 text-medium-emphasis mb-5">
        the stored config for
        <code class="text-body-2">{{ uuid }}</code>
        is gone, re-enable it any time from the mod's keybind.
      </p>
      <v-btn variant="outlined" block to="/">back to the api docs</v-btn>
    </template>

    <template v-else>
      <p class="text-body-1 mb-1">boobs opt-out</p>
      <p class="text-body-2 text-medium-emphasis mb-5">
        this deletes your stored sync config from {{ branding.name }} and stops the mod from uploading
        again until you re-register.
      </p>

      <v-list density="compact" class="mb-4" bg="surface">
        <v-list-item>
          <template #prepend><v-icon icon="mdi-account" size="small" /></template>
          <v-list-item-title class="text-body-2">{{ uuid || "no uuid provided" }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption">uuid</v-list-item-subtitle>
        </v-list-item>
        <v-list-item>
          <template #prepend><v-icon icon="mdi-key" size="small" /></template>
          <v-list-item-title class="text-body-2">
            {{ token ? token.slice(0, 4) + "••••" + token.slice(-4) : "no token provided" }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">token</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-alert
        v-if="!uuidLooksValid || !token"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
        text="this link is missing a valid uuid or token, open it again from the mod."
      />

      <v-alert
        v-if="state === 'error'"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
        :text="errorMessage"
      />

      <v-btn
        variant="outlined"
        color="error"
        block
        :loading="state === 'loading'"
        :disabled="!uuidLooksValid || !token"
        @click="optOut"
      >
        delete my config
      </v-btn>
    </template>
  </v-sheet>
</template>