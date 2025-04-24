document.addEventListener('DOMContentLoaded', function() {
    // Función para actualizar nombres
    const updateCompetitorNames = () => {
        const redName = localStorage.getItem('selectedRedName') || 'B-BOY ROJO';
        const blueName = localStorage.getItem('selectedBlueName') || 'B-BOY AZUL';

        // Selectores mejorados
        document.querySelectorAll('[id^="redCompetitorName-"]').forEach(element => {
            element.textContent = redName;
        });
        
        document.querySelectorAll('[id^="blueCompetitorName-"]').forEach(element => {
            element.textContent = blueName;
        });
    };

    // Actualizar al cargar
    updateCompetitorNames();

    // Escuchar cambios en el almacenamiento
    window.addEventListener('storage', updateCompetitorNames);
    
    // Escuchar evento personalizado desde main.js
    window.addEventListener('updateMainView', updateCompetitorNames);
});