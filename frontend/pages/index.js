import { useState, useEffect } from 'react';
import axios from 'axios';

// API key hardcoded (fallback)
const WEATHER_API_KEY = '9d5a1dcb22314a12838132953262605';

export default function Home() {
  const [city, setCity] = useState('New York');
  const [weather, setWeather] = useState(null);
  const [nextRain, setNextRain] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) setFavorites(JSON.parse(saved));
    fetchWeather('New York');
  }, []);

  const fetchWeather = async (searchCity) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
        params: {
          key: WEATHER_API_KEY,
          q: searchCity,
          days: 7,
          aqi: 'yes',
        },
      });

      const current = response.data.current;
      const forecast = response.data.forecast.forecastday;

      // Find next rain
      let nextRain = null;
      let hoursFromNow = null;

      for (let dayIdx = 0; dayIdx < forecast.length; dayIdx++) {
        const day = forecast[dayIdx];
        const hourly = day.hour;

        for (let hourIdx = 0; hourIdx < hourly.length; hourIdx++) {
          const hour = hourly[hourIdx];
          const hourTime = new Date(hour.time);
          const now = new Date();

          if (hourTime > now && (hour.chance_of_rain > 30 || hour.precip_mm > 0.1)) {
            hoursFromNow = Math.round((hourTime - now) / (1000 * 60 * 60));
            nextRain = {
              hoursFromNow,
              chance: hour.chance_of_rain,
              condition: hour.condition.text,
              precipitation: hour.precip_mm,
            };
            break;
          }
        }
        if (nextRain) break;
      }

      // Format 7-day forecast
      const formattedForecast = forecast.slice(0, 7).map((day) => ({
        date: new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        condition: day.day.condition.text,
        icon: getWeatherIcon(day.day.condition.code),
        maxTemp: day.day.maxtemp_c,
        minTemp: day.day.mintemp_c,
      }));

      setWeather({
        name: response.data.location.name,
        country: response.data.location.country,
        temp: current.temp_c,
        feelsLike: current.feelslike_c,
        condition: current.condition.text,
        humidity: current.humidity,
        windSpeed: current.wind_kph,
        icon: getWeatherIcon(current.condition.code),
      });
      setNextRain(nextRain || { hoursFromNow: null, condition: 'No rain expected' });
      setForecast(formattedForecast);
      setCity(searchCity);
    } catch (err) {
      setError('Failed to fetch weather. Try another city.');
      console.error(err);
    }
    setLoading(false);
  };

  const addFavorite = () => {
    if (!favorites.includes(city)) {
      const updated = [...favorites, city];
      setFavorites(updated);
      localStorage.setItem('favorites', JSON.stringify(updated));
    }
  };

  const removeFavorite = (fav) => {
    const updated = favorites.filter((f) => f !== fav);
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  function getWeatherIcon(code) {
    if (code === 1000) return '☀️';
    if (code === 1003 || code === 1006) return '⛅';
    if (code === 1009) return '☁️';
    if ([1063, 1069, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1240, 1243, 1246, 1249, 1252].includes(code))
      return '🌧️';
    if ([1255, 1258, 1261, 1264, 1273, 1276, 1279, 1282].includes(code)) return '❄️';
    if ([1030, 1135, 1147].includes(code)) return '🌫️';
    if ([1087, 1279, 1282].includes(code)) return '⛈️';
    return '🌤️';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">⛅ Weather Dashboard</h1>

        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name..."
            className="flex-1 px-4 py-3 rounded-lg shadow-lg focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && fetchWeather(city)}
          />
          <button
            onClick={() => fetchWeather(city)}
            className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg shadow-lg hover:bg-gray-100"
          >
            Search
          </button>
          <button
            onClick={addFavorite}
            className="px-6 py-3 bg-yellow-400 text-gray-800 font-bold rounded-lg shadow-lg hover:bg-yellow-300"
          >
            ⭐ Save
          </button>
        </div>

        {favorites.length > 0 && (
          <div className="mb-6 bg-white bg-opacity-20 p-4 rounded-lg text-white">
            <p className="font-bold mb-2">Favorites:</p>
            <div className="flex gap-2 flex-wrap">
              {favorites.map((fav) => (
                <button
                  key={fav}
                  onClick={() => fetchWeather(fav)}
                  className="px-3 py-1 bg-white bg-opacity-30 hover:bg-opacity-50 rounded-full transition"
                >
                  {fav} ✕
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="text-white text-center mb-4 bg-red-500 p-4 rounded-lg">{error}</div>}
        {loading && <div className="text-white text-center text-xl">Loading...</div>}

        {weather && (
          <>
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-8 mb-6 shadow-2xl text-white">
              <h2 className="text-3xl font-bold mb-4">{weather.name || city}</h2>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-6xl font-bold">{Math.round(weather.temp)}°C</p>
                  <p className="text-xl capitalize mt-2">{weather.condition}</p>
                </div>
                <div className="text-right">
                  <p>💧 Humidity: {weather.humidity}%</p>
                  <p>💨 Wind: {weather.windSpeed} km/h</p>
                  <p>🌡️ Feels like: {Math.round(weather.feelsLike)}°C</p>
                </div>
              </div>
            </div>

            {nextRain && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 mb-6 shadow-2xl text-white text-center">
                <h3 className="text-2xl font-bold mb-2">🌧️ Next Rain Prediction</h3>
                {nextRain.hoursFromNow !== null ? (
                  <>
                    <p className="text-5xl font-bold mb-2">{nextRain.hoursFromNow} hours</p>
                    <p className="text-lg">Rain probability: {nextRain.chance}%</p>
                    <p className="text-sm mt-2">Expected: {nextRain.condition}</p>
                  </>
                ) : (
                  <p className="text-2xl">☀️ No rain expected in the next 7 days!</p>
                )}
              </div>
            )}

            {forecast && (
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-6">📊 7-Day Forecast</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {forecast.map((day, idx) => (
                    <div
                      key={idx}
                      className="bg-white bg-opacity-10 rounded-xl p-4 text-white text-center hover:bg-opacity-20 transition"
                    >
                      <p className="font-bold mb-2">{day.date}</p>
                      <p className="text-3xl mb-2">{day.icon}</p>
                      <p className="text-sm">{day.condition}</p>
                      <p className="text-lg font-bold mt-2">{Math.round(day.maxTemp)}°</p>
                      <p className="text-sm opacity-75">{Math.round(day.minTemp)}°</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
