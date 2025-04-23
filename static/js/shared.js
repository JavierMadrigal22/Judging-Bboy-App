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
        const currentRound = localStorage.getItem('currentRound') || 1;
        
        // Calcular votos para la ronda actual
        let redTotal = 0, blueTotal = 0;
        
        categories.forEach(category => {
            const vote = localStorage.getItem(
                `judge-${judgeId}-${category}-round${currentRound}`
            );
            if (vote === 'red') redTotal++;
            if (vote === 'blue') blueTotal++;
        });
        
        // Actualizar UI
        const voteDisplay = container.querySelector('.vote-display');
        // ... (resto de la lógica de colores)
    });
}

// Escuchar eventos de votación
window.addEventListener('storage', updateVotes);
document.addEventListener('DOMContentLoaded', updateVotes);

function submitEvaluation(category) {
    const redScore = document.querySelector(`input[name="${category.toLowerCase()}_bboy_rojo"]:checked`)?.value;
    const blueScore = document.querySelector(`input[name="${category.toLowerCase()}_bboy_azul"]:checked`)?.value;

    fetch('/submit_vote', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            category: category,
            red_score: redScore,
            blue_score: blueScore
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Enviar evento de actualización a main.html
            localStorage.setItem('judgeUpdate', JSON.stringify({
                judgeId: data.judge_id,
                winner: data.winner
            }));
            alert('Voto registrado!');
        }
    });
}