let map, marker;
const url = 'https://task-backend-fxnt.onrender.com';

// Obsługa geolokalizacji
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => updateWeather(pos.coords.latitude, pos.coords.longitude),
        err => {
            alert("Nie udało się pobrać lokalizacji. Używam domyślnej (Warszawa).");
            updateWeather(52.2297, 21.0122);
        }
    );
} else {
    alert("Twoja przeglądarka nie wspiera geolokalizacji. Używam domyślnej (Warszawa).");
    updateWeather(52.2297, 21.0122);
}

//Funkcja, która pobiera prognoze z endpointu 1
function fetchForecast(lat, lon) {
    fetch(`${url}/api/forecast?latitude=${lat}&longitude=${lon}`)
        .then(res => res.json())
        .then(forecasts => {
            renderForecastTable(forecasts);
        })
         .catch(() => {
            document.getElementById('forecast').innerHTML = "Nie udało się pobrać danych.";
        });
}

//Funkcja, która pobiera podsumowanie z endpointu 2
function fetchSummary(lat, lon) {
    fetch(`${url}/api/summary?latitude=${lat}&longitude=${lon}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('summary').innerHTML = `
                <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 justify-content-lg-center g-3">
                    ${renderSummaryCard("fa-gauge-high", "Śr. ciśnienie", `${data.avgPressure} hPa`)}
                    ${renderSummaryCard("fa-sun", "Śr. czas ekspozycji na słońce", `${data.avgSunshineHours} h`)}
                    ${renderSummaryCard("fa-temperature-high", "Temp. max", `${data.maxTemp}°C`)}
                    ${renderSummaryCard("fa-temperature-low", "Temp. min", `${data.minTemp}°C`)}
                    ${renderSummaryCard("fa-comment-alt", "Komentarz", data.summary)}
                </div>`;
        })
        .catch(() => {
            document.getElementById('summary').innerHTML = "Nie udało się pobrać danych.";
        });
}



//Funkcja pomocznicza, która tworzy element podsumowania
function renderSummaryCard(icon, title, value) {
    return `
        <div class="col col-lg-2">
            <div class="card h-100 shadow-sm border-0">
                <div class="card-body d-flex align-items-center">
                    <i class="fas ${icon} fa-2x me-3" style="color: #7C3AED"></i>
                    <div>
                        <h6 class="card-title mb-1">${title}</h6>
                        <p class="card-text mb-0">${value}</p>
                    </div>
                </div>
            </div>
        </div>`;
}

//Funkcja tworząca tabele prognozy
function renderForecastTable(forecasts) {
    const headerCells = forecasts.map(day => `<th>${formatDate(day.date)}</th>`).join('');

    const weatherRow = forecasts.map(day => {
        const { iconClass, description } = weatherCodeToContext(day.weatherCode);
        return `<td><i class="${iconClass} fa-2x"></i><div>${description}</div></td>`;
    }).join('');

    const maxTempRow = forecasts.map(day => `<td>${day.maxTemp}°C</td>`).join('');
    const minTempRow = forecasts.map(day => `<td>${day.minTemp}°C</td>`).join('');
    const energyRow = forecasts.map(day => `<td>${day.generatedEnergy}</td>`).join('');

    document.getElementById('forecast').innerHTML = `
        <table class="table table-striped table-bordered align-middle justify-content-center shadow-sm" style="text-align: center;">
            <thead>
                <tr>
                    <th></th>
                    ${headerCells}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Prognoza</td>
                    ${weatherRow}
                </tr>
                <tr>
                    <td>Temp. max</td>
                    ${maxTempRow}
                </tr>
                <tr>
                    <td>Temp. min</td>
                    ${minTempRow}
                </tr>
                <tr>
                    <td>Szac. wytw. energia (kWh)</td>
                    ${energyRow}
                </tr>
            </tbody>
        </table>
    `;
}

// Funckja odpowiadająca za inicializacje i aktualizacje mapy
function updateMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 10);
        marker.setLatLng([lat, lon]).openPopup();
    } else {
        map = L.map('map').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        marker = L.marker([lat, lon], { draggable: false })
            .addTo(map)
            .bindPopup("Twoja lokalizacja")
            .openPopup();

        map.on('click', function (e) {
            const { lat, lng } = e.latlng;
            updateWeather(lat, lng);
        });
    }
}

//Funkcja aktualizacja danych pogodowych
function updateWeather(lat, lon) {
    lon = normalizeLongitude(lon);
    updateMap(lat, lon);
    fetchSummary(lat, lon);
    fetchForecast(lat, lon);
}

// Funkcja pomocnicza, która normalizuje podaną długość geograficzną
function normalizeLongitude(lon) {
    return (lon > 180 || lon < -180) ? lon % 180 : lon;
}

// Funkcja pomocnicza, która formatuje date z YYYY-MM-DD na DD-MM-YYYY
function formatDate(dateStr) {
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}-${mm}-${yyyy}`;
}

// Funkcja pomocnicza, która mapuje kod pogody na ikone i krótki słowny opis
function weatherCodeToContext(weatherCode) {
    switch (weatherCode) {
        case 0: return { iconClass: "fas fa-sun", description: "Słonecznie" };
        case 1: return { iconClass: "fas fa-cloud-sun", description: "Częściowo słonecznie" };
        case 2: return { iconClass: "fas fa-cloud-sun", description: "Pochmurno z przejaśnieniami" };
        case 3: return { iconClass: "fas fa-cloud", description: "Pochmurno" };
        case 45: return { iconClass: "fas fa-smog", description: "Mgła" };
        case 48: return { iconClass: "fas fa-snowflake", description: "Szron" };
        case 51: return { iconClass: "fas fa-cloud-rain", description: "Lekka mżawka" };
        case 53: return { iconClass: "fas fa-cloud-rain", description: "Umiarkowana mżawka" };
        case 55: return { iconClass: "fas fa-cloud-rain", description: "Gęsta mżawka" };
        case 56: return { iconClass: "fas fa-cloud-meatball", description: "Lekki mróz mżawka" };
        case 57: return { iconClass: "fas fa-cloud-meatball", description: "Gęsty mróz mżawka" };
        case 61: return { iconClass: "fas fa-cloud-showers-heavy", description: "Lekki deszcz" };
        case 63: return { iconClass: "fas fa-cloud-showers-heavy", description: "Umiarkowany deszcz" };
        case 65: return { iconClass: "fas fa-cloud-showers-heavy", description: "Silny deszcz" };
        case 66: return { iconClass: "fas fa-snowflake", description: "Lekki mróz deszcz" };
        case 67: return { iconClass: "fas fa-snowflake", description: "Silny mróz deszcz" };
        case 71: return { iconClass: "fas fa-snowflake", description: "Lekki śnieg" };
        case 73: return { iconClass: "fas fa-snowflake", description: "Umiarkowany śnieg" };
        case 75: return { iconClass: "fas fa-snowflake", description: "Silny śnieg" };
        case 77: return { iconClass: "fas fa-snowflake", description: "Płatki śniegu" };
        case 80: return { iconClass: "fas fa-cloud-showers-heavy", description: "Przelotne opady deszczu" };
        case 81: return { iconClass: "fas fa-cloud-showers-heavy", description: "Umiarkowane przelotne opady" };
        case 82: return { iconClass: "fas fa-cloud-showers-heavy", description: "Silne przelotne opady" };
        case 85: return { iconClass: "fas fa-snowflake", description: "Przelotne opady śniegu" };
        case 86: return { iconClass: "fas fa-snowflake", description: "Silne przelotne opady śniegu" };
        case 95: return { iconClass: "fas fa-bolt", description: "Burza" };
        case 96: return { iconClass: "fas fa-bolt", description: "Burza z lekkim gradem" };
        case 99: return { iconClass: "fas fa-bolt", description: "Burza z silnym gradem" };
        default: return { iconClass: "fas fa-question", description: "Nieznany" };
    }
}

