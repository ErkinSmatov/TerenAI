import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { ArmchairIcon, FootprintsIcon, KayakIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  {
    name: "low",
    label: "Сидячий образ жизни",
    description: "Обычно меньше 5000 шагов в день",
    Icon: ArmchairIcon,
  },
  {
    name: "medium",
    label: "Умеренно активный",
    description: "Обычно 5000–10 000 шагов в день",
    Icon: FootprintsIcon,
  },
  {
    name: "high",
    label: "Очень активный",
    description: "Обычно больше 10 000 шагов в день",
    Icon: KayakIcon,
  },
];

export default function OnboardingActivityLevel() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.activityLevel ? [data.activityLevel] : [];
  const setSelectedOption = (name: string) => {
    if (name === "low" || name === "medium" || name === "high") {
      setData((prev) => ({ ...prev, activityLevel: name }));
    }
  };

  return (
    <OnboardingStep title="Какой у вас уровень активности?">
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
