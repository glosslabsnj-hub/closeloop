import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  Bot,
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Voice Assistant",
    description: "Answers calls 24/7, qualifies leads, handles objections, and books appointments automatically.",
  },
  {
    icon: Phone,
    title: "Missed Call Recovery",
    description: "Every missed call gets an instant callback or SMS. Never lose a lead again.",
  },
  {
    icon: Calendar,
    title: "Smart Booking",
    description: "AI offers available slots, confirms appointments, and collects deposits automatically.",
  },
  {
    icon: MessageSquare,
    title: "Unified Inbox",
    description: "All conversations in one place. AI summaries help you understand every lead instantly.",
  },
  {
    icon: DollarSign,
    title: "Deposit Collection",
    description: "Secure payment links sent automatically. Reduce no-shows and protect your revenue.",
  },
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    description: "See exactly how much revenue CloseLoop recovered. Track your ROI in real-time.",
  },
];

const testimonials = [
  {
    quote: "CloseLoop recovered $12,000 in just the first month. My AI assistant books more than my receptionist.",
    author: "Mike's Auto Detailing",
    rating: 5,
  },
  {
    quote: "I was missing 40% of my calls. Now every single one gets answered and pushed to booking.",
    author: "Elite Mobile Detail",
    rating: 5,
  },
  {
    quote: "Setup took 60 seconds. The AI sounds incredible - customers can't tell it's not human.",
    author: "Pristine Auto Spa",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Bot className="h-4 w-4" />
              AI-Powered Revenue Recovery
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
              Never miss a{" "}
              <span className="text-primary">customer</span>
              {" "}again
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              CloseLoop turns every call, text, and inquiry into booked appointments with deposits. 
              AI answers your phone 24/7 and pushes every lead to booking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                <PlayCircle className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Setup in 60 seconds • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-secondary/30 py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">40%</p>
              <p className="text-sm text-muted-foreground mt-1">Calls go unanswered</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">$1,200</p>
              <p className="text-sm text-muted-foreground mt-1">Lost per missed call</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground mt-1">AI availability</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">3x</p>
              <p className="text-sm text-muted-foreground mt-1">More bookings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to close more deals
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One platform to answer calls, recover leads, book appointments, and collect deposits.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How CloseLoop works
            </h2>
            <p className="text-lg text-muted-foreground">
              From missed call to booked appointment in seconds
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Call comes in", desc: "AI answers instantly or calls back missed calls" },
              { step: "2", title: "AI qualifies", desc: "Answers questions, handles objections naturally" },
              { step: "3", title: "Books appointment", desc: "Offers available slots and confirms" },
              { step: "4", title: "Collects deposit", desc: "Sends payment link via SMS" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by service businesses
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                  <p className="font-semibold">{testimonial.author}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start recovering revenue today
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join hundreds of service businesses using CloseLoop to never miss another opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm opacity-90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              60-second setup
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              AI trained on your business
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
