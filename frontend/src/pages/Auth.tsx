import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import { useStore } from "@/store/useStore";
import { loginRequest, registerRequest } from "@/lib/authApi";
import { analyzeFinances } from "@/lib/api";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "register" ? "register" : "login";
  const navigate = useNavigate();
  const login = useStore((s) => s.login);

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsSubmitting(true);

  try {
    // 1. Get the Auth Token   
    const { token, user } = await loginRequest({ email: loginEmail, password: loginPassword });

    // 2. Fetch the Full Profile from the backend
    const profileResponse = await fetch("http://localhost:5000/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!profileResponse.ok) throw new Error("Failed to sync profile.");
    const profileData = await profileResponse.json();
    const dbUser = profileData.user;

    // 3. Save Auth state to Zustand
    login(user, token);

    // 4. Check if they have already finished onboarding in the DB
    if (dbUser && dbUser.monthlyIncome) {
      const restoredData = {
        profile: { 
          name: dbUser.name, 
          dob: dbUser.dob, 
          employmentStatus: dbUser.employmentStatus 
        },
        financial: { 
          monthlyIncome: dbUser.monthlyIncome, 
          fixedExpenses: dbUser.fixedExpenses, 
          variableExpenses: dbUser.variableExpenses 
        },
        goal: { 
          goalType: dbUser.goalType, 
          targetAmount: dbUser.targetAmount, 
          timelineMonths: dbUser.timelineMonths 
        },
        risk_answers: dbUser.risk_answers || [1, 1, 1, 1, 1],
      };

      // Set the data in store BEFORE navigating
      useStore.getState().setOnboardingData(restoredData);
      
      // Optional: Re-run analysis so charts appear immediately
      const analysis = await analyzeFinances(restoredData);
      useStore.getState().setAnalysisData(analysis);

      navigate("/dashboard");
    } else {
      // New user or incomplete profile
      navigate("/onboarding");
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Invalid email or password.");
  } finally {
    setIsSubmitting(false);
  }
};


 
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
  
    try {
      const { token, user } = await registerRequest({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
  
      localStorage.setItem("token", token);   // required
  
      login(user, token);
  
      navigate("/onboarding");
  
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">FinancePRO</span>
        </div>

        <Card>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "login" | "register");
              setError(null);
            }}
          >
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </CardHeader>

            {error && (
              <CardContent className="pt-6 pb-0">
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="********"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && activeTab === "login" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Login
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Doe"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="********"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && activeTab === "register" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
