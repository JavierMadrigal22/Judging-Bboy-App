// Actualizar votos en tiempo real
function fetchVotes() {
    fetch('/votes')
        .then(response => response.json())
        .then(data => {
            document.getElementById('red-votes').textContent = `Votos: ${data.red}`;
            document.getElementById('blue-votes').textContent = `Votos: ${data.blue}`;
        });
}

// Enviar voto desde el juez
function submitVote(competitor, category, value) {
    fetch('/submit_vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor, category, value })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') alert('Voto registrado!');
    });
}

// Actualizar cada 3 segundos
setInterval(fetchVotes, 3000);

// Manejar selección de radio buttons
document.querySelectorAll('.form-check-input').forEach(radio => {
    radio.addEventListener('change', function() {
        const card = this.closest('.evaluation-card');
        const color = this.dataset.bboy === 'red' ? 'underground-red' : 'underground-blue';
        card.style.borderColor = `var(--${color})`;
    });
});

// Enviar evaluación
function submitEvaluation(category) {
    const scores = {
        red: document.querySelector(`input[name="${category.toLowerCase()}_bboy_rojo"]:checked`)?.dataset.score,
        blue: document.querySelector(`input[name="${category.toLowerCase()}_bboy_azul"]:checked`)?.dataset.score
    };

    if (!scores.red || !scores.blue) {
        alert('¡Debes evaluar ambos B-Boys!');
        return;
    }

    fetch('/submit_evaluation', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            category: category,
            scores: scores
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Evaluación guardada correctamente');
        }
    });
}

// Cerrar sidebar automáticamente en móviles al hacer click en un link
document.querySelectorAll('.offcanvas a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 992) {
            const sidebar = bootstrap.Offcanvas.getInstance(document.getElementById('sidebar'));
            sidebar.hide();
        }
    });
});