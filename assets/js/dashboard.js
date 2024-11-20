import { initializeGoogleClient, fetchSheetDataHHEE, appendSheetDataHHEE, authenticateUser } from './googlesheets.js';
import { SHEET_ID } from './googlesheets.js';
window.onload = async () => {
    try {
        const isAuthenticated = localStorage.getItem('authenticated');
        const accessToken = localStorage.getItem('google_access_token');

        if (!isAuthenticated || !accessToken) {
            Swal.fire({
                icon: 'error',
                title: 'No autenticado',
                text: 'Por favor, inicia sesión primero.',
                confirmButtonText: 'Ir al login',
            }).then(() => {
                window.location.href = '../index.html';
            });
            return;
        }

        // Inicializar cliente de Google con el token existente
        await initializeGoogleClient();

        // Configurar token en la API de Google
        gapi.auth.setToken({ access_token: accessToken });
        console.log("Google API inicializada con token reutilizado.");

        // Actualizar tabla con los registros actuales
        await updateTable();
    } catch (error) {
        console.error("Error al inicializar o autenticar:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo inicializar la API o autenticar al usuario.',
            confirmButtonText: 'OK',
        });
    }
};

// **Cerrar sesión**
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('google_access_token');
    Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        text: 'Has cerrado sesión exitosamente.',
        confirmButtonText: 'OK',
    }).then(() => {
        window.location.href = '../index.html';
    });
});

// **Alternar entre secciones del dashboard**
document.addEventListener("DOMContentLoaded", () => {
    const menuButtons = document.querySelectorAll(".menu-btn");
    const sections = document.querySelectorAll(".section");

    if (!menuButtons.length || !sections.length) {
        console.error("No se encontraron botones o secciones en el DOM.");
        return;
    }

    menuButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const targetSection = button.dataset.section;

            // Validar si la sección existe
            const sectionToActivate = document.getElementById(targetSection);
            if (!sectionToActivate) {
                console.error(`No se encontró la sección con id: ${targetSection}`);
                return;
            }

            // Ocultar todas las secciones
            sections.forEach((section) => section.classList.remove("active"));

            // Mostrar la sección correspondiente
            sectionToActivate.classList.add("active");

            // Resaltar el botón activo
            menuButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
        });
    });
});

// **Función para formatear automáticamente las horas y soportar tabulación**
function agregarFormatoHoraConTab(input, siguienteInput) {
    input.addEventListener("input", (event) => {
        let value = input.value.replace(/[^0-9]/g, ""); // Solo números
        if (value.length > 2) {
            value = `${value.slice(0, 2)}:${value.slice(2, 4)}`; // Agregar ':'
        }
        input.value = value;

        // Si se completa el formato, tabula al siguiente input
        if (value.length === 5 && siguienteInput) {
            siguienteInput.focus();
        }
    });

    // Limitar el número máximo de caracteres
    input.addEventListener("keydown", (event) => {
        if (input.value.length >= 5 && event.key !== "Backspace" && event.key !== "Delete") {
            event.preventDefault();
        }
    });
}

// Obtener los campos del formulario
const horaInicioInput = document.getElementById("hora-inicio");
const horaTerminoInput = document.getElementById("hora-termino");

// Aplicar la función a los campos
agregarFormatoHoraConTab(horaInicioInput, horaTerminoInput); // Tabular de "hora-inicio" a "hora-termino"
agregarFormatoHoraConTab(horaTerminoInput, null); // "hora-termino" no tabula más allá

// Función para buscar el RUT en la hoja de Google Sheets
async function buscarDatosPorRut(rutInput, nombreInput, cargoInput) {
    rutInput.addEventListener("input", async () => {
        const rut = rutInput.value.trim(); // Capturar el valor del RUT
        if (rut === "") {
            nombreInput.value = "";
            cargoInput.value = "";
            return;
        }

        try {
            // Llamar a la API de Google Sheets
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: '1eeUBgYIoo1K0w3EN4AfYAb1hgUGsu8MiYas-k8HlzmQ', // Reemplaza con tu Sheet ID
                range: 'personal!A2:C', // Rango en la hoja "personal"
            });

            const datos = response.result.values || [];
            let encontrado = false;

            // Buscar el RUT en los datos
            datos.forEach((fila) => {
                if (fila[0] === rut) { // Coincidencia con el RUT (Columna A)
                    nombreInput.value = fila[1] || ""; // Rellenar nombre (Columna B)
                    cargoInput.value = fila[2] || ""; // Rellenar cargo (Columna C)
                    encontrado = true;
                }
            });

            // Si no se encuentra, limpiar los campos
            if (!encontrado) {
                nombreInput.value = "";
                cargoInput.value = "";
            }
        } catch (error) {
            console.error("Error al buscar datos por RUT:", error);
        }
    });
}

