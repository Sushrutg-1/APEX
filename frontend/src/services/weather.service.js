const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

const weatherConditions = (code) => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if ([56, 57].includes(code)) return 'Freezing drizzle';
  if (code === 61) return 'Light rain';
  if (code === 63) return 'Moderate rain';
  if (code === 65) return 'Heavy rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code === 71) return 'Light snow';
  if (code === 73) return 'Moderate snow';
  if (code === 75) return 'Heavy snow';
  if (code === 77) return 'Snow grains';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96 || code === 99) return 'Thunderstorm with hail';
  return 'Unknown conditions';
};

const getCurrentWeather = async (latitude, longitude, signal) => {
  const url = new URL(WEATHER_API_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
  );
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const current = payload.current;
  const values = [
    current?.temperature_2m,
    current?.relative_humidity_2m,
    current?.apparent_temperature,
    current?.weather_code,
    current?.wind_speed_10m,
  ];

  if (
    values.some((value) => typeof value !== 'number' || !Number.isFinite(value)) ||
    !Number.isInteger(current?.weather_code)
  ) {
    throw new Error('Open-Meteo returned incomplete current weather');
  }

  return {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    apparentTemperature: current.apparent_temperature,
    windSpeed: current.wind_speed_10m,
    condition: weatherConditions(current.weather_code),
    observedAt: current.time,
  };
};

export { getCurrentWeather };
