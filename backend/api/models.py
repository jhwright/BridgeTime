from django.db import models
from django.core.exceptions import ValidationError


class Employee(models.Model):
    """Employee synced from Gusto payroll system."""
    gusto_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    pin_hash = models.CharField(max_length=128, blank=True, help_text="Hashed 4-digit PIN for authentication")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def has_pin(self):
        return bool(self.pin_hash)

    def set_pin(self, pin: str):
        """Set the employee's PIN (hashed)."""
        from django.contrib.auth.hashers import make_password
        self.pin_hash = make_password(pin)

    def check_pin(self, pin: str) -> bool:
        """Verify a PIN against the stored hash."""
        from django.contrib.auth.hashers import check_password
        if not self.pin_hash:
            return False
        return check_password(pin, self.pin_hash)


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


class ActivityTag(models.Model):
    """Optional activity markers for time sessions (e.g., walk-in, phone call)."""
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    role = models.ForeignKey(
        JobCodeCategory,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_tags',
        help_text="If null, tag is global (available for all roles)"
    )
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#6B7280', help_text="Hex color for UI")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        if self.role:
            return f"{self.name} ({self.role.name})"
        return f"{self.name} (global)"


class TimeEntry(models.Model):
    """Individual clock-in/clock-out records."""
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='time_entries'
    )

    # Can be assigned to either a category (role) or a specific job code
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

    # Activity tags for categorizing work type
    activity_tags = models.ManyToManyField(
        ActivityTag,
        blank=True,
        related_name='time_entries'
    )

    # Interruption tracking (legacy - kept for backward compatibility)
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


def time_entry_photo_path(instance, filename):
    """Generate upload path for time entry photos."""
    from django.utils import timezone
    date_str = timezone.now().strftime('%Y/%m/%d')
    # Always save as .jpg since we convert HEIC
    base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
    return f'time_entry_photos/{date_str}/{instance.time_entry_id}/{base_name}.jpg'


class TimeEntryPhoto(models.Model):
    """Photos attached to time entries."""
    time_entry = models.ForeignKey(
        TimeEntry,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    image = models.ImageField(upload_to=time_entry_photo_path)
    caption = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Photo for {self.time_entry} ({self.created_at})"

    def save(self, *args, **kwargs):
        """Convert HEIC images to JPEG before saving."""
        # Only convert if this is a new upload (file has a 'file' attribute)
        if self.image and hasattr(self.image, 'file'):
            self._convert_image_to_jpeg()
        super().save(*args, **kwargs)

    def _convert_image_to_jpeg(self):
        """Convert the uploaded image to JPEG format."""
        from io import BytesIO
        from django.core.files.uploadedfile import InMemoryUploadedFile
        from PIL import Image
        import logging

        logger = logging.getLogger(__name__)

        # Note: pillow_heif is registered at app startup in apps.py

        try:
            # Read the image
            self.image.seek(0)
            img = Image.open(self.image)

            # Convert to RGB if necessary (HEIC can have different modes)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Save as JPEG to a buffer
            output = BytesIO()
            img.save(output, format='JPEG', quality=85)
            output.seek(0)

            # Get the new filename
            original_name = self.image.name
            base_name = original_name.rsplit('.', 1)[0] if '.' in original_name else original_name
            new_name = f"{base_name}.jpg"

            # Replace the image file
            self.image = InMemoryUploadedFile(
                output,
                'ImageField',
                new_name,
                'image/jpeg',
                output.getbuffer().nbytes,
                None
            )
            logger.info(f"Converted image to JPEG: {new_name}")
        except Exception as e:
            # Log the error but keep the original image
            logger.warning(f"Image conversion failed, keeping original: {e}")
