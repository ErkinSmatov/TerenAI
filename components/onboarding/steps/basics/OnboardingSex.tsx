import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import { MarsIcon, VenusIcon } from "lucide-react-native";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  { name: "male", label: "Мужской", Icon: MarsIcon },
  { name: "female", label: "Женский", Icon: VenusIcon },
];

export default function OnboardingSex() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.sex ? [data.sex] : [];
  const setSelectedOption = (name: string) => {
    if (name === "male" || name === "female") {
      setData((prev) => ({ ...prev, sex: name }));
    }
  };

  return (
    <OnboardingStep title="Какой у вас пол?">
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
