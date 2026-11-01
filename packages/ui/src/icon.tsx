import {
  IconAlertTriangle,
  IconArmchair,
  IconArrowRight,
  IconAward,
  IconBackpack,
  IconBan,
  IconBuildingBridge,
  IconBulb,
  IconChartBar,
  IconCheck,
  IconChevronRight,
  IconCircleDashed,
  IconClipboardCheck,
  IconClock,
  IconCoinOff,
  IconCompass,
  IconDeviceLaptop,
  IconDoorExit,
  IconFlag,
  IconGift,
  IconHeart,
  IconHeartHandshake,
  IconHome,
  IconLayoutGrid,
  IconLock,
  IconMail,
  IconMapPin,
  IconMoodSad,
  IconMoodSmile,
  IconPalette,
  IconPlayerPlayFilled,
  IconPlus,
  IconPuzzle,
  IconRefresh,
  IconRoute,
  IconSchool,
  IconShieldCheck,
  IconShirt,
  IconSparkles,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconVolume,
  IconWorld,
  IconX,
} from "@tabler/icons-react";

// Semantic names, so content files pick icons by meaning, not by library.
const icons = {
  "arrow-right": IconArrowRight,
  award: IconAward,
  avatar: IconShirt,
  ban: IconBan,
  bridge: IconBuildingBridge,
  chart: IconChartBar,
  check: IconCheck,
  "chevron-right": IconChevronRight,
  chromebook: IconDeviceLaptop,
  clipboard: IconClipboardCheck,
  clock: IconClock,
  compass: IconCompass,
  create: IconPalette,
  curriculum: IconMapPin,
  flag: IconFlag,
  furniture: IconArmchair,
  gift: IconGift,
  grid: IconLayoutGrid,
  heart: IconHeart,
  house: IconHome,
  idea: IconBulb,
  leave: IconDoorExit,
  mail: IconMail,
  "no-money": IconCoinOff,
  "not-yet": IconCircleDashed,
  parent: IconHeartHandshake,
  path: IconRoute,
  play: IconPlayerPlayFilled,
  plus: IconPlus,
  privacy: IconShieldCheck,
  problem: IconAlertTriangle,
  puzzle: IconPuzzle,
  replay: IconRefresh,
  sad: IconMoodSad,
  secure: IconLock,
  smile: IconMoodSmile,
  speaker: IconVolume,
  sparkles: IconSparkles,
  star: IconStar,
  student: IconBackpack,
  target: IconTarget,
  teacher: IconSchool,
  trophy: IconTrophy,
  users: IconUsers,
  world: IconWorld,
  x: IconX,
} as const;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
  /** Icons are decorative by default; pass a label when they carry meaning. */
  label?: string;
}

export function Icon({ name, size = 24, label }: IconProps) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      stroke={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
