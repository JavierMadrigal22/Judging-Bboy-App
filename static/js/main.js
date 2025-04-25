document.addEventListener('DOMContentLoaded', function () {
    // Estado de la aplicación
    const appState = {
        currentRound: 1,
        maxRounds: 3,
        battleActive: false,
        redPoints: [0, 0, 0], // Puntos por round [R1, R2, R3]
        bluePoints: [0, 0, 0],
        judgesVoted: {},
        battleHistory: []
    };

    // Elementos del DOM
    const elements = {
        eventSelect: document.getElementById('eventSelect'),
        competitorRed: document.getElementById('competitorRed'),
        competitorBlue: document.getElementById('competitorBlue'),
        currentRoundDisplay: document.getElementById('currentRoundDisplay'),
        roundIndicator: document.getElementById('roundIndicator'),
        startBattleBtn: document.getElementById('startBattleBtn'),
        endBattleBtn: document.getElementById('endBattleBtn'),
        battleCountdown: document.getElementById('battleCountdown'),
        judgesContainer: document.getElementById('judgesContainer'),
        redWinnerBanner: document.getElementById('redWinnerBanner'),
        blueWinnerBanner: document.getElementById('blueWinnerBanner')
    };

    // Inicialización
    initEventListeners();
    updateRoundDisplay();

    function initEventListeners() {
        elements.eventSelect.addEventListener('change', handleEventChange);
        elements.competitorRed.addEventListener('change', () => updateCompetitorCard('red'));
        elements.competitorBlue.addEventListener('change', () => updateCompetitorCard('blue'));
        elements.startBattleBtn.addEventListener('click', startBattle);
        elements.endBattleBtn.addEventListener('click', endBattle);
        
        // Escuchar eventos de votación desde vote.html
        window.addEventListener('judgeVoted', handleJudgeVoted);
        window.addEventListener('voteSaved', handleVoteSaved);
    }

    function handleEventChange() {
        const eventId = this.value;
        fetch(`/get_competitors/${eventId}`)
            .then(response => response.json())
            .then(competitors => {
                [elements.competitorRed, elements.competitorBlue].forEach(select => {
                    select.innerHTML = '<option value="">Seleccionar B-BOY</option>';
                    competitors.forEach(competitor => {
                        const option = document.createElement('option');
                        option.value = competitor.id;
                        option.textContent = competitor.name;
                        select.appendChild(option);
                    });
                });
            });
    }

    function updateCompetitorCard(color) {
        const selectElement = color === 'red' ? elements.competitorRed : elements.competitorBlue;
        const competitorId = selectElement.value;
        const nameElement = document.getElementById(`${color}Name`);
        const pointsElement = document.getElementById(`${color}Points`);
        const formattedColor = color.charAt(0).toUpperCase() + color.slice(1);

        if (competitorId) {
            fetch(`/get_competitor/${competitorId}`)
                .then(response => response.json())
                .then(data => {
                    nameElement.textContent = data.name;
                    pointsElement.textContent = data.total_points || 0;

                    localStorage.setItem(`selected${formattedColor}Name`, data.name);
                    localStorage.setItem(`selected${formattedColor}Id`, competitorId);

                    // Actualizar enlace de votación
                    const voteLink = document.getElementById('voteLink');
                    const rId = localStorage.getItem('selectedRedId');
                    const bId = localStorage.getItem('selectedBlueId');
                    if (rId && bId && voteLink) {
                        voteLink.href = `/vote?red=${rId}&blue=${bId}`;
                        voteLink.classList.remove('disabled');
                    }
                });
        } else {
            nameElement.textContent = '-';
            pointsElement.textContent = '0';
            localStorage.removeItem(`selected${formattedColor}Name`);
            localStorage.removeItem(`selected${formattedColor}Id`);
        }
    }

    function startBattle() {
        if (!validateCompetitors()) return;
        
        elements.startBattleBtn.disabled = true;
        elements.battleCountdown.style.display = 'block';
        
        let count = 3;
        elements.battleCountdown.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            elements.battleCountdown.textContent = count > 0 ? count : '¡BATALLA!';
            
            if (count === 0) {
                clearInterval(countdownInterval);
                setTimeout(() => {
                    elements.battleCountdown.style.display = 'none';
                    appState.battleActive = true;
                    appState.currentRound = 1;
                    appState.judgesVoted = {};
                    updateRoundDisplay();
                    elements.endBattleBtn.disabled = false;
                }, 1000);
            }
        }, 1000);
    }

    function endBattle() {
        if (!appState.battleActive) return;
        
        // Determinar ganador final
        const finalWinner = determineFinalWinner();
        saveBattleResults(finalWinner);
        
        // Resetear estado
        appState.battleActive = false;
        appState.currentRound = 1;
        appState.redPoints = [0, 0, 0];
        appState.bluePoints = [0, 0, 0];
        appState.judgesVoted = {};
        
        // Actualizar UI
        updateRoundDisplay();
        updateJudgeCards();
        updateRoundPoints();
        elements.startBattleBtn.disabled = false;
        elements.endBattleBtn.disabled = true;
        
        // Mostrar ganador
        if (finalWinner) {
            showWinnerBanner(finalWinner);
            setTimeout(() => {
                hideWinnerBanners();
            }, 3000);
        }
    }

    function handleJudgeVoted(event) {
        const { judgeId, competitorId, vote } = event.detail;
        // Guardar voto temporalmente hasta que se guarde
        if (appState.battleActive) {
            appState.judgesVoted[judgeId] = {
                competitorId,
                vote,
                round: appState.currentRound
            };
            updateJudgeCards();
        }
    }

    function handleVoteSaved(event) {
        const { judgeId, competitorId, round } = event.detail;
        
        if (competitorId === localStorage.getItem('selectedRedId')) {
            appState.redPoints[round - 1]++;
        } else if (competitorId === localStorage.getItem('selectedBlueId')) {
            appState.bluePoints[round - 1]++;
        }
        
        updateRoundPoints();
        
        // Verificar si todos los jueces votaron
        if (allJudgesVoted()) {
            advanceRoundOrFinish();
        }
    }

    function advanceRoundOrFinish() {
        const redTotal = appState.redPoints.slice(0, 2).reduce((a, b) => a + b, 0);
        const blueTotal = appState.bluePoints.slice(0, 2).reduce((a, b) => a + b, 0);
        
        if (appState.currentRound < 2 || (appState.currentRound === 2 && redTotal === blueTotal && appState.currentRound < appState.maxRounds)) {
            // Avanzar al siguiente round
            appState.currentRound++;
            appState.judgesVoted = {};
            updateRoundDisplay();
        } else {
            // Finalizar batalla
            endBattle();
        }
    }

    function updateRoundDisplay() {
        elements.currentRoundDisplay.textContent = appState.currentRound;
        elements.roundIndicator.textContent = appState.currentRound;
    }

    function updateJudgeCards() {
        document.querySelectorAll('.judge-vote').forEach(judgeElement => {
            const judgeId = judgeElement.dataset.judgeId;
            if (appState.judgesVoted[judgeId]) {
                const vote = appState.judgesVoted[judgeId];
                judgeElement.classList.remove('bg-secondary', 'bg-danger', 'bg-primary', 'bg-warning');
                
                if (vote.competitorId === localStorage.getItem('selectedRedId')) {
                    judgeElement.classList.add('bg-danger');
                } else if (vote.competitorId === localStorage.getItem('selectedBlueId')) {
                    judgeElement.classList.add('bg-primary');
                } else if (vote.vote === 'tie') {
                    judgeElement.classList.add('bg-warning');
                }
            } else {
                judgeElement.classList.remove('bg-danger', 'bg-primary', 'bg-warning');
                judgeElement.classList.add('bg-secondary');
            }
        });
    }

    function updateRoundPoints() {
        // Actualizar puntos por round
        for (let i = 0; i < 3; i++) {
            document.querySelectorAll(`.round-point[data-round="${i + 1}"]`).forEach(el => {
                if (el.closest('.competitor-card-top').querySelector('.neon-red')) {
                    el.textContent = `R${i + 1}: ${appState.redPoints[i]}`;
                } else {
                    el.textContent = `R${i + 1}: ${appState.bluePoints[i]}`;
                }
            });
        }
    }

    function determineFinalWinner() {
        const redTotal = appState.redPoints.reduce((a, b) => a + b, 0);
        const blueTotal = appState.bluePoints.reduce((a, b) => a + b, 0);
        
        if (redTotal > blueTotal) return 'red';
        if (blueTotal > redTotal) return 'blue';
        return 'tie';
    }

    function showWinnerBanner(winner) {
        if (winner === 'red') {
            elements.redWinnerBanner.style.display = 'block';
        } else if (winner === 'blue') {
            elements.blueWinnerBanner.style.display = 'block';
        }
    }

    function hideWinnerBanners() {
        elements.redWinnerBanner.style.display = 'none';
        elements.blueWinnerBanner.style.display = 'none';
    }

    function saveBattleResults(winner) {
        const redId = localStorage.getItem('selectedRedId');
        const blueId = localStorage.getItem('selectedBlueId');
        const eventId = elements.eventSelect.value;
        
        if (!redId || !blueId || !eventId) return;
        
        const battleData = {
            eventId,
            redId,
            blueId,
            rounds: appState.currentRound,
            redPoints: appState.redPoints,
            bluePoints: appState.bluePoints,
            winner,
            date: new Date().toISOString()
        };
        
        // Guardar en historial local
        appState.battleHistory.push(battleData);
        
        // Enviar al servidor
        fetch('/save_battle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(battleData)
        }).then(response => {
            if (response.ok) {
                // Actualizar puntos totales
                updateCompetitorCard('red');
                updateCompetitorCard('blue');
            }
        });
    }

    function validateCompetitors() {
        const redId = localStorage.getItem('selectedRedId');
        const blueId = localStorage.getItem('selectedBlueId');
        
        if (!redId || !blueId) {
            alert('Por favor selecciona ambos competidores');
            return false;
        }
        
        if (redId === blueId) {
            alert('No puede ser el mismo competidor para ambos lados');
            return false;
        }
        
        return true;
    }

    function allJudgesVoted() {
        const judgeElements = document.querySelectorAll('.judge-vote');
        return Array.from(judgeElements).every(judge => {
            const judgeId = judge.dataset.judgeId;
            return appState.judgesVoted[judgeId] && appState.judgesVoted[judgeId].round === appState.currentRound;
        });
    }
});