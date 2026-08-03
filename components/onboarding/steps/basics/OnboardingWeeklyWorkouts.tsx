import Dot3Icon from "@/components/icons/dots/Dot3Icon";
import Dot1Icon from "@/components/icons/dots/Dot1Icon";
import Select, { SelectOption } from "@/components/ui/Select";
import { useOnboardingContext } from "@/context/OnboardingContext";
import Dot6Icon from "@/components/icons/dots/Dot6Icon";
import OnboardingStep from "../../OnboardingStep";

const options: SelectOption[] = [
  {
    name: "0-2",
    label: "0-2",
    description: "Тренируюсь время от времени",
    Icon: Dot1Icon,
  },
  {
    name: "3-5",
    label: "3-5",
    description: "Тренируюсь несколько раз в неделю",
    Icon: Dot3Icon,
  },
  {
    name: "6+",
    label: "6+",
    description: "Тренируюсь почти каждый день",
    Icon: Dot6Icon,
  },
];

export default function OnboardingWeeklyWorkouts() {
  const { data, setData } = useOnboardingContext();

  const selectedOptions = data.weeklyWorkouts ? [data.weeklyWorkouts] : [];
  const setSelectedOption = (name: string) => {
    if (name === "0-2" || name === "3-5" || name === "6+") {
      setData((prev) => ({ ...prev, weeklyWorkouts: name }));
    }
  };

  return (
    <OnboardingStep title="Сколько тренировок в неделю вы делаете?">
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
