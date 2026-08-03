import React from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { CircleQuestionMarkIcon } from "lucide-react-native";
import getColor from "@/lib/ui/getColor";
import Text from "@/components/ui/Text";
import { View, Linking } from "react-native";

export default function PlanInfoSheet() {
  return (
    <BottomSheet
      Trigger={
        <Button
          variant="base"
          size="base"
          style={{ position: "absolute", right: 0 }}
          hitSlop={100}
        >
          <CircleQuestionMarkIcon size={22} color={getColor("foreground")} />
        </Button>
      }
    >
      <View style={{ gap: 32 }}>
        <View style={{ gap: 8 }}>
          <Text size="16" weight="600">
            Медицинское предупреждение
          </Text>
          <Text size="14">
            Это приложение предоставляет оценки в информационных целях и не
            заменяет профессиональную медицинскую консультацию. Всегда
            консультируйтесь с врачом перед внесением изменений в диету или
            физическую активность.
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text size="16" weight="600">
            Методология и источники
          </Text>
          <View style={{ gap: 8 }}>
            <Text size="14">
              &bull;{" "}
              <Text size="14" weight="600">
                Базовый уровень метаболизма (BMR):
              </Text>{" "}
              Рассчитан по уравнению Миффлина-Сан Жеора.{" "}
              <Text
                size="14"
                style={{ textDecorationLine: "underline" }}
                onPress={() =>
                  void Linking.openURL(
                    "https://pubmed.ncbi.nlm.nih.gov/2305711/"
                  )
                }
              >
                (Mifflin et al., 1990)
              </Text>
              .
            </Text>
            <Text size="14">
              &bull;{" "}
              <Text size="14" weight="600">
                Расход энергии:
              </Text>{" "}
              Оценивается по Компендиуму физической активности.{" "}
              <Text
                size="14"
                style={{ textDecorationLine: "underline" }}
                onPress={() =>
                  void Linking.openURL(
                    "https://pubmed.ncbi.nlm.nih.gov/21681120/"
                  )
                }
              >
                (Ainsworth et al., 2011)
              </Text>
              .
            </Text>
            <Text size="14">
              &bull;{" "}
              <Text size="14" weight="600">
                Безопасность:
              </Text>{" "}
              Минимальные лимиты калорий основаны на{" "}
              <Text
                size="14"
                style={{ textDecorationLine: "underline" }}
                onPress={() =>
                  void Linking.openURL(
                    "https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf"
                  )
                }
              >
                Диетических рекомендациях для американцев (2020–2025)
              </Text>
              .
            </Text>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
