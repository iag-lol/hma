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
                console.log('Cliente de Google inicializado correctamente.');
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

        // Solicitar token de acceso de inmediato
        tokenClient.requestAccessToken({ prompt: '' }); // `prompt: ''` para ventana emergente inmediata
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
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Completa todos los campos.',
            timer: 3000,
            showConfirmButton: false
        });
        return;
    }

    try {
        const credentials = await getSheetData();
        const user = credentials.find(row => row[0] === username && row[1] === password);

        if (user) {
            Swal.fire({
                icon: 'success',
                title: 'Inicio de sesión exitoso',
                text: 'Redirigiendo al dashboard...',
                timer: 3000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'dashboard.html';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Usuario o contraseña incorrectos.',
                timer: 3000,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al validar las credenciales.',
            timer: 3000,
            showConfirmButton: false
        });
    }
});

// **Ejecutar autenticación automática al cargar**
window.onload = async () => {
    try {
        await authenticateOnLoad(); // Autenticación automática
        await getConnectionStatus(); // Verificar conexión
    } catch (error) {
        console.error('Error al cargar la aplicación:', error);
        document.getElementById('connection-status').textContent = 'Desconectado';
    }
};
