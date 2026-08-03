import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import {
  SignalIcon,
  SignalLowIcon,
  SignalMediumIcon,
  SignalZeroIcon,
} from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  {
    name: "none",
    label: "Нет",
    description: "Не занимаюсь силовыми тренировками",
    Icon: SignalZeroIcon,
  },
  {
    name: "beginner",
    label: "Начинающий",
    description: "Занимаюсь меньше 1 года",
    Icon: SignalLowIcon,
  },
  {
    name: "intermediate",
    label: "Средний уровень",
    description: "Занимаюсь от 1 до 4 лет",
    Icon: SignalMediumIcon,
  },
  {
    name: "advanced",
    label: "Продвинутый",
    description: "Занимаюсь больше 4 лет",
    Icon: SignalIcon,
  },
];

export default function OnboardingLiftingExperience() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.liftingExperience
    ? [data.liftingExperience]
    : [];
  const setSelectedOption = (name: string) => {
    if (
      name === "none" ||
      name === "beginner" ||
      name === "intermediate" ||
      name === "advanced"
    ) {
      setData((prev) => ({ ...prev, liftingExperience: name }));
    }
  };

  return (
    <OnboardingStep title="Какой у вас опыт силовых тренировок?">
      <Select
        options={options}
        selectedOptions={selectedOptions}
        onSelectOption={setSelectedOption}
        animated
        animationDelay={100}
      />
    </OnboardingStep>
  );
}
