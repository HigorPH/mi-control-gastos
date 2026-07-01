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
        listaYapes.innerHTML = '<li class="yape-item"><div class="yape-info"><span class="yape-name">No hay yapes registrados aún.</span></div></li>';
        return;
    }

    // Por cada yape, creamos un nuevo <li>
    yapesA_Mostrar.forEach((yape, index) => {
        const li = document.createElement('li');
        li.className = 'yape-item';
        // Añadimos un pequeño retraso a la animación para que entren en cascada
        li.style.animationDelay = `${index * 0.05}s`;
        
        const fechaBonita = new Date(yape.fecha).toLocaleString('es-PE');
        
        li.innerHTML = `
            <div class="yape-info">
                <span class="yape-name">${yape.nombre_remitente}</span>
                <span class="yape-date">📅 ${fechaBonita}</span>
                <span class="yape-raw-text">"${yape.texto_original}"</span>
            </div>
            <div class="yape-amount">
                + S/ ${yape.monto.toFixed(2)}
            </div>
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
// Que la página le pregunte al servidor si hay nuevos yapes cada 5 segundos
setInterval(cargarYapes, 15000);