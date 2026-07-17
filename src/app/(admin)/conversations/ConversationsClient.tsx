"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HiOutlinePaperAirplane,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePhone,
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";

import { Button } from "@/components/ui/Button";
import { ContactCallModal } from "@/components/ContactCallModal";
import { DeliveryPartnerViewModal } from "@/components/DeliveryPartnerViewModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import {
  deleteChatMessage,
  fetchChatMessages,
  fetchConversations,
  fetchDeliveryGuys,
  sendChatMessage,
  updateChatMessage,
  type ChatMessage,
  type Conversation,
  type DeliveryGuy,
} from "@/lib/api";
import { useLocale, useT } from "@/lib/i18n";

function timeLabel(iso: string | null, locale: "en" | "si") {
  if (!iso) return "";
  const elapsedSeconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  const absolute = Math.abs(elapsedSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absolute < 60) return formatter.format(-elapsedSeconds, "second");
  if (absolute < 3600) {
    return formatter.format(-Math.round(elapsedSeconds / 60), "minute");
  }
  if (absolute < 86400) {
    return formatter.format(-Math.round(elapsedSeconds / 3600), "hour");
  }
  if (absolute < 604800) {
    return formatter.format(-Math.round(elapsedSeconds / 86400), "day");
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Colombo",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function Avatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-100"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function previewLabel(
  item: Conversation,
  t: ReturnType<typeof useT>,
) {
  if (item.lastMessageType === "deleted") return t("chat.messageDeleted");
  if (item.lastMessageType === "image" && !item.lastMessage) {
    return t("chat.photo");
  }
  if (item.lastMessageType === "image" && item.lastMessage) {
    return `📷 ${item.lastMessage}`;
  }
  return item.lastMessage ?? t("chat.startChat");
}

export default function ConversationsPage() {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialId = Number(searchParams.get("with") ?? "");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [partners, setPartners] = useState<DeliveryGuy[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isInteger(initialId) && initialId > 0 ? initialId : null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [viewingPartner, setViewingPartner] = useState<DeliveryGuy | null>(
    null,
  );
  const [callingPartner, setCallingPartner] = useState<DeliveryGuy | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedMeta = useMemo(() => {
    const fromConv = conversations.find((c) => c.deliveryGuyId === selectedId);
    if (fromConv) return fromConv;
    const partner = partners.find((p) => p.id === selectedId);
    if (!partner) return null;
    return {
      deliveryGuyId: partner.id,
      deliveryGuyName: partner.name,
      deliveryGuyImageUrl: partner.imageUrl ?? null,
      lastMessage: null,
      lastMessageType: null,
      lastMessageAt: null,
      unreadCount: 0,
    } satisfies Conversation;
  }, [conversations, partners, selectedId]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedId) ?? null,
    [partners, selectedId],
  );

  const loadList = useCallback(async () => {
    try {
      const [convData, guys] = await Promise.all([
        fetchConversations(),
        fetchDeliveryGuys(),
      ]);
      setConversations(convData.conversations);
      setPartners(guys.filter((g) => g.isActive));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("chat.failedLoad"),
      );
    } finally {
      setLoadingList(false);
    }
  }, [toast, t]);

  const loadThread = useCallback(
    async (deliveryGuyId: number, quiet = false) => {
      try {
        if (!quiet) setLoadingThread(true);
        const data = await fetchChatMessages(deliveryGuyId);
        setMessages(data);
      } catch (err) {
        if (!quiet) {
          toast.error(
            err instanceof Error ? err.message : t("chat.failedLoad"),
          );
        }
      } finally {
        setLoadingThread(false);
      }
    },
    [toast, t],
  );

  useEffect(() => {
    void loadList();
    const timer = window.setInterval(() => void loadList(), 5000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (selectedId == null) return;
    void loadThread(selectedId, false);
    const timer = window.setInterval(
      () => void loadThread(selectedId, true),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [selectedId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  async function uploadChatImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? t("upload.failed"));
      }
      setPendingImage(data.url as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("upload.failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSend() {
    if (!selectedId || sending) return;
    const body = draft.trim();
    if (!body && !pendingImage) return;
    setSending(true);
    try {
      const message = await sendChatMessage(selectedId, {
        body,
        imageUrl: pendingImage,
      });
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== message.id);
        return [...without, message];
      });
      setDraft("");
      setPendingImage(null);
      void loadList();
      window.dispatchEvent(new Event("bakery:chat-updated"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("chat.failedSend"),
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSaveEdit(messageId: number) {
    const body = editDraft.trim();
    if (!body) return;
    try {
      const updated = await updateChatMessage(messageId, body);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m)),
      );
      setEditingId(null);
      setEditDraft("");
      void loadList();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("chat.failedEdit"),
      );
    }
  }

  async function handleDelete(messageId: number) {
    if (!window.confirm(t("chat.deleteConfirm"))) return;
    try {
      const updated = await deleteChatMessage(messageId);
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updated } : m)),
        );
      } else if (selectedId) {
        await loadThread(selectedId, true);
      }
      void loadList();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("chat.failedDelete"),
      );
    }
  }

  const sidebarItems = useMemo(() => {
    const byId = new Map<number, Conversation>();
    for (const c of conversations) byId.set(c.deliveryGuyId, c);
    for (const p of partners) {
      if (!byId.has(p.id)) {
        byId.set(p.id, {
          deliveryGuyId: p.id,
          deliveryGuyName: p.name,
          deliveryGuyImageUrl: p.imageUrl ?? null,
          lastMessage: null,
          lastMessageType: null,
          lastMessageAt: null,
          unreadCount: 0,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      const at = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bt = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      if (bt !== at) return bt - at;
      return a.deliveryGuyName.localeCompare(b.deliveryGuyName);
    });
  }, [conversations, partners]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("chat.title")}
        description={t("chat.description")}
      />

      <div className="flex h-[min(72vh,640px)] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        <aside className="flex w-full max-w-[280px] flex-col border-r border-amber-100 sm:max-w-[320px]">
          <div className="border-b border-amber-100 px-3 py-2.5 text-sm font-semibold text-stone-800">
            {t("chat.conversations")}
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : sidebarItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-stone-500">
                {t("chat.noPartners")}
              </p>
            ) : (
              sidebarItems.map((item) => {
                const active = item.deliveryGuyId === selectedId;
                return (
                  <button
                    key={item.deliveryGuyId}
                    type="button"
                    onClick={() => setSelectedId(item.deliveryGuyId)}
                    className={`flex w-full items-start gap-3 border-b border-amber-50 px-3 py-3 text-left hover:bg-amber-50/60 ${
                      active ? "bg-amber-50" : "bg-white"
                    }`}
                  >
                    <Avatar
                      name={item.deliveryGuyName}
                      imageUrl={item.deliveryGuyImageUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-stone-900">
                          {item.deliveryGuyName}
                        </p>
                        {item.unreadCount > 0 ? (
                          <span className="rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-white">
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-stone-500">
                        {previewLabel(item, t)}
                      </p>
                      {item.lastMessageAt ? (
                        <p className="mt-0.5 text-[10px] text-stone-400">
                          {timeLabel(item.lastMessageAt, locale)}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {!selectedMeta ? (
            <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-stone-500">
              {t("chat.selectConversation")}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-amber-100 px-4 py-3">
                <Avatar
                  name={selectedMeta.deliveryGuyName}
                  imageUrl={selectedMeta.deliveryGuyImageUrl}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">
                    {selectedMeta.deliveryGuyName}
                  </p>
                  <button
                    type="button"
                    disabled={!selectedPartner}
                    onClick={() => setViewingPartner(selectedPartner)}
                    className="text-xs text-amber-700 hover:underline disabled:opacity-50"
                  >
                    {t("chat.viewPartner")}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!selectedPartner?.phone}
                  onClick={() => setCallingPartner(selectedPartner)}
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-green-200 text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("calls.call")}
                >
                  <HiOutlinePhone className="h-5 w-5" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-amber-50/40 to-white px-4 py-4">
                {loadingThread ? (
                  <div className="flex justify-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-stone-500">
                    {t("chat.emptyThread")}
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.mine ? "justify-end" : "justify-start"}`}
                    >
                      {!msg.mine ? (
                        <Avatar
                          name={msg.senderName}
                          imageUrl={msg.senderImageUrl}
                        />
                      ) : null}
                      <div
                        className={`group relative max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          msg.isDeleted
                            ? "rounded-md bg-stone-100 italic text-stone-500 ring-1 ring-stone-200"
                            : msg.mine
                              ? "rounded-br-md bg-amber-600 text-white"
                              : "rounded-bl-md bg-white text-stone-900 ring-1 ring-amber-100"
                        }`}
                      >
                        {msg.mine && !msg.isDeleted && editingId !== msg.id ? (
                          <div className="absolute -left-9 top-1">
                            <button
                              type="button"
                              aria-label={t("chat.messageActions")}
                              onClick={() =>
                                setActionMenuId((current) =>
                                  current === msg.id ? null : msg.id,
                                )
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-600 shadow ring-1 ring-stone-200 transition hover:bg-stone-50 ${
                                actionMenuId === msg.id
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                              }`}
                            >
                              <HiOutlineEllipsisVertical className="h-5 w-5" />
                            </button>
                            {actionMenuId === msg.id ? (
                              <div className="absolute right-0 top-9 z-20 min-w-32 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 text-stone-800 shadow-xl">
                                {msg.canEdit && msg.body ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50"
                                    onClick={() => {
                                      setEditingId(msg.id);
                                      setEditDraft(msg.body);
                                      setActionMenuId(null);
                                    }}
                                  >
                                    <HiOutlinePencilSquare className="h-4 w-4" />
                                    {t("common.edit")}
                                  </button>
                                ) : null}
                                {msg.canDelete ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      void handleDelete(msg.id);
                                    }}
                                  >
                                    <HiOutlineTrash className="h-4 w-4" />
                                    {t("common.delete")}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {!msg.mine && !msg.isDeleted ? (
                          <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                            {msg.senderName}
                          </p>
                        ) : null}

                        {editingId === msg.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-amber-200 px-2 py-1 text-sm text-stone-900"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold underline"
                                onClick={() => void handleSaveEdit(msg.id)}
                              >
                                {t("common.saveChanges")}
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold underline"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditDraft("");
                                }}
                              >
                                {t("common.cancel")}
                              </button>
                            </div>
                          </div>
                        ) : msg.isDeleted ? (
                          <p>{t("chat.messageDeleted")}</p>
                        ) : (
                          <>
                            {msg.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={msg.imageUrl}
                                alt=""
                                className="mb-2 max-h-56 w-full rounded-lg object-cover"
                              />
                            ) : null}
                            {msg.body ? (
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                            ) : null}
                          </>
                        )}

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] ${
                            msg.isDeleted
                              ? "text-stone-400"
                              : msg.mine
                                ? "text-amber-100"
                                : "text-stone-400"
                          }`}
                        >
                          <span>{timeLabel(msg.createdAt, locale)}</span>
                          {msg.editedAt && !msg.isDeleted ? (
                            <span>{t("chat.edited")}</span>
                          ) : null}
                        </div>

                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-amber-100 bg-white p-3">
                {pendingImage ? (
                  <div className="mb-2 flex items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pendingImage}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      className="rounded-full bg-stone-100 p-1 text-stone-600 hover:bg-stone-200"
                      onClick={() => setPendingImage(null)}
                      aria-label={t("common.remove")}
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadChatImage(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading || sending}
                    onClick={() => fileRef.current?.click()}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                    aria-label={t("chat.attachPhoto")}
                  >
                    <HiOutlinePhoto className="h-5 w-5" />
                  </button>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={1}
                    placeholder={t("chat.placeholder")}
                    className="max-h-28 min-h-[42px] flex-1 resize-y rounded-xl border border-amber-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={
                      sending ||
                      uploading ||
                      (!draft.trim() && !pendingImage)
                    }
                    className="shrink-0"
                  >
                    <HiOutlinePaperAirplane className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <DeliveryPartnerViewModal
        partner={viewingPartner}
        onClose={() => setViewingPartner(null)}
        onCall={(partner) => {
          setViewingPartner(null);
          setCallingPartner(partner);
        }}
      />
      <ContactCallModal
        partner={callingPartner}
        onClose={() => setCallingPartner(null)}
      />
    </div>
  );
}
