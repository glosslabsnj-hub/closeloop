import { Card, CardContent } from "@/components/ui/card";
import { Star, Shield, Lock, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "CloseLoop recovered $12,000 in just the first month. My AI assistant books more than my receptionist ever did.",
    author: "Mike's Auto Detailing",
    role: "Service Business",
    rating: 5,
  },
  {
    quote: "I was missing 40% of my calls. Now every single one gets answered and pushed to booking.",
    author: "Elite Mobile Detail",
    role: "Service Business",
    rating: 5,
  },
  {
    quote: "Setup took 10 minutes. The AI sounds incredible — customers can't tell it's not human.",
    author: "Pristine Auto Spa",
    role: "Service Business",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Trusted by local businesses
          </h2>
          <p className="text-lg text-muted-foreground">
            Real results from real businesses
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-14">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="bg-card hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
              {/* Quote decoration */}
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
              
              <CardContent className="p-7">
                <div className="flex gap-0.5 mb-5">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="pt-4 border-t border-border">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Trust & Security */}
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 p-8 rounded-2xl bg-card border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Secure & Private</p>
                <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
              </div>
            </div>
            <div className="hidden sm:block h-12 w-px bg-border" />
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">HIPAA-Ready Options</p>
                <p className="text-sm text-muted-foreground">For medical practices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
