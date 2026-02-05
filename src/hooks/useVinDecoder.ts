/**
 * useVinDecoder - Hook for decoding VINs using the free NHTSA vPIC API
 * Returns vehicle year, make, model from a 17-character VIN
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  bodyClass?: string;
  vehicleType?: string;
}

interface NHTSAResult {
  Variable: string;
  Value: string | null;
}

export function useVinDecoder() {
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decodeVin = useCallback(async (vin: string): Promise<VehicleInfo | null> => {
    // Validate VIN format (17 alphanumeric, no I, O, Q)
    const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    
    if (cleanVin.length !== 17) {
      setError("VIN must be exactly 17 characters");
      return null;
    }
    
    setIsDecoding(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanVin}?format=json`
      );
      
      if (!response.ok) {
        throw new Error("Failed to decode VIN");
      }
      
      const data = await response.json();
      const results = data.Results?.[0];
      
      if (!results) {
        throw new Error("No results from VIN decoder");
      }
      
      // Check for errors in the response
      if (results.ErrorCode && results.ErrorCode !== "0") {
        const errorText = results.ErrorText || "Invalid VIN";
        // Only show error for completely invalid VINs
        if (results.ErrorCode.includes("1")) {
          setError(errorText);
          toast.error(`VIN Error: ${errorText}`);
          return null;
        }
      }
      
      const vehicleInfo: VehicleInfo = {
        year: results.ModelYear || "",
        make: results.Make || "",
        model: results.Model || "",
        bodyClass: results.BodyClass || "",
        vehicleType: results.VehicleType || "",
      };
      
      // Only return if we got meaningful data
      if (vehicleInfo.year || vehicleInfo.make || vehicleInfo.model) {
        toast.success(`Found: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`);
        return vehicleInfo;
      }
      
      setError("Could not decode VIN - no vehicle data found");
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to decode VIN";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsDecoding(false);
    }
  }, []);

  return {
    decodeVin,
    isDecoding,
    error,
  };
}
