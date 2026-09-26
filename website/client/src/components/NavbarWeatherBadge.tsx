import React, { useState, useEffect, useRef } from 'react';
import { Sun, CloudSun, Wind, Waves, Sunset, Droplets, RefreshCw, X } from 'lucide-react';

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  sunset: string;
  waveHeight: number;
  loading: boolean;
  lastUpdated: string;
}

export const NavbarWeatherBadge: React.FC = () => {
  const [data, setData] = useState<WeatherData>({
    temperature: 29,
    apparentTemperature: 33,
    humidity: 75,
    windSpeed: 13.5,
    weatherCode: 0,
    sunset: '18:31',
    waveHeight: 1.2,
    loading: true,
    lastUpdated: 'Live',
  });

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLiveWeather = async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }));
      const weatherRes = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=14.5479&longitude=74.3188&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=sunset&timezone=Asia%2FKolkata'
      );
      const weatherJson = await weatherRes.json();

      let wave = 1.2;
      try {
        const marineRes = await fetch(
          'https://marine-api.open-meteo.com/v1/marine?latitude=14.5479&longitude=74.3188&current=wave_height,wave_period'
        );
        const marineJson = await marineRes.json();
        if (marineJson?.current?.wave_height != null) {
          wave = Math.round(marineJson.current.wave_height * 10) / 10;
        }
      } catch (e) {
        console.warn('Marine telemetry fallback:', e);
      }

      if (weatherJson?.current) {
        const cur = weatherJson.current;
        let sunsetTime = '18:31';
        if (weatherJson.daily?.sunset?.[0]) {
          const raw = weatherJson.daily.sunset[0];
          sunsetTime = raw.includes('T') ? raw.split('T')[1] : raw;
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        setData({
          temperature: Math.round(cur.temperature_2m),
          apparentTemperature: Math.round(cur.apparent_temperature),
          humidity: Math.round(cur.relative_humidity_2m),
          windSpeed: Math.round(cur.wind_speed_10m * 10) / 10,
          weatherCode: cur.weather_code,
          sunset: sunsetTime,
          waveHeight: wave,
          loading: false,
          lastUpdated: timeStr,
        });
      }
    } catch (err) {
      console.error('Failed to fetch Gokarna live weather:', err);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchLiveWeather();
    const timer = setInterval(fetchLiveWeather, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Click outside listener to prevent staying open
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getWeatherDesc = (code: number) => {
    if (code === 0) return 'Clear Coastal Sky';
    if (code >= 1 && code <= 3) return 'Partly Cloudy Sea Breeze';
    if (code === 45 || code === 48) return 'Morning Coastal Mist';
    if (code >= 51 && code <= 67) return 'Tropical Rain Shower';
    if (code >= 80 && code <= 82) return 'Arabian Sea Squall';
    return 'Mild Coastal Weather';
  };

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group h-8 sm:h-9 px-2 sm:px-2.5 rounded-full bg-elevated hover:bg-paper-2 border border-line shadow-2xs transition-colors duration-200 flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
        title="Live Gokarna Weather Telemetry"
      >
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
        </span>

        <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 group-hover:rotate-45 transition-transform duration-500" />

        <span className="font-mono text-[11px] sm:text-xs font-bold text-ink whitespace-nowrap">
          {data.temperature}°C
        </span>

        <span className="text-[11px] font-medium text-ink-3 hidden xl:inline">
          Gokarna
        </span>
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-elevated border border-line shadow-2xl p-4 space-y-3 z-[100] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-1.5">
              <CloudSun className="w-4 h-4 text-tide" />
              <span className="font-display text-xs font-bold text-ink">
                Gokarna Coastline
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-ink-3">
                {data.lastUpdated} IST
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLiveWeather();
                }}
                className="p-1 rounded-md text-ink-3 hover:text-tide hover:bg-paper-2 transition-colors cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3 h-3 ${data.loading ? 'animate-spin text-tide' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="sm:hidden p-1 rounded-md text-ink-3 hover:text-ink hover:bg-paper-2 transition-colors cursor-pointer ml-1"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-tide/10 p-3 rounded-xl border border-tide/20">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold text-ink">
                  {data.temperature}°C
                </span>
                <span className="text-xs text-ink-2 font-medium">
                  Feels {data.apparentTemperature}°C
                </span>
              </div>
              <p className="text-[11px] font-medium text-tide mt-0.5">
                {getWeatherDesc(data.weatherCode)}
              </p>
            </div>
            <Sun className="w-9 h-9 text-amber-500 opacity-90 shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-paper-2 border border-line space-y-1">
              <div className="flex items-center gap-1.5 text-tide">
                <Waves className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-3">
                  Arabian Swell
                </span>
              </div>
              <div className="font-mono font-bold text-ink">
                {data.waveHeight}m Gentle
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-paper-2 border border-line space-y-1">
              <div className="flex items-center gap-1.5 text-amber-500">
                <Sunset className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-3">
                  Sunset
                </span>
              </div>
              <div className="font-mono font-bold text-ink">
                {data.sunset} IST
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-paper-2 border border-line space-y-1">
              <div className="flex items-center gap-1.5 text-tide-glow">
                <Wind className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-3">
                  Sea Breeze
                </span>
              </div>
              <div className="font-mono font-bold text-ink">
                {data.windSpeed} km/h
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-paper-2 border border-line space-y-1">
              <div className="flex items-center gap-1.5 text-tide">
                <Droplets className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-3">
                  Humidity
                </span>
              </div>
              <div className="font-mono font-bold text-ink">
                {data.humidity}%
              </div>
            </div>
          </div>

          <div className="text-[10px] text-ink-3 text-center font-mono pt-1">
            Live Open-Meteo Satellite & Buoy Feed
          </div>
        </div>
      )}
    </div>
  );
};
