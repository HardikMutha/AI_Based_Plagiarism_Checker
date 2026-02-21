import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
} from "../components/ui/navigation-menu";
import { useNavigate } from "react-router-dom";

import {
  FileText,
  Code,
  Brain,
  Quote,
  GraduationCap,
  BarChart3,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  BookOpen,
  Shield,
  Globe,
  Users,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { scrollYProgress } = useScroll();
  const { user } = useAuth();

  const headerBgLight = useTransform(
    scrollYProgress,
    [0, 0.1],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.98)"],
  );
  const headerBgDark = useTransform(
    scrollYProgress,
    [0, 0.1],
    ["rgba(9, 9, 11, 0)", "rgba(9, 9, 11, 0.98)"],
  );
  const headerBg = isDarkMode ? headerBgDark : headerBgLight;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const statsRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.2 });
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  const features = [
    {
      title: "Text Similarity Detection",
      description:
        "Advanced algorithms to detect plagiarized content across millions of sources, ensuring original submissions.",
      icon: FileText,
    },
    {
      title: "Code Similarity Analysis",
      description:
        "Specialized detection for programming assignments supporting multiple languages and structural similarity checks.",
      icon: Code,
    },
    {
      title: "AI Paraphrase Detection",
      description:
        "Identify AI-generated and paraphrased content using state-of-the-art language models.",
      icon: Brain,
    },
    {
      title: "Smart Citation Suggestions",
      description:
        "Automated citation recommendations and formatting in APA, MLA, and Chicago styles.",
      icon: Quote,
    },
    {
      title: "LMS Integration",
      description:
        "Seamless integration with Moodle, Google Classroom, and other learning management systems.",
      icon: GraduationCap,
    },
    {
      title: "Real-time Reports",
      description:
        "Comprehensive similarity reports with highlighted matches and originality scores.",
      icon: BarChart3,
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Upload Submission",
      description:
        "Students submit assignments directly through LMS or platform interface",
      icon: FileText,
    },
    {
      number: "02",
      title: "Advanced Analysis",
      description:
        "AI-powered engine scans for text similarity, code patterns, and AI-generated content",
      icon: Brain,
    },
    {
      number: "03",
      title: "Generate Report",
      description:
        "Detailed originality report with similarity scores and citation suggestions",
      icon: BarChart3,
    },
    {
      number: "04",
      title: "Review & Grade",
      description:
        "Instructors review findings and provide feedback with integrated grading",
      icon: CheckCircle,
    },
  ];

  const stats = [
    { value: "99.7%", label: "Detection Accuracy", icon: Shield },
    { value: "50M+", label: "Sources Indexed", icon: Globe },
    { value: "15+", label: "Programming Languages", icon: Code },
    { value: "10K+", label: "Active Institutions", icon: Users },
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-zinc-950" : "bg-zinc-50"}`}
    >
      <div className="font-serif text-zinc-900 dark:text-zinc-50 tracking-wide">
        <motion.nav
          style={{ backgroundColor: headerBg }}
          className={`fixed w-full z-50 transition-all duration-300 border-b border-transparent ${
            isScrolled
              ? "border-zinc-200 dark:border-zinc-800 shadow-sm backdrop-blur-md"
              : ""
          }`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center space-x-3"
              >
                <BookOpen className="w-7 h-7 text-zinc-950 dark:text-white" />
                <Badge
                  variant="outline"
                  className="hidden sm:block border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900"
                >
                  Plagiarism Checker
                </Badge>
              </motion.div>

              <NavigationMenu className="hidden md:flex">
                <NavigationMenuList>
                  {["Features", "How It Works", "Pricing", "Contact"].map(
                    (item, index) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <NavigationMenuItem>
                          <NavigationMenuLink className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer">
                            {item}
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      </motion.div>
                    ),
                  )}
                </NavigationMenuList>
              </NavigationMenu>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center space-x-4"
              >
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
                {!user ? (
                  <Button
                    onClick={() => navigate("/login")}
                    className="bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all hover:cursor-pointer"
                  >
                    Log In
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all hover:cursor-pointer"
                  >
                    Dashboard
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-md transition-all"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.nav>

        <section
          ref={heroRef}
          className="pt-40 pb-20 px-4 overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-300"
        >
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-8 bg-stone-100 dark:bg-zinc-900 text-stone-800 dark:text-zinc-300 border border-stone-200 dark:border-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-800 px-4 py-1 text-xs uppercase tracking-widest">
                AI-Powered Academic Integrity
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold text-zinc-950 dark:text-white mb-6 max-w-4xl mx-auto leading-[1.1] tracking-tight"
            >
              Plagiarism & Authenticity Checker for Assignments
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Advanced AI-based tool that checks assignment submissions for
              plagiarism, paraphrased content, and originality — including code
              assignments.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
            >
              <Button
                onClick={() => navigate("/login")}
                size="lg"
                className="bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 px-8 h-14 text-base shadow-lg group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-14 text-base"
              >
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              ref={statsRef}
              variants={staggerContainer}
              initial="hidden"
              animate={statsInView ? "visible" : "hidden"}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border-t border-zinc-100 dark:border-zinc-800 pt-12"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="text-center group"
                  >
                    <div className="w-12 h-12 mx-auto mb-4 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-100 dark:border-zinc-800 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
                      <Icon className="w-5 h-5 text-zinc-900 dark:text-zinc-300" />
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
                      {stat.value}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section
          ref={featuresRef}
          className="py-24 bg-zinc-50 dark:bg-zinc-900/50 transition-colors duration-300"
        >
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={featuresInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-zinc-950 dark:text-white mb-4 tracking-tight">
                Comprehensive Detection Features
              </h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
                Our platform combines multiple detection methods to ensure
                absolute academic integrity.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
            >
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="h-full"
                  >
                    <Card className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                      <CardHeader className="pb-4">
                        <div className="w-12 h-12 bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg flex items-center justify-center mb-4">
                          <Icon className="w-5 h-5 text-zinc-800 dark:text-zinc-300" />
                        </div>
                        <CardTitle className="text-xl font-bold text-zinc-950 dark:text-white">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed font-serif">
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section
          ref={stepsRef}
          className="py-24 bg-white dark:bg-zinc-950 transition-colors duration-300"
        >
          <div className="container mx-auto px-4 max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-zinc-950 dark:text-white mb-4 tracking-tight">
                How It Works
              </h2>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
                A frictionless four-step process for comprehensive plagiarism
                detection.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={stepsInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative group p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-white dark:hover:bg-zinc-800/50 hover:shadow-xl hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        delay: index * 0.2,
                      }}
                      className="absolute -right-4 -top-8 text-[120px] font-bold text-transparent bg-clip-text bg-gradient-to-b from-zinc-200/50 to-transparent dark:from-zinc-800/50 z-0 pointer-events-none"
                    >
                      {step.number}
                    </motion.div>

                    <div className="relative z-10">
                      <div className="w-12 h-12 bg-white dark:bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-700 mb-6 shadow-sm">
                        <Icon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="py-24 bg-zinc-950 dark:bg-black text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold mb-6 tracking-tight text-white"
            >
              Seamless LMS Integration
            </motion.h2>

            <motion.p
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-zinc-400 max-w-2xl mx-auto mb-16"
            >
              Integrate effortlessly with popular learning management systems
              for automated checking.
            </motion.p>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-4 mb-14"
            >
              {["Moodle", "Google Classroom", "Canvas", "Blackboard"].map(
                (lms, index) => (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className="bg-zinc-900 border border-zinc-800 rounded-full px-8 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    {lms}
                  </motion.div>
                ),
              )}
            </motion.div>

            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-white hover:text-black transition-colors h-14 px-8"
            >
              Learn About Integration
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.section>

        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50 transition-colors duration-300">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <Card className="bg-zinc-950 dark:bg-zinc-900 text-white border border-transparent dark:border-zinc-800 shadow-2xl overflow-hidden relative rounded-3xl">
                <CardContent className="relative py-20 px-8 text-center">
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold mb-6 tracking-tight"
                  >
                    Start Ensuring Academic Integrity Today
                  </motion.h2>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                    className="text-lg text-zinc-400 mb-10 max-w-2xl mx-auto"
                  >
                    Join thousands of educational institutions using our
                    platform to maintain absolute academic standards.
                  </motion.p>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                    className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
                  >
                    <Input
                      type="email"
                      placeholder="Enter your work email"
                      className="bg-zinc-900 dark:bg-zinc-950 border-zinc-800 dark:border-zinc-700 text-white placeholder:text-zinc-500 h-12 focus-visible:ring-1 focus-visible:ring-zinc-700"
                    />
                    <Button
                      onClick={() => navigate("/login")}
                      className="bg-white text-black hover:bg-zinc-200 h-12 px-8 whitespace-nowrap w-full sm:w-auto font-semibold"
                    >
                      Sign Up Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
          <div className="container mx-auto px-4 py-16 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <BookOpen className="w-6 h-6 text-zinc-950 dark:text-white" />
                  <span className="font-bold text-lg text-zinc-950 dark:text-white tracking-tight">
                    Plagiarism Checker
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Advanced plagiarism detection and structural code analysis for
                  modern educational institutions.
                </p>
              </motion.div>

              {["Product", "Resources", "Legal"].map((section, idx) => (
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                >
                  <h4 className="font-bold text-zinc-950 dark:text-white mb-6">
                    {section}
                  </h4>
                  <ul className="space-y-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <li className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                      {section === "Product" && "Features"}
                      {section === "Resources" && "Documentation"}
                      {section === "Legal" && "Privacy Policy"}
                    </li>
                    <li className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                      {section === "Product" && "Pricing"}
                      {section === "Resources" && "Support"}
                      {section === "Legal" && "Terms of Service"}
                    </li>
                    <li className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                      {section === "Product" && "Integration"}
                      {section === "Resources" && "Blog"}
                      {section === "Legal" && "Security"}
                    </li>
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
              className="border-t border-zinc-200 dark:border-zinc-800 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500 dark:text-zinc-400"
            >
              <p>&copy; 2026. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <span className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Twitter
                </span>
                <span className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                  LinkedIn
                </span>
                <span className="cursor-pointer hover:text-zinc-900 dark:hover:text-white transition-colors">
                  GitHub
                </span>
              </div>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
