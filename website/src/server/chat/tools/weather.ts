import { z } from "zod";

const latType = z.number().min(-90).max(90);
const lonType = z.number().min(-180).max(180);

function fetch(key: string) {
  return async ({
    latitude,
    longitude,
  }: {
    latitude: number;
    longitude: number;
  }) => {
    const lat = latType.parse(latitude).toFixed();
    const lon = lonType.parse(longitude).toFixed();

    const params = new URLSearchParams({
      lat,
      lon,
      appid: key,
    });
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?${params.toString()}`,
    );
    const json = await res.json();

  };
}
