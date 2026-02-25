import { Star, Shield, Lock, Quote } from "lucide-react";

// Example testimonials representing typical customer experiences
const testimonials = [
  {
    quote: "Our AI assistant books more appointments than we could handle manually. Revenue is up and we never miss a call.",
    author: "Service Business Owner",
    business: "Auto Detailing Shop",
    role: "Owner",
    rating: 5,
  },
  {
    quote: "We were missing nearly half our calls. Now every single one gets answered and converted to a booking.",
    author: "Restaurant Manager",
    business: "Local Restaurant",
    role: "Manager",
    rating: 5,
  },
  {
    quote: "Setup took minutes, not days. The AI sounds natural and customers love the instant response.",
    author: "Salon Owner",
    business: "Hair & Beauty Salon",
    role: "Owner",
    rating: 5,
  },
];

// Example testimonial representing a typical customer experience
const featured = {
  quote: "We went from losing dozens of calls a week to capturing every single one. The ROI was obvious within the first week.",
  author: "Towing Company Operator",
  business: "Regional Towing & Recovery",
  role: "Operations Manager",
  rating: 5,
};

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_70%_50%,hsl(280_60%_55%/0.04),transparent)] pointer-events-none" />

      <div className="container relative">
        {/* Social proof counter */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            What businesses are saying
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-5">
            Built for{" "}
            <span className="text-gradient-primary">local businesses</span>
          </h2>
          <p className="text-lg text-muted-foreground/80 leading-relaxed">
            See how AI voice assistants help businesses capture every call
          </p>
        </div>

        {/* Featured testimonial */}
        <div className="max-w-3xl mx-auto mb-14">
          <div className="relative rounded-xl bg-card/70 backdrop-blur-sm border border-primary/20 p-8 md:p-10 shadow-[0_0_40px_-12px_hsl(230_70%_62%/0.12)]">
            <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/10" />
            <div className="flex gap-0.5 mb-4">
              {[...Array(featured.rating)].map((_, j) => (
                <Star key={j} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium leading-relaxed mb-6">
              "{featured.quote}"
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                {featured.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{featured.author}</p>
                <p className="text-sm text-muted-foreground">
                  {featured.role}, {featured.business}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-14">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="group relative rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 p-7 hover:border-primary/30 hover:bg-card/80 hover:shadow-[0_8px_32px_-8px_hsl(230_70%_62%/0.1)] transition-all duration-300"
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors" />
              <div className="flex gap-0.5 mb-5">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <Star key={j} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="pt-4 border-t border-border/30">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role}, {testimonial.business}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust & Security */}
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Secure & Private</p>
                <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
              </div>
            </div>
            <div className="hidden sm:block h-12 w-px bg-border/30" />
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
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
