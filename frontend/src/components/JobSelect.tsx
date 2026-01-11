import { useState } from 'react';
import { useJobCategories } from '../hooks/useApi';
import type { JobCodeCategory, JobCode } from '../types';

interface JobSelection {
  category: JobCodeCategory;
  jobCode: JobCode | null;
}

interface JobSelectProps {
  onSelect: (selection: JobSelection) => void;
  disabled?: boolean;
}

export function JobSelect({ onSelect, disabled }: JobSelectProps) {
  const { data: categories, isLoading, error } = useJobCategories();
  const [selectedCategory, setSelectedCategory] = useState<JobCodeCategory | null>(null);

  if (isLoading) {
    return <div className="loading">Loading jobs...</div>;
  }

  if (error) {
    return <div className="error">Error loading jobs</div>;
  }

  const handleCategorySelect = (categoryId: number) => {
    const category = categories?.find((c) => c.id === categoryId);
    if (!category) return;

    setSelectedCategory(category);

    // If category has no sub-jobs, select it directly
    if (category.job_codes.length === 0) {
      onSelect({ category, jobCode: null });
      setSelectedCategory(null);
    }
  };

  const handleJobCodeSelect = (jobCodeId: number) => {
    if (!selectedCategory) return;

    const jobCode = selectedCategory.job_codes.find((jc) => jc.id === jobCodeId);
    if (!jobCode) return;

    onSelect({ category: selectedCategory, jobCode });
    setSelectedCategory(null);
  };

  const handleBack = () => {
    setSelectedCategory(null);
  };

  // Show job codes if a category with sub-jobs is selected
  if (selectedCategory && selectedCategory.job_codes.length > 0) {
    return (
      <div className="job-select">
        <button className="back-button" onClick={handleBack} disabled={disabled}>
          ← Back to Categories
        </button>
        <h3>{selectedCategory.name}</h3>
        <div className="job-grid">
          {selectedCategory.job_codes.map((jobCode) => (
            <button
              key={jobCode.id}
              className="job-button"
              onClick={() => handleJobCodeSelect(jobCode.id)}
              disabled={disabled}
            >
              {jobCode.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show categories
  return (
    <div className="job-select">
      <h3>Select Job</h3>
      <div className="job-grid">
        {categories?.map((category) => (
          <button
            key={category.id}
            className="job-button"
            onClick={() => handleCategorySelect(category.id)}
            disabled={disabled}
          >
            {category.name}
            {category.job_codes.length > 0 && ' →'}
          </button>
        ))}
      </div>
    </div>
  );
}
