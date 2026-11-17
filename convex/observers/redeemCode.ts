import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import logError from "@/lib/utils/logError";
import { rateLimiter } from "../rateLimit";
import {
  REDEEM_ERRORS,
  normalizeLinkStatus,
  pickEffectiveLink,
  resolveTransition,
  shouldNotifyRequest,
  type LinkStatus,
  type RedeemErrorCode,
} from "@/lib/observers/linkStatus";
import { PUSH_CATALOG } from "@/lib/notifications/pushCatalog";
import { isQuietHours } from "@/lib/notifications/pushRules";
import { pickLatestTokenRows } from "@/lib/notifications/tokenDedupe";
import { loadPairLinks, patchPairLinks } from "./utils/pairLinks";

const CODE_FORMAT = /^\d{5}$/;

type RedeemResult =
  | { ok: true; linkId: Id<"observerLinks">; status: LinkStatus }
  | { ok: false; error: RedeemErrorCode };

const redeemCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }): Promise<RedeemResult> => {
    try {
      const observerId = await getAuthUserId(ctx);
      if (observerId === null) throw new Error("Unauthorized");

      // Валидация формы кода до любого обращения к базе и до лимитов —
      // ничего не списывается, ответ неотличим от «нет такого кода».
      if (!CODE_FORMAT.test(code)) {
        return { ok: false, error: REDEEM_ERRORS.notFound };
      }

      // Два независимых лимита, оба до поиска профиля:
      // - по observerId — ограничивает одного вызывающего;
      // - по самому коду — ограничивает попытки против ОДНОГО кода
      //   независимо от числа аккаунтов, которыми его перебирают
      //   (5-значный код — 100 000 значений, per-account лимит один
      //   тривиально обходится созданием новых аккаунтов).
      await rateLimiter.limit(ctx, "observerCodeRedeem", {
        key: observerId,
        throws: true,
      });
      await rateLimiter.limit(ctx, "observerCodeGuess", {
        key: code,
        throws: true,
      });

      const patientProfile = await ctx.db
        .query("profiles")
        .withIndex("byObserverCode", (q) => q.eq("observerCode", code))
        .first();
      // После списания лимитов не бросать: исключение откатывает записи
      // rate-limiter вместе с мутацией, и перебор кода перестаёт ограничиваться.
      if (!patientProfile) {
        return { ok: false, error: REDEEM_ERRORS.notFound };
      }

      const patientId = patientProfile.userId;
      // См. комментарий выше: возвращаем результат, а не бросаем.
      if (patientId === observerId) {
        return { ok: false, error: REDEEM_ERRORS.self };
      }

      const now = Date.now();
      const pairLinks = await loadPairLinks(ctx, observerId, patientId);
      const effective = pickEffectiveLink(pairLinks);
      const current = effective ? normalizeLinkStatus(effective.status) : null;
      const result = resolveTransition({
        current,
        action: "request",
        actor: "observer",
        now,
        respondedAt: effective?.respondedAt,
      });

      // D-10: текст нейтральный, слово declined в ответе не используется.
      if (result.kind === "cooldown") {
        return { ok: false, error: REDEEM_ERRORS.notAccepted };
      }
      if (result.kind === "forbidden") {
        return { ok: false, error: REDEEM_ERRORS.notFound };
      }
      // Идемпотентно (pending или active): без повторного push.
      if (result.kind === "noop") {
        if (!effective || current === null) {
          return { ok: false, error: REDEEM_ERRORS.notFound };
        }
        return { ok: true, linkId: effective._id, status: current };
      }

      let linkId: Id<"observerLinks">;
      if (!effective) {
        linkId = await ctx.db.insert("observerLinks", {
          observerId,
          patientId,
          status: "pending",
          requestedAt: now,
        });
      } else {
        // Повторный запрос после revoked разрешён сразу (допущение A4).
        await patchPairLinks(ctx, pairLinks, {
          status: "pending",
          requestedAt: now,
          respondedAt: undefined,
          confirmedAt: undefined,
          endedBy: undefined,
        });
        linkId = effective._id;
      }

      // D-01, D-02: push не чаще раза в 24 часа на пару и не в тихие часы
      // (допущение A3: бейдж и модалка всё равно сработают).
      if (shouldNotifyRequest(effective?.lastNotifiedAt, now)) {
        const tokenRows = await ctx.db
          .query("pushTokens")
          .withIndex("byUserId", (q) => q.eq("userId", patientId))
          .collect();
        const entry = PUSH_CATALOG["OBS-01"];
        const messages = pickLatestTokenRows(tokenRows)
          .keep.filter(
            (token) => !isQuietHours(now, token.timezoneOffsetMinutes)
          )
          .map((token) => ({
            expoPushToken: token.expoPushToken,
            title: entry.title,
            body: entry.texts[0],
            data: { url: entry.url },
          }));
        if (messages.length > 0) {
          await ctx.scheduler.runAfter(
            0,
            internal.notifications.sendPushNotification.default,
            { messages }
          );
          await ctx.db.patch(linkId, { lastNotifiedAt: now });
        }
      }

      return { ok: true, linkId, status: "pending" };
    } catch (error) {
      logError("redeemCode error", error);
      throw error;
    }
  },
});

export default redeemCode;
