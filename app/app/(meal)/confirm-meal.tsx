import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ScreenMain,
  ScreenMainScrollView,
} from "@/components/ui/screen/ScreenMain";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderTitle,
} from "@/components/ui/screen/ScreenHeader";
import {
  ScreenFooter,
  ScreenFooterButton,
} from "@/components/ui/screen/ScreenFooter";
import Card from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import ConfirmMealItems from "@/components/meal/ConfirmMealItems";
import cropImageToAspect from "@/lib/image/cropImageToAspect";
import processLibraryImage from "@/lib/image/processLibraryImage";
import uuidv4 from "@/lib/utils/uuidv4";
import tryCatch from "@/lib/utils/tryCatch";
import logError from "@/lib/utils/logError";

type ConfirmItem = {
  id: string;
  name: string;
  searchName?: string;
  grams: number;
};

// Convex actions не ретраятся клиентом сами — если соединение обрывается
// пока action выполняется (переключение wifi/сотовой сети, уход приложения
// в фон), запрос падает с "Connection lost while action was in flight".
// Детекция блюда не имеет побочных эффектов, поэтому один повтор безопасен.
const isTransientConnectionError = (error: unknown) =>
  error instanceof Error && error.message.includes("Connection lost");

const DETECTION_MAX_ATTEMPTS = 2;

