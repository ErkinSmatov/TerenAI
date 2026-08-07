import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { GaugeIcon, PillIcon, SyringeIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "diabetes2", label: "Диабет 2 степени", Icon: PillIcon },
  { name: "diabetes1", label: "Диабет 1 степени", Icon: SyringeIcon },
  { name: "sugarControl", label: "Контроль сахара", Icon: GaugeIcon },
];

export default function OnboardingGlucometerType() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.glucometerType ? [data.glucometerType] : [];
  const setSelectedOption = (name: string) => {
    if (name === "diabetes2" || name === "diabetes1" || name === "sugarControl") {
      setData((prev) => ({ ...prev, glucometerType: name }));
    }
  };

  return (
    <OnboardingStep title="Что из этого вам подходит?">
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
