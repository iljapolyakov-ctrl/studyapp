// ==== HIER TRAGEN DEINE EIGENEN AZURE-APP-WERTE EIN ====
// Siehe README.md Abschnitt "1. Azure App-Registrierung" für die genauen Schritte.
const APP_CONFIG = {
  msal: {
    auth: {
      // Die "Application (client) ID" aus deiner Azure-App-Registrierung:
      clientId: "94c42f79-95a6-4aa5-9e6a-e648acea919b",
      // "consumers" = nur private Microsoft-Konten (outlook.com, hotmail.com, live.com ...)
      // "common"    = private UND Microsoft 365/Schul-/Arbeitskonten
      authority: "https://login.microsoftonline.com/consumers",
      // Muss exakt der URL entsprechen, unter der du die App hostest (ohne trailing slash-Probleme),
      // z. B. "https://deinname.github.io/studyapp" oder "http://localhost:5500" für lokale Tests.
      redirectUri: window.location.origin + window.location.pathname
    },
    cache: {
      cacheLocation: "localStorage"
    }
  },
  scopes: ["User.Read", "Files.ReadWrite.AppFolder"],
  // Dateiname, unter dem alle Daten im OneDrive-App-Ordner gespeichert werden
  dataFileName: "studyapp-data.json"
};
