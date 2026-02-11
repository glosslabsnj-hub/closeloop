/**
 * Partner Analysis Types
 *
 * Interfaces for the AI-generated business analysis returned
 * by the partner-analysis edge function.
 */

export interface AnalysisItem {
  title: string;
  explanation: string;
  evidence: string;
}

export interface ProblemItem {
  title: string;
  explanation: string;
  impact: string;
  fix_action: string;
  fix_link: string;
}

export interface GrowthItem {
  title: string;
  explanation: string;
  expected_impact: string;
  effort_level: "low" | "medium" | "high";
  action_link: string;
}

export interface ActionItem {
  title: string;
  description: string;
  action_link: string;
  priority: number;
}

export interface BenchmarkItem {
  metric: string;
  your_value: string;
  typical_range: string;
  assessment: "above" | "on_track" | "below";
}

export interface PartnerAnalysis {
  executive_summary: {
    headline: string;
    stage_assessment: string;
    overall_grade: "A" | "B" | "C" | "D" | "F";
    grade_reasoning: string;
  };
  current_state: {
    strengths: AnalysisItem[];
    weaknesses: AnalysisItem[];
  };
  problems: {
    critical: ProblemItem[];
    warnings: ProblemItem[];
  };
  growth: {
    quick_wins: GrowthItem[];
    strategic_initiatives: GrowthItem[];
    industry_specific: GrowthItem[];
  };
  action_plan: {
    this_week: ActionItem[];
    this_month: ActionItem[];
    this_quarter: ActionItem[];
  };
  industry_context: {
    narrative: string;
    benchmarks: BenchmarkItem[];
  };
  _meta: {
    business_name: string;
    business_mode: string;
    industry: string;
    stage: string;
  };
}

export interface PartnerAnalysisResponse {
  analysis: PartnerAnalysis;
  generated_at: string;
  expires_at: string;
  is_cached: boolean;
  refresh_count_today: number;
  max_refreshes_per_day: number;
}
