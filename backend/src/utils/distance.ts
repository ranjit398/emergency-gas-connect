interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Find nearest providers to a location
 */
export const findNearestProviders = (
  userLat: number,
  userLon: number,
  providers: Array<{
    latitude: number;
    longitude: number;
    id: string;
  }>,
  limit = 5
): Array<{ id: string; distance: number }> => {
  const distances = providers.map((provider) => ({
    id: provider.id,
    distance: calculateDistance(
      { latitude: userLat, longitude: userLon },
      { latitude: provider.latitude, longitude: provider.longitude }
    ),
  }));

  return distances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};
