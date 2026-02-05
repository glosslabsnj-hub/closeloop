 import { Link } from "react-router-dom";
 import { motion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Check, Phone, LayoutDashboard } from "lucide-react";
 
 interface OnboardingCompleteProps {
   businessName: string;
 }
 
 export function OnboardingComplete({ businessName }: OnboardingCompleteProps) {
   return (
     <div className="text-center space-y-6">
       {/* Animated success icon */}
       <motion.div
         initial={{ scale: 0 }}
         animate={{ scale: 1 }}
         transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
       >
         <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
           <Check className="w-10 h-10 text-success" strokeWidth={3} />
         </div>
       </motion.div>
 
       {/* Success message */}
       <motion.div
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
       >
         <h2 className="text-2xl font-semibold">You're all set!</h2>
         <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
           {businessName ? `${businessName}'s` : "Your"} AI receptionist is ready.
           Let's test it out.
         </p>
       </motion.div>
 
       {/* Action buttons */}
       <motion.div
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.3 }}
         className="space-y-3 pt-4"
       >
         <Button size="lg" className="w-full gap-2" asChild>
           <Link to="/app/simulator?suggested=true">
             <Phone className="w-4 h-4" />
             Test Your AI
           </Link>
         </Button>
         <Button variant="outline" size="lg" className="w-full gap-2" asChild>
           <Link to="/app/dashboard">
             <LayoutDashboard className="w-4 h-4" />
             Go to Dashboard
           </Link>
         </Button>
       </motion.div>
 
       {/* Helpful tip */}
       <motion.p
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.5 }}
         className="text-sm text-muted-foreground"
       >
         You can always edit your AI's knowledge from the Business Brain.
       </motion.p>
     </div>
   );
 }