// Weather API Configuration
const API_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherContent = document.getElementById('weatherContent');
const forecastContent = document.getElementById('forecastContent');

// Weather emoji mapping
const weatherEmojis = {
    'clear': '☀️',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'snowy': '❄️',
    'stormy': '⛈️',
    'foggy': '🌫️',
    'partly_cloudy': '⛅',
    'overcast': '☁️'
};

// WMO Weather code to description mapping
const wmoDescriptions = {
    0: { desc: 'Açık gökyüzü', emoji: '☀️' },
    1: { desc: 'Çoğunlukla açık', emoji: '🌤️' },
    2: { desc: 'Parçalı bulutlu', emoji: '⛅' },
    3: { desc: 'Kapalı', emoji: '☁️' },
    45: { desc: 'Sisli', emoji: '🌫️' },
    48: { desc: 'Sisli buzlu', emoji: '🌫️' },
    51: { desc: 'Hafif yağış', emoji: '🌦️' },
    53: { desc: 'Orta yağış', emoji: '🌧️' },
    55: { desc: 'Şiddetli yağış', emoji: '⛈️' },
    61: { desc: 'Hafif yağmur', emoji: '🌧️' },
    63: { desc: 'Orta yağmur', emoji: '🌧️' },
    65: { desc: 'Şiddetli yağmur', emoji: '⛈️' },
    71: { desc: 'Hafif kar', emoji: '❄️' },
    73: { desc: 'Orta kar', emoji: '❄️' },
    75: { desc: 'Şiddetli kar', emoji: '❄️' },
    77: { desc: 'Kar taneleri', emoji: '❄️' },
    80: { desc: 'Hafif sağanaklar', emoji: '🌧️' },
    81: { desc: 'Şiddetli sağanaklar', emoji: '⛈️' },
    82: { desc: 'Çok şiddetli sağanaklar', emoji: '⛈️' },
    85: { desc: 'Hafif kar sağanakları', emoji: '❄️' },
    86: { desc: 'Şiddetli kar sağanakları', emoji: '❄️' },
    80: { desc: 'Gök gürültülü fırtına', emoji: '⛈️' }
};

// Event listeners
searchBtn.addEventListener('click', searchCity);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchCity();
});

// Initialize - load weather for current location
window.addEventListener('load', initializeWeather);

// Initialize weather on page load
function initializeWeather() {
    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoordinates(latitude, longitude);
            },
            error => {
                // If geolocation fails, use default city
                console.log('Konum erişimi başarısız, varsayılan şehir kullanılıyor');
                searchCityByName('İstanbul');
            }
        );
    } else {
        // Fallback to default city
        searchCityByName('İstanbul');
    }
}

// Search city by name
async function searchCity() {
    const cityName = searchInput.value.trim();
    if (!cityName) {
        showError('Lütfen bir şehir adı girin');
        return;
    }
    searchCityByName(cityName);
}

// Search city name
async function searchCityByName(cityName) {
    clearError();
    showLoading();

    try {
        const response = await fetch(
            `${API_BASE}?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`
        );
        
        if (!response.ok) throw new Error('API hatası');
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            showError(`"${cityName}" şehri bulunamadı. Lütfen başka bir şehir deneyin.`);
            hideLoading();
            return;
        }
        
        const location = data.results[0];
        fetchWeatherByCoordinates(location.latitude, location.longitude, location.name);
    } catch (error) {
        showError('Şehir aranırken bir hata oluştu. Lütfen tekrar deneyin.');
        hideLoading();
        console.error('Search error:', error);
    }
}

// Fetch weather by coordinates
async function fetchWeatherByCoordinates(latitude, longitude, cityName = null) {
    try {
        const response = await fetch(
            `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl,visibility,weather_code,is_day,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Hava durumu API hatası');
        
        const weatherData = await response.json();
        displayWeather(weatherData, cityName);
        displayForecast(weatherData);
    } catch (error) {
        showError('Hava durumu verisi alınırken bir hata oluştu.');
        console.error('Weather fetch error:', error);
    } finally {
        hideLoading();
    }
}

// Display current weather
function displayWeather(data, customCityName) {
    const current = data.current;
    const daily = data.daily;
    
    // Get weather description
    const weatherInfo = wmoDescriptions[current.weather_code] || 
                       { desc: 'Bilinmiyor', emoji: '🌤️' };
    
    // Calculate feels like (simplified)
    const feelsLike = Math.round(current.temperature_2m - (current.wind_speed_10m / 10));
    
    // Format sunset time
    const sunsetTime = new Date(daily.sunset[0]);
    const formattedSunset = sunsetTime.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Get city name from timezone if not provided
    const timezone = data.timezone || 'Bilinmiyor';
    const cityDisplay = customCityName || timezone.split('/')[1]?.replace('_', ' ') || 'Konumunuz';
    
    // Update DOM
    document.getElementById('cityName').textContent = cityDisplay;
    document.getElementById('weatherDescription').textContent = weatherInfo.desc;
    document.getElementById('temperature').textContent = Math.round(current.temperature_2m);
    document.getElementById('feelsLike').textContent = `Hissedilen sıcaklık: ${feelsLike}°C`;
    document.getElementById('weatherEmoji').textContent = weatherInfo.emoji;
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = `${current.pressure_msl} hPa`;
    document.getElementById('visibility').textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    document.getElementById('uvIndex').textContent = Math.round(current.uv_index);
    document.getElementById('sunset').textContent = formattedSunset;
    
    showWeather();
}

// Display 5-day forecast
function displayForecast(data) {
    const daily = data.daily;
    const forecastDays = 5;
    let forecastHTML = '';
    
    for (let i = 0; i < forecastDays; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
        const weatherInfo = wmoDescriptions[daily.weather_code[i]] || 
                           { desc: 'Bilinmiyor', emoji: '🌤️' };
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        
        forecastHTML += `
            <div class="forecast-card">
                <div class="forecast-date">${dayName}</div>
                <div class="forecast-emoji">${weatherInfo.emoji}</div>
                <div class="forecast-temp">${maxTemp}° / ${minTemp}°</div>
                <div class="forecast-description">${weatherInfo.desc}</div>
            </div>
        `;
    }
    
    forecastContent.innerHTML = forecastHTML;
}

// Show/hide functions
function showLoading() {
    loadingSpinner.style.display = 'block';
    weatherContent.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showWeather() {
    weatherContent.style.display = 'block';
    loadingSpinner.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

console.log('🌙 Dreamy Weather Dashboard loaded! ✨');