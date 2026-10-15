export const scalarConfig = {
  devtools: true,
  layout: false,
  configurations: [],
  darkMode: true,
  metaData: {
    title: "api.ehis.gay"
  },
  pathRouting: {
    basePath: "/"
  },
  showSidebar: true,
  url: "/openapi.yml",
  hideClientButton: true,
  showDeveloperTools: "never",
  hideTestRequestButton: true,
  documentDownloadType: "none",
  hideDarkModeToggle: true,
  mcp: {
    disabled: true
  },
  agent: {
    disabled: true
  },
  theme: "default",
  customCss: `
      .light-mode,
      .dark-mode {
        --scalar-font: "Roboto", system-ui, -apple-system, "Segoe UI", sans-serif;
        --scalar-background-1: #1e1f24;
        --scalar-background-2: #262a30;
        --scalar-background-3: #2a2c33;
        --scalar-background-4: #34373f;
        --scalar-background-accent: #f59e0b1f;
        --scalar-color-1: #f0ece8;
        --scalar-color-2: #b9b3ac;
        --scalar-color-3: #8d8781;
        --scalar-color-accent: #f59e0b;
        --scalar-border-color: #2a2c33;
        --scalar-link-color: #f59e0b;
        --scalar-link-color-hover: #fbbf24;
        --scalar-button-1: #f59e0b;
        --scalar-button-1-hover: #d97706;
        --scalar-button-1-color: #171310;
        --scalar-color-green: #03DAC6;
        --scalar-color-red: #CF6679;
        --scalar-color-blue: #BB86FC;
        --scalar-color-purple: #BB86FC;
        --scalar-color-orange: #f59e0b;
        --scalar-color-yellow: #F2E6A8;
        --scalar-sidebar-background-1: #17181c;
        --scalar-sidebar-color-1: #f0ece8;
        --scalar-sidebar-color-2: #8d8781;
        --scalar-sidebar-color-active: #f59e0b;
        --scalar-sidebar-border-color: #2a2c33;
        --scalar-sidebar-item-hover-background: #1e1f24;
        --scalar-sidebar-item-active-background: #f59e0b1a;
        --scalar-sidebar-search-background: #1e1f24;
        --scalar-sidebar-search-border-color: #2a2c33;
        --scalar-sidebar-search-color: #8d8781;
        --scalar-shadow-1: 0 1px 3px 0 #0000001a;
        --scalar-shadow-2: 0 0 0 0.5px var(--scalar-border-color), #0f0f0f33 0px 3px 6px,
          #0f0f0f66 0px 9px 24px;
        --scalar-lifted-brightness: 1.45;
        --scalar-backdrop-brightness: 0.5;
        --scalar-scrollbar-color: #ffffff2e;
        --scalar-scrollbar-color-active: #ffffff5c;
        --scalar-text-decoration-color: currentColor;
        --scalar-text-decoration-color-hover: currentColor;
      }
      body {
        background: #17181c;
      }
    `,
  telemetry: false
};