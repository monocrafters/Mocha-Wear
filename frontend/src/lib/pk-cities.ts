export const PK_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
] as const;

export function isListedCity(city: string) {
  return PK_CITIES.some((item) => item.toLowerCase() === city.trim().toLowerCase());
}
