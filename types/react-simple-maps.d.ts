declare module "react-simple-maps" {
  import type { ComponentType, ReactNode } from "react";

  export type RsmGeography = {
    rsmKey: string;
    properties?: Record<string, unknown>;
  };

  export type RsmGeographiesRenderProps = {
    geographies: RsmGeography[];
  };

  export type ComposableMapProps = Record<string, unknown> & {
    children?: ReactNode;
  };

  export type GeographiesProps = Record<string, unknown> & {
    geography: string | Record<string, unknown>;
    children: (props: RsmGeographiesRenderProps) => ReactNode;
  };

  export type GeographyProps = Record<string, unknown> & {
    geography: RsmGeography;
    children?: ReactNode;
  };

  export type ZoomableGroupMoveEnd = {
    coordinates: [number, number];
    zoom: number;
  };

  export type ZoomableGroupProps = Record<string, unknown> & {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMoveEnd?: (position: ZoomableGroupMoveEnd) => void;
    children?: ReactNode;
  };

  export type MarkerProps = Record<string, unknown> & {
    coordinates: [number, number];
    children?: ReactNode;
  };

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Marker: ComponentType<MarkerProps>;
}
