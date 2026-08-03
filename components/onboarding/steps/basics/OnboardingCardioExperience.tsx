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
    description: "Не занимаюсь кардио",
    Icon: SignalZeroIcon,
  },
  {
    name: "beginner",
    label: "Начинающий",
    description: "Занимаюсь кардио меньше 1 года",
    Icon: SignalLowIcon,
  },
  {
    name: "intermediate",
    label: "Средний уровень",
    description: "Занимаюсь кардио от 1 до 4 лет",
    Icon: SignalMediumIcon,
  },
  {
    name: "advanced",
    label: "Продвинутый",
    description: "Занимаюсь кардио больше 4 лет",
    Icon: SignalIcon,
  },
];

export default function OnboardingCardioExperience() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.cardioExperience ? [data.cardioExperience] : [];
  const setSelectedOption = (name: string) => {
    if (
      name === "none" ||
      name === "beginner" ||
      name === "intermediate" ||
      name === "advanced"
    ) {
      setData((prev) => ({ ...prev, cardioExperience: name }));
    }
  };

  return (
    <OnboardingStep title="Какой у вас опыт с кардио?">
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
