import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { DropletIcon, FlaskConicalIcon, ScaleIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "biohacking", label: "Биохакинг", Icon: FlaskConicalIcon },
  { name: "glucometer", label: "Глюкометр", Icon: DropletIcon },
  { name: "weightControl", label: "Контроль веса", Icon: ScaleIcon },
];

export default function OnboardingGoalTrack() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.goalTrack ? [data.goalTrack] : [];
  const setSelectedOption = (name: string) => {
    if (name !== "biohacking" && name !== "glucometer" && name !== "weightControl") {
      return;
    }

    setData((prev) => {
      if (name === "weightControl") {
        return { ...prev, goalTrack: name, glucometerType: undefined };
      }

      return {
        ...prev,
        goalTrack: name,
        glucometerType: name === "glucometer" ? prev.glucometerType : undefined,
        goal: "maintain",
        targetWeight: prev.weight,
        weightChangeRate: 0,
      };
    });
  };

  return (
    <OnboardingStep title="Что вас интересует больше всего?">
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
