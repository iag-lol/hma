export const CLIENT_ID = '185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com';
export const API_KEY = 'AIzaSyCyVG9n1lH7sfiSF2ABW6q5Q00xLVkXDgI';
export const SHEET_ID = '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ';
export const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let gapiInitialized = false;
let tokenClient;

async function authenticateOnLoad() {
    try {
        await initializeGoogleClient();
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (!tokenResponse.error) {
                    console.log("Usuario autenticado automáticamente.");
                    localStorage.setItem('google_access_token', tokenResponse.access_token);
                } else {
                    console.error("Error durante la autenticación automática:", tokenResponse.error);
                }
            },
        });
        tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
        console.error("Error durante la autenticación automática:", error);
    }
}

window.onload = authenticateOnLoad;


export function initializeGoogleClient



if (typeof gapi === 'undefined') {
  console.error("Google API Client no se cargó. Revisa si incluiste el script gapi.js.");
}



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

        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error("Error autenticando al usuario:", tokenResponse.error);
                    reject(tokenResponse.error);
                } else {
                    console.log("Usuario autenticado correctamente.");
                    localStorage.setItem('google_access_token', tokenResponse.access_token);
                    resolve(tokenResponse);
                }
            },
        });

        tokenClient.requestAccessToken({ prompt: '' });
    });
}


// **Obtener credenciales desde Google Sheets**
export function getSheetData() {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  return gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'credenciales!A2:B', // Cambiar al rango correspondiente
  }).then(response => response.result.values || [])
    .catch(error => {
      console.error('Error al obtener datos de credenciales:', error);
      throw error;
    });
}

// **Verificar el estado de conexión**
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

// **Leer datos de la hoja HHEE**
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


// **Escribir datos en la hoja HHEE**
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


export async function appendPersonalData(rowData) {
  if (!gapiInitialized) {
    throw new Error('Google API Client no está inicializado.');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID, // Reemplaza con tu SHEET_ID definido
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
