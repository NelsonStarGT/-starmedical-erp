declare module "d3-geo" {
  export type GeoProjection = ((point: [number, number]) => [number, number] | null) & {
    fitExtent(extent: [[number, number], [number, number]], object: unknown): GeoProjection;
  };

  export function geoMercator(): GeoProjection;
  export function geoPath(projection?: GeoProjection): (object: unknown) => string | null;
}