// Obtener los inputs
const rutInput = document.getElementById("rut");
const nombreInput = document.getElementById("nombre");
const cargoInput = document.getElementById("cargo");

// Llamar a la función para activar la búsqueda
buscarDatosPorRut(rutInput, nombreInput, cargoInput);








// **Actualizar la tabla con registros de HHEE**
async function updateTable() {
    try {
        const registros = await fetchSheetDataHHEE();
        const tableBody = document.querySelector("#tabla-registros tbody");

        // Limpiar la tabla antes de rellenar
        tableBody.innerHTML = "";

        let acumuladorHorasExtras = 0; // Acumulador para sumar todas las horas extras en minutos

        // Procesar cada registro
        registros.forEach((registro) => {
            const row = document.createElement("tr");

            // Formatear la fecha antes de insertar
            registro[3] = formatearFecha(registro[3]); // Cambiar la fecha al formato DD-MM-YYYY

            // Obtener hora de inicio y término
            const horaInicio = registro[4]; // Se espera en formato HH:MM
            const horaTermino = registro[5]; // Se espera en formato HH:MM
            const totalHorasExtras = calcularHorasExtras(horaInicio, horaTermino);

            // Sumar las horas extras al acumulador
            if (totalHorasExtras !== "00:00") {
                acumuladorHorasExtras += convertirHorasAMinutos(totalHorasExtras);
            }

            // Crear celdas para cada columna
            registro.forEach((celda) => {
                const cell = document.createElement("td");
                cell.textContent = celda;
                row.appendChild(cell);
            });

            // Crear y agregar celda para horas extras
            const totalHorasCell = document.createElement("td");
            totalHorasCell.textContent = totalHorasExtras;
            row.appendChild(totalHorasCell);

            tableBody.appendChild(row);
        });

        // Actualizar el total de registros y horas extras en el resumen
        document.getElementById("total-registros").textContent = registros.length;
        document.getElementById("total-horas-extras").textContent = convertirMinutosAHoras(acumuladorHorasExtras);
    } catch (error) {
        console.error("Error al actualizar la tabla:", error);

        if (error.status === 401) {
            console.log("Token expirado. Reautenticando...");
            await authenticateUser();
            await updateTable(); // Reintentar después de obtener un nuevo token
        } else {
            Swal.fire({
                icon: "error",
                title: "Error al cargar la tabla",
                text: "No se pudieron cargar los datos desde Google Sheets.",
                timer: 3000,
                showConfirmButton: false,
            });
        }
    }
}

// **Función para formatear fecha al estilo "DD-MM-YYYY"**
function formatear_Fecha(fecha) {
    const [año, mes, dia] = fecha.split("-"); // Dividir la fecha (ISO: YYYY-MM-DD)
    return `${dia}-${mes}-${año}`; // Retornar en formato DD-MM-YYYY
}


// **Función única para calcular las horas extras**
function calcularHorasExtras(horaInicio, horaTermino) {
    // Validar si los valores existen
    if (!horaInicio || !horaTermino) {
        console.warn("Hora de inicio o término faltante:", { horaInicio, horaTermino });
        return "00:00"; // Si falta alguno de los valores, retornar "00:00"
    }

    // Validar formato HH:MM
    if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaTermino)) {
        console.warn(`Formato de hora inválido: Inicio(${horaInicio}), Término(${horaTermino})`);
        return "00:00"; // Si el formato no es válido, retornar "00:00"
    }

    // Separar horas y minutos
    const [inicioHoras, inicioMinutos] = horaInicio.split(":").map(Number);
    const [terminoHoras, terminoMinutos] = horaTermino.split(":").map(Number);

    // Convertir a minutos totales
    const inicioEnMinutos = inicioHoras * 60 + inicioMinutos;
    const terminoEnMinutos = terminoHoras * 60 + terminoMinutos;

    // Calcular diferencia en minutos (considerar turnos nocturnos)
    let diferenciaEnMinutos = terminoEnMinutos - inicioEnMinutos;
    if (diferenciaEnMinutos < 0) {
        diferenciaEnMinutos += 24 * 60; // Turno nocturno
    }

    // Convertir a formato HH:MM y retornar
    return convertirMinutosA_Horas(diferenciaEnMinutos);
}

// **Convertir Minutos Totales a Formato "HH:MM"**
function convertirMinutosAHoras(minutosTotales) {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
}

