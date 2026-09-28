import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Linking } from "react-native";
import Purchases, {
  PACKAGE_TYPE,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { useRouter } from "expo-router";
import {
  ScreenMain,
  ScreenMainScrollView,
  ScreenMainTitle,
} from "../ui/screen/ScreenMain";
import {
  ScreenHeader,
  ScreenHeaderBackButton,
  ScreenHeaderButton,
  ScreenHeaderTitle,
} from "../ui/screen/ScreenHeader";
import useScrollY from "@/lib/hooks/reanimated/useScrollY";
import { ScreenFooter, ScreenFooterButton } from "../ui/screen/ScreenFooter";
import { Toast } from "../ui/Toast";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { revenueCatConfig } from "@/config/revenueCatConfig";
import Text from "../ui/Text";
import getColor, { getActiveTheme } from "../../lib/ui/getColor";
import {
  CameraIcon,
  PenLineIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react-native";
import { useSubscriptionContext } from "@/context/SubscriptionContext";
import logError from "@/lib/utils/logError";

const proFeatures = [
  {
    title: "Сфоткал — и готово",
    description:
      "ИИ распознаёт вашу еду и мгновенно считает калории. Просто наведите камеру и снимите.",
    Icon: CameraIcon,
  },
  {
    title: "Запись текстом",
    description:
      "Просто опишите блюдо, и ИИ автоматически рассчитает БЖУ.",
    Icon: PenLineIcon,
  },
  {
    title: "Полный контроль и редактирование",
    description:
      "Легко скорректируйте ингредиенты или количество, если ИИ ошибся. Последнее слово всегда за вами.",
    Icon: SparklesIcon,
  },
];

const currencyMap: Record<string, string> = {
  USD: "$",
  EUR: "€",
};

type BackProps = {
  type?: "back";
  onClose?: undefined;
};

type CloseProps = {
  type?: "close";
  onClose: () => void;
};

type Props = (BackProps | CloseProps) & {
  onSuccess?: () => void;
};

export default function Paywall({ type = "back", onClose, onSuccess }: Props) {
  const router = useRouter();
  const { scrollY, onScroll } = useScrollY();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { restorePurchases } = useSubscriptionContext();

  useEffect(() => {
    void (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null) {
          setOffering(offerings.current);
          if (offerings.current.availablePackages.length > 0) {
            setSelectedPackage(
              offerings.current.availablePackages[
                offerings.current.availablePackages.length - 1
              ]
            );
          }
        }
      } catch (e) {
        logError("Paywall error", e);
        Toast.show({
          variant: "error",
          text: "Не удалось загрузить предложения",
        });
      }
    })();
  }, []);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (
        typeof customerInfo.entitlements.active[
          revenueCatConfig.entitlementId
        ] !== "undefined"
      ) {
        if (onSuccess) {
          onSuccess();
        } else if (router.canGoBack()) {
          router.back();
        }
      }
    } catch (e) {
      const error = e as { userCancelled?: boolean; message?: string };
      if (!error.userCancelled && error.message) {
        Alert.alert("Ошибка", error.message);
      }
      logError("Paywall error", error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    const customerInfo = await restorePurchases();
    if (customerInfo) {
      Alert.alert("Успех", "Покупки успешно восстановлены");
    } else {
      Alert.alert("Ошибка", "Не удалось восстановить покупки");
    }
    setIsPurchasing(false);
  };

  return (
    <ScreenMain edges={[]}>
      <ScreenHeader scrollY={scrollY}>
        {type === "back" && <ScreenHeaderBackButton />}
        <ScreenHeaderTitle title="Тарифы" />
        {type === "close" && (
          <ScreenHeaderButton
            Icon={XIcon}
            onPress={onClose}
            style={{ marginLeft: "auto", aspectRatio: 1 }}
          />
        )}
      </ScreenHeader>

      <ScreenMainScrollView
        scrollViewProps={{ onScroll }}
        safeAreaProps={{ edges: ["left", "right"] }}
      >
        <ScreenMainTitle
          title="TerenAI Pro"
          description="Достигайте своих целей, записывая приёмы пищи за секунды, а не за минуты"
          style={styles.title}
        />
        <View style={styles.packageContainer}>
          {offering?.availablePackages.map((pkg) => {
            const isSelected = selectedPackage?.identifier === pkg.identifier;
            return (
              <Button
                key={`package-${pkg.identifier}`}
                variant="base"
                size="base"
                onPress={() => {
                  setSelectedPackage(pkg);
                }}
                style={{ flex: 1 }}
              >
                <Card style={[styles.card, isSelected && styles.selectedCard]}>
                  {pkg.packageType === PACKAGE_TYPE.ANNUAL && (
                    <View
                      style={[
                        styles.badge,
                        isSelected && { backgroundColor: getColor("primary") },
                      ]}
                    >
                      <Text
                        size="10"
                        weight="600"
                        color={isSelected ? getColor("background") : undefined}
                      >
                        {currencyMap[pkg.product.currencyCode] ??
                          pkg.product.currencyCode}
                        {Math.round((pkg.product.price / 12) * 100) / 100} / мес
                      </Text>
                    </View>
                  )}

                  <Text size="12">
                    {pkg.packageType === PACKAGE_TYPE.MONTHLY
                      ? "1 месяц"
                      : "12 месяцев"}
                  </Text>
                  <Text size="18" weight="600">
                    {currencyMap[pkg.product.currencyCode] ??
                      pkg.product.currencyCode}
                    {Math.round(pkg.product.price * 100) / 100}
                  </Text>
                  <Text size="12" color={getColor("mutedForeground", 0.75)}>
                    Оплата{" "}
                    {pkg.packageType === PACKAGE_TYPE.MONTHLY
                      ? "ежемесячно"
                      : "ежегодно"}
                  </Text>
                </Card>
              </Button>
            );
          })}
        </View>

        <View>
          <Text size="20" weight="600" style={{ paddingBottom: 16 }}>
            Почему стоит выбрать Pro?
          </Text>
          <Card style={styles.featuresCard}>
            {proFeatures.map(({ title, description, Icon }, index) => {
              const isLast = index === proFeatures.length - 1;

              return (
                <React.Fragment key={`feature-${title}`}>
                  <Button
                    variant="base"
                    size="base"
                    style={styles.featureButton}
                  >
                    <Icon size={20} color={getColor("foreground")} />
                    <View style={styles.featureTextContainer}>
                      <Text size="16" weight="600">
                        {title}
                      </Text>
                      <Text size="12" color={getColor("mutedForeground", 0.75)}>
                        {description}
                      </Text>
                    </View>
                  </Button>

                  {!isLast && <View style={styles.featuresDivider}></View>}
                </React.Fragment>
              );
            })}
          </Card>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingTop: 24,
            marginTop: "auto",
          }}
        >
          <Text
            size="14"
            style={{ textDecorationLine: "underline" }}
            onPress={() =>
              void Linking.openURL(
                "https://docs.google.com/document/d/e/2PACX-1vTyNCLjuAHdtZmdZQpIfOolwZ2nE7pA5kKTH3jrszZEgkSzfJMMBXdawf7yva_GFIoMiJ9vS63IplTy/pub"
              )
            }
          >
            Политика конфиденциальности
          </Text>
          <Text>&middot;</Text>
          <Text
            size="14"
            style={{ textDecorationLine: "underline" }}
            onPress={() =>
              void Linking.openURL(
                "https://docs.google.com/document/d/e/2PACX-1vR-UlE0mpZ5nD3DekvTdch6hxejnJ_wqBGYKb9Fwk5ObEK8vgHpxUjVXWuRUOD40qREZCvoTo6L3PlG/pub"
              )
            }
          >
            Условия использования
          </Text>
        </View>
      </ScreenMainScrollView>

      <ScreenFooter style={{ flexDirection: "column", gap: 14 }}>
        <ScreenFooterButton
          style={{ flex: 0 }}
          onPress={() =>
            void (selectedPackage && handlePurchase(selectedPackage))
          }
          disabled={!selectedPackage || isPurchasing}
        >
          Начать бесплатный пробный период на 7 дней
        </ScreenFooterButton>
        <ScreenFooterButton
          variant="ghost"
          size="sm"
          style={{
            flex: 0,
            height: "auto",
            alignSelf: "center",
          }}
          hitSlop={4}
          onPress={() => void handleRestore()}
        >
          Восстановить покупки
        </ScreenFooterButton>
      </ScreenFooter>
    </ScreenMain>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingBottom: 20,
  },
  packageContainer: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    alignItems: "center",
    padding: 16,
  },
  selectedCard: {
    padding: 16 - 2 + StyleSheet.hairlineWidth,
    borderWidth: 2,
    borderColor: getColor("primary"),
  },
  // "muted", не "secondary": в тёмной палитре secondary — сплошной белый,
  // задуман только для низкой прозрачности (см. lib/ui/palettes.ts).
  badge: {
    position: "absolute",
    top: 0,
    transform: [{ translateY: "-50%" }],
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: getColor("muted"),
  },
  featuresCard: {
    padding: 20,
    gap: 16,
  },
  featureButton: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  featureTextContainer: {
    gap: 4,
    flex: 1,
  },
  // Та же конвенция границы, что и в Card.tsx: "secondary" при 0.08
  // непрозрачности в тёмной теме. Этот экран пока не переведён на
  // useThemedStyles (вне скоупа фазы), поэтому берём тему один раз при
  // загрузке модуля через getActiveTheme() — переживёт холодный старт, но
  // не переключится live без перезапуска (как и остальные нередизайненные
  // экраны).
  featuresDivider: {
    height: 1,
    backgroundColor: getColor(
      "secondary",
      getActiveTheme() === "dark" ? 0.08 : undefined
    ),
  },
});
