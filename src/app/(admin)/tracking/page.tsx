"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchDeliveryLocations,
  type DeliveryLocationPin,
} from "@/lib/api";
import { useT } from "@/lib/i18n";

const DEFAULT_CENTER: [number, number] = [7.8731, 80.7718]; // Sri Lanka
const POLL_MS = 20000;

function timeLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function LiveMapPage() {
  const t = useT();
  const toast = useToast();
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const [locations, setLocations] = useState<DeliveryLocationPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchDeliveryLocations();
      setLocations(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("tracking.failedLoad"),
      );
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapElRef.current || mapRef.current) return;

      const map = L.map(mapElRef.current, {
        center: DEFAULT_CENTER,
        zoom: 8,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markersRef.current) return;

    let cancelled = false;

    async function paint() {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current || !markersRef.current) return;

      markersRef.current.clearLayers();

      const live = locations.filter((pin) => pin.isLive);
      const points: Array<[number, number]> = [];

      for (const pin of locations) {
        const color = pin.isLive ? "#DC2626" : "#A8A29E";
        const marker = L.circleMarker([pin.latitude, pin.longitude], {
          radius: pin.isLive ? 10 : 8,
          color: "#7F1D1D",
          weight: 2,
          fillColor: color,
          fillOpacity: 0.9,
        });

        marker.bindPopup(
          `<div style="min-width:140px">
            <strong>${escapeHtml(pin.name)}</strong><br/>
            <span style="color:${pin.isLive ? "#B45309" : "#78716C"}">
              ${pin.isLive ? "Live" : "Stale"}
            </span><br/>
            <small>${escapeHtml(timeLabel(pin.updatedAt))}</small>
          </div>`,
        );

        marker.addTo(markersRef.current);
        if (pin.isLive) points.push([pin.latitude, pin.longitude]);
      }

      if (points.length === 1) {
        mapRef.current.setView(points[0], 14);
      } else if (points.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
      } else if (live.length === 0 && locations.length > 0) {
        const all = locations.map(
          (p) => [p.latitude, p.longitude] as [number, number],
        );
        mapRef.current.fitBounds(L.latLngBounds(all), { padding: [48, 48] });
      }
    }

    void paint();
    return () => {
      cancelled = true;
    };
  }, [locations, mapReady]);

  const liveCount = locations.filter((p) => p.isLive).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("tracking.title")}
        description={t("tracking.description")}
        action={
          <Button type="button" variant="secondary" onClick={() => void load()}>
            {t("tracking.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
          {t("tracking.liveCount", { count: liveCount })}
        </span>
        <span className="text-stone-400">·</span>
        <span>{t("tracking.autoRefresh")}</span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        {loading && !mapReady ? (
          <div className="flex h-[min(70vh,560px)] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : null}
        <div
          ref={mapElRef}
          className="h-[min(70vh,560px)] w-full"
          aria-label={t("tracking.mapAria")}
        />
        {!loading && locations.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <p className="rounded-lg bg-white/95 px-4 py-2 text-sm text-stone-600 shadow">
              {t("tracking.empty")}
            </p>
          </div>
        ) : null}
      </div>

      {locations.length > 0 ? (
        <ul className="divide-y divide-amber-100 overflow-hidden rounded-xl border border-amber-200 bg-white">
          {locations.map((pin) => (
            <li
              key={pin.deliveryGuyId}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-900">
                  {pin.name}
                </p>
                <p className="text-xs text-stone-500">
                  {timeLabel(pin.updatedAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  pin.isLive
                    ? "bg-red-50 text-red-700"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {pin.isLive ? t("tracking.live") : t("tracking.stale")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