// **Convertir Formato "HH:MM" a Minutos**
function convertirHorasAMinutos(horasExtras) {
    const [horas, minutos] = horasExtras.split(":").map(Number);
    return horas * 60 + minutos;
}

// **Manejar el formulario para agregar un nuevo registro**
document.getElementById("form-hhee").addEventListener("submit", async (event) => {
    event.preventDefault();

    // Capturar los valores del formulario
    const rut = document.getElementById("rut").value.trim();
    const nombre = document.getElementById("nombre").value.trim();
    const cargo = document.getElementById("cargo").value.trim();
    const fecha = document.getElementById("fecha").value;
    const horaInicio = document.getElementById("hora-inicio").value.trim();
    const horaTermino = document.getElementById("hora-termino").value.trim();

    // Validar campos vacíos
    if (!rut || !nombre || !cargo || !fecha || !horaInicio || !horaTermino) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Por favor completa todos los campos.",
            timer: 3000,
            showConfirmButton: false,
        });
        return;
    }

    try {
        // Agregar nuevo registro en Google Sheets
        await appendSheetDataHHEE([rut, nombre, cargo, fecha, horaInicio, horaTermino]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Registro agregado con éxito",
            timer: 3000,
            showConfirmButton: false,
        });

        // Actualizar la tabla después de agregar un registro
        await updateTable();

        // Limpiar el formulario
        event.target.reset();
    } catch (error) {
        console.error("Error al agregar registro:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Hubo un problema al registrar los datos.",
            timer: 3000,
            showConfirmButton: false,
        });
    }
});








document.getElementById('btn-consultar-hhee').addEventListener('click', async () => {
    const rutConsulta = document.getElementById('rut-consulta').value.trim();
    const nombreConsulta = document.getElementById('nombre-consulta');
    const mesSeleccionado = document.getElementById('mes-consulta').value;

    if (!rutConsulta) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Por favor ingresa un RUT.",
            timer: 3000,
            showConfirmButton: false,
        });
        return;
    }

    try {
        // Obtener datos del trabajador
        const datosPersonal = await obtenerDatosTrabajador(rutConsulta);
        if (!datosPersonal) {
            Swal.fire({
                icon: "error",
                title: "No encontrado",
                text: "El RUT ingresado no tiene registros.",
                timer: 3000,
                showConfirmButton: false,
            });
            return;
        }

        // Rellenar el campo de nombre
        nombreConsulta.value = datosPersonal.nombre;

        // Obtener horas extras del trabajador
        const horasExtras = await obtenerHorasExtrasPorRut(rutConsulta);

        // Limpiar la tabla de detalles
        const tablaBody = document.querySelector("#tabla-informe-hhee tbody");
        tablaBody.innerHTML = "";

        let totalHorasExtras = 0; // Acumulador para total de horas del mes

        // Procesar y mostrar los registros
        horasExtras.forEach((registro) => {
            const fechaFormateada = registro.fecha ? formatearFecha(registro.fecha) : "Sin fecha";
            const horasExtrasFormato = registro.horasExtras || "00:00";

            // Filtrar por mes si está seleccionado
            if (mesSeleccionado) {
                const [dia, mes, anio] = fechaFormateada.split("/");
                if (parseInt(mes) !== parseInt(mesSeleccionado)) {
                    return; // Saltar registros que no coincidan con el mes
                }
            }

            const row = document.createElement("tr");

            // Crear celdas
            const cellFecha = document.createElement("td");
            const cellHoras = document.createElement("td");

            cellFecha.textContent = fechaFormateada;
            cellHoras.textContent = horasExtrasFormato;

            row.appendChild(cellFecha);
            row.appendChild(cellHoras);
            tablaBody.appendChild(row);

            // Acumular las horas extras
            totalHorasExtras += convertirHorasA_Minutos(horasExtrasFormato);
        });

        // Mostrar el total del mes en formato HH:MM
        document.getElementById("total-horas-mes").textContent = convertirMinutosA_Horas(totalHorasExtras);

        // Actualizar el total ganado en base al valor ingresado
        const valorHheeInput = document.getElementById("valor-hhee");
        valorHheeInput.addEventListener("input", () => {
            const valorPorHora = parseFloat(valorHheeInput.value) || 0; // Obtener valor por hora
            const totalGanado = Math.floor(valorPorHora * (totalHorasExtras / 60)); // Calcular y eliminar decimales
            document.getElementById("total-ganado-mes").textContent = `$${totalGanado.toLocaleString("es-CL")}`; // Formatear en pesos CLP
        });

    } catch (error) {
        console.error("Error al consultar HHEE:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Hubo un problema al consultar los datos.",
            timer: 3000,
            showConfirmButton: false,
        });
    }
});

