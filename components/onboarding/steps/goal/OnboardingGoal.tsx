import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "lose", label: "Похудеть", Icon: ArrowDownIcon },
  { name: "maintain", label: "Поддерживать вес", Icon: MinusIcon },
  { name: "gain", label: "Набрать вес", Icon: ArrowUpIcon },
];

export default function OnboardingGoal() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.goal ? [data.goal] : [];
  const setSelectedOption = (name: string) => {
    if (name === "lose" || name === "maintain" || name === "gain") {
      setData((prev) => ({
        ...prev,
        goal: name,
        targetWeight: name === "maintain" ? prev.weight : prev.targetWeight,
        weightChangeRate: name === "maintain" ? 0 : prev.weightChangeRate,
      }));
    }
  };

  return (
    <OnboardingStep title="Какая у вас цель?">
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
