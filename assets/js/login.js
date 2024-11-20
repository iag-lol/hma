import { initializeGoogleClient, authenticateUser, getSheetData, getConnectionStatus } from './googlesheets.js';

window.onload = async function () {
  try {
    // Inicializa el cliente de Google
    await initializeGoogleClient();

    // Verifica el estado de conexión
    const status = await getConnectionStatus();
    const statusElement = document.getElementById('connection-status');

    if (status === 'Conectado') {
      statusElement.textContent = 'Conectado';
      statusElement.classList.add('connected');
      statusElement.classList.remove('disconnected');
    } else {
      statusElement.textContent = 'Desconectado';
      statusElement.classList.add('disconnected');
      statusElement.classList.remove('connected');
    }
  } catch (error) {
    console.error('Error al inicializar o verificar el estado de conexión:', error);

    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = 'Desconectado';
    statusElement.classList.add('disconnected');
    statusElement.classList.remove('connected');
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
    // Autenticar usuario
    const tokenResponse = await authenticateUser();

    // Guardar el token en localStorage
    localStorage.setItem('google_access_token', tokenResponse.access_token);

    // Obtener credenciales desde Google Sheets
    const credentials = await getSheetData();
    const match = credentials.find(row => row[0] === username && row[1] === password);

    if (match) {
      // Guardar estado autenticado
      localStorage.setItem('authenticated', 'true');

      // Notificación de éxito
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Inicio de sesión exitoso',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didClose: () => {
          // Redirigir al dashboard
          window.location.href = 'views/dashboard.html';
        },
      });
    } else {
      // Notificación de error
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
