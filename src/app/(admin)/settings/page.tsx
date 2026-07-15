"use client";

import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineBuildingStorefront,
  HiOutlineCog6Tooth,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineIdentification,
  HiOutlineLink,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineUserCircle,
} from "react-icons/hi2";

import { useBusinessSettings } from "@/components/BusinessSettingsProvider";
import { BillPreview } from "@/components/BillPreview";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getAppDownloadSettings,
  getMe,
  updateAppDownloadSettings,
  updateBusinessSettings,
  updateProfile,
  type AppDownloadSettings,
} from "@/lib/api";
import { useT } from "@/lib/i18n";

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <p className="bakery-field-caption flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
      {children}
    </p>
  );
}

function BentoCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className = "",
  accent = "white",
}: {
  icon: IconType;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: "white" | "gradient";
}) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm ${className}`}
    >
      <div
        className={`flex items-start justify-between gap-3 border-b border-amber-100 px-4 py-3 ${
          accent === "gradient"
            ? "bg-gradient-to-r from-amber-600 to-orange-500 text-white"
            : "bg-amber-50/70"
        }`}
      >
        <div className="min-w-0">
          <h2
            className={`flex items-center gap-2 text-base font-semibold ${
              accent === "gradient" ? "text-white" : "text-black"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                accent === "gradient" ? "text-amber-100" : "text-amber-700"
              }`}
              aria-hidden
            />
            {title}
          </h2>
          <p
            className={`mt-0.5 text-xs leading-snug ${
              accent === "gradient" ? "text-amber-100" : "text-stone-600"
            }`}
          >
            {description}
          </p>
        </div>
        <div className="shrink-0">{action ?? null}</div>
      </div>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </article>
  );
}

function InfoTile({
  icon,
  label,
  value,
  className = "",
}: {
  icon: IconType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-amber-100 bg-amber-50/40 p-3 ${className}`}
    >
      <FieldLabel icon={icon}>{label}</FieldLabel>
      <p className="bakery-field-value mt-1 text-sm">{value}</p>
    </div>
  );
}

