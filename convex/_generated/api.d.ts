/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as TelegramOTP from "../TelegramOTP.js";
import type * as WhatsAppOTP from "../WhatsAppOTP.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as bloodPressure_createReading from "../bloodPressure/createReading.js";
import type * as bloodPressure_deleteReading from "../bloodPressure/deleteReading.js";
import type * as bloodPressure_getAllReadings from "../bloodPressure/getAllReadings.js";
import type * as bloodPressure_getMonthReadings from "../bloodPressure/getMonthReadings.js";
import type * as bloodPressure_getWeekReadings from "../bloodPressure/getWeekReadings.js";
import type * as foods_createFood from "../foods/createFood.js";
import type * as foods_getFoodByIdentity from "../foods/getFoodByIdentity.js";
import type * as foods_getFoodByIdentityInternal from "../foods/getFoodByIdentityInternal.js";
import type * as foods_ingestFoods from "../foods/ingestFoods.js";
import type * as foods_updateFoodHealthScore from "../foods/updateFoodHealthScore.js";
import type * as foods_updateFoodTranslation from "../foods/updateFoodTranslation.js";
import type * as foods_upsertFoods from "../foods/upsertFoods.js";
import type * as glucose_createReading from "../glucose/createReading.js";
import type * as glucose_deleteReading from "../glucose/deleteReading.js";
import type * as glucose_getAllReadings from "../glucose/getAllReadings.js";
import type * as glucose_getMonthReadings from "../glucose/getMonthReadings.js";
import type * as glucose_getWeekReadings from "../glucose/getWeekReadings.js";
import type * as glucose_importHealthKitReadings from "../glucose/importHealthKitReadings.js";
import type * as home_getStreak from "../home/getStreak.js";
import type * as http from "../http.js";
import type * as mealItems_getMealItem from "../mealItems/getMealItem.js";
import type * as mealItems_updateMealItem from "../mealItems/updateMealItem.js";
import type * as meals_analyze_analyzeMealBarcode from "../meals/analyze/analyzeMealBarcode.js";
import type * as meals_analyze_analyzeMealConfig from "../meals/analyze/analyzeMealConfig.js";
import type * as meals_analyze_calculateHealthScore from "../meals/analyze/calculateHealthScore.js";
import type * as meals_analyze_correctMeal from "../meals/analyze/correctMeal.js";
import type * as meals_analyze_correctMealItems from "../meals/analyze/correctMealItems.js";
import type * as meals_analyze_detectMealFromPhoto from "../meals/analyze/detectMealFromPhoto.js";
import type * as meals_analyze_detectMealFromText from "../meals/analyze/detectMealFromText.js";
import type * as meals_analyze_detectMealItems from "../meals/analyze/detectMealItems.js";
import type * as meals_analyze_detectMealItemsFromText from "../meals/analyze/detectMealItemsFromText.js";
import type * as meals_analyze_nameMeal from "../meals/analyze/nameMeal.js";
import type * as meals_analyze_processDetectedItems from "../meals/analyze/processDetectedItems.js";
import type * as meals_analyze_processDetectedItemsAction from "../meals/analyze/processDetectedItemsAction.js";
import type * as meals_analyze_searchFdcCandidates from "../meals/analyze/searchFdcCandidates.js";
import type * as meals_analyze_selectCandidates from "../meals/analyze/selectCandidates.js";
import type * as meals_analyze_translateFood from "../meals/analyze/translateFood.js";
import type * as meals_confirmMeal from "../meals/confirmMeal.js";
import type * as meals_createMeal from "../meals/createMeal.js";
import type * as meals_getMeal from "../meals/getMeal.js";
import type * as meals_getMonthMeals from "../meals/getMonthMeals.js";
import type * as meals_getWeekMeals from "../meals/getWeekMeals.js";
import type * as meals_replaceMealItems from "../meals/replaceMealItems.js";
import type * as meals_replaceMealItemsInternal from "../meals/replaceMealItemsInternal.js";
import type * as meals_retryProcessDetectedItems from "../meals/retryProcessDetectedItems.js";
import type * as meals_updateMeal from "../meals/updateMeal.js";
import type * as meals_updateMealInternal from "../meals/updateMealInternal.js";
import type * as meals_updateMealTotals from "../meals/updateMealTotals.js";
import type * as migrations from "../migrations.js";
import type * as movement_getMonthMovement from "../movement/getMonthMovement.js";
import type * as movement_getWeekMovement from "../movement/getWeekMovement.js";
import type * as movement_syncDays from "../movement/syncDays.js";
import type * as nutrition_computeNutritionTargets from "../nutrition/computeNutritionTargets.js";
import type * as observers_generateCode from "../observers/generateCode.js";
import type * as observers_getMyObservers from "../observers/getMyObservers.js";
import type * as observers_getObservedPatients from "../observers/getObservedPatients.js";
import type * as observers_getPatientToday from "../observers/getPatientToday.js";
import type * as observers_redeemCode from "../observers/redeemCode.js";
import type * as observers_regenerateCode from "../observers/regenerateCode.js";
import type * as observers_revokeLink from "../observers/revokeLink.js";
import type * as observers_utils_thresholds from "../observers/utils/thresholds.js";
import type * as profiles_completeOnboarding from "../profiles/completeOnboarding.js";
import type * as profiles_getProfile from "../profiles/getProfile.js";
import type * as profiles_syncSubscriptionStatus from "../profiles/syncSubscriptionStatus.js";
import type * as profiles_updateProStatus from "../profiles/updateProStatus.js";
import type * as profiles_updateProfile from "../profiles/updateProfile.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reports_getMonthlyReport from "../reports/getMonthlyReport.js";
import type * as storage_generateUploadUrl from "../storage/generateUploadUrl.js";
import type * as tables_badges from "../tables/badges.js";
import type * as tables_bloodPressureReadings from "../tables/bloodPressureReadings.js";
import type * as tables_foods from "../tables/foods.js";
import type * as tables_glucoseReadings from "../tables/glucoseReadings.js";
import type * as tables_mealItems from "../tables/mealItems.js";
import type * as tables_meals from "../tables/meals.js";
import type * as tables_movementData from "../tables/movementData.js";
import type * as tables_observerLinks from "../tables/observerLinks.js";
import type * as tables_profiles from "../tables/profiles.js";
import type * as tables_pushTokens from "../tables/pushTokens.js";
import type * as testing_getOrCreateTestUser from "../testing/getOrCreateTestUser.js";
import type * as users_deleteUser from "../users/deleteUser.js";
import type * as utils_backfillFoodEmbeddings from "../utils/backfillFoodEmbeddings.js";
import type * as utils_countFoodEmbeddings from "../utils/countFoodEmbeddings.js";
import type * as utils_localDayBoundaries from "../utils/localDayBoundaries.js";
import type * as utils_localMonthBounds from "../utils/localMonthBounds.js";
import type * as utils_localWeekBounds from "../utils/localWeekBounds.js";
import type * as utils_observerAuth from "../utils/observerAuth.js";
import type * as utils_otp from "../utils/otp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  TelegramOTP: typeof TelegramOTP;
  WhatsAppOTP: typeof WhatsAppOTP;
  ai: typeof ai;
  auth: typeof auth;
  "bloodPressure/createReading": typeof bloodPressure_createReading;
  "bloodPressure/deleteReading": typeof bloodPressure_deleteReading;
  "bloodPressure/getAllReadings": typeof bloodPressure_getAllReadings;
  "bloodPressure/getMonthReadings": typeof bloodPressure_getMonthReadings;
  "bloodPressure/getWeekReadings": typeof bloodPressure_getWeekReadings;
  "foods/createFood": typeof foods_createFood;
  "foods/getFoodByIdentity": typeof foods_getFoodByIdentity;
  "foods/getFoodByIdentityInternal": typeof foods_getFoodByIdentityInternal;
  "foods/ingestFoods": typeof foods_ingestFoods;
  "foods/updateFoodHealthScore": typeof foods_updateFoodHealthScore;
  "foods/updateFoodTranslation": typeof foods_updateFoodTranslation;
  "foods/upsertFoods": typeof foods_upsertFoods;
  "glucose/createReading": typeof glucose_createReading;
  "glucose/deleteReading": typeof glucose_deleteReading;
  "glucose/getAllReadings": typeof glucose_getAllReadings;
  "glucose/getMonthReadings": typeof glucose_getMonthReadings;
  "glucose/getWeekReadings": typeof glucose_getWeekReadings;
  "glucose/importHealthKitReadings": typeof glucose_importHealthKitReadings;
  "home/getStreak": typeof home_getStreak;
  http: typeof http;
  "mealItems/getMealItem": typeof mealItems_getMealItem;
  "mealItems/updateMealItem": typeof mealItems_updateMealItem;
  "meals/analyze/analyzeMealBarcode": typeof meals_analyze_analyzeMealBarcode;
  "meals/analyze/analyzeMealConfig": typeof meals_analyze_analyzeMealConfig;
  "meals/analyze/calculateHealthScore": typeof meals_analyze_calculateHealthScore;
  "meals/analyze/correctMeal": typeof meals_analyze_correctMeal;
  "meals/analyze/correctMealItems": typeof meals_analyze_correctMealItems;
  "meals/analyze/detectMealFromPhoto": typeof meals_analyze_detectMealFromPhoto;
  "meals/analyze/detectMealFromText": typeof meals_analyze_detectMealFromText;
  "meals/analyze/detectMealItems": typeof meals_analyze_detectMealItems;
  "meals/analyze/detectMealItemsFromText": typeof meals_analyze_detectMealItemsFromText;
  "meals/analyze/nameMeal": typeof meals_analyze_nameMeal;
  "meals/analyze/processDetectedItems": typeof meals_analyze_processDetectedItems;
  "meals/analyze/processDetectedItemsAction": typeof meals_analyze_processDetectedItemsAction;
  "meals/analyze/searchFdcCandidates": typeof meals_analyze_searchFdcCandidates;
  "meals/analyze/selectCandidates": typeof meals_analyze_selectCandidates;
  "meals/analyze/translateFood": typeof meals_analyze_translateFood;
  "meals/confirmMeal": typeof meals_confirmMeal;
  "meals/createMeal": typeof meals_createMeal;
  "meals/getMeal": typeof meals_getMeal;
  "meals/getMonthMeals": typeof meals_getMonthMeals;
  "meals/getWeekMeals": typeof meals_getWeekMeals;
  "meals/replaceMealItems": typeof meals_replaceMealItems;
  "meals/replaceMealItemsInternal": typeof meals_replaceMealItemsInternal;
  "meals/retryProcessDetectedItems": typeof meals_retryProcessDetectedItems;
  "meals/updateMeal": typeof meals_updateMeal;
  "meals/updateMealInternal": typeof meals_updateMealInternal;
  "meals/updateMealTotals": typeof meals_updateMealTotals;
  migrations: typeof migrations;
  "movement/getMonthMovement": typeof movement_getMonthMovement;
  "movement/getWeekMovement": typeof movement_getWeekMovement;
  "movement/syncDays": typeof movement_syncDays;
  "nutrition/computeNutritionTargets": typeof nutrition_computeNutritionTargets;
  "observers/generateCode": typeof observers_generateCode;
  "observers/getMyObservers": typeof observers_getMyObservers;
  "observers/getObservedPatients": typeof observers_getObservedPatients;
  "observers/getPatientToday": typeof observers_getPatientToday;
  "observers/redeemCode": typeof observers_redeemCode;
  "observers/regenerateCode": typeof observers_regenerateCode;
  "observers/revokeLink": typeof observers_revokeLink;
  "observers/utils/thresholds": typeof observers_utils_thresholds;
  "profiles/completeOnboarding": typeof profiles_completeOnboarding;
  "profiles/getProfile": typeof profiles_getProfile;
  "profiles/syncSubscriptionStatus": typeof profiles_syncSubscriptionStatus;
  "profiles/updateProStatus": typeof profiles_updateProStatus;
  "profiles/updateProfile": typeof profiles_updateProfile;
  rateLimit: typeof rateLimit;
  "reports/getMonthlyReport": typeof reports_getMonthlyReport;
  "storage/generateUploadUrl": typeof storage_generateUploadUrl;
  "tables/badges": typeof tables_badges;
  "tables/bloodPressureReadings": typeof tables_bloodPressureReadings;
  "tables/foods": typeof tables_foods;
  "tables/glucoseReadings": typeof tables_glucoseReadings;
  "tables/mealItems": typeof tables_mealItems;
  "tables/meals": typeof tables_meals;
  "tables/movementData": typeof tables_movementData;
  "tables/observerLinks": typeof tables_observerLinks;
  "tables/profiles": typeof tables_profiles;
  "tables/pushTokens": typeof tables_pushTokens;
  "testing/getOrCreateTestUser": typeof testing_getOrCreateTestUser;
  "users/deleteUser": typeof users_deleteUser;
  "utils/backfillFoodEmbeddings": typeof utils_backfillFoodEmbeddings;
  "utils/countFoodEmbeddings": typeof utils_countFoodEmbeddings;
  "utils/localDayBoundaries": typeof utils_localDayBoundaries;
  "utils/localMonthBounds": typeof utils_localMonthBounds;
  "utils/localWeekBounds": typeof utils_localWeekBounds;
  "utils/observerAuth": typeof utils_observerAuth;
  "utils/otp": typeof utils_otp;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
};
