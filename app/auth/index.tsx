import Button from "@/components/ui/Button";
import SafeArea from "@/components/ui/SafeArea";
import Text from "@/components/ui/Text";
import Title from "@/components/ui/Title";
import {
  Image,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import BottomSheet from "@/components/ui/BottomSheet";
import SignInButtons from "@/components/auth/SignInButtons";
import { useRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import getShadow from "@/lib/ui/getShadow";
import Carousel from "@/components/ui/Carousel";
import getColor from "@/lib/ui/getColor";
import type { ThemeName } from "@/lib/ui/palettes";
import useThemedStyles from "@/lib/ui/useThemedStyles";

const carouselImages: readonly ImageSourcePropType[] = [
  require("@/assets/images/screenshot-1.png") as ImageSourcePropType,
  require("@/assets/images/screenshot-2.png") as ImageSourcePropType,
  require("@/assets/images/screenshot-3.png") as ImageSourcePropType,
];

export default function AuthScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  return (
    <SafeArea>
      <Title style={{ textAlign: "center" }}>
        Считайте калории легко и просто
      </Title>
      <View style={styles.carouselContainer}>
        <Carousel showArrows infinite autoScroll>
          {carouselImages.map((source, index) => (
            <View key={`carousel-image-${index}`} style={styles.imageContainer}>
              <Image
                source={source}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          ))}
        </Carousel>
      </View>
      <View style={styles.footerContainer}>
        <Button
          size="lg"
          onPress={() => {
            router.navigate("/onboarding");
          }}
        >
          Начать
        </Button>
        <View style={styles.footerText}>
          <Text size="16" style={{ textAlign: "center" }}>
            Уже есть аккаунт?
          </Text>
          <BottomSheet
            ref={bottomSheetRef}
            Trigger={
              <Button size="md" variant="text">
                Войти
              </Button>
            }
          >
            <SignInButtons
              onPhoneLogin={() => bottomSheetRef.current?.close()}
            />
          </BottomSheet>
        </View>
      </View>
    </SafeArea>
  );
}

const createStyles = (theme: ThemeName) => ({
  carouselContainer: {
    flex: 1,
    paddingVertical: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  imageContainer: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  image: {
    height: "100%" as const,
    aspectRatio: 9 / 19.5,
    maxWidth: "100%" as const,
    borderRadius: 20,
    borderColor: getColor("secondary", theme === "dark" ? 0.08 : undefined, theme),
    borderWidth: 1,
    ...getShadow("lg"),
  },
  footerContainer: {
    gap: 10,
    paddingBottom: 15,
  },
  footerText: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 4,
  },
});
