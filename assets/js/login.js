const CLIENT_ID = '185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCyVG9n1L7sfiSF2ABW6q5Q00xLVkXDgI';
const SHEET_ID = '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInitialized = false;
let tokenClient;

// Inicializar Google API
async function initializeGoogleClient() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            reject(new Error('Google API Client no está disponible.'));
            return;
        }

        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
                });
                gapiInitialized = true;
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Autenticación Automática
async function authenticateOnLoad() {
    try {
        await initializeGoogleClient();
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error('Error durante la autenticación automática:', tokenResponse.error);
                } else {
                    console.log('Autenticación automática exitosa.');
                    localStorage.setItem('google_access_token', tokenResponse.access_token);
                }
            }
        });

        tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
        console.error('Error durante la autenticación automática:', error);
    }
}

// Verificar Estado de Conexión
async function getConnectionStatus() {
    if (!gapiInitialized) throw new Error('Google API Client no está inicializado.');

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'credenciales!E1'
        });
        return response.result.values ? response.result.values[0][0] : null;
    } catch (error) {
        console.error('Error al verificar el estado de conexión:', error);
        throw error;
    }
}

// Obtener Credenciales
async function getSheetData() {
    if (!gapiInitialized) throw new Error('Google API Client no está inicializado.');

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'credenciales!A2:B'
        });
        return response.result.values || [];
    } catch (error) {
        console.error('Error al obtener credenciales:', error);
        throw error;
    }
}

// Manejar Inicio de Sesión
document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        Swal.fire('Error', 'Debes completar ambos campos.', 'error');
        return;
    }

    try {
        const credentials = await getSheetData();
        const match = credentials.find(row => row[0] === username && row[1] === password);

        if (match) {
            Swal.fire('Éxito', 'Inicio de sesión exitoso.', 'success').then(() => {
                window.location.href = 'views/dashboard.html';
            });
        } else {
            Swal.fire('Error', 'Usuario o contraseña incorrectos.', 'error');
        }
    } catch (error) {
        console.error('Error durante la validación de credenciales:', error);
        Swal.fire('Error', 'Ocurrió un problema con la autenticación.', 'error');
    }
});

// Ejecutar autenticación automática al cargar
window.onload = authenticateOnLoad;
