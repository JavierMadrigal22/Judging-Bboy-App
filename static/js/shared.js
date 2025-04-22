// shared.js (actualización)
function updateCompetitorNames() {
    const redName = localStorage.getItem('selectedRedName');
    const blueName = localStorage.getItem('selectedBlueName');
    const categories = ['fundación', 'originalidad', 'dinámica', 'ejecución', 'batalla'];

    categories.forEach(category => {
        const redElement = document.getElementById(`redCompetitorName-${category}`);
        const blueElement = document.getElementById(`blueCompetitorName-${category}`);
        
        if (redName && redElement) redElement.textContent = redName;
        if (blueName && blueElement) blueElement.textContent = blueName;
    });
}

// Escuchar ambos eventos
window.addEventListener('storage', updateCompetitorNames);
window.addEventListener('storageUpdate', updateCompetitorNames); // Nuevo evento

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', updateCompetitorNames);

// Función para actualizar votos
function updateVotes() {
    document.querySelectorAll('.judge-vote').forEach(container => {
        const judgeId = container.dataset.judgeId;
        const categories = ['fundación', 'originalidad', 'dinámica', 'ejecución', 'batalla'];
        
        // Calcular votos totales
        let redTotal = 0;
        let blueTotal = 0;
        
        categories.forEach(category => {
            const vote = localStorage.getItem(`judge-${judgeId}-${category}`);
            if (vote === 'red') redTotal++;
            if (vote === 'blue') blueTotal++;
        });
        
        // Determinar color ganador
        const voteDisplay = container.querySelector('.vote-display');
        if (redTotal > blueTotal) {
            container.classList.add('neon-border-red');
            container.classList.remove('neon-border-blue');
            voteDisplay.textContent = 'ROJO';
            voteDisplay.style.color = '#ff0000';
        } else if (blueTotal > redTotal) {
            container.classList.add('neon-border-blue');
            container.classList.remove('neon-border-red');
            voteDisplay.textContent = 'AZUL';
            voteDisplay.style.color = '#0066ff';
        } else {
            container.classList.remove('neon-border-red', 'neon-border-blue');
            voteDisplay.textContent = '-';
            voteDisplay.style.color = 'inherit';
        }
    });
}

// Escuchar eventos de votación
window.addEventListener('storage', updateVotes);
document.addEventListener('DOMContentLoaded', updateVotes);

function submitEvaluation(category) {
    // Obtener votos
    const redScore = parseInt(document.querySelector(`input[name="${category}_bboy_rojo"]:checked`)?.value || 0);
    const blueScore = parseInt(document.querySelector(`input[name="${category}_bboy_azul"]:checked`)?.value || 0);
    
    // Determinar ganador
    const winner = redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'draw';
    
    // Guardar en localStorage
    localStorage.setItem(`judge-{{ current_user.id }}-${category}`, winner);
    
    // Actualizar vista principal
    window.dispatchEvent(new Event('storage'));
    
    // Enviar datos al servidor (aquí tu lógica de AJAX)
    // ...
}