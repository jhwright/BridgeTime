from rest_framework import serializers
from .models import Employee, JobCodeCategory, JobCode, TimeEntry, ActivityTag, TimeEntryPhoto


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    has_pin = serializers.BooleanField(read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'gusto_id', 'first_name', 'last_name', 'full_name', 'email', 'is_active', 'has_pin']


class JobCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobCode
        fields = ['id', 'name', 'alias', 'is_active']


class JobCodeCategorySerializer(serializers.ModelSerializer):
    job_codes = JobCodeSerializer(many=True, read_only=True)

    class Meta:
        model = JobCodeCategory
        fields = ['id', 'name', 'alias', 'is_active', 'job_codes']


class ActivityTagSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True, allow_null=True)

    class Meta:
        model = ActivityTag
        fields = ['id', 'name', 'description', 'role', 'role_name', 'is_active', 'color']


class TimeEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    job_display_name = serializers.CharField(read_only=True)
    duration_seconds = serializers.FloatField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    activity_tags = ActivityTagSerializer(many=True, read_only=True)
    activity_tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=ActivityTag.objects.filter(is_active=True),
        many=True,
        write_only=True,
        required=False,
        source='activity_tags'
    )

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'employee', 'employee_name',
            'job_category', 'job_code', 'job_display_name',
            'start_time', 'end_time', 'duration_seconds', 'is_active',
            'description',
            'activity_tags', 'activity_tag_ids',
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
    photos = serializers.SerializerMethodField()

    class Meta(TimeEntrySerializer.Meta):
        fields = TimeEntrySerializer.Meta.fields + [
            'job_category_detail', 'job_code_detail', 'paused_entry', 'photos'
        ]

    def get_photos(self, obj):
        photos = obj.photos.all()
        request = self.context.get('request')
        return TimeEntryPhotoSerializer(photos, many=True, context={'request': request}).data

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
    """Serializer for clock-in requests (legacy employee-based)."""
    employee_id = serializers.IntegerField()
    job_category_id = serializers.IntegerField(required=False)
    job_code_id = serializers.IntegerField(required=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    performer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('job_category_id') and not data.get('job_code_id'):
            raise serializers.ValidationError("Must provide job_category_id or job_code_id")
        return data


class SessionStartSerializer(serializers.Serializer):
    """Serializer for role-based session start (new API)."""
    role_id = serializers.IntegerField(help_text="JobCodeCategory ID")
    job_code_id = serializers.IntegerField(required=False, help_text="Optional specific job code (e.g., WRP property)")
    performer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    activity_tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )


class SessionStopSerializer(serializers.Serializer):
    """Serializer for stopping a session."""
    session_id = serializers.IntegerField(required=False, help_text="If not provided, stops the most recent active session")


class SessionSwitchSerializer(serializers.Serializer):
    """Serializer for switching between roles (ends current, starts new)."""
    role_id = serializers.IntegerField(help_text="New role to switch to")
    job_code_id = serializers.IntegerField(required=False)
    performer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)


class SessionTagUpdateSerializer(serializers.Serializer):
    """Serializer for updating tags on an active session."""
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="List of tag IDs to set (replaces existing)"
    )


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


class VerifyPinSerializer(serializers.Serializer):
    """Serializer for PIN verification requests."""
    employee_id = serializers.IntegerField()
    pin = serializers.CharField(max_length=10)


class SetPinSerializer(serializers.Serializer):
    """Serializer for setting an employee's PIN."""
    pin = serializers.CharField(min_length=4, max_length=10)

    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("PIN must contain only digits")
        return value


class TimeEntryPhotoSerializer(serializers.ModelSerializer):
    """Serializer for time entry photos."""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntryPhoto
        fields = ['id', 'time_entry', 'image', 'image_url', 'caption', 'created_at']
        read_only_fields = ['created_at']
        extra_kwargs = {
            'image': {'write_only': True}
        }

    def get_image_url(self, obj):
        if obj.image:
            # S3 storage returns full presigned URLs, local storage needs request context
            url = obj.image.url
            if url.startswith('http'):
                return url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            return url
        return None
