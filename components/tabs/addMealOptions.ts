import {
  DropletIcon,
  HeartPulseIcon,
  LucideIcon,
  PenLineIcon,
  ScanIcon,
  StarIcon,
} from "lucide-react-native";

export type AddOption = {
  label: string;
  icon: LucideIcon;
  pathname:
    | "/app/(add)/describe"
    | "/app/(add)/camera"
    | "/app/(add)/favorites"
    | "/app/(add)/glucose"
    | "/app/(add)/bloodPressure";
  isPro: boolean;
  isAiFeature: boolean;
  // Принимает ли экран параметр date (добавление за прошлый день).
  // Показатели (сахар/давление) за прошлую дату вне скоупа фазы 71.
  supportsDate: boolean;
};

export const describeOption: AddOption = {
  label: "Описать",
  icon: PenLineIcon,
  pathname: "/app/(add)/describe",
  isPro: true,
  isAiFeature: true,
  supportsDate: true,
};

export const cameraOption: AddOption = {
  label: "Сканировать",
  icon: ScanIcon,
  pathname: "/app/(add)/camera",
  isPro: false,
  isAiFeature: true,
  supportsDate: true,
};

export const favoritesOption: AddOption = {
  label: "Избранное",
  icon: StarIcon,
  pathname: "/app/(add)/favorites",
  isPro: false,
  isAiFeature: false,
  supportsDate: true,
};

export const glucoseOption: AddOption = {
  label: "Сахар",
  icon: DropletIcon,
  pathname: "/app/(add)/glucose",
  isPro: false,
  isAiFeature: false,
  supportsDate: false,
};

export const bloodPressureOption: AddOption = {
  label: "Давление",
  icon: HeartPulseIcon,
  pathname: "/app/(add)/bloodPressure",
  isPro: false,
  isAiFeature: false,
  supportsDate: false,
};

export const MEAL_ADD_OPTIONS: AddOption[] = [
  describeOption,
  cameraOption,
  favoritesOption,
];

export function getTabAddOptions(isGlucometer: boolean): AddOption[] {
  return isGlucometer
    ? [...MEAL_ADD_OPTIONS, glucoseOption, bloodPressureOption]
    : MEAL_ADD_OPTIONS;
}
