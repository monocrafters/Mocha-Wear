"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { DEFAULT_SETTINGS, type SiteNote, type SiteSettings } from "@/lib/settings";
import { AdminFormSkeleton } from "@/components/skeletons";

const field =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

function newNote(order: number): SiteNote {
  return { id: crypto.randomUUID(), title: "", copy: "", sort_order: order };
}

export function AdminSettings() {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [marqueeText, setMarqueeText] = useState(DEFAULT_SETTINGS.marquee.join("\n"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/settings`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load settings");
      const next = { ...DEFAULT_SETTINGS, ...(data.settings as SiteSettings) };
      setForm(next);
      setMarqueeText((next.marquee || []).join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          marquee: marqueeText,
          notes: form.notes.map((note, index) => ({ ...note, sort_order: index + 1 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save settings");
      const next = { ...DEFAULT_SETTINGS, ...(data.settings as SiteSettings) };
      setForm(next);
      setMarqueeText((next.marquee || []).join("\n"));
      setSaved("Storefront settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <AdminFormSkeleton />;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="bg-cream px-3 py-2 text-sm text-slate-900">{saved}</p> : null}

      <Section title="Brand" copy="Header logo, browser tab, and the footer name.">
        <Field label="Brand name" value={form.brand_name} onChange={(v) => set("brand_name", v)} placeholder="Mocha" required />
        <Field label="Brand suffix" value={form.brand_suffix} onChange={(v) => set("brand_suffix", v)} placeholder="Wear" />
        <Field
          label="Browser title"
          value={form.site_title}
          onChange={(v) => set("site_title", v)}
          className="sm:col-span-2"
        />
        <Area
          label="Browser description"
          value={form.site_description}
          onChange={(v) => set("site_description", v)}
          className="sm:col-span-2"
        />
        <Area label="Footer tagline" value={form.tagline} onChange={(v) => set("tagline", v)} className="sm:col-span-2" />
      </Section>

      <Section title="Contact" copy="Shown in the footer. Leave phone blank to hide it.">
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="hello@mochawear.com" />
        <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="0300 1234567" />
        <Field
          label="Cities"
          value={form.cities}
          onChange={(v) => set("cities", v)}
          placeholder="Karachi · Lahore · Islamabad"
          className="sm:col-span-2"
        />
        <Field
          label="Delivery line"
          value={form.delivery_line}
          onChange={(v) => set("delivery_line", v)}
          placeholder="Free nationwide delivery"
        />
        <Field
          label="Mobile footer line"
          value={form.mobile_line}
          onChange={(v) => set("mobile_line", v)}
          placeholder="Free nationwide delivery · Cash on delivery"
        />
        <Field label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="@mochawear" />
        <Field
          label="Instagram URL"
          value={form.instagram_url}
          onChange={(v) => set("instagram_url", v)}
          placeholder="https://instagram.com/mochawear"
        />
      </Section>

      <Section title="Floating WhatsApp" copy="Shows a chat button only on the homepage. Add a number to turn it on.">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.floating_whatsapp_enabled}
            onChange={(e) => set("floating_whatsapp_enabled", e.target.checked)}
          />
          Show floating WhatsApp on homepage
        </label>
        <Field
          label="WhatsApp number"
          value={form.floating_whatsapp_number}
          onChange={(v) => set("floating_whatsapp_number", v)}
          placeholder="0300 1234567"
        />
        <Field
          label="Opening message"
          value={form.floating_whatsapp_message}
          onChange={(v) => set("floating_whatsapp_message", v)}
          placeholder="Hi Mocha Wear, I have a question."
        />
      </Section>

      <Section title="Footer" copy="Marquee words, column headings, and the copyright line.">
        <Field label="Visit heading" value={form.visit_heading} onChange={(v) => set("visit_heading", v)} />
        <Field label="Contact heading" value={form.atelier_heading} onChange={(v) => set("atelier_heading", v)} />
        <Field
          label="Copyright"
          value={form.copyright}
          onChange={(v) => set("copyright", v)}
          placeholder="© {year} Mocha Wear · All rights reserved"
          className="sm:col-span-2"
        />
        <p className="sm:col-span-2 text-xs text-slate-500">Use {"{year}"} to keep the year current automatically.</p>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-600">Marquee words</span>
          <textarea
            rows={5}
            value={marqueeText}
            onChange={(e) => setMarqueeText(e.target.value)}
            className={field}
            placeholder={"Sale\nLawn\nFormals"}
          />
          <span className="mt-1.5 block text-xs text-slate-500">One word or phrase per line.</span>
        </label>
      </Section>

      <Section title="Homepage collections" copy="The collections row on the homepage and collections page.">
        <Field label="Kicker" value={form.collections_kicker} onChange={(v) => set("collections_kicker", v)} />
        <Field label="Heading" value={form.collections_heading} onChange={(v) => set("collections_heading", v)} />
        <Field
          label="All collections link"
          value={form.collections_all_label}
          onChange={(v) => set("collections_all_label", v)}
          className="sm:col-span-2"
        />
      </Section>

      <Section title="Homepage products" copy="The sale suits grid on the homepage.">
        <Field label="Kicker" value={form.products_kicker} onChange={(v) => set("products_kicker", v)} />
        <Field label="Heading" value={form.products_heading} onChange={(v) => set("products_heading", v)} />
        <Area label="Copy" value={form.products_copy} onChange={(v) => set("products_copy", v)} className="sm:col-span-2" />
      </Section>

      <Section title="Shop page" copy="The heading on /shop.">
        <Field label="Kicker" value={form.shop_kicker} onChange={(v) => set("shop_kicker", v)} />
        <Field label="Heading" value={form.shop_heading} onChange={(v) => set("shop_heading", v)} />
      </Section>

      <Section title="Reviews" copy="The reviews section on the homepage.">
        <Field label="Kicker" value={form.reviews_kicker} onChange={(v) => set("reviews_kicker", v)} />
        <Field label="Heading" value={form.reviews_heading} onChange={(v) => set("reviews_heading", v)} />
        <Field
          label="Side label"
          value={form.reviews_aside}
          onChange={(v) => set("reviews_aside", v)}
          placeholder="Pakistan"
          className="sm:col-span-2"
        />
      </Section>

      <section className="border border-slate-200 bg-white px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Before you buy</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Info cards under the homepage, above the newsletter.</p>
          </div>
          <button
            type="button"
            onClick={() => set("notes", [...form.notes, newNote(form.notes.length + 1)])}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Add card
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Kicker" value={form.notes_kicker} onChange={(v) => set("notes_kicker", v)} />
          <Field label="Button" value={form.notes_cta} onChange={(v) => set("notes_cta", v)} />
          <Area label="Heading" value={form.notes_heading} onChange={(v) => set("notes_heading", v)} className="sm:col-span-2" />
        </div>
        <div className="mt-5 space-y-3">
          {form.notes.map((note, index) => (
            <div key={note.id} className="grid gap-3 border border-slate-200 p-4 sm:grid-cols-[1fr_1fr_auto]">
              <Field
                label="Title"
                value={note.title}
                onChange={(v) =>
                  set(
                    "notes",
                    form.notes.map((item, i) => (i === index ? { ...item, title: v } : item)),
                  )
                }
              />
              <Area
                label="Copy"
                value={note.copy}
                rows={2}
                onChange={(v) =>
                  set(
                    "notes",
                    form.notes.map((item, i) => (i === index ? { ...item, copy: v } : item)),
                  )
                }
              />
              <button
                type="button"
                onClick={() => set("notes", form.notes.filter((_, i) => i !== index))}
                className="self-end text-sm font-medium text-red-600 sm:mb-2"
              >
                Remove
              </button>
            </div>
          ))}
          {!form.notes.length ? <p className="text-sm text-slate-500">No cards yet. Add delivery, exchange, or COD notes.</p> : null}
        </div>
      </section>

      <Section title="Newsletter" copy="The join-the-list block at the bottom of the homepage.">
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.newsletter_enabled}
            onChange={(e) => set("newsletter_enabled", e.target.checked)}
          />
          Show newsletter section
        </label>
        <Field label="Kicker" value={form.newsletter_kicker} onChange={(v) => set("newsletter_kicker", v)} />
        <Field label="Button" value={form.newsletter_button} onChange={(v) => set("newsletter_button", v)} />
        <Area
          label="Heading"
          value={form.newsletter_heading}
          onChange={(v) => set("newsletter_heading", v)}
          className="sm:col-span-2"
        />
        <Field
          label="Email placeholder"
          value={form.newsletter_placeholder}
          onChange={(v) => set("newsletter_placeholder", v)}
          className="sm:col-span-2"
        />
      </Section>

      <div className="sticky bottom-4 z-10">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-slate-200 bg-white px-5 py-6 sm:px-6">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows = 3,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={field} />
    </label>
  );
}
