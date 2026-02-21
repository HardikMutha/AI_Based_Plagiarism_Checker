import React, { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, User, Lock, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (username && password) {
      try {
        await login(username, password);
        toast.success("Welcome back you are logged in!");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.message || "Invalid credentials");
        setError(err.message || "Invalid credentials");
      }
    } else {
      toast.error("Please fill in all fields.");
      setError("Please fill in all fields.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative p-4 overflow-hidden">
      {/* Background Texture Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-background/50 hover:bg-background/80 px-3 py-2 rounded-md backdrop-blur-md border border-border/50 shadow-sm"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-card rounded-2xl shadow-2xl overflow-hidden border relative z-10">

        <div className="hidden md:flex flex-col justify-center p-12 bg-primary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
              <ShieldCheck className="text-primary w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">Welcome Back</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Securely access your admin dashboard to run and review plagiarism scans.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-8 md:p-12 flex flex-col justify-center"
        >
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-bold">Sign In</h3>
            <p className="text-muted-foreground mt-2">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative group">
                <User className="absolute left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  className="pl-10 h-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm text-primary hover:underline font-medium">Forgot password?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-6" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
              <LogIn className="ml-2" size={18} />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
