/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace naver.maps {
  class Map {
    constructor(el: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setZoom(level: number): void;
    panTo(latlng: LatLng, transitionOptions?: any): void;
    destroy(): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
    x: number;
    y: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setPosition(latlng: LatLng): void;
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class Event {
    static addListener(target: any, type: string, handler: (...args: any[]) => void): any;
    static removeListener(listener: any): void;
  }

  namespace TransCoord {
    function fromTM128ToLatLng(point: Point): LatLng;
    function fromLatLngToTM128(latlng: LatLng): Point;
  }

  interface MapOptions {
    center: LatLng;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    zoomControl?: boolean;
    zoomControlOptions?: any;
    mapTypeControl?: boolean;
    scaleControl?: boolean;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    icon?: any;
    animation?: number;
  }

  namespace Service {
    function reverseGeocode(
      options: { coords: LatLng; orders?: string },
      callback: (status: number, response: ReverseGeocodeResponse) => void
    ): void;

    function geocode(
      options: { query: string },
      callback: (status: number, response: GeocodeResponse) => void
    ): void;

    interface ReverseGeocodeResponse {
      v2: {
        status: { code: number; name: string };
        results: Array<{
          name: string;
          code: { id: string; type: string; mappingId: string };
          region: {
            area0: { name: string };
            area1: { name: string; alias: string };
            area2: { name: string };
            area3: { name: string };
            area4: { name: string };
          };
          land?: {
            type: string;
            number1: string;
            number2: string;
            name?: string;
            addition0?: { type: string; value: string };
          };
        }>;
        address: {
          jibunAddress: string;
          roadAddress: string;
        };
      };
    }

    interface GeocodeResponse {
      v2: {
        status: { code: number; name: string };
        meta: { totalCount: number };
        addresses: Array<{
          roadAddress: string;
          jibunAddress: string;
          x: string;
          y: string;
          addressElements: Array<{
            types: string[];
            longName: string;
            shortName: string;
          }>;
        }>;
      };
    }

    const Status: {
      OK: number;
      ERROR: number;
    };
  }
}
