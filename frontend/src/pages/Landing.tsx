import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, TrendingUp, PieChart, Target, Users, Lock } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FinancePRO</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/auth?tab=register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 md:py-32 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
  
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Smart financial planning for{' '}
            <span className="text-primary">every stage</span> of life
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered budgeting, investment recommendations, and goal simulations tailored to your age, income, and risk profile.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button size="lg" asChild>
              <Link to="/auth?tab=register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Login</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: PieChart, title: 'Budget Smartly', desc: 'AI-optimized budget breakdown with category tracking and spending alerts.' },
            { icon: TrendingUp, title: 'Invest Wisely', desc: 'Risk-adjusted portfolio recommendations from conservative to aggressive.' },
            { icon: Target, title: 'Simulate Goals', desc: 'Monte Carlo simulations to visualize your probability of reaching financial goals.' },
          ].map((f) => (
            <Card key={f.title} className="group hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
     

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 FinancePRO. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
