import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react-native";
import { IconQuestionMark } from "@tabler/icons-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "lose", label: "Я похудел(а)", Icon: ArrowDownIcon },
  { name: "gain", label: "Я набрал(а) вес", Icon: ArrowUpIcon },
  { name: "maintain", label: "Мой вес не изменился", Icon: MinusIcon },
  {
    name: "unsure",
    label: "Не уверен(а)",
    Icon: <IconQuestionMark size={28} />,
  },
];

export default function OnboardingWeightTrend() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.weightTrend ? [data.weightTrend] : [];
  const setSelectedOption = (name: string) => {
    if (
      name === "lose" ||
      name === "maintain" ||
      name === "gain" ||
      name === "unsure"
    ) {
      setData((prev) => ({ ...prev, weightTrend: name }));
    }
  };

  return (
    <OnboardingStep title="Как менялся ваш вес за последние недели?">
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
