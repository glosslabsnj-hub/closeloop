import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type SoundType = "order" | "call" | "lead" | "urgent" | "notification";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  repeat?: number;
  delay?: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  order: { frequency: 800, duration: 0.15, type: "sine", repeat: 3, delay: 0.1 }, // Kitchen bell
  call: { frequency: 600, duration: 0.2, type: "sine", repeat: 2, delay: 0.15 },
  lead: { frequency: 440, duration: 0.1, type: "sine" },
  urgent: { frequency: 900, duration: 0.1, type: "square", repeat: 4, delay: 0.08 },
  notification: { frequency: 520, duration: 0.1, type: "sine" },
};

export function useSoundManager() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(true);

  // Initialize audio context on first user interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // WebKit prefix for older Safari versions
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    if (!soundEnabledRef.current) return;
    
    try {
      const ctx = initAudio();
      const config = SOUND_CONFIGS[type];
      const repeat = config.repeat || 1;
      const delay = config.delay || 0;

      for (let i = 0; i < repeat; i++) {
        const startTime = ctx.currentTime + (i * (config.duration + delay));
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = config.frequency;
        oscillator.type = config.type;
        
        // Fade in/out for smoother sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration);
      }
    } catch {
      // Audio playback not available - silently fail
    }
  }, [initAudio]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
  }, []);

  return { playSound, setSoundEnabled, initAudio };
}

export function SoundManager() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { playSound, setSoundEnabled, initAudio } = useSoundManager();
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Load sound preference
  useEffect(() => {
    const stored = localStorage.getItem("notificationSoundsEnabled");
    setSoundEnabled(stored !== "false");
  }, [setSoundEnabled]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudio]);

  // Subscribe to realtime events
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel('sound-manager')
      // New food orders
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const eventId = `order-${payload.new.id}`;
          if (processedEventsRef.current.has(eventId)) return;
          processedEventsRef.current.add(eventId);
          
          playSound("order");
          const order = payload.new as { order_number?: string; order_type?: string };
          toast({
            title: "🍽️ New Order!",
            description: `Order #${order.order_number} - ${order.order_type?.toUpperCase() || "Pickup"}`,
            action: (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => navigate("/app/orders")}
              >
                View
              </Button>
            ),
          });
        }
      )
      // New calls
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const eventId = `call-${payload.new.id}`;
          if (processedEventsRef.current.has(eventId)) return;
          processedEventsRef.current.add(eventId);
          
          playSound("call");
        }
      )
      // New bookings
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const eventId = `booking-${payload.new.id}`;
          if (processedEventsRef.current.has(eventId)) return;
          processedEventsRef.current.add(eventId);
          
          playSound("lead");
          toast({
            title: "📅 New Booking!",
            description: "A new appointment was just scheduled.",
            action: (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => navigate("/app/bookings")}
              >
                View
              </Button>
            ),
          });
        }
      )
      // Urgent dispatch jobs
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dispatch_jobs', filter: `tenant_id=eq.${tenant.id}` },
        (payload) => {
          const job = payload.new as { id: string; priority?: string; job_type?: string; customer_name?: string };
          const eventId = `dispatch-${job.id}`;
          if (processedEventsRef.current.has(eventId)) return;
          processedEventsRef.current.add(eventId);

          if (job.priority === "urgent") {
            playSound("urgent");
          } else {
            playSound("notification");
          }
          toast({
            title: "🚚 New Job!",
            description: `${job.job_type || "Job"} - ${job.customer_name || "Customer"}`,
            action: (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => navigate("/app/dispatch")}
              >
                View
              </Button>
            ),
          });
        }
      )
      .subscribe();

    // Cleanup old events periodically
    const cleanup = setInterval(() => {
      if (processedEventsRef.current.size > 100) {
        processedEventsRef.current.clear();
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanup);
    };
  }, [tenant?.id, playSound, toast, navigate]);

  return null; // This is a non-visual component
}
