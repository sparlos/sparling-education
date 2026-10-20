import {
  IconArmchair,
  IconArrowRight,
  IconBackpack,
  IconBan,
  IconBuildingBridge,
  IconChartBar,
  IconCheck,
  IconClipboardCheck,
  IconClock,
  IconCoinOff,
  IconDeviceLaptop,
  IconGift,
  IconHeart,
  IconHeartHandshake,
  IconHome,
  IconLock,
  IconMail,
  IconMapPin,
  IconMoodSmile,
  IconPalette,
  IconPuzzle,
  IconRoute,
  IconSchool,
  IconShieldCheck,
  IconShirt,
  IconSparkles,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconWorld,
  IconX,
} from "@tabler/icons-react";

// Semantic names, so content files pick icons by meaning, not by library.
const icons = {
  "arrow-right": IconArrowRight,
  avatar: IconShirt,
  ban: IconBan,
  bridge: IconBuildingBridge,
  chart: IconChartBar,
  check: IconCheck,
  chromebook: IconDeviceLaptop,
  clipboard: IconClipboardCheck,
  clock: IconClock,
  create: IconPalette,
  curriculum: IconMapPin,
  furniture: IconArmchair,
  gift: IconGift,
  heart: IconHeart,
  house: IconHome,
  mail: IconMail,
  "no-money": IconCoinOff,
  parent: IconHeartHandshake,
  path: IconRoute,
  privacy: IconShieldCheck,
  puzzle: IconPuzzle,
  secure: IconLock,
  smile: IconMoodSmile,
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
