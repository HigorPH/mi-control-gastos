const balanceEl = document.getElementById('balance');
const ingresosEl = document.getElementById('ingresos');
const gastosEl = document.getElementById('gastos');
const listEl = document.getElementById('lista-transacciones');
const form = document.getElementById('form');
const tipoEl = document.getElementById('tipo');
const montoEl = document.getElementById('monto');
const categoriaEl = document.getElementById('categoria');
const fechaEl = document.getElementById('fecha');
const descripcionEl = document.getElementById('descripcion');
const btnExportar = document.getElementById('btn-exportar');

const API_URL = '/api/transacciones';

let myChart = null;

// Establecer fecha de hoy por defecto
fechaEl.valueAsDate = new Date();

// Obtener transacciones desde el backend
async function getTransactions() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        const transactions = data.data;
        updateDOM(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

// Añadir transacción
async function addTransaction(e) {
    e.preventDefault();

    const transaction = {
        tipo: tipoEl.value,
        monto: parseFloat(montoEl.value),
        categoria: categoriaEl.value,
        fecha: fechaEl.value,
        descripcion: descripcionEl.value
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transaction)
        });

        if (res.ok) {
            // Limpiar campos menos fecha
            montoEl.value = '';
            descripcionEl.value = '';
            getTransactions(); // Recargar la lista
        }
    } catch (error) {
        console.error('Error adding transaction:', error);
    }
}

// Eliminar transacción
async function deleteTransaction(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            getTransactions(); // Recargar la lista
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
}

// Actualizar DOM (Lista y Dashboard)
function updateDOM(transactions) {
    listEl.innerHTML = '';

    let totalIngresos = 0;
    let totalGastos = 0;

    transactions.forEach(t => {
        // Calcular totales
        if (t.tipo === 'ingreso') {
            totalIngresos += t.monto;
        } else {
            totalGastos += t.monto;
        }

        // Crear elemento en la lista
        const li = document.createElement('li');
        li.classList.add('transaction-item');
        li.classList.add(t.tipo); // añade clase 'ingreso' o 'gasto'

        const sign = t.tipo === 'ingreso' ? '+' : '-';
        const colorClass = t.tipo === 'ingreso' ? 'money-plus' : 'money-minus';

        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-desc">${t.descripcion}</span>
                <span class="transaction-cat-date">${t.categoria} | ${t.fecha}</span>
            </div>
            <div class="transaction-amount-action">
                <span class="amount ${colorClass}">${sign}$${t.monto.toFixed(2)}</span>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">x</button>
            </div>
        `;
        listEl.appendChild(li);
    });

    // Actualizar Balance
    const balance = totalIngresos - totalGastos;
    balanceEl.innerText = `$${balance.toFixed(2)}`;
    ingresosEl.innerText = `+$${totalIngresos.toFixed(2)}`;
    gastosEl.innerText = `-$${totalGastos.toFixed(2)}`;

    // Renderizar gráfico
    renderChart(transactions);
}

// Función para renderizar el gráfico
function renderChart(transactions) {
    const ctx = document.getElementById('gastosChart').getContext('2d');
    
    // Filtrar solo gastos y agrupar por categoría
    const gastosData = {};
    transactions.forEach(t => {
        if (t.tipo === 'gasto') {
            gastosData[t.categoria] = (gastosData[t.categoria] || 0) + t.monto;
        }
    });

    const labels = Object.keys(gastosData);
    const data = Object.values(gastosData);

    if (myChart) {
        myChart.destroy();
    }

    // Si no hay gastos, mostramos un gráfico gris vacío
    if (labels.length === 0) {
        labels.push('Sin gastos');
        data.push(1);
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#cf6679', '#bb86fc', '#03dac6', '#f48fb1', '#ffb74d', '#4dd0e1'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a0a0a0' }
                }
            }
        }
    });
}

// Event Listeners
form.addEventListener('submit', addTransaction);

btnExportar.addEventListener('click', () => {
    // Abrir la ruta de exportación en una nueva pestaña forzará la descarga del Excel
    window.open('/api/exportar', '_blank');
});

// Init
getTransactions();
