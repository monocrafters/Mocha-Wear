"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import defaults from "@/lib/spotlight-defaults.json";
import type { Collection } from "./admin-collections";
import type { SpotlightConfig } from "./collection-spotlight";
import { StoreImage } from "./store-image";

type SpotlightItem = SpotlightConfig["items"][number];
const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm";

function requestError(status: number, message?: string) {
  if (status === 401 || status === 403) return "Your admin session has expired. Sign in again to edit the collection hero.";
  if (status === 404) return "The collection hero editor needs the updated backend. Your existing homepage settings have not changed.";
  return message || "Could not save the collection hero. Please try again.";
}

export function AdminSpotlight() {
  const [config, setConfig] = useState<SpotlightConfig>(defaults);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [status, setStatus] = useState("Loading collection hero...");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [heroResponse, collectionsResponse] = await Promise.all([
          apiFetch(`${API_URL}/api/admin/spotlight`, { credentials: "include" }),
          apiFetch(`${API_URL}/api/admin/collections`, { credentials: "include" }),
        ]);
        if (!collectionsResponse.ok) throw new Error(requestError(collectionsResponse.status, "Could not load collections."));
        const catalog = await collectionsResponse.json();
        if (live) setCollections(catalog.items);
        if (!heroResponse.ok) throw new Error(requestError(heroResponse.status, "Could not load the collection hero."));
        const data = await heroResponse.json();
        if (live) {
          setConfig(data.spotlight);
          setReady(true);
          setStatus("");
        }
      } catch (error) {
        if (live) setStatus(error instanceof Error ? error.message : "Could not load the editor.");
      }
    })();
    return () => { live = false; };
  }, []);

  function update(id: string, patch: Partial<SpotlightItem>) {
    setConfig((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  async function upload(id: string, key: "image" | "background", file: File) {
    setBusy(true);
    setStatus("Uploading collection artwork...");
    try {
      const body = new FormData();
      body.append("cover", file);
      const response = await apiFetch(`${API_URL}/api/admin/spotlight/image`, { method: "POST", credentials: "include", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(requestError(response.status, data.message));
      update(id, { [key]: data.url });
      setStatus("Artwork uploaded. Save changes to publish it.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setStatus("Saving collection hero...");
    try {
      const response = await apiFetch(`${API_URL}/api/admin/spotlight`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(requestError(response.status, data.message));
      setConfig(data.spotlight);
      setStatus("Collection hero saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, delta: number) {
    setConfig((current) => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...current, items };
    });
  }

  function addCollection(id: string) {
    const collection = collections.find((item) => item.id === id);
    if (!collection) return;
    setConfig((current) => ({
      ...current,
      items: [...current.items, {
        id: collection.id,
        collection_id: collection.id,
        title: collection.name,
        description: collection.subtitle || "",
        image: "",
        background: "",
        enabled: false,
      }],
    }));
    setStatus("Collection added as a draft. Upload its collection artwork, then publish and save.");
  }

  const available = collections.filter((collection) => !config.items.some((item) => item.collection_id === collection.id));

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-slate-500">Desktop homepage</p>
          <h2 className="mt-2 text-2xl">Collection hero</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Introduce each collection with fabric textures and draping. Upload a square mood image, arrange the order and choose which collections appear.
          </p>
        </div>
        <button type="button" disabled={!ready || busy} onClick={save} className="rounded-lg bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-40">Save changes</button>
      </div>
      <p role="status" aria-live="polite" className="my-4 text-sm text-slate-600">{status}</p>
      <fieldset disabled={!ready || busy} className="disabled:opacity-50">
        <legend className="sr-only">Collection hero settings</legend>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-slate-100 py-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} /> Enable collection hero</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={config.autoplay} onChange={(event) => setConfig({ ...config, autoplay: event.target.checked })} /> Automatic transitions</label>
          <label className="flex items-center gap-2">Seconds per collection <input className="w-16 rounded-lg border border-slate-200 p-2" type="number" min={4} max={15} step={1} value={config.interval / 1000} onChange={(event) => setConfig({ ...config, interval: Number(event.target.value) * 1000 })} /></label>
          <p className="w-full text-xs text-slate-500">Default: the next collection appears automatically every 5 seconds.</p>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {config.items.map((item, index) => {
            const collection = collections.find((entry) => entry.id === item.collection_id);
            return (
              <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-[2/1] bg-slate-50">
                  {item.image ? <StoreImage src={item.image} alt={`${item.title} collection artwork`} sizes="(min-width: 1280px) 40vw, 80vw" cloudWidth={900} preserveCrop className="object-contain" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400"><ImagePlus size={28} /><span className="text-sm">Add collection artwork</span></div>}
                </div>
                <div className="p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{collection?.name || "Collection unavailable"} · Position {index + 1}</p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      <button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                      <button type="button" aria-label={`Move ${item.title} down`} disabled={index === config.items.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                    </div>
                  </div>
                  <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={(event) => update(item.id, { enabled: event.target.checked })} /> Published in the hero</label>
                  <label className="mb-3 block text-xs">Collection title<input className={inputClass} maxLength={100} value={item.title} onChange={(event) => update(item.id, { title: event.target.value })} /></label>
                  <label className="mb-4 block text-xs">Short introduction<textarea aria-label="Short introduction" className={inputClass} rows={2} maxLength={350} value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} /></label>
                  <label className="block text-xs">Collection artwork
                    <span className="mt-1 block leading-5 text-slate-500">Use a square fabric or texture image with a central focal point for the circular crop. Avoid models, outfits, product grids, text and pricing.</span>
                    <input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(item.id, "image", file); event.target.value = ""; }} />
                    <input aria-label={`${item.title} image URL`} className={inputClass} placeholder="Uploaded collection artwork URL" value={item.image} onChange={(event) => update(item.id, { image: event.target.value })} />
                  </label>
                  <details className="mt-4 rounded-lg border border-slate-100 p-3">
                    <summary className="cursor-pointer text-xs text-slate-600">Alternative background artwork (optional)</summary>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Leave empty to use the same collection artwork throughout. Upload an alternative composition only if the background needs a different image.</p>
                    <label className="mt-2 block text-xs">Background artwork<input className="mt-2 block w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(item.id, "background", file); event.target.value = ""; }} /><input aria-label={`${item.title} background URL`} className={inputClass} placeholder="Optional background artwork URL" value={item.background} onChange={(event) => update(item.id, { background: event.target.value })} /></label>
                  </details>
                  {!collection && ready && <p className="mt-3 text-xs text-amber-700">This collection no longer exists. Remove this entry before saving.</p>}
                  <button type="button" className="mt-4 text-xs text-red-600" onClick={() => setConfig((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))}>Remove from hero</button>
                </div>
              </article>
            );
          })}
        </div>
        <label className="mt-6 block text-sm">Add a collection<select aria-label="Add a collection" className="ml-3 rounded-lg border border-slate-200 p-3" value="" onChange={(event) => addCollection(event.target.value)}><option value="">Choose collection</option>{available.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}{collection.is_published ? "" : " (unpublished)"}</option>)}</select></label>
        <p className="mt-2 text-xs text-slate-500">New collections start as drafts. A collection must also be published in your catalog to appear on the homepage.</p>
      </fieldset>
    </section>
  );
}
