from django.contrib import admin
from .models import Employee, JobCodeCategory, JobCode, TimeEntry


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'is_active', 'gusto_id']
    list_filter = ['is_active']
    search_fields = ['first_name', 'last_name', 'email']


@admin.register(JobCodeCategory)
class JobCodeCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'alias', 'is_active']
    list_filter = ['is_active']


@admin.register(JobCode)
class JobCodeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'alias', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name']


@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['employee', 'job_display_name', 'start_time', 'end_time', 'is_interruption', 'is_paused']
    list_filter = ['is_interruption', 'is_paused', 'job_category']
    search_fields = ['employee__first_name', 'employee__last_name']
    date_hierarchy = 'start_time'
