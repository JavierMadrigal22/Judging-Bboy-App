document.addEventListener('DOMContentLoaded', function () {
    const eventSelect = document.getElementById('eventSelect');
    const competitorRed = document.getElementById('competitorRed');
    const competitorBlue = document.getElementById('competitorBlue');
    

    eventSelect.addEventListener('change', function () {
        const eventId = this.value;

        fetch(`/get_competitors/${eventId}`)
            .then(response => response.json())
            .then(competitors => {
                [competitorRed, competitorBlue].forEach(select => {
                    select.innerHTML = '<option value="">Seleccionar B-BOY</option>';
                    competitors.forEach(competitor => {
                        const option = document.createElement('option');
                        option.value = competitor.id;
                        option.textContent = competitor.name;
                        select.appendChild(option);
                    });
                });
            });
    });

    const voteLink = document.getElementById('voteLink');
    window.addEventListener('updateMainView', () => {
      const rId = localStorage.getItem('selectedRedId');
      const bId = localStorage.getItem('selectedBlueId');
      if (rId && bId) {
        voteLink.href = `/vote?red=${rId}&blue=${bId}`;
        voteLink.classList.remove('disabled');
      }
    });
       

    function updateCompetitorCard(selectElement, color) {
        const competitorId = selectElement.value;
        const nameElement = document.getElementById(`${color}Name`);
        const pointsElement = document.getElementById(`${color}Points`);
        const formattedColor = color.charAt(0).toUpperCase() + color.slice(1);

        if (competitorId) {
            fetch(`/get_competitor/${competitorId}`)
                .then(response => response.json())
                .then(data => {
                    nameElement.textContent = data.name;
                    pointsElement.textContent = data.total_points;

                    localStorage.setItem(`selected${formattedColor}Name`, data.name);
                    localStorage.setItem(`selected${formattedColor}Id`, competitorId);

                    const event = new CustomEvent('updateMainView', {
                        detail: { color: color, name: data.name }
                    });
                    window.dispatchEvent(event);
                });
        } else {
            nameElement.textContent = '-';
            pointsElement.textContent = '0';
            localStorage.removeItem(`selected${formattedColor}Name`);
            localStorage.removeItem(`selected${formattedColor}Id`);
        }
    }

    competitorRed.addEventListener('change', () => updateCompetitorCard(competitorRed, 'red'));
    competitorBlue.addEventListener('change', () => updateCompetitorCard(competitorBlue, 'blue'));
});