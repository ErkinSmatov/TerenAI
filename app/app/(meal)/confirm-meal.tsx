import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "@react-navigation/native";
import { useAction, useMutation } from "convex/react";
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

type ConfirmItem = { id: string; name: string; grams: number };

export default function ConfirmMealScreen() {
  const dimensions = useWindowDimensions();
  const router = useRouter();
  const navigation = useNavigation();
  const { photoUri, description, source } = useLocalSearchParams<{
    photoUri?: string;
    description?: string;
    source?: "camera" | "library";
  }>();

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
  const [isDetecting, setIsDetecting] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [photoStorageId, setPhotoStorageId] = useState<
    Id<"_storage"> | undefined
  >(undefined);

  const startedRef = useRef(false);
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

    try {
      let result: { mealName: string; items: { name: string; grams: number }[] };

      if (photoUri) {
        const storageId = await uploadAndGetStorageId(photoUri);
        setPhotoStorageId(storageId);
        result = await detectMealFromPhoto({ storageId });
      } else if (description) {
        result = await detectMealFromText({ description });
      } else {
        return;
      }

      setMealName(result.mealName);
      setItems(result.items.map((item) => ({ id: uuidv4(), ...item })));
      setIsDetecting(false);
    } catch (e) {
      logError("Detect meal error", e);
      Toast.show({ text: "Ошибка при анализе блюда", variant: "error" });
      router.replace("/app");
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

  const handleConfirm = async () => {
    if (isDetecting || isConfirming) return;
    const validItems = items.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) return;

    setIsConfirming(true);
    const { data: mealId, error } = await tryCatch(
      confirmMeal({
        photoStorageId,
        description,
        mealName: mealName || "Блюдо",
        items: validItems.map(({ name, grams }) => ({ name, grams })),
      })
    );
    setIsConfirming(false);

    if (error) {
      Toast.show({ text: "Ошибка при исправлении блюда", variant: "error" });
      return;
    }

    setConfirmed(true);
    router.replace({
      pathname: "/app/(meal)/meal",
      params: { mealId },
    });
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
        {photoUri && (
          <Card style={styles.photoCard}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
          </Card>
        )}

        <ConfirmMealItems
          items={items}
          loading={isDetecting}
          onChangeName={(id, name) =>
            setItems((prev) =>
              prev.map((i) => (i.id === id ? { ...i, name } : i))
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
          disabled={isDetecting || isConfirming || validCount === 0}
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
