export const CLIENT_ID = '185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com';
export const API_KEY = 'AIzaSyCyVG9n1L7sfiSF2ABW6q5Q00xLVkXDgI';
export const SHEET_ID = '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ';
export const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInitialized = false;
let tokenClient;

// **Inicializar Google API Client**
export function initializeGoogleClient() {
  return new Promise((resolve, reject) => {
    if (typeof gapi === 'undefined') {
      console.error("Google API Client no se cargó. Asegúrate de incluir el script gapi.js antes de este archivo.");
      reject(new Error('Google API Client no está disponible.'));
      return;
    }

    if (gapiInitialized) {
      console.log("Cliente de Google ya inicializado.");
      resolve();
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

// **Autenticación Automática al Cargar**
async function authenticateOnLoad() {
  try {
    await initializeGoogleClient();

    if (!tokenClient) {
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
    }

    // Solicitar acceso inmediatamente al cargar la página
    tokenClient.requestAccessToken({ prompt: '' }); // No muestra ventana emergente
  } catch (error) {
    console.error("Error durante la autenticación automática:", error);
  }
}

// Ejecutar la autenticación tan pronto como se cargue la página
window.onload = authenticateOnLoad;

// **Autenticación Manual (si se necesita)**
export function authenticateUser() {
  return new Promise(async (resolve, reject) => {
    if (!gapiInitialized) {
      try {
        await initializeGoogleClient();
      } catch (error) {
        console.error("Error inicializando Google API antes de autenticar:", error);
        reject(new Error('Google API Client no está inicializado.'));
        return;
      }
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

    tokenClient.requestAccessToken({ prompt: '' }); // Solicitar token
  });
}

// **Verificar el Estado de Conexión**
export function getConnectionStatus() {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  return gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'credenciales!E1',
  }).then(response => {
    const value = response.result.values ? response.result.values[0][0] : null;
    console.log('Estado de conexión (E1):', value);
    return value;
  }).catch(error => {
    console.error('Error al obtener el estado de conexión:', error);
    throw error;
  });
}

// **Leer Datos de la Hoja HHEE**
export async function fetchSheetDataHHEE() {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'HHEE!A2:F',
    });
    return response.result.values || [];
  } catch (error) {
    console.error("Error al leer datos de Google Sheets:", error);
    throw error;
  }
}

// **Escribir Datos en la Hoja HHEE**
export async function appendSheetDataHHEE(rowData) {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'HHEE!A:F',
      valueInputOption: 'RAW',
      resource: {
        values: [rowData],
      },
    });
    console.log("Registro agregado correctamente:", response.result);
    return response.result;
  } catch (error) {
    console.error("Error al escribir datos en Google Sheets:", error);
    throw error;
  }
}

// **Escribir Datos en la Hoja Personal**
export async function appendPersonalData(rowData) {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'personal!B:C', // Especifica las columnas B y C
      valueInputOption: 'RAW',
      resource: {
        values: [rowData], // Los datos deben corresponder al rango especificado (B y C)
      },
    });
    console.log("Registro agregado correctamente en personal:", response.result);
    return response.result;
  } catch (error) {
    console.error("Error al escribir datos en la hoja 'personal':", error);
    throw error;
  }
}
