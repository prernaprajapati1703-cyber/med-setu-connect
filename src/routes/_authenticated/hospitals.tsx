import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchNearbyHospitals } from "@/lib/hospitals.functions";
import { AppShell } from "@/components/AppShell";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { MapPin, Navigation, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: typeof google;
    __medsetuInitMap?: () => void;
  }
}

export const Route = createFileRoute("/_authenticated/hospitals")({
  head: () => ({ meta: [{ title: "Hospital Finder — MedSetu" }] }),
  component: HospitalsPage,
});

interface Hospital {
  place_id: string;
  name: string;
  address?: string;
  lat: number; lng: number;
  rating?: number;
  emergency_24h?: boolean;
  distance_m?: number;
}

function HospitalsPage() {
  const { t } = useLang();
  const findHospitals = useServerFn(searchNearbyHospitals);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [busy, setBusy] = useState(true);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInst = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Get location, then search
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => { toast.error(e.message); setBusy(false); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    if (!pos) return;
    (async () => {
      setBusy(true);
      try {
        const list = await findHospitals({ data: { lat: pos.lat, lng: pos.lng, radiusMeters: 5000 } });
        setHospitals(list);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Search failed");
      } finally {
        setBusy(false);
      }
    })();
  }, [pos, findHospitals]);

  // Load Google Maps JS and render
  useEffect(() => {
    if (!pos) return;
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return;

    const renderMap = () => {
      if (!mapRef.current || !window.google) return;
      mapInst.current = new window.google.maps.Map(mapRef.current, {
        center: pos, zoom: 13,
        disableDefaultUI: true, zoomControl: true,
      });
      new window.google.maps.Marker({
        position: pos, map: mapInst.current,
        title: "You",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8, fillColor: "#0A6CB8", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
        },
      });
    };

    if (window.google?.maps) { renderMap(); return; }

    window.__medsetuInitMap = renderMap;
    const id = "medsetu-gmaps";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__medsetuInitMap${channel ? `&channel=${channel}` : ""}`;
    document.head.appendChild(s);
  }, [pos]);

  useEffect(() => {
    const map = mapInst.current;
    if (!map || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = hospitals.map((h) =>
      new window.google!.maps.Marker({
        position: { lat: h.lat, lng: h.lng }, map,
        title: h.name,
        icon: h.emergency_24h ? {
          path: window.google!.maps.SymbolPath.CIRCLE,
          scale: 9, fillColor: "#EF4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
        } : undefined,
      })
    );
  }, [hospitals]);

  return (
    <AppShell title={t("hospitals_title")}>
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h1 className="font-display text-lg font-semibold">{t("hospitals_title")}</h1>
      </div>

      <div ref={mapRef} className="mt-3 h-64 w-full overflow-hidden rounded-2xl border border-border bg-secondary/40" />

      <div className="mt-4 space-y-2">
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t("hospitals_locating")}</div>}
        {!busy && hospitals.length === 0 && <p className="text-sm text-muted-foreground">{t("hospitals_none")}</p>}
        {hospitals.map((h) => (
          <div key={h.place_id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${h.emergency_24h ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <MapPin className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium">{h.name}</h3>
                {h.emergency_24h && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">{t("emergency_24h")}</span>}
              </div>
              {h.address && <p className="truncate text-xs text-muted-foreground">{h.address}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {h.distance_m != null ? `${(h.distance_m / 1000).toFixed(1)} km` : ""}{h.rating ? ` · ★ ${h.rating}` : ""}
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Navigation className="h-3.5 w-3.5" /> {t("directions")}
            </a>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