export default function SettingsPage() {
  const t = useT();
  const { settings, setSettings } = useBusinessSettings();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("admin");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState("");
  const [accountEditOpen, setAccountEditOpen] = useState(false);
  const [businessEditOpen, setBusinessEditOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editBusinessAddress, setEditBusinessAddress] = useState("");
  const [editBusinessPhone, setEditBusinessPhone] = useState("");
  const [editBusinessEmail, setEditBusinessEmail] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [appDownload, setAppDownload] = useState<AppDownloadSettings | null>(
    null,
  );
  const [appDownloadEditOpen, setAppDownloadEditOpen] = useState(false);
  const [editDownloadUsername, setEditDownloadUsername] = useState("");
  const [editDownloadPassword, setEditDownloadPassword] = useState("");
  const [editDownloadUrl, setEditDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadProfile();
    void loadAppDownloadSettings();
  }, []);

  async function loadAppDownloadSettings() {
    try {
      setAppDownload(await getAppDownloadSettings());
    } catch {
      setAppDownload(null);
    }
  }

  async function loadProfile() {
    const data = await getMe();
    setName(data.user.name);
    setEmail(data.user.email);
    setPhone(data.phone ?? "");
    setRole(data.user.role);
    setImageUrl(data.imageUrl ?? null);
    setOriginalEmail(data.user.email);
  }

  function openAccountEditModal() {
    setEditName(name);
    setEditEmail(email);
    setEditPhone(phone);
    setEditImageUrl(imageUrl);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setAccountEditOpen(true);
  }

  function openBusinessEditModal() {
    setEditBusinessName(settings.businessName);
    setEditBusinessAddress(settings.address);
    setEditBusinessPhone(settings.phone);
    setEditBusinessEmail(settings.email ?? "");
    setEditOwnerName(settings.ownerName ?? "");
    setBusinessEditOpen(true);
  }

  function openAppDownloadEditModal() {
    setEditDownloadUsername(appDownload?.username ?? "");
    setEditDownloadPassword("");
    setEditDownloadUrl(appDownload?.downloadUrl ?? "");
    setAppDownloadEditOpen(true);
  }

  async function copyShareUrl() {
    if (!appDownload?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(appDownload.shareUrl);
      toast.success(t("settings.linkCopiedToast"));
    } catch {
      toast.error(t("settings.copyFailedToast"));
    }
  }

  async function handleAccountSave() {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error(t("settings.passwordsMismatch"));
      return;
    }

    const changingCredentials =
      newPassword.length > 0 || editEmail.trim() !== originalEmail;

    if (changingCredentials && !currentPassword) {
      toast.error(t("settings.currentPasswordRequired"));
      return;
    }

    setLoading(true);

    try {
      const result = await updateProfile({
        currentPassword: currentPassword || undefined,
        email: editEmail.trim(),
        name: editName.trim(),
        phone: editPhone.trim(),
        password: newPassword || undefined,
        imageUrl: editImageUrl,
      });

      setName(result.user.name);
      setEmail(result.user.email);
      setPhone(result.phone ?? "");
      setImageUrl(result.imageUrl ?? null);
      setOriginalEmail(result.user.email);
      setAccountEditOpen(false);
      toast.success(t("settings.accountUpdatedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleBusinessSave() {
    setLoading(true);

    try {
      const updated = await updateBusinessSettings({
        businessName: editBusinessName.trim(),
        address: editBusinessAddress.trim(),
        phone: editBusinessPhone.trim(),
        email: editBusinessEmail.trim() || null,
        ownerName: editOwnerName.trim() || null,
      });

      setSettings(updated);
      setBusinessEditOpen(false);
      toast.success(t("settings.businessUpdatedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleAppDownloadSave() {
    setLoading(true);

    try {
      const updated = await updateAppDownloadSettings({
        username: editDownloadUsername.trim(),
        password: editDownloadPassword.trim() || undefined,
        downloadUrl: editDownloadUrl.trim(),
      });

      setAppDownload(updated);
      setAppDownloadEditOpen(false);
      toast.success(t("settings.appDownloadUpdatedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <BentoCard
          icon={HiOutlineBuildingStorefront}
          title={t("settings.businessDetails")}
          description={t("settings.businessDetailsDescription")}
          action={
            <Button variant="secondary" onClick={openBusinessEditModal}>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <HiOutlinePencilSquare className="h-4 w-4" />
                {t("common.edit")}
              </span>
            </Button>
          }
        >
          <div className="mb-3 rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3">
            <p className="text-lg font-bold text-black">
              {settings.businessName || "Bakery"}
            </p>
            {settings.ownerName ? (
              <p className="text-sm text-stone-600">{settings.ownerName}</p>
            ) : null}
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <InfoTile
              className="sm:col-span-2"
              icon={HiOutlineMapPin}
              label={t("common.address")}
              value={
                <span className="whitespace-pre-line">
                  {settings.address || "—"}
                </span>
              }
            />
            <InfoTile
              icon={HiOutlinePhone}
              label={t("common.phone")}
              value={settings.phone || "—"}
            />
            <InfoTile
              icon={HiOutlineEnvelope}
              label={t("common.email")}
              value={settings.email || "—"}
            />
            <InfoTile
              className="sm:col-span-2"
              icon={HiOutlineIdentification}
              label={t("settings.ownerName")}
              value={settings.ownerName || "—"}
            />
          </div>
        </BentoCard>

        <BentoCard
          icon={HiOutlineUserCircle}
          title={t("settings.account")}
          description={t("settings.accountDescription")}
          accent="gradient"
          action={
            <Button
              variant="secondary"
              onClick={openAccountEditModal}
              className="border-white/30 bg-white/15 text-white hover:bg-white/25"
            >
              <span className="inline-flex items-center gap-1.5 text-sm">
                <HiOutlinePencilSquare className="h-4 w-4" />
                {t("common.edit")}
              </span>
            </Button>
          }
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/40 bg-white/20">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <HiOutlineUser className="h-7 w-7 text-white" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-black">
                {name || t("common.admin")}
              </p>
              <p className="truncate text-sm text-stone-600">{email || "—"}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
                <HiOutlineCog6Tooth className="h-3 w-3" />
                {role}
              </span>
            </div>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <InfoTile
              icon={HiOutlineUser}
              label={t("deliveryGuys.formFullName")}
              value={name || "—"}
            />
            <InfoTile
              icon={HiOutlineEnvelope}
              label={t("common.email")}
              value={email || "—"}
            />
            <InfoTile
              icon={HiOutlinePhone}
              label={t("common.phone")}
              value={phone || "—"}
            />
            <InfoTile
              icon={HiOutlineCog6Tooth}
              label={t("settings.role")}
              value={<span className="capitalize">{role}</span>}
            />
          </div>
        </BentoCard>

        <BentoCard
          icon={HiOutlineDevicePhoneMobile}
          title={t("settings.appDownload")}
          description={t("settings.appDownloadDescription")}
          action={
            <Button variant="secondary" onClick={openAppDownloadEditModal}>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <HiOutlinePencilSquare className="h-4 w-4" />
                {t("common.configure")}
              </span>
            </Button>
          }
        >
          <div className="grid flex-1 gap-3">
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <FieldLabel icon={HiOutlineLink}>
                {t("settings.shareLink")}
              </FieldLabel>
              <div className="mt-1 flex flex-col gap-2">
                <p className="bakery-field-value line-clamp-2 break-all text-sm">
                  {appDownload?.shareUrl ?? "—"}
                </p>
                {appDownload?.shareUrl ? (
                  <Button
                    variant="secondary"
                    onClick={() => void copyShareUrl()}
                    className="w-full"
                  >
                    {t("common.copy")}
                  </Button>
                ) : null}
              </div>
            </div>
            <InfoTile
              icon={HiOutlineUser}
              label={t("settings.downloadUsername")}
              value={appDownload?.username || "—"}
            />
            <InfoTile
              icon={HiOutlineCog6Tooth}
              label={t("common.status")}
              value={
                appDownload?.enabled
                  ? t("settings.appStatusReady")
                  : t("settings.appStatusNotConfigured")
              }
            />
          </div>
        </BentoCard>

        <BentoCard
          icon={HiOutlineDocumentText}
          title={t("settings.billPreview")}
          description={t("settings.billPreviewDescription")}
          action={
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900">
              Sample
            </span>
          }
        >
          <BillPreview settings={settings} className="mx-auto max-w-full" />
          <p className="mt-3 text-center text-[10px] leading-snug text-stone-500">
            {t("settings.billPreviewHint")}
          </p>
        </BentoCard>
      </div>

      <Modal
        open={businessEditOpen}
        title={t("settings.editBusinessTitle")}
        onClose={() => setBusinessEditOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setBusinessEditOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={() => void handleBusinessSave()}
              disabled={loading}
            >
              {loading
                ? t("common.saving")
                : t("settings.saveBusinessDetails")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t("settings.businessName")}
            required
            value={editBusinessName}
            onChange={(e) => setEditBusinessName(e.target.value)}
            placeholder={t("settings.businessNamePlaceholder")}
          />
          <Textarea
            label={t("settings.address")}
            required
            value={editBusinessAddress}
            onChange={(e) => setEditBusinessAddress(e.target.value)}
            placeholder={t("settings.addressPlaceholder")}
          />
          <Input
            label={t("settings.phone")}
            required
            value={editBusinessPhone}
            onChange={(e) => setEditBusinessPhone(e.target.value)}
            placeholder={t("settings.phonePlaceholder")}
          />
          <Input
            label={t("settings.email")}
            type="email"
            value={editBusinessEmail}
            onChange={(e) => setEditBusinessEmail(e.target.value)}
            placeholder={t("common.optional")}
          />
          <Input
            label={t("settings.ownerName")}
            value={editOwnerName}
            onChange={(e) => setEditOwnerName(e.target.value)}
            placeholder={t("settings.ownerNamePlaceholder")}
          />
        </div>
      </Modal>

      <Modal
        open={appDownloadEditOpen}
        title={t("settings.appDownloadModalTitle")}
        onClose={() => setAppDownloadEditOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setAppDownloadEditOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={() => void handleAppDownloadSave()}
              disabled={loading}
            >
              {loading
                ? t("common.saving")
                : t("settings.saveDownloadSettings")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            {t("settings.appDownloadCredentialsHint")}
          </p>
          <Input
            label={t("settings.downloadUsername")}
            required
            value={editDownloadUsername}
            onChange={(e) => setEditDownloadUsername(e.target.value)}
            placeholder={t("settings.downloadUsernamePlaceholder")}
          />
          <Input
            label={
              appDownload?.hasPassword
                ? t("settings.downloadPasswordKeepCurrent")
                : t("settings.downloadPassword")
            }
            type="password"
            required={!appDownload?.hasPassword}
            minLength={6}
            value={editDownloadPassword}
            onChange={(e) => setEditDownloadPassword(e.target.value)}
          />
          <Input
            label={t("settings.apkLink")}
            required
            value={editDownloadUrl}
            onChange={(e) => setEditDownloadUrl(e.target.value)}
            placeholder={t("settings.apkLinkPlaceholder")}
          />
          <p className="text-xs text-stone-500">{t("settings.apkLinkHelp")}</p>
        </div>
      </Modal>

      <Modal
        open={accountEditOpen}
        title={t("settings.editAccountTitle")}
        onClose={() => setAccountEditOpen(false)}
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setAccountEditOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={() => void handleAccountSave()}
              disabled={loading}
            >
              {loading ? t("common.saving") : t("common.saveChanges")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <ImageUpload
            label={t("settings.profilePhoto")}
            value={editImageUrl}
            onChange={setEditImageUrl}
          />
          <Input
            label={t("settings.formName")}
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label={t("common.email")}
            required
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <Input
            label={t("common.phone")}
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />

          <hr className="border-amber-100" />

          <p className="text-sm text-stone-600">
            {t("settings.passwordChangeHint")}
          </p>
          <Input
            label={t("settings.currentPassword")}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label={t("settings.newPassword")}
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t("settings.newPasswordPlaceholder")}
          />
          <Input
            label={t("settings.confirmNewPassword")}
            type="password"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
