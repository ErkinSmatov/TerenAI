import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import {
  ArmchairIcon,
  CheckCheckIcon,
  DumbbellIcon,
  HeartPulseIcon,
} from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "none", label: "Нет", Icon: ArmchairIcon },
  { name: "lifting", label: "Силовые тренировки", Icon: DumbbellIcon },
  { name: "cardio", label: "Кардио", Icon: HeartPulseIcon },
  { name: "both", label: "Оба варианта", Icon: CheckCheckIcon },
];

export default function OnboardingTraining() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.training ? [data.training] : [];
  const setSelectedOption = (name: string) => {
    if (
      name === "none" ||
      name === "lifting" ||
      name === "cardio" ||
      name === "both"
    ) {
      setData((prev) => ({ ...prev, training: name }));
    }
  };

  return (
    <OnboardingStep title="Какой тип тренировок вы будете выполнять по этой программе?">
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
