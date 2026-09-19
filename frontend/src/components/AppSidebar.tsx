import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Settings,
  LogOut,
  BookOpen,
  Umbrella,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useStore } from "@/store/useStore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

// 1. Helper function to calculate age from DOB string
const calculateAge = (dobString?: string) => {
  if (!dobString) return 0;

  const birthday = new Date(dobString);
  const today = new Date();

  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();

  // If the birth month hasn't happened yet this year, subtract 1
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }

  return age;
};

// We keep the base items that everyone sees outside the component
const baseNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Investments", url: "/dashboard/investments", icon: TrendingUp },
  { title: "Goal Simulation", url: "/dashboard/simulation", icon: Target },
  { title: "Education", url: "/dashboard/education", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  // 2. Pull onboardingData from your store to get the DOB
  const { logout, onboardingData } = useStore();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // 3. Calculate age and determine visibility
  const userAge = calculateAge(onboardingData?.profile?.dob);
  const showRetirement = userAge >= 25 && userAge <= 60;

  // 4. Dynamically build the final navigation array
  const navItems = [...baseNavItems];

  if (showRetirement) {
    navItems.push({
      title: "Retirement Plan",
      url: "/dashboard/retirement",
      icon: Umbrella,
    });
  }

  // Add Profile Settings at the very bottom
  navItems.push({
    title: "Profile Settings",
    url: "/dashboard/settings",
    icon: Settings,
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <TrendingUp className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">
            FinancePRO
          </span>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Logout"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
