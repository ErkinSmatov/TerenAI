import { DimensionValue, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PlusIcon, XIcon } from "lucide-react-native";
import Text from "@/components/ui/Text";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import WithSkeleton from "@/components/ui/WithSkeleton";
import GramsStepper from "@/components/meal/GramsStepper";
import getColor from "@/lib/ui/getColor";
import resolveFontFamily from "@/lib/ui/resolveFontFamily";

type Item = {
  id: string;
  name: string;
  grams: number;
};

type Props = {
  items: Item[];
  loading: boolean;
  onChangeName: (id: string, name: string) => void;
  onChangeGrams: (id: string, grams: number) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

const placeholderRows = 3;
const nameSkeletonWidths: DimensionValue[] = ["75%", "65%", "60%"];

export default function ConfirmMealItems({
  items,
  loading,
  onChangeName,
  onChangeGrams,
  onRemove,
  onAdd,
}: Props) {
  if (loading) {
    return (
      <View>
        <View style={styles.headerContainer}>
          <Text weight="600">Ингредиенты</Text>
        </View>
        <View style={styles.ingredientsContainer}>
          {Array.from({ length: placeholderRows }).map((_, i) => (
            <Card key={`skeleton-${i}`} style={styles.card}>
              <WithSkeleton
                loading
                containerStyle={styles.nameContent}
                skeletonStyle={{
                  height: 14,
                  width: nameSkeletonWidths[i % nameSkeletonWidths.length],
                  borderRadius: 4,
                }}
              >
                <Text size="16">placeholder</Text>
              </WithSkeleton>
              <WithSkeleton
                loading
                skeletonStyle={{
                  height: 14,
                  width: 60,
                  borderRadius: 4,
                  alignSelf: "flex-end",
                }}
              >
                <Text size="16">placeholder</Text>
              </WithSkeleton>
            </Card>
          ))}
        </View>
      </View>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <View>
      <View style={styles.headerContainer}>
        <Text weight="600">Ингредиенты</Text>
      </View>

      {isEmpty && (
        <View style={styles.emptyState}>
          <Text size="18" weight="600">
            Список пуст
          </Text>
          <Text size="14" color={getColor("mutedForeground")}>
            Добавьте хотя бы один ингредиент, чтобы продолжить
          </Text>
        </View>
      )}

      <View style={styles.ingredientsContainer}>
        {items.map((item) => (
          <IngredientRow
            key={item.id}
            item={item}
            onChangeName={onChangeName}
            onChangeGrams={onChangeGrams}
            onRemove={onRemove}
          />
        ))}

        <Button
          variant="base"
          size="base"
          style={styles.addRow}
          onPress={onAdd}
        >
          <PlusIcon size={14} strokeWidth={2.25} color={getColor("mutedForeground")} />
          <Text size="14" color={getColor("mutedForeground")}>
            Добавить ингредиент
          </Text>
        </Button>
      </View>
    </View>
  );
}

function IngredientRow({
  item,
  onChangeName,
  onChangeGrams,
  onRemove,
}: {
  item: Item;
  onChangeName: (id: string, name: string) => void;
  onChangeGrams: (id: string, grams: number) => void;
  onRemove: (id: string) => void;
}) {
  const translateX = useSharedValue(0);

  const handleRemove = () => {
    onRemove(item.id);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -80) {
        scheduleOnRN(handleRemove);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <Card style={styles.card}>
          <RNTextInput
            style={styles.nameInput}
            value={item.name}
            onChangeText={(text) => onChangeName(item.id, text)}
          />
          <Button
            variant="base"
            size="base"
            style={styles.removeButton}
            hitSlop={8}
            onPress={handleRemove}
          >
            <XIcon size={18} color={getColor("red")} />
          </Button>
          <GramsStepper
            value={item.grams}
            onChange={(grams) => onChangeGrams(item.id, grams)}
          />
        </Card>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  ingredientsContainer: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 20,
  },
  nameContent: {
    flex: 1,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: resolveFontFamily({ weight: "400" }),
    color: getColor("foreground"),
    padding: 0,
  },
  removeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: getColor("secondary"),
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
  },
  emptyState: {
    paddingBottom: 12,
    gap: 4,
  },
});
