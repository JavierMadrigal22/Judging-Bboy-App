// shared.js
let currentRound = parseInt(localStorage.getItem('currentRound')) || 1;
const categories = ['fundación', 'originalidad', 'dinámica', 'ejecución', 'batalla'];

// ========== FUNCIONES BÁSICAS ==========
function updateCompetitorNames() {
    const redName = localStorage.getItem('selectedRedName');
    const blueName = localStorage.getItem('selectedBlueName');

    categories.forEach(category => {
        const redElement = document.getElementById(`redCompetitorName-${category}`);
        const blueElement = document.getElementById(`blueCompetitorName-${category}`);
        
        if (redName && redElement) redElement.textContent = redName;
        if (blueName && blueElement) blueElement.textContent = blueName;
    });
}

function setCurrentRound(round) {
    currentRound = round;
    localStorage.setItem('currentRound', currentRound);
    document.querySelectorAll('.round-display').forEach(el => {
        el.textContent = `Round ${currentRound}:`;
    });
    window.dispatchEvent(new Event('updateVotes'));
}

// ========== LÓGICA DE VOTACIÓN ==========
function calculateJudgeVote(judgeId) {
    let redTotal = 0, blueTotal = 0;
    
    categories.forEach(category => {
        const vote = localStorage.getItem(`judge-${judgeId}-${category}-round${currentRound}`);
        if (vote === 'red') redTotal++;
        if (vote === 'blue') blueTotal++;
    });
    
    return { redTotal, blueTotal };
}

function updateJudgeDisplay(container) {
    const judgeId = container.dataset.judgeId;
    const { redTotal, blueTotal } = calculateJudgeVote(judgeId);
    const voteDisplay = container.querySelector('.vote-display');

    container.classList.remove('neon-border-red', 'neon-border-blue', 'neon-border-gray');
    voteDisplay.style.color = 'inherit';

    if (redTotal > blueTotal) {
        container.classList.add('neon-border-red');
        voteDisplay.textContent = 'ROJO';
        voteDisplay.style.color = '#ff0000';
    } else if (blueTotal > redTotal) {
        container.classList.add('neon-border-blue');
        voteDisplay.textContent = 'AZUL';
        voteDisplay.style.color = '#0066ff';
    } else {
        container.classList.add('neon-border-gray');
        voteDisplay.textContent = '-';
    }
}

// ========== CONTROL DE RONDAS ==========
function checkRoundCompletion() {
    const allJudges = document.querySelectorAll('.judge-vote');
    let allJudgesCompleted = true;

    allJudges.forEach(judge => {
        const judgeId = judge.dataset.judgeId;
        let hasAllVotes = true;
        
        categories.forEach(category => {
            if (!localStorage.getItem(`judge-${judgeId}-${category}-round${currentRound}`)) {
                hasAllVotes = false;
            }
        });
        
        if (!hasAllVotes) allJudgesCompleted = false;
    });

    if (allJudgesCompleted) {
        const results = calculateRoundResults();
        handleRoundTransition(results);
    }
}

function calculateRoundResults() {
    const judges = document.querySelectorAll('.judge-vote');
    let redWins = 0, blueWins = 0;

    judges.forEach(judge => {
        const { redTotal, blueTotal } = calculateJudgeVote(judge.dataset.judgeId);
        if (redTotal > blueTotal) redWins++;
        if (blueTotal > redTotal) blueWins++;
    });

    return { redWins, blueWins };
}

function handleRoundTransition(results) {
    if (currentRound === 1) {
        setCurrentRound(2);
    } else if (currentRound === 2) {
        if (results.redWins === results.blueWins) {
            setCurrentRound(3);
        } else {
            // Lógica para finalizar la competencia
            alert(`¡GANADOR: ${results.redWins > results.blueWins ? 'ROJO' : 'AZUL'}`);
        }
    } else if (currentRound === 3) {
        // Lógica para ronda de desempate final
    }
}

// ========== EVENTOS ==========
function handleStorageUpdate() {
    updateCompetitorNames();
    document.querySelectorAll('.judge-vote').forEach(updateJudgeDisplay);
    checkRoundCompletion();
}

document.addEventListener('DOMContentLoaded', () => {
    updateCompetitorNames();
    setCurrentRound(currentRound); // Inicializar display
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('updateVotes', handleStorageUpdate);
});

// ========== SUBMIT EVALUATION ==========
function submitEvaluation(category) {
    const redScore = parseInt(document.querySelector(`input[name="${category}_bboy_rojo"]:checked`)?.value || 0);
    const blueScore = parseInt(document.querySelector(`input[name="${category}_bboy_azul"]:checked`)?.value || 0);
    
    const winner = redScore > blueScore ? 'red' : 
                   blueScore > redScore ? 'blue' : 
                   'draw';
    
    localStorage.setItem(
        `judge-{{ current_user.id }}-${category}-round${currentRound}`,
        winner
    );
    
    window.dispatchEvent(new Event('updateVotes'));
    
    // AJAX para guardar en backend
    fetch('/save_vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            judgeId: {{ current_user.id }},
            category,
            round: currentRound,
            winner
        })
    });
}