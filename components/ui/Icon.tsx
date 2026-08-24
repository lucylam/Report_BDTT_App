import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  X,
  Database,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  Moon,
  PanelLeft,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  UserCircle,
  UsersRound,
  Wifi,
  WifiOff,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/ui";

export type IconName =
  | "account"
  | "bell"
  | "camera"
  | "calendar"
  | "chart"
  | "check"
  | "chevronDown"
  | "close"
  | "dashboard"
  | "data"
  | "database"
  | "download"
  | "demo"
  | "help"
  | "history"
  | "list"
  | "loading"
  | "logout"
  | "moon"
  | "panel"
  | "people"
  | "search"
  | "settings"
  | "shield"
  | "spreadsheet"
  | "sun"
  | "upload"
  | "wifi"
  | "wifiOff"
  | "workorder";

interface IconProps {
  readonly name: IconName;
  readonly className?: string;
  readonly strokeWidth?: number;
}

const iconMap: Record<IconName, LucideIcon> = {
  account: UserCircle,
  bell: Bell,
  camera: Camera,
  calendar: CalendarDays,
  chart: BarChart3,
  check: CheckCircle2,
  chevronDown: ChevronDown,
  close: X,
  dashboard: LayoutDashboard,
  data: Database,
  database: Database,
  download: Download,
  demo: FlaskConical,
  help: CircleHelp,
  history: History,
  list: ListChecks,
  loading: LoaderCircle,
  logout: LogOut,
  moon: Moon,
  panel: PanelLeft,
  people: UsersRound,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  spreadsheet: FileSpreadsheet,
  sun: Sun,
  upload: Upload,
  wifi: Wifi,
  wifiOff: WifiOff,
  workorder: BriefcaseBusiness
};

export const isIconName = (value: string): value is IconName => value in iconMap;

export const Icon = ({
  name,
  className,
  strokeWidth = 2
}: IconProps): React.ReactElement => {
  const LucideIconComponent = iconMap[name] ?? Gauge;

  return (
    <LucideIconComponent
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
      strokeWidth={strokeWidth}
    />
  );
};
