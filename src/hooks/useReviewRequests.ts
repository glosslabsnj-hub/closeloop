import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SendReviewRequestInput {
  customerId: string;
  jobId?: string;
  bookingId?: string;
  channel?: "sms" | "email" | "both";
}

export function useReviewRequests() {
  const { toast } = useToast();

  const sendReviewRequest = useMutation({
    mutationFn: async (input: SendReviewRequestInput) => {
      const { data, error } = await supabase.functions.invoke("send-review-request", {
        body: {
          customer_id: input.customerId,
          job_id: input.jobId,
          booking_id: input.bookingId,
          channel: input.channel || "both",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send review request");

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Review request sent",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    sendReviewRequest,
  };
}
