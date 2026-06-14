import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  FileSpreadsheet,
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
  | "calendar"
  | "chart"
  | "check"
  | "chevronDown"
  | "dashboard"
  | "data"
  | "database"
  | "download"
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
  calendar: CalendarDays,
  chart: BarChart3,
  check: CheckCircle2,
  chevronDown: ChevronDown,
  dashboard: LayoutDashboard,
  data: Database,
  database: Database,
  download: Download,
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
