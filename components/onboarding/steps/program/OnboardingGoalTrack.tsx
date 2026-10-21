import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { DropletIcon, FlaskConicalIcon, ScaleIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "biohacking", label: "Биохакинг", Icon: FlaskConicalIcon },
  { name: "glucometer", label: "Диабет", Icon: DropletIcon },
  { name: "weightControl", label: "Контроль веса", Icon: ScaleIcon },
];

export default function OnboardingGoalTrack() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.goalTrack ? [data.goalTrack] : [];
  const setSelectedOption = (name: string) => {
    if (name !== "biohacking" && name !== "glucometer" && name !== "weightControl") {
      return;
    }

    setData((prev) => ({
      ...prev,
      goalTrack: name,
      glucometerType: name === "glucometer" ? prev.glucometerType : undefined,
    }));
  };

  return (
    <OnboardingStep title="Какую программу вы выбираете?">
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