export default function ConfirmMealScreen() {
  const dimensions = useWindowDimensions();
  const router = useRouter();
  const navigation = useNavigation();
  const { photoUri, description, source, favoriteId } = useLocalSearchParams<{
    photoUri?: string;
    description?: string;
    source?: "camera" | "library";
    favoriteId?: string;
  }>();

  const favorite = useQuery(
    api.favorites.getFavorite.default,
    favoriteId ? { favoriteId: favoriteId as Id<"favoriteMeals"> } : "skip"
  );

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl.default);
  const detectMealFromPhoto = useAction(
    api.meals.analyze.detectMealFromPhoto.default
  );
  const detectMealFromText = useAction(
    api.meals.analyze.detectMealFromText.default
  );
  const confirmMeal = useMutation(api.meals.confirmMeal.default);

  const { status } = useRateLimit(api.rateLimit.getAiFeaturesRateLimit, {
    getServerTimeMutation: api.rateLimit.getServerTime,
  });

  const [items, setItems] = useState<ConfirmItem[]>([]);
  const [mealName, setMealName] = useState("");
  const [isDetecting, setIsDetecting] = useState(!favoriteId);
  const [isPrefilling, setIsPrefilling] = useState(!!favoriteId);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photoStorageId, setPhotoStorageId] = useState<
    Id<"_storage"> | undefined
  >(undefined);

  const startedRef = useRef(false);
  const prefilledRef = useRef(false);
  const fromCamera = source === "camera";

  const uploadAndGetStorageId = useCallback(
    async (uri: string) => {
      const croppedUri = fromCamera
        ? await cropImageToAspect({ uri, dimensions })
        : await processLibraryImage(uri);

      const uploadUrl = await generateUploadUrl();
      const fileRes = await fetch(croppedUri);
      const blob = await fileRes.blob();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status}`);
      }
      const json: unknown = await uploadRes.json();
      const schema = z.object({ storageId: z.string() });
      const { data, success } = schema.safeParse(json);
      if (!success) {
        throw new Error("Upload response missing storageId");
      }
      return data.storageId as Id<"_storage">;
    },
    [dimensions, fromCamera, generateUploadUrl]
  );

  const runDetection = useCallback(async () => {
    if (startedRef.current || (!photoUri && !description)) return;
    startedRef.current = true;

    if (status && !status.ok) {
      Toast.show({
        text: "Вы достигли дневного лимита функций ИИ.",
        variant: "error",
      });
      router.replace("/app");
      return;
    }

    let storageId: Id<"_storage"> | undefined;

    for (let attempt = 1; attempt <= DETECTION_MAX_ATTEMPTS; attempt++) {
      try {
        let result: {
          mealName: string;
          items: { name: string; nameRu: string; grams: number }[];
        };

        if (photoUri) {
          if (!storageId) {
            storageId = await uploadAndGetStorageId(photoUri);
            setPhotoStorageId(storageId);
          }
          result = await detectMealFromPhoto({ storageId });
        } else if (description) {
          result = await detectMealFromText({ description });
        } else {
          return;
        }

        setMealName(result.mealName);
        setItems(
          result.items.map((item) => ({
            id: uuidv4(),
            name: item.nameRu,
            searchName: item.name,
            grams: item.grams,
          }))
        );
        setIsDetecting(false);
        return;
      } catch (e) {
        const isLastAttempt = attempt === DETECTION_MAX_ATTEMPTS;
        if (isTransientConnectionError(e) && !isLastAttempt) {
          continue;
        }
        logError("Detect meal error", e);
        Toast.show({ text: "Ошибка при анализе блюда", variant: "error" });
        router.replace("/app");
        return;
      }
    }
  }, [
    photoUri,
    description,
    status,
    router,
    uploadAndGetStorageId,
    detectMealFromPhoto,
    detectMealFromText,
  ]);

  useEffect(() => {
    void runDetection();
  }, [runDetection]);

  useEffect(() => {
    if (!favoriteId || prefilledRef.current || favorite === undefined) return;
    if (favorite === null) {
      Toast.show({
        text: "Блюдо не найдено в избранном",
        variant: "error",
      });
      router.replace("/app");
      return;
    }
    // Один раз: реактивное обновление запроса не должно затирать правки граммов.
    prefilledRef.current = true;
    setMealName(favorite.name);
    setItems(
      favorite.items.map((i) => ({
        id: uuidv4(),
        name: i.nameRu ?? i.name,
        searchName: i.name,
        grams: i.grams,
      }))
    );
    setPhotoStorageId(favorite.photoStorageId);
    setIsPrefilling(false);
  }, [favorite, favoriteId, router]);

  const handleConfirm = async () => {
    if (isDetecting || isPrefilling || isConfirming) return;
    const validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) return;

    setIsConfirming(true);
    const { error } = await tryCatch(
      confirmMeal({
        photoStorageId,
        description,
        mealName: mealName || "Блюдо",
        items: validItems.map(({ name, searchName, grams }) => ({
          name: searchName ?? name,
          nameRu: name,
          grams,
        })),
      })
    );
    setIsConfirming(false);

    if (error) {
      Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" });
      return;
    }

    setConfirmed(true);
    router.replace("/app");
  };

  usePreventRemove(!confirmed, ({ data }) => {
    Alert.alert(
      "Уйти без подтверждения?",
      "Список ингредиентов не будет сохранён.",
      [
        { text: "Остаться", style: "cancel" },
        {
          text: "Уйти",
          style: "destructive",
          onPress: () => navigation.dispatch(data.action),
        },
      ]
    );
  });

  const validCount = items.filter((i) => i.name.trim().length > 0).length;

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader>
        <ScreenHeaderBackButton />
        <ScreenHeaderTitle title="Проверьте блюдо" />
      </ScreenHeader>

      <ScreenMainScrollView safeAreaProps={{ edges: ["left", "right"] }}>
        {(photoUri ?? favorite?.photoUrl) && (
          <Card style={styles.photoCard}>
            <Image
              source={{ uri: photoUri ?? favorite?.photoUrl ?? undefined }}
              style={styles.photo}
            />
          </Card>
        )}

        <ConfirmMealItems
          items={items}
          loading={isDetecting || isPrefilling}
          onChangeName={(id, name) =>
            setItems((prev) =>
              prev.map((i) =>
                i.id === id ? { ...i, name, searchName: undefined } : i
              )
            )
          }
          onChangeGrams={(id, grams) =>
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, grams } : i))
            )
          }
          onRemove={(id) =>
            setItems((prev) => prev.filter((i) => i.id !== id))
          }
          onAdd={() =>
            setItems((prev) => [...prev, { id: uuidv4(), name: "", grams: 100 }])
          }
        />
      </ScreenMainScrollView>

      <ScreenFooter style={{ boxShadow: [] }}>
        <ScreenFooterButton
          onPress={() => void handleConfirm()}
          disabled={
            isDetecting || isPrefilling || isConfirming || validCount === 0
          }
        >
          {isConfirming ? "Подтверждаем…" : "Подтвердить"}
        </ScreenFooterButton>
      </ScreenFooter>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: 24,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
});
