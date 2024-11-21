const CLIENT_ID = '185859829591-k1bspc3ksrha9pe2o7lmh5gv8q987a2m.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCyVG9n1L7sfiSF2ABW6q5Q00xLVkXDgI';
const SHEET_ID = '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let gapiInitialized = false;
let tokenClient;

// **Inicializar Google API**
async function initializeGoogleClient() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            console.error('Google API Client no se cargó. Revisa si incluiste el script gapi.js.');
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
                console.error('Error inicializando cliente de Google:', error);
                reject(error);
            }
        });
    });
}

// **Autenticación Automática**
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

// **Verificar Estado de Conexión**
async function getConnectionStatus() {
    if (!gapiInitialized) {
        throw new Error('Google API Client no está inicializado.');
    }

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'credenciales!E1'
        });
        const status = response.result.values ? response.result.values[0][0] : null;
        document.getElementById('connection-status').textContent = status || 'Desconectado';
    } catch (error) {
        console.error('Error al verificar el estado de conexión:', error);
        throw error;
    }
}

// **Obtener Datos de Credenciales**
async function getSheetData() {
    if (!gapiInitialized) throw new Error('Google API Client no está inicializado.');

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'credenciales!A2:B'
        });
        return response.result.values || [];
    } catch (error) {
        console.error('Error al obtener datos de credenciales:', error);
        throw error;
    }
}

// **Manejar Inicio de Sesión**
document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert('Completa todos los campos.');
        return;
    }

    try {
        const credentials = await getSheetData();
        const user = credentials.find(row => row[0] === username && row[1] === password);

        if (user) {
            alert('Inicio de sesión exitoso.');
            window.location.href = 'dashboard.html';
        } else {
            alert('Usuario o contraseña incorrectos.');
        }
    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        alert('Hubo un problema al validar las credenciales.');
    }
});

// **Ejecutar autenticación automática al cargar**
window.onload = async () => {
    await authenticateOnLoad();
    await getConnectionStatus();
};
