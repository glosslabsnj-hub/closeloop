 import { cn } from "@/lib/utils";
 import { CheckCircle2 } from "lucide-react";
 
 export interface OnboardingStep {
   id: string;
   title: string;
   description: string;
   icon: React.ElementType;
 }
 
 interface OnboardingProgressProps {
   steps: OnboardingStep[];
   currentStep: number;
   onStepClick?: (stepIndex: number) => void;
 }
 
 export function OnboardingProgress({ steps, currentStep, onStepClick }: OnboardingProgressProps) {
   return (
     <nav className="space-y-1">
       {steps.map((step, index) => {
         const stepNumber = index + 1;
         const isActive = stepNumber === currentStep;
         const isComplete = stepNumber < currentStep;
         const isClickable = isComplete && onStepClick;
         const Icon = step.icon;
 
         return (
           <button
             key={step.id}
             type="button"
             onClick={() => isClickable && onStepClick(stepNumber)}
             disabled={!isClickable}
             className={cn(
               "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
               isActive && "bg-primary/10",
               isComplete && "hover:bg-muted/50 cursor-pointer",
               !isComplete && !isActive && "opacity-50 cursor-default"
             )}
           >
             {/* Step indicator */}
             <div
               className={cn(
                 "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                 isActive && "bg-primary text-primary-foreground",
                 isComplete && "bg-success text-success-foreground",
                 !isActive && !isComplete && "bg-muted text-muted-foreground"
               )}
             >
               {isComplete ? (
                 <CheckCircle2 className="h-4 w-4" />
               ) : (
                 stepNumber
               )}
             </div>
 
             {/* Step text */}
             <div className="min-w-0">
               <p
                 className={cn(
                   "text-sm font-medium truncate",
                   isActive && "text-primary",
                   isComplete && "text-muted-foreground",
                   !isActive && !isComplete && "text-muted-foreground"
                 )}
               >
                 {step.title}
               </p>
               {isActive && (
                 <p className="text-[13px] text-muted-foreground truncate">
                   {step.description}
                 </p>
               )}
             </div>
           </button>
         );
       })}
     </nav>
   );
 }