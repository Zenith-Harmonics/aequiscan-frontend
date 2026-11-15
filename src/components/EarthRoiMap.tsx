import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { Crosshair, Maximize2 } from "lucide-react";
import type { SiteQuery } from "../utils/telemetry";

export interface ExtractedRoi {
  bbox: SiteQuery["bbox"];
  centerLat: number;
  centerLon: number;
  radiusM: number;
  polygonCoords: [number, number][];
}

interface EarthRoiMapProps {
  bbox: SiteQuery["bbox"];
  siteName: string;
  onRoiChange: (roi: ExtractedRoi) => void;
}

export function EarthRoiMap({ bbox, siteName, onRoiChange }: EarthRoiMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const isInternalUpdateRef = useRef(false);

  const emitGeometryFromLayer = (layer: L.Polygon | L.Rectangle) => {
    const bounds = layer.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const center = bounds.getCenter();
    const radiusM = Math.round(center.distanceTo(ne));

    const latLngGroups = layer.getLatLngs();
    const ring = (
      Array.isArray(latLngGroups[0]) ? latLngGroups[0] : latLngGroups
    ) as L.LatLng[];
    const polygonCoords: [number, number][] = ring.map((pt) => [
      Number(pt.lng.toFixed(6)),
      Number(pt.lat.toFixed(6)),
    ]);

    isInternalUpdateRef.current = true;
    onRoiChange({
      bbox: {
        min_lon: Number(sw.lng.toFixed(5)),
        min_lat: Number(sw.lat.toFixed(5)),
        max_lon: Number(ne.lng.toFixed(5)),
        max_lat: Number(ne.lat.toFixed(5)),
      },
      centerLat: Number(center.lat.toFixed(5)),
      centerLon: Number(center.lng.toFixed(5)),
      radiusM,
      polygonCoords,
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [
        (bbox.min_lat + bbox.max_lat) / 2,
        (bbox.min_lon + bbox.max_lon) / 2,
      ],
      zoom: 11,
      zoomControl: true,
    });

    // Strat satelitar Esri World Imagery
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri World Imagery",
        maxZoom: 18,
      },
    ).addTo(map);

    // Strat gratuit Esri pentru granițe și toponime (fără API key)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
        opacity: 0.85,
      },
    ).addTo(map);

    // Limitele orbitale ISS / NASA EMIT (-54° .. +54° latitudine)
    L.polyline(
      [
        [54, -180],
        [54, 180],
      ],
      { color: "#f59e0b", weight: 1.5, dashArray: "6 6", opacity: 0.65 },
    ).addTo(map);
    L.polyline(
      [
        [-54, -180],
        [-54, 180],
      ],
      { color: "#f59e0b", weight: 1.5, dashArray: "6 6", opacity: 0.65 },
    ).addTo(map);

    map.pm.addControls({
      position: "topleft",
      // Doar selecție dreptunghiulară și poligonală:
      drawRectangle: true,
      drawPolygon: true,

      // Opțional: păstrează-le true dacă vrei să ajustezi colțurile sau să ștergi conturul
      // (pune-le pe false dacă vrei absolut doar cele 2 butoane de desenare)
      editMode: false,
      removalMode: false,

      // Dezactivăm complet textul și restul uneltelor inutile:
      drawText: false,
      dragMode: false,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawCircle: false,
      cutPolygon: false,
      rotateMode: false,
    });

    map.pm.setGlobalOptions({
      pathOptions: {
        color: "#22d3ee",
        fillColor: "#22d3ee",
        fillOpacity: 0.22,
        weight: 2.5,
      },
    });

    const attachLayerListeners = (layer: L.Polygon | L.Rectangle) => {
      layer.on("pm:edit", () => emitGeometryFromLayer(layer));
      layer.on("pm:dragend", () => emitGeometryFromLayer(layer));
    };

    map.on("pm:create", (e) => {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      const layer = e.layer as L.Polygon | L.Rectangle;
      drawnLayerRef.current = layer;
      attachLayerListeners(layer);
      emitGeometryFromLayer(layer);
    });

    map.on("pm:remove", (e) => {
      if (e.layer === drawnLayerRef.current) {
        drawnLayerRef.current = null;
      }
    });

    mapRef.current = map;

    // Recalculează dimensiunea hărții la redimensionarea containerului
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    if (drawnLayerRef.current) {
      map.removeLayer(drawnLayerRef.current);
    }

    const bounds: L.LatLngBoundsExpression = [
      [bbox.min_lat, bbox.min_lon],
      [bbox.max_lat, bbox.max_lon],
    ];

    const rect = L.rectangle(bounds, {
      color: "#22d3ee",
      fillColor: "#22d3ee",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    rect.on("pm:edit", () => emitGeometryFromLayer(rect));
    drawnLayerRef.current = rect;
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox.min_lat, bbox.min_lon, bbox.max_lat, bbox.max_lon]);

  const centerLat = ((bbox.min_lat + bbox.max_lat) / 2).toFixed(4);
  const centerLon = ((bbox.min_lon + bbox.max_lon) / 2).toFixed(4);
  const outOfEmitBounds = bbox.min_lat < -54 || bbox.max_lat > 54;

  return (
    <div className="relative w-full h-full min-h-130 flex flex-col">
      {/* Bară HUD flotantă sus-dreapta cu instrucțiuni */}
      <div className="absolute top-3 right-3 z-500 bg-slate-950/90 backdrop-blur border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs shadow-xl max-w-sm">
        <div className="flex items-center gap-2 font-semibold text-cyan-400">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Earth ROI Selector — {siteName}</span>
        </div>
        <p className="text-[11px] text-slate-300 mt-1">
          Folosește uneltele din stânga-sus (
          <strong className="text-slate-100">Polygon</strong> sau{" "}
          <strong className="text-slate-100">Rectangle</strong>) pentru a trasa
          conturul direct pe imaginea satelitară.
        </p>
      </div>

      {/* Harta full-container */}
      <div ref={containerRef} className="w-full h-full flex-1 z-0" />

      {/* Bară HUD flotantă jos cu telemetria extrasă din contur */}
      <div className="absolute bottom-4 left-4 right-4 z-500 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur border border-slate-700/80 rounded-lg px-4 py-2 flex flex-wrap items-center gap-4 text-[11px] font-mono shadow-xl">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Crosshair className="w-3.5 h-3.5" />
            EXTRACTED ROI:
          </span>
          <span className="text-slate-300">
            Center:{" "}
            <strong className="text-slate-100">
              {centerLat}°, {centerLon}°
            </strong>
          </span>
          <span className="text-slate-300">
            Lat:{" "}
            <strong className="text-slate-100">
              [{bbox.min_lat.toFixed(4)}, {bbox.max_lat.toFixed(4)}]
            </strong>
          </span>
          <span className="text-slate-300">
            Lon:{" "}
            <strong className="text-slate-100">
              [{bbox.min_lon.toFixed(4)}, {bbox.max_lon.toFixed(4)}]
            </strong>
          </span>
          {outOfEmitBounds && (
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-amber-300">
              ⚠ În afara acoperirii EMIT (±54°)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
