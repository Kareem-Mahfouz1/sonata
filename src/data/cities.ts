export interface City { name: string; country: string; lat: number; lon: number }

export const cities: City[] = [
  { name: 'Cairo', country: 'Egypt', lat: 30.04, lon: 31.24 },
  { name: 'Alexandria', country: 'Egypt', lat: 31.20, lon: 29.92 },
  { name: 'Aswan', country: 'Egypt', lat: 24.09, lon: 32.90 },
  { name: 'Luxor', country: 'Egypt', lat: 25.69, lon: 32.64 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68 },
  { name: 'Jeddah', country: 'Saudi Arabia', lat: 21.49, lon: 39.19 },
  { name: 'Dubai', country: 'UAE', lat: 25.20, lon: 55.27 },
  { name: 'Doha', country: 'Qatar', lat: 25.29, lon: 51.53 },
  { name: 'Kuwait City', country: 'Kuwait', lat: 29.38, lon: 47.99 },
  { name: 'Tehran', country: 'Iran', lat: 35.69, lon: 51.39 },
  { name: 'Baghdad', country: 'Iraq', lat: 33.31, lon: 44.36 },
  { name: 'Istanbul', country: 'Türkiye', lat: 41.01, lon: 28.98 },
  { name: 'Athens', country: 'Greece', lat: 37.98, lon: 23.73 },
  { name: 'Rome', country: 'Italy', lat: 41.90, lon: 12.50 },
  { name: 'Madrid', country: 'Spain', lat: 40.42, lon: -3.70 },
  { name: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
  { name: 'London', country: 'UK', lat: 51.51, lon: -0.13 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.40 },
  { name: 'Moscow', country: 'Russia', lat: 55.76, lon: 37.62 },
  { name: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 },
  { name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.01 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.76, lon: 100.50 },
  { name: 'Beijing', country: 'China', lat: 39.90, lon: 116.40 },
  { name: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47 },
  { name: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98 },
  { name: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69 },
  { name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.21, lon: 106.85 },
  { name: 'Manila', country: 'Philippines', lat: 14.60, lon: 120.98 },
  { name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
  { name: 'Melbourne', country: 'Australia', lat: -37.81, lon: 144.96 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.85, lon: 174.76 },
  { name: 'Los Angeles', country: 'USA', lat: 34.05, lon: -118.24 },
  { name: 'San Francisco', country: 'USA', lat: 37.77, lon: -122.42 },
  { name: 'Seattle', country: 'USA', lat: 47.61, lon: -122.33 },
  { name: 'Vancouver', country: 'Canada', lat: 49.28, lon: -123.12 },
  { name: 'Fort Nelson', country: 'Canada', lat: 58.81, lon: -122.70 },
  { name: 'Prince George', country: 'Canada', lat: 53.92, lon: -122.75 },
  { name: 'Edmonton', country: 'Canada', lat: 53.55, lon: -113.49 },
  { name: 'Calgary', country: 'Canada', lat: 51.05, lon: -114.07 },
  { name: 'Denver', country: 'USA', lat: 39.74, lon: -104.99 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.43, lon: -99.13 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.52, lon: 3.38 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.29, lon: 36.82 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.20, lon: 28.05 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.92, lon: 18.42 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.57, lon: -7.59 },
]

export function nearestCity(lat: number, lon: number): City {
  let best = cities[0]
  let bestDistance = Infinity
  for (const city of cities) {
    const dx = Math.abs(((city.lon - lon + 540) % 360) - 180) * Math.cos((lat * Math.PI) / 180)
    const dy = city.lat - lat
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) { best = city; bestDistance = distance }
  }
  return best
}
