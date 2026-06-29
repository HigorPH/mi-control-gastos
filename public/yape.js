// URL de nuestra nueva ruta en el backend
const API_URL = '/api/yapes';

// Atrapamos los elementos del HTML
const listaYapes = document.getElementById('lista-yapes');
const buscador = document.getElementById('buscador');

// Variable global para guardar todos los yapes y poder filtrarlos luego
let todosLosYapes = [];

// Función para ir al servidor y traer los datos
async function cargarYapes() {
    try {
        const respuesta = await fetch(API_URL);
        const datos = await respuesta.json();
        
        todosLosYapes = datos.data || [];
        dibujarYapes(todosLosYapes);
    } catch (error) {
        listaYapes.innerHTML = `<li style="color:red">Error al cargar datos: ${error.message}</li>`;
    }
}

// Función para dibujar los datos en la pantalla
function dibujarYapes(yapesA_Mostrar) {
    listaYapes.innerHTML = ''; // Limpiamos la lista primero
    
    if (yapesA_Mostrar.length === 0) {
        listaYapes.innerHTML = '<li>No hay yapes registrados aún.</li>';
        return;
    }

    // Por cada yape, creamos un nuevo <li>
    yapesA_Mostrar.forEach(yape => {
        const li = document.createElement('li');
        // Formateamos la fecha bonita
        const fechaBonita = new Date(yape.fecha).toLocaleString('es-PE');
        
        li.innerHTML = `
            <strong>${yape.nombre_remitente}</strong> te yapeó 
            <span style="color: #00d09c; font-weight: bold;">S/ ${yape.monto.toFixed(2)}</span> 
            <br><small>📅 ${fechaBonita}</small>
        `;
        listaYapes.appendChild(li);
    });
}

// Lógica del Buscador en tiempo real
buscador.addEventListener('input', (evento) => {
    const textoBuscado = evento.target.value.toLowerCase();
    
    // Filtramos la lista: nos quedamos solo con los que el nombre incluya el texto
    const filtrados = todosLosYapes.filter(yape => 
        yape.nombre_remitente.toLowerCase().includes(textoBuscado)
    );
    
    dibujarYapes(filtrados);
});

// Arrancar apenas cargue la página
cargarYapes();