import type { EnMessages } from "@/lib/i18n/messages/en";

type MessageKey = keyof EnMessages;

type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;
export function buildAppDownloadPartnerMessage({
  businessName,
  shareUrl,
  username,
  password,
  t,
}: {
  businessName: string;
  shareUrl: string;
  username: string;
  password: string;
  t: Translate;
}) {
  return [
    t("settings.appDownloadMessageTitle", { businessName }),
    "",
    t("settings.appDownloadMessageIntro"),
    "",
    t("settings.appDownloadMessageLink", { url: shareUrl }),
    t("settings.appDownloadMessageUsername", { username }),
    t("settings.appDownloadMessagePassword", { password }),
    "",
    t("settings.appDownloadMessageSteps"),
    t("settings.appDownloadMessageStep1"),
    t("settings.appDownloadMessageStep2"),
    t("settings.appDownloadMessageStep3"),
    "",
    t("settings.appDownloadMessageThanks"),
  ].join("\n");
}
