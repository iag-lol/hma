// Configuración de Google API
const CLIENT_ID = '185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCyVG9n1L7sfiSF2ABW6q5Q00xLVkXDgI';
const SHEET_ID = '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInitialized = false;
let tokenClient;

// **Inicializar Google API Client**
async function initializeGoogleClient() {
  return new Promise((resolve, reject) => {
    if (typeof gapi === 'undefined') {
      console.error("Google API Client no se cargó. Revisa si incluiste el script gapi.js.");
      reject(new Error('Google API Client no está disponible.'));
      return;
    }

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"], // Configuración necesaria
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

// **Autenticación Automática**
async function authenticateOnLoad() {
  try {
    await initializeGoogleClient(); // Asegurar que el cliente esté inicializado

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (!tokenResponse.error) {
          console.log("Usuario autenticado automáticamente.");
          localStorage.setItem('google_access_token', tokenResponse.access_token); // Guardar token
        } else {
          console.error("Error durante la autenticación automática:", tokenResponse.error);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: '' }); // Solicitar acceso inmediatamente al cargar
  } catch (error) {
    console.error("Error durante la autenticación automática:", error);
  }
}

// **Autenticación Manual**
async function authenticateUser() {
  return new Promise((resolve, reject) => {
    if (!gapiInitialized) {
      console.error('Google API Client no está inicializado.');
      reject(new Error('Google API Client no está inicializado.'));
      return;
    }

    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error("Error autenticando al usuario:", tokenResponse.error);
            reject(tokenResponse.error);
          } else {
            console.log("Usuario autenticado correctamente.");
            localStorage.setItem('google_access_token', tokenResponse.access_token); // Guardar token
            resolve(tokenResponse);
          }
        },
      });
    }

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

// **Obtener Credenciales desde Google Sheets**
async function getSheetData() {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'credenciales!A2:B', // Rango que contiene credenciales
    });
    return response.result.values || [];
  } catch (error) {
    console.error("Error al obtener datos de credenciales:", error);
    throw error;
  }
}

// **Lógica de Login**
window.onload = async function () {
  try {
    await authenticateOnLoad(); // Autenticar automáticamente

    console.log("Autenticación automática completada.");
  } catch (error) {
    console.error('Error durante la autenticación automática:', error);
  }
};

document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (!username || !password) {
    Swal.fire({
      icon: 'error',
      title: 'Campos vacíos',
      text: 'Por favor ingresa usuario y contraseña.',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    return;
  }

  try {
    const tokenResponse = await authenticateUser(); // Autenticar usuario manualmente

    localStorage.setItem('google_access_token', tokenResponse.access_token);

    // Obtener credenciales
    const credentials = await getSheetData();
    const match = credentials.find(row => row[0] === username && row[1] === password);

    if (match) {
      localStorage.setItem('authenticated', 'true');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Inicio de sesión exitoso',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didClose: () => {
          window.location.href = 'views/dashboard.html';
        },
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Usuario o contraseña incorrectos',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    console.error('Error durante la autenticación o validación:', error);

    Swal.fire({
      icon: 'error',
      title: 'Error de autenticación',
      text: 'No se pudo completar el inicio de sesión. Inténtalo nuevamente.',
      showConfirmButton: true,
    });
  }
});
