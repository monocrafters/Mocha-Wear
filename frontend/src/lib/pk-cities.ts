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

function resolveListedCity(city: string) {
  const match = PK_CITIES.find((item) => item.toLowerCase() === city.trim().toLowerCase());
  return match || "";
}

export function isListedCity(city: string) {
  return Boolean(resolveListedCity(city));
}
