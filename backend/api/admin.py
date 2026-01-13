from django import forms
from django.contrib import admin
from .models import Employee, JobCodeCategory, JobCode, TimeEntry, ActivityTag, TimeEntryPhoto


class EmployeeAdminForm(forms.ModelForm):
    """Custom form for Employee admin with PIN field."""
    pin = forms.CharField(
        max_length=10,
        min_length=4,
        required=False,
        widget=forms.PasswordInput(render_value=False),
        help_text="Enter a 4-10 digit PIN. Leave blank to keep existing PIN."
    )

    class Meta:
        model = Employee
        fields = ['first_name', 'last_name', 'email', 'is_active', 'gusto_id']

    def clean_pin(self):
        pin = self.cleaned_data.get('pin')
        if pin and not pin.isdigit():
            raise forms.ValidationError("PIN must contain only digits")
        return pin

    def save(self, commit=True):
        employee = super().save(commit=False)
        pin = self.cleaned_data.get('pin')
        if pin:
            employee.set_pin(pin)
        if commit:
            employee.save()
        return employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    form = EmployeeAdminForm
    list_display = ['full_name', 'email', 'is_active', 'has_pin', 'gusto_id']
    list_filter = ['is_active']
    search_fields = ['first_name', 'last_name', 'email']
    fieldsets = (
        (None, {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('Authentication', {
            'fields': ('pin',),
            'description': 'Set a 4-10 digit PIN for employee authentication'
        }),
        ('Status', {
            'fields': ('is_active', 'gusto_id')
        }),
    )

    def has_pin(self, obj):
        return bool(obj.pin_hash)
    has_pin.boolean = True
    has_pin.short_description = 'PIN Set'


@admin.register(JobCodeCategory)
class JobCodeCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'alias', 'is_active']
    list_filter = ['is_active']


@admin.register(JobCode)
class JobCodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'alias', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name']


@admin.register(ActivityTag)
class ActivityTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'role', 'color', 'is_active']
    list_filter = ['is_active', 'role']
    search_fields = ['name']


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'job_display_name', 'start_time', 'end_time', 'is_interruption', 'is_paused']
    list_filter = ['is_interruption', 'is_paused', 'job_category']
    search_fields = ['employee__first_name', 'employee__last_name']
    date_hierarchy = 'start_time'


@admin.register(TimeEntryPhoto)
class TimeEntryPhotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'time_entry', 'caption', 'created_at']
    list_filter = ['created_at']
    search_fields = ['caption', 'time_entry__employee__first_name']
    date_hierarchy = 'created_at'
