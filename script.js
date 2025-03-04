const CACHE_KEY = "feriados_cache";
const CACHE_TIME_KEY = "feriados_cache_time";
const SELECTED_COUNTRIES_KEY = "selected_countries";

// Salva os feriados e os paises no cache
function saveCache(countries, holidays) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(holidays));
    localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    localStorage.setItem(SELECTED_COUNTRIES_KEY, JSON.stringify(countries));
}

// Verifica se o cache ainda é válido
// Cache válido por 24 horas
function isCacheValid() {
    const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
    const selectedCountries = JSON.parse(localStorage.getItem(SELECTED_COUNTRIES_KEY));

    if (!cacheTime || !selectedCountries) return false;

    const lastFetch = new Date(cacheTime);
    const now = new Date();
    const diffMinutes = (now - lastFetch) / (1000 * 60);

    return diffMinutes < 1440;
}

// Retorna os países salvos no cache
function getCachedCountries() {
    return JSON.parse(localStorage.getItem(SELECTED_COUNTRIES_KEY)) || [];
}

// Retorna os feriados salvos no cache
function getCachedHolidays() {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
}

// Busca feriados na date.nager
async function fetchHolidays(countries, startYear, endYear) {
    let holidays = [];
    for (let year = startYear; year <= endYear; year++) {
        for (const country of countries) {
            try {
                const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/${country}`);
                if (!response.ok) throw new Error(`Erro ${response.status} ao buscar feriados para ${country}`);

                const data = await response.json();
                holidays = holidays.concat(data.map(f => ({
                    date: f.date,
                    title: `${country}: ${f.localName}`,
                    details: `Feriado em ${country}: ${f.localName}`
                })));
            } catch (error) {
                console.error(error);
            }
        }
    }

    return holidays;
}

// Atualiza o calendário com os feriados
function updateCalendar(holidays) {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = "";

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: holidays,
        eventColor: '#FF0000',
        dateClick: function(info) {
            const clickedDate = info.dateStr;
            const eventosDoDia = holidays.filter(event => event.date === clickedDate);
            const resultadoDiv = document.getElementById('resultado');
            resultadoDiv.innerHTML = eventosDoDia.length > 0
                ? eventosDoDia.map(event => event.title).join('<br>')
                : "Nenhum feriado encontrado neste dia.";
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        }
    });

    calendar.render();
}

// Função principal da pesquisa
async function handleSearch() {
    const select = document.getElementById("country-select");
    const selectedCountries = Array.from(select.selectedOptions).map(option => option.value);

    // Se o cache estiver valido e os países não mudaram, usa o cache
    if (isCacheValid() && JSON.stringify(selectedCountries) === JSON.stringify(getCachedCountries())) {
        const cachedHolidays = getCachedHolidays();
        console.log("Usando cache", cachedHolidays);
        updateCalendar(cachedHolidays);
    } else {
        // Se não houver cache, faz a busca e armazena
        const holidays = await fetchHolidays(selectedCountries, 2024, 2030);
        saveCache(selectedCountries, holidays);
        console.log("Novos feriados", holidays);
        updateCalendar(holidays);
    }
}

// Carrega os dados do cache ao abrir a pagina
document.addEventListener('DOMContentLoaded', () => {
    if (isCacheValid()) {
        const cachedCountries = getCachedCountries();
        const cachedHolidays = getCachedHolidays();
        console.log("Carregando cache ao abrir a página", cachedHolidays);
        updateCalendar(cachedHolidays);

        // Preenche o select com os paises salvos no cache
        const select = document.getElementById("country-select");
        Array.from(select.options).forEach(option => {
            if (cachedCountries.includes(option.value)) {
                option.selected = true;
            }
        });
    } else {
        console.log("Cache inválido ou ausente. Aguardando pesquisa.");
    }
});

// Evento do clique no botao de "Search for Holidays"
document.getElementById('search-button').addEventListener('click', handleSearch);
