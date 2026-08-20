"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import { HELP_ICONS, type HelpContent, type HelpNote, type HelpTopic } from "@/lib/support";
import { AdminConfirm } from "@/components/admin-confirm";
import { AdminFormSkeleton } from "@/components/skeletons";

const field =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

const emptyTopic = {
  title: "",
  copy: "",
  message: "",
  icon: "message",
  is_published: true,
};

const emptyNote = {
  title: "",
  copy: "",
  is_published: true,
};

export function AdminHelp() {
  const [help, setHelp] = useState<HelpContent | null>(null);
  const [settings, setSettings] = useState({
    hours: "",
    whatsapp_number: "",
    reply_line: "",
    cta_label: "",
    cta_desktop_label: "",
    default_message: "",
    kicker: "",
    title: "",
    desktop_heading: "",
    desktop_copy: "",
    topics_heading: "",
    notes_heading: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<HelpTopic | null>(null);
  const [editingNote, setEditingNote] = useState<HelpNote | null>(null);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "topic" | "note"; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/help`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load help");
      const next = data.help as HelpContent;
      setHelp(next);
      setSettings({
        hours: next.hours,
        whatsapp_number: next.whatsapp_display || next.whatsapp_number,
        reply_line: next.reply_line,
        cta_label: next.cta_label,
        cta_desktop_label: next.cta_desktop_label,
        default_message: next.default_message,
        kicker: next.kicker,
        title: next.title,
        desktop_heading: next.desktop_heading,
        desktop_copy: next.desktop_copy,
        topics_heading: next.topics_heading,
        notes_heading: next.notes_heading,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load help");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const res = await apiFetch(`${API_URL}/api/admin/help`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save help");
      setHelp(data.help);
      setSettings((prev) => ({
        ...prev,
        whatsapp_number: data.help.whatsapp_display || data.help.whatsapp_number,
      }));
      setSaved("Support settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save help");
    } finally {
      setSaving(false);
    }
  }

  function startTopic(item?: HelpTopic) {
    setEditingTopic(item || null);
    setTopicForm(
      item
        ? {
            title: item.title,
            copy: item.copy,
            message: item.message,
            icon: item.icon,
            is_published: item.is_published,
          }
        : emptyTopic,
    );
    setTopicOpen(true);
    setError("");
  }

  function startNote(item?: HelpNote) {
    setEditingNote(item || null);
    setNoteForm(item ? { title: item.title, copy: item.copy, is_published: item.is_published } : emptyNote);
    setNoteOpen(true);
    setError("");
  }

  async function saveTopic(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editingTopic
        ? `${API_URL}/api/admin/help/topics/${editingTopic.id}`
        : `${API_URL}/api/admin/help/topics`;
      const res = await apiFetch(url, {
        method: editingTopic ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topicForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save topic");
      setTopicOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save topic");
    } finally {
      setSaving(false);
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editingNote
        ? `${API_URL}/api/admin/help/notes/${editingNote.id}`
        : `${API_URL}/api/admin/help/notes`;
      const res = await apiFetch(url, {
        method: editingNote ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save card");
      setNoteOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save card");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError("");
    try {
      const path = pendingDelete.kind === "topic" ? "topics" : "notes";
      const res = await apiFetch(`${API_URL}/api/admin/help/${path}/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete");
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleTopic(item: HelpTopic) {
    await apiFetch(`${API_URL}/api/admin/help/topics/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !item.is_published }),
    });
    await load();
  }

  async function toggleNote(item: HelpNote) {
    await apiFetch(`${API_URL}/api/admin/help/notes/${item.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !item.is_published }),
    });
    await load();
  }

  if (loading) {
    return <AdminFormSkeleton />;
  }

  return (
    <div className="mt-8 space-y-10">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="bg-cream px-3 py-2 text-sm text-slate-900">{saved}</p> : null}

      <form onSubmit={saveSettings} className="border border-slate-200 bg-white px-5 py-6 sm:px-6">
        <p className="text-sm font-semibold text-slate-900">Contact and hours</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Hours</span>
            <input
              value={settings.hours}
              onChange={(e) => setSettings({ ...settings, hours: e.target.value })}
              className={field}
              placeholder="10am–8pm"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">WhatsApp number</span>
            <input
              value={settings.whatsapp_number}
              onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
              className={field}
              placeholder="0300 1234567"
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-600">Reply line</span>
            <input
              value={settings.reply_line}
              onChange={(e) => setSettings({ ...settings, reply_line: e.target.value })}
              className={field}
              placeholder="Usually replies in minutes"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Mobile button</span>
            <input
              value={settings.cta_label}
              onChange={(e) => setSettings({ ...settings, cta_label: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Desktop button</span>
            <input
              value={settings.cta_desktop_label}
              onChange={(e) => setSettings({ ...settings, cta_desktop_label: e.target.value })}
              className={field}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-600">Default WhatsApp message</span>
            <input
              value={settings.default_message}
              onChange={(e) => setSettings({ ...settings, default_message: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <p className="mt-8 text-sm font-semibold text-slate-900">Page copy</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Kicker</span>
            <input
              value={settings.kicker}
              onChange={(e) => setSettings({ ...settings, kicker: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Title</span>
            <input
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className={field}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-600">Desktop heading</span>
            <input
              value={settings.desktop_heading}
              onChange={(e) => setSettings({ ...settings, desktop_heading: e.target.value })}
              className={field}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-600">Desktop intro</span>
            <textarea
              value={settings.desktop_copy}
              onChange={(e) => setSettings({ ...settings, desktop_copy: e.target.value })}
              className={`${field} min-h-[90px]`}
              rows={3}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Topics heading</span>
            <input
              value={settings.topics_heading}
              onChange={(e) => setSettings({ ...settings, topics_heading: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Cards heading</span>
            <input
              value={settings.notes_heading}
              onChange={(e) => setSettings({ ...settings, notes_heading: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Help topics</p>
            <p className="mt-1 text-sm text-slate-500">Each topic opens WhatsApp with its own message.</p>
          </div>
          <button
            type="button"
            onClick={() => startTopic()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Add topic
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {help?.topics.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-4">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase">
                  {item.is_published ? "Live" : "Hidden"} · {item.icon}
                </p>
                <h3 className="font-semibold mt-1 truncate text-xl text-slate-900">{item.title}</h3>
                <p className="mt-1 truncate text-sm text-slate-500">{item.copy}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startTopic(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                  Edit
                </button>
                <button type="button" onClick={() => toggleTopic(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                  {item.is_published ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => setPendingDelete({ kind: "topic", id: item.id, name: item.title })} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!help?.topics.length ? (
            <p className="border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No topics yet. Add size, orders, delivery, or anything else.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Info cards</p>
            <p className="mt-1 text-sm text-slate-500">Short notes under the topic list — delivery, exchange, COD.</p>
          </div>
          <button
            type="button"
            onClick={() => startNote()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Add card
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {help?.notes.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-4 border border-slate-200 bg-white px-4 py-4">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase">
                  {item.is_published ? "Live" : "Hidden"}
                </p>
                <h3 className="font-semibold mt-1 truncate text-xl text-slate-900">{item.title}</h3>
                <p className="mt-1 truncate text-sm text-slate-500">{item.copy}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startNote(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                  Edit
                </button>
                <button type="button" onClick={() => toggleNote(item)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                  {item.is_published ? "Hide" : "Show"}
                </button>
                <button type="button" onClick={() => setPendingDelete({ kind: "note", id: item.id, name: item.title })} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600">
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!help?.notes.length ? (
            <p className="border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              No info cards yet.
            </p>
          ) : null}
        </div>
      </section>

      {topicOpen ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={() => setTopicOpen(false)}>
          <form
            onSubmit={saveTopic}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-2xl">{editingTopic ? "Edit topic" : "New topic"}</h2>
              <button type="button" onClick={() => setTopicOpen(false)} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Title</span>
                <input
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Copy</span>
                <textarea
                  value={topicForm.copy}
                  onChange={(e) => setTopicForm({ ...topicForm, copy: e.target.value })}
                  className={`${field} min-h-[90px]`}
                  rows={3}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">WhatsApp message</span>
                <textarea
                  value={topicForm.message}
                  onChange={(e) => setTopicForm({ ...topicForm, message: e.target.value })}
                  className={`${field} min-h-[80px]`}
                  rows={3}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Icon</span>
                <select
                  value={topicForm.icon}
                  onChange={(e) => setTopicForm({ ...topicForm, icon: e.target.value })}
                  className={field}
                >
                  {HELP_ICONS.map((icon) => (
                    <option key={icon.id} value={icon.id}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={topicForm.is_published}
                  onChange={(e) => setTopicForm({ ...topicForm, is_published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save topic"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {noteOpen ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40" onClick={() => setNoteOpen(false)}>
          <form
            onSubmit={saveNote}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-2xl">{editingNote ? "Edit card" : "New card"}</h2>
              <button type="button" onClick={() => setNoteOpen(false)} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Title</span>
                <input
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Copy</span>
                <textarea
                  value={noteForm.copy}
                  onChange={(e) => setNoteForm({ ...noteForm, copy: e.target.value })}
                  className={`${field} min-h-[90px]`}
                  rows={3}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={noteForm.is_published}
                  onChange={(e) => setNoteForm({ ...noteForm, is_published: e.target.checked })}
                />
                Published
              </label>
            </div>
            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save card"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminConfirm
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === "note" ? "Delete this info card?" : "Delete this help topic?"}
        message={
          pendingDelete
            ? `“${pendingDelete.name || "Untitled"}” will be removed from the Help page.`
            : ""
        }
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
