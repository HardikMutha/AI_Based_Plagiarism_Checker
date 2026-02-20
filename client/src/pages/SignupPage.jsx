import React, { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, User, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

const SignupPage = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (username && email && password) {
            try {
                await register(username, email, password);
                toast.success("Account successfully created! Please log in.");
                navigate("/login");
            } catch (err) {
                toast.error(err.message || "Failed to create an account");
                setError(err.message || "Failed to create an account");
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative z-10"
                    >
                        <h2 className="text-3xl font-bold tracking-tight mb-4">Plagiarism Detection System</h2>
                        <p className="text-muted-foreground text-lg mb-8">
                            Create an admin account to check for paraphrased AI content, exact matches across files, and missing citations.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-primary/10 text-primary">
                                    <UserPlus size={18} />
                                </div>
                                <span className="text-sm font-medium">Easy onboarding process</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 md:p-12 flex flex-col justify-center"
                >
                    <div className="mb-8 text-center md:text-left">
                        <h3 className="text-2xl font-bold">Create an account</h3>
                        <p className="text-muted-foreground mt-2">Enter your details below to sign up</p>
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
                            <Label htmlFor="email">Email</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 h-11"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
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
                            {loading ? "Creating account..." : "Sign Up"}
                            <ArrowRight className="ml-2" size={18} />
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SignupPage;
