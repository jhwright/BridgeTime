from rest_framework import serializers
from .models import Employee, JobCodeCategory, JobCode, TimeEntry


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'gusto_id', 'first_name', 'last_name', 'full_name', 'email', 'is_active']


class JobCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobCode
        fields = ['id', 'name', 'alias', 'is_active']


class JobCodeCategorySerializer(serializers.ModelSerializer):
    job_codes = JobCodeSerializer(many=True, read_only=True)

    class Meta:
        model = JobCodeCategory
        fields = ['id', 'name', 'alias', 'is_active', 'job_codes']


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    job_display_name = serializers.CharField(read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee', 'employee_name',
            'job_category', 'job_code', 'job_display_name',
            'start_time', 'end_time', 'duration_seconds', 'is_active',
            'description',
            'is_interruption', 'interrupted_entry', 'is_paused', 'interruption_reason',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TimeEntryDetailSerializer(TimeEntrySerializer):
    """Extended serializer with nested employee and job info."""
    employee = EmployeeSerializer(read_only=True)
    job_category_detail = JobCodeCategorySerializer(source='job_category', read_only=True)
    job_code_detail = JobCodeSerializer(source='job_code', read_only=True)
    paused_entry = serializers.SerializerMethodField()

    class Meta(TimeEntrySerializer.Meta):
        fields = TimeEntrySerializer.Meta.fields + [
            'job_category_detail', 'job_code_detail', 'paused_entry'
        ]

    def get_paused_entry(self, obj):
        """If this is an interruption, get the entry it interrupted."""
        if obj.interrupted_entry:
            return {
                'id': obj.interrupted_entry.id,
                'job_display_name': obj.interrupted_entry.job_display_name,
                'start_time': obj.interrupted_entry.start_time,
            }
        return None


class ClockStartSerializer(serializers.Serializer):
    """Serializer for clock-in requests."""
    employee_id = serializers.IntegerField()
    job_category_id = serializers.IntegerField(required=False)
    job_code_id = serializers.IntegerField(required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('job_category_id') and not data.get('job_code_id'):
            raise serializers.ValidationError("Must provide job_category_id or job_code_id")
        return data


class ClockStopSerializer(serializers.Serializer):
    """Serializer for clock-out requests."""
    employee_id = serializers.IntegerField()


class InterruptedStartSerializer(serializers.Serializer):
    """Serializer for interrupted start requests."""
    employee_id = serializers.IntegerField()
    job_category_id = serializers.IntegerField(required=False)
    job_code_id = serializers.IntegerField(required=False)
    reason = serializers.CharField(max_length=500)

    def validate(self, data):
        if not data.get('job_category_id') and not data.get('job_code_id'):
            raise serializers.ValidationError("Must provide job_category_id or job_code_id")
        return data


class InterruptedStopSerializer(serializers.Serializer):
    """Serializer for interrupted stop requests."""
    employee_id = serializers.IntegerField()