document.getElementById('btn-descargar-pdf').addEventListener('click', () => {
    const rutConsulta = document.getElementById('rut-consulta').value.trim();
    const nombreConsulta = document.getElementById('nombre-consulta').value.trim();

    if (!rutConsulta || !nombreConsulta) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Por favor ingresa un RUT y realiza la consulta antes de descargar el PDF.',
            timer: 3000,
            showConfirmButton: false,
        });
        return;
    }

    try {
        // Crear una nueva instancia de jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Agregar título
        doc.setFontSize(16);
        doc.text('Informe Mensual de HHEE', 10, 10);

        // Agregar información del trabajador
        doc.setFontSize(12);
        doc.text(`RUT: ${rutConsulta}`, 10, 20);
        doc.text(`Nombre: ${nombreConsulta}`, 10, 30);

        // Crear tabla de datos
        const tablaBody = document.querySelectorAll("#tabla-informe-hhee tbody tr");
        const headers = ["Fecha", "Horas Extras"];
        const rows = [];

        tablaBody.forEach(row => {
            const fecha = row.children[0].textContent || "Sin fecha";
            const horasExtras = row.children[1].textContent || "00:00";
            rows.push([fecha, horasExtras]);
        });

        // Agregar la tabla al PDF usando jsPDF-AutoTable con límite de 10 filas por página
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: 40,
            pageBreak: 'auto', // Activar el salto de página automático
            theme: 'grid', // Tema de la tabla (opcional)
            styles: {
                fontSize: 10, // Ajustar el tamaño de fuente para la tabla
            },
            bodyStyles: {
                valign: 'middle',
            },
            headStyles: {
                fillColor: [22, 160, 133], // Color de fondo del encabezado
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Ajustar la columna de Fecha
                1: { cellWidth: 'auto' }, // Ajustar la columna de Horas Extras
            },
            showHead: 'everyPage', // Repetir encabezado en cada página
        });

        // Agregar resumen de horas
        const totalHorasMes = document.getElementById('total-horas-mes').textContent;
        const totalGanadoMes = document.getElementById('total-ganado-mes').textContent;
        doc.text(`Total de Horas Extras del Mes: ${totalHorasMes}`, 10, doc.lastAutoTable.finalY + 10);
        doc.text(`Total Ganado en el Mes: ${totalGanadoMes}`, 10, doc.lastAutoTable.finalY + 20);

        // Descargar el archivo PDF
        doc.save(`Informe_HHEE_${rutConsulta}.pdf`);
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al generar el PDF.',
            timer: 3000,
            showConfirmButton: false,
        });
    }
});




// Función para buscar datos del trabajador por RUT en la hoja "personal"
async function obtenerDatosTrabajador(rut) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'personal!A2:C', // Rango de la hoja "personal"
        });

        const rows = response.result.values || [];

        // Buscar el RUT en la primera columna
        const registro = rows.find(row => row[0] === rut);

        if (registro) {
            return { nombre: registro[1], cargo: registro[2] }; // Devolver nombre y cargo
        }

        return null; // Si no se encuentra
    } catch (error) {
        console.error("Error al obtener datos del trabajador:", error);
        throw error;
    }
}

// Función para buscar las horas extras de un trabajador por RUT

async function obtenerHorasExtrasPorRut(rut) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'HHEE!A2:G', // Rango de la hoja de horas extras
        });

        const rows = response.result.values || [];

        // Filtrar las filas que coincidan con el RUT
        const registros = rows.filter(row => row[0] === rut).map(row => {
            const fecha = row[3]; // Columna de fecha
            const horaInicio = row[4]; // Columna de hora de inicio
            const horaTermino = row[5]; // Columna de hora de término
            const horasExtras = calcularHorasExtras(horaInicio, horaTermino); // Calcular horas extras

            return {
                fecha,
                horasExtras,
            };
        });

        return registros;
    } catch (error) {
        console.error("Error al obtener horas extras:", error);
        throw error;
    }
}





// Función para formatear fechas (de formato YYYY-MM-DD a DD/MM/YYYY)
function formatearFecha(fecha) {
    if (!fecha) return "Fecha inválida"; // Manejar fecha inválida
    const [year, month, day] = fecha.split("-");
    return `${day}/${month}/${year}`;
}

// Función para convertir de formato HH:MM a minutos totales
function convertirHorasA_Minutos(horas) {
    if (!horas) return 0; // Si no hay horas, retorna 0
    const [hh, mm] = horas.split(":").map(Number);
    return hh * 60 + mm;
}

// Función para convertir minutos totales a formato HH:MM
function convertirMinutosA_Horas(minutosTotales) {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
}
