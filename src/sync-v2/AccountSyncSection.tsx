import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { useStore } from "../store";
import { getLanguage } from "../i18n";
import { useQuestTheme } from "../design/useQuestTheme";
import {
  QuestGroupedSurface,
  QuestSectionHeader,
} from "../components/ui/QuestPrimitives";
import QuestInput from "../components/ui/QuestInput";
import QuestButton from "../components/ui/QuestButton";
import { authConfigured, authService, supabaseClient } from "./supabase";
import {
  clearLocalReplica,
  getSyncEngine,
  readSyncState,
  requestSync,
} from "./runtime";
import { syncCopy as c } from "./copy";
import type { IdentitySession } from "./auth";
import type { SyncState } from "./contracts";
import { useInteractionBusyState } from '../components/AsyncInteractionBoundary';

export default function AccountSyncSection() {
  const { data, localPersistence } = useStore();
  const pendingLocal = useRef(localPersistence?.pending ?? 0);
  pendingLocal.current = localPersistence?.pending ?? 0;
  const lang = getLanguage(data.settings.language);
  const q = useQuestTheme(data.settings.selectedThemeId);
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [snapshot, setSnapshot] = useState<SyncState | null>(null);
  const [status, setStatus] = useState<
    "signedOut" | "idle" | "syncing" | "offline" | "error" | "conflict"
  >("signedOut");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useInteractionBusyState();
  const [failed, setFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    const refresh = async () => {
      const [engine, state, identity] = await Promise.all([
        getSyncEngine(),
        readSyncState(),
        authService.getSession(),
      ]);
      if (active) {
        setSnapshot(state);
        setStatus(engine.status);
        setSession(identity);
        setLinkFailed(engine.lastError === 'auth_link_failed');
      }
    };
    void getSyncEngine().then((engine) => {
      if (active) {
        stop = engine.subscribe(() => void refresh().catch(() => undefined));
        void refresh().catch(() => {
          if (active) setFailed(true);
        });
      }
    });
    const authStop = authService.subscribe(() =>
      setTimeout(() => void refresh().catch(() => undefined), 0),
    );
    return () => {
      active = false;
      stop?.();
      authStop();
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (session)
      void supabaseClient()
        .from("questlife_sync_devices")
        .select("platform,name")
        .eq("user_id", session.userId)
        .then(({ data: rows, error }) => {
          if (active && !error)
            setDevices((rows ?? []).map((row) => row.name || row.platform));
        });
    else setDevices([]);
    return () => {
      active = false;
    };
  }, [session?.userId, snapshot?.lastSuccessAt]);
  const run = async (job: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await job();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const note = (text: string) => (
    <Text
      style={{
        color: q.colors.textSecondary,
        fontSize: q.typography.captionSize,
        lineHeight: q.typography.bodyLineHeight,
      }}
    >
      {text}
    </Text>
  );
  const blocked =
    !!session && !!snapshot?.ownerId && session.userId !== snapshot.ownerId;
  const confirmClear = () => {
    if (pendingLocal.current) return;
    const execute = () => { if (!pendingLocal.current) void run(() => clearLocalReplica(true)); };
    if (Platform.OS === "web") {
      if (window.confirm(c(lang, "clearWarning"))) execute();
    } else
      Alert.alert(c(lang, "clearLocal"), c(lang, "clearWarning"), [
        { text: c(lang, "cancel"), style: "cancel" },
        { text: c(lang, "clearLocal"), style: "destructive", onPress: execute },
      ]);
  };
  return (
    <View style={{ gap: q.spacing.sm, paddingVertical: q.spacing.md }}>
      <QuestSectionHeader questTheme={q} title={c(lang, "account")} />
      {!authConfigured() ? (
        note(c(lang, "unconfigured"))
      ) : (
        <QuestGroupedSurface questTheme={q}>
          <View style={{ gap: q.spacing.sm, padding: q.spacing.md }}>
            {!session ? (
              <>
                <QuestInput
                  questTheme={q}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={c(lang, "email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <QuestButton
                  questTheme={q}
                  label={c(lang, "request")}
                  loading={busy}
                  onPress={() =>
                    void run(async () => {
                      await authService.requestOtp(email);
                      setSent(true);
                    })
                  }
                />
                {sent ? (
                  <>
                    {note(c(lang, "sent"))}
                    <QuestInput
                      questTheme={q}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder={c(lang, "otp")}
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      maxLength={10}
                    />
                    <QuestButton
                      questTheme={q}
                      loading={busy}
                      label={c(lang, "verify")}
                      onPress={() =>
                        void run(async () => {
                          await authService.verifyOtp(email, otp);
                          setOtp("");
                        })
                      }
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                {note(session.email?.replace(/^(.).+(@.*)$/, "$1***$2") ?? "")}
                {note(
                  c(
                    lang,
                    blocked
                      ? "accountBlocked"
                      : status === "idle" && !snapshot?.lastSuccessAt
                        ? "never"
                        : status,
                  ),
                )}
                {note(
                  `${c(lang, "lastSync")}: ${snapshot?.lastSuccessAt ? new Date(snapshot.lastSuccessAt).toLocaleString(lang) : c(lang, "never")}`,
                )}
                {note(`${c(lang, "pending")}: ${snapshot?.outbox.length ?? 0}`)}
                {devices.length
                  ? note(`${c(lang, "devices")}: ${devices.join(" · ")}`)
                  : null}
                <QuestButton
                  questTheme={q}
                  disabled={blocked || status === "syncing"}
                  label={c(lang, "sync")}
                  onPress={() => requestSync(true)}
                />
                <View
                  style={{
                    flexDirection: "row",
                    gap: q.spacing.sm,
                    alignItems: "center",
                    minHeight: 44,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: q.colors.text,
                      fontSize: q.typography.bodySize,
                    }}
                  >
                    {c(lang, "health")}
                  </Text>
                  <Switch
                    disabled={blocked || busy}
                    accessibilityLabel={c(lang, "health")}
                    value={snapshot?.healthConsent ?? false}
                    onValueChange={(value) =>
                      void run(async () => {
                        await (await getSyncEngine()).setHealthConsent(value);
                        requestSync();
                      })
                    }
                  />
                </View>
                {note(c(lang, "healthNote"))}
                {note(c(lang, "healthOff"))}
                {snapshot?.conflicts
                  .filter((item) => item.resolution === "pending")
                  .map((item) => (
                    <View key={item.id} style={{ gap: q.spacing.sm }}>
                      <QuestButton
                        questTheme={q}
                        variant="secondary"
                        label={`${c(lang, "inspect")} · ${item.entityType}`}
                        onPress={() =>
                          setOpen(open === item.id ? null : item.id)
                        }
                      />
                      {open === item.id ? (
                        <>
                          {note(
                            `${c(lang, "local")}: ${JSON.stringify(item.local.at(-1)?.payload ?? null)}`,
                          )}
                          {note(
                            `${c(lang, "remote")}: ${JSON.stringify(item.remote.payload)}`,
                          )}
                          <QuestButton
                            questTheme={q}
                            disabled={blocked || busy}
                            label={c(lang, "keepRemote")}
                            onPress={() =>
                              void run(async () => {
                                await (
                                  await getSyncEngine()
                                ).resolve(item.id, "remote");
                                requestSync();
                              })
                            }
                          />
                          <QuestButton
                            questTheme={q}
                            disabled={blocked || busy}
                            variant="secondary"
                            label={c(lang, "keepLocal")}
                            onPress={() =>
                              void run(async () => {
                                await (
                                  await getSyncEngine()
                                ).resolve(item.id, "local");
                                requestSync();
                              })
                            }
                          />
                        </>
                      ) : null}
                    </View>
                  ))}
                <QuestButton
                  questTheme={q}
                  variant="ghost"
                  loading={busy}
                  label={c(lang, "signOut")}
                  onPress={() =>
                    void run(async () => {
                      (await getSyncEngine()).detach();
                      await authService.signOut();
                    })
                  }
                />
              </>
            )}
            {note(c(lang, "privacy"))}
            {linkFailed ? note(c(lang, 'linkFailed')) : null}
            {!session && snapshot?.ownerId ? (
              <QuestButton
                questTheme={q}
                variant="ghost"
                disabled={
                  busy ||
                  !!localPersistence?.pending ||
                  !!snapshot.outbox.length ||
                  snapshot.conflicts.some(
                    (item) => item.resolution === "pending",
                  )
                }
                label={c(lang, "clearLocal")}
                onPress={confirmClear}
              />
            ) : null}
            {!session && snapshot?.ownerId ? note(c(lang, "clearLimit")) : null}
            {failed ? (
              <Text
                accessibilityRole="alert"
                style={{
                  color: q.colors.text,
                  fontSize: q.typography.bodySize,
                }}
              >
                {c(lang, "failure")}
              </Text>
            ) : null}
          </View>
        </QuestGroupedSurface>
      )}
    </View>
  );
}
