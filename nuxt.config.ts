import { md2 } from "vuetify/blueprints";
import { scalarConfig } from "./scalar.config";

export default defineNuxtConfig({
  compatibilityDate: "2026-10-11",
  devtools: { enabled: true },
  modules: ["vuetify-nuxt-module", "@scalar/nuxt"],
  css: ["~/assets/globals.css"],
  vue: {
    compilerOptions: {
      comments: false
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        "@scalar/nuxt > @scalar/api-reference",
        "@scalar/nuxt > jsonpointer",
        "@scalar/nuxt > ajv-draft-04",
        "@scalar/nuxt > ajv-formats",
        "@scalar/nuxt > ajv",
        "@scalar/nuxt > ajv-draft-04 > ajv",
        "@scalar/nuxt > ajv-formats > ajv",
        "@scalar/nuxt > whatwg-mimetype",
        "@scalar/nuxt > @scalar/openapi-parser",
        "@scalar/nuxt > debug",
        "@scalar/nuxt > extend",
        "@scalar/nuxt > highlightjs-curl",
        "@scalar/nuxt > highlight.js/lib/core"
      ]
    }
  },
  routeRules: {
    "/**": { ssr: false },
    "/v1/**": { cors: true }
  },
  vuetify: {
    moduleOptions: {
      icons: { defaultSet: "mdi" }
    },
    vuetifyOptions: {
      blueprint: md2,
      theme: {
        defaultTheme: "dark",
        themes: {
          dark: {
            dark: true,
            colors: {
              background: "#17181c",
              surface: "#1e1f24",
              "surface-variant": "#2a2c33",
              "surface-bright": "#262a30",
              primary: "#f59e0b",
              "primary-darken-1": "#b45309",
              "on-primary": "#171310",
              secondary: "#03DAC6",
              "secondary-darken-1": "#018786",
              accent: "#03DAC6",
              error: "#CF6679",
              info: "#BB86FC",
              success: "#03DAC6",
              warning: "#F2E6A8",
              "on-background": "#f0ece8",
              "on-surface": "#f0ece8"
            }
          }
        }
      }
    }
  },
  scalar: scalarConfig,
  nitro: {
    preset: process.env.BUILD_EXE ? "bun" : process.env.NITRO_PRESET || "cloudflare_module",
    ...(process.env.BUILD_EXE ? { serveStatic: "inline" as const } : {}),
    prerender: {
      routes: ["/"]
    }
  },
  app: {
    head: {
      title: "api.ehis.gay",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "color-scheme", content: "dark" }
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        }
      ]
    }
  }
});