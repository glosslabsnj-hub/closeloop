import { Card, CardContent } from "@/components/ui/card";
import { Star, Shield, Lock } from "lucide-react";

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
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by local businesses
          </h2>
          <p className="text-lg text-muted-foreground">
            Real results from real businesses
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Trust & Security */}
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 rounded-2xl bg-card border">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Secure & Private</p>
                <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
              </div>
            </div>
            <div className="hidden sm:block h-10 w-px bg-border" />
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">HIPAA-Ready Options</p>
                <p className="text-sm text-muted-foreground">For medical practices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
