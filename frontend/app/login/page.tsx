'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { MiloLogoMark } from '@/components/MiloLogoMark';
import { 
  Zap, 
  Brain, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Programming',
      description: 'Smart workout generation that adapts to your coaching style and client needs',
    },
    {
      icon: Clock,
      title: 'Save Hours Every Week',
      description: 'Build 6-week training blocks in minutes, not hours',
    },
    {
      icon: Users,
      title: 'Scale Your Impact',
      description: 'Manage 10-100+ clients without sacrificing quality or personalization',
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'InBody integration, workout logging, and performance analytics',
    },
  ];

  const benefits = [
    'Personalized 6-week training blocks',
    'Trainer personas for consistent coaching voice',
    'Exercise library with AI suggestions',
    'Client progress tracking & analytics',
    'Mobile-friendly workout execution',
    'InBody scan integration',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-amber-200/20 bg-gradient-to-b from-amber-50/50 to-card/90 backdrop-blur-md dark:from-amber-950/20 dark:to-card/90 dark:border-amber-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 sm:min-h-[4.5rem] items-center justify-between gap-4 py-2">
            <a
              href="#login"
              className="flex min-w-0 items-center gap-3 sm:gap-4 rounded-lg outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MiloLogoMark size="header" withAlt={false} />
              <div className="min-w-0 text-left">
                <div
                  className="text-lg font-bold leading-tight sm:text-2xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Milo
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm">
                  AI Training Companion
                </div>
              </div>
            </a>
            <Button variant="ghost" size="sm" asChild>
              <a href="#login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-4 w-4" />
              Your loyal programming companion
            </div>
            
            <h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Smart programming for coaches who{' '}
              <span className="text-primary">care</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Build personalized training plans faster, without losing your coaching touch. 
              Milo handles the heavy lifting so you can focus on what matters—your clients.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="shadow-lg">
                <a href="#login">Get Started</a>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/40">
              <div>
                <div className="text-3xl font-bold text-primary">10x</div>
                <div className="text-sm text-muted-foreground">Faster Programming</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">100+</div>
                <div className="text-sm text-muted-foreground">Coaches Trust Milo</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">1000+</div>
                <div className="text-sm text-muted-foreground">Programs Generated</div>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div id="login" className="w-full max-w-md mx-auto">
            <Card className="shadow-2xl border-border/50">
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Sign in to your Milo account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form id="login-form" onSubmit={handleSubmit}>
                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="coach@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  type="submit"
                  form="login-form"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardFooter>
            </Card>

            {/* Demo Account Info */}
            <Card className="mt-4 bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">Demo Account</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Try Milo with these credentials:
                </p>
                <div className="space-y-1 text-xs font-mono bg-background/50 p-3 rounded-md">
                  <div>Email: <span className="text-primary">matt@bestrong.com</span></div>
                  <div>Password: <span className="text-primary">bestrong</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="text-center mb-16">
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built for busy coaches
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create world-class training programs without the busywork
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 
              className="text-3xl sm:text-4xl font-bold mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Everything you need, nothing you don't
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Milo is purpose-built for personal trainers and coaches who want to scale 
              their impact without sacrificing the personal touch that makes their coaching special.
            </p>
            <div className="grid gap-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 p-8 flex items-center justify-center">
              <Image 
                src="/milo-logo-gold.png" 
                alt="Milo mascot" 
                width={300} 
                height={300}
                className="opacity-60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-12 text-center text-primary-foreground">
          <h2 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to meet your new training companion?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join coaches who are building better programs in less time with Milo
          </p>
          <Button size="lg" variant="secondary" className="shadow-xl" asChild>
            <a href="#login">Get Started Today</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <MiloLogoMark size="md" />
              <span className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Milo
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Milo. Your loyal AI training companion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
