const CLIENT_ID = "185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com";
const API_KEY = "AIzaSyCyVG9n1L7sfiSF2ABW6q5Q00xLVkXDgI";
const SHEET_ID = "1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let gapiInitialized = false;
let tokenClient;

// **Inicializar Google API Client**
async function initializeGoogleClient() {
  return new Promise((resolve, reject) => {
    if (typeof gapi === "undefined") {
      console.error("Google API Client no se cargó. Revisa si incluiste el script gapi.js.");
      reject(new Error("Google API Client no está disponible."));
      return;
    }

    gapi.load("client", async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        gapiInitialized = true;
        console.log("Cliente de Google inicializado correctamente.");
        resolve();
      } catch (error) {
        console.error("Error inicializando cliente de Google:", error);
        reject(error);
      }
    });
  });
}

// **Autenticación Manual**
async function authenticateUser() {
  return new Promise(async (resolve, reject) => {
    if (!gapiInitialized) {
      try {
        await initializeGoogleClient();
      } catch (error) {
        console.error("Error inicializando Google API antes de autenticar:", error);
        reject(new Error("Google API Client no está inicializado."));
        return;
      }
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error("Error autenticando al usuario:", tokenResponse.error);
          reject(tokenResponse.error);
        } else {
          console.log("Usuario autenticado correctamente.");
          localStorage.setItem("google_access_token", tokenResponse.access_token);
          resolve(tokenResponse);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// **Obtener Datos de Google Sheets**
async function getSheetData() {
  if (!gapiInitialized) {
    throw new Error("Google API Client no está inicializado.");
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "credenciales!A2:B",
    });
    return response.result.values || [];
  } catch (error) {
    console.error("Error al obtener datos de credenciales:", error);
    throw error;
  }
}

// **Manejar el inicio de sesión al hacer clic en el botón**
document.getElementById("loginForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Por favor, ingresa usuario y contraseña.");
    return;
  }

  try {
    // Autenticar usuario con Google
    await authenticateUser();

    // Obtener credenciales desde Google Sheets
    const credentials = await getSheetData();
    const match = credentials.find((row) => row[0] === username && row[1] === password);

    if (match) {
      alert("Inicio de sesión exitoso");
      window.location.href = "views/dashboard.html";
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  } catch (error) {
    console.error("Error durante la validación de credenciales:", error);
    alert("Hubo un problema al validar tus credenciales. Inténtalo más tarde.");
  }
});

// **Autenticación Automática al cargar**
window.onload = async () => {
  try {
    await initializeGoogleClient();
    console.log("Google API Client cargado automáticamente.");
  } catch (error) {
    console.error("Error durante la inicialización automática:", error);
  }
};

