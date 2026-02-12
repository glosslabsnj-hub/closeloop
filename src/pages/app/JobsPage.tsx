import { useState } from "react";
import { useModuleRequired } from "@/hooks/useModuleRequired";
import { useActiveJobs, type ActiveJob } from "@/hooks/useActiveJobs";
import { useJobLabels } from "@/hooks/useJobLabels";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilterBar } from "@/components/jobs/JobFilterBar";
import { JobDetailSheet } from "@/components/jobs/JobDetailSheet";
import { NewJobDialog } from "@/components/jobs/NewJobDialog";
import { CSVImportDialog } from "@/components/jobs/CSVImportDialog";
import { ClipboardCheck, Plus, Upload, Loader2, ChevronDown } from "lucide-react";

export default function JobsPage() {
  const { isAllowed, isLoading: moduleLoading } = useModuleRequired(["job_tracking"]);
  const { jobs, isLoading, stats, filter, setFilter } = useActiveJobs();
  const labels = useJobLabels();

  const [selectedJob, setSelectedJob] = useState<ActiveJob | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleJobClick = (job: ActiveJob) => {
    setSelectedJob(job);
    setDetailOpen(true);
  };

  if (moduleLoading || !isAllowed) {
    return (
      <PageContainer padTop>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={labels.pageTitle}
        icon={ClipboardCheck}
        badge={
          stats.activeCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {stats.activeCount}
            </Badge>
          ) : undefined
        }
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  Import
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  Import from CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              New {labels.singularJob}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="mb-6">
        <JobFilterBar filter={filter} onFilterChange={setFilter} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={filter.status !== "all" || filter.search ? "No matching jobs" : labels.emptyStateMessage}
          description={
            filter.status !== "all" || filter.search
              ? "Try adjusting your filters."
              : `Create a new ${labels.singularJob.toLowerCase()} or import from CSV to get started.`
          }
          action={
            !filter.search && filter.status === "all" ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                New {labels.singularJob}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              labels={labels}
              onClick={handleJobClick}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NewJobDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <JobDetailSheet
        job={selectedJob}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageContainer>
  );
}
