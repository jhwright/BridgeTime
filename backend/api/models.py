from django.db import models
from django.core.exceptions import ValidationError


class Employee(models.Model):
    """Employee synced from Gusto payroll system."""
    gusto_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class JobCodeCategory(models.Model):
    """Top-level job categories (Level 0): WRP, Events, Kitchen, etc."""
    name = models.CharField(max_length=100, unique=True)
    alias = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Job Code Categories'

    def __str__(self):
        return self.name


class JobCode(models.Model):
    """Sub-jobs under a category (Level 1), primarily for WRP properties."""
    category = models.ForeignKey(
        JobCodeCategory,
        on_delete=models.CASCADE,
        related_name='job_codes'
    )
    name = models.CharField(max_length=100)
    alias = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ['category', 'name']

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class TimeEntry(models.Model):
    """Individual clock-in/clock-out records."""
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='time_entries'
    )
    # Can be assigned to either a category or a specific job code
    job_category = models.ForeignKey(
        JobCodeCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='time_entries'
    )
    job_code = models.ForeignKey(
        JobCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='time_entries'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True, help_text="Optional description of work performed")

    # Interruption tracking
    is_interruption = models.BooleanField(default=False)
    interrupted_entry = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interruptions'
    )
    is_paused = models.BooleanField(default=False)
    interruption_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        verbose_name_plural = 'Time Entries'

    def __str__(self):
        job = self.job_code or self.job_category
        return f"{self.employee} - {job} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"

    def clean(self):
        # Must have either job_category or job_code
        if not self.job_category and not self.job_code:
            raise ValidationError("Must specify either job_category or job_code")

        # If job_code is set, job_category should match
        if self.job_code and self.job_category:
            if self.job_code.category != self.job_category:
                raise ValidationError("job_category must match job_code's category")

        # Set job_category from job_code if not set
        if self.job_code and not self.job_category:
            self.job_category = self.job_code.category

    def save(self, *args, **kwargs):
        # Auto-set job_category from job_code
        if self.job_code and not self.job_category:
            self.job_category = self.job_code.category
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        """Entry is active if it has no end_time and is not paused."""
        return self.end_time is None and not self.is_paused

    @property
    def job_display_name(self):
        """Returns the display name for the job."""
        if self.job_code:
            return str(self.job_code)
        return str(self.job_category)

    @property
    def duration_seconds(self):
        """Calculate duration in seconds."""
        if not self.end_time:
            from django.utils import timezone
            return (timezone.now() - self.start_time).total_seconds()
        return (self.end_time - self.start_time).total_seconds()
