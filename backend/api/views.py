from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.parsers import MultiPartParser, FormParser

from .models import Employee, JobCodeCategory, JobCode, TimeEntry, ActivityTag, TimeEntryPhoto
from .serializers import (
    EmployeeSerializer, JobCodeCategorySerializer, JobCodeSerializer,
    TimeEntrySerializer, TimeEntryDetailSerializer,
    ClockStartSerializer, ClockStopSerializer,
    InterruptedStartSerializer, InterruptedStopSerializer,
    ActivityTagSerializer,
    SessionStartSerializer, SessionStopSerializer, SessionSwitchSerializer, SessionTagUpdateSerializer,
    VerifyPinSerializer, SetPinSerializer, TimeEntryPhotoSerializer
)


class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for employees."""
    queryset = Employee.objects.filter(is_active=True)
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['get'])
    def current_entry(self, request, pk=None):
        """Get the current active time entry for an employee."""
        employee = self.get_object()
        # Get active entry (no end_time, not paused)
        active_entry = TimeEntry.objects.filter(
            employee=employee,
            end_time__isnull=True
        ).order_by('-start_time').first()

        if not active_entry:
            return Response({'current_entry': None})

        serializer = TimeEntryDetailSerializer(active_entry)
        return Response({'current_entry': serializer.data})

    @action(detail=True, methods=['post'], url_path='set-pin')
    def set_pin(self, request, pk=None):
        """Set the PIN for an employee."""
        employee = self.get_object()
        serializer = SetPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee.set_pin(serializer.validated_data['pin'])
        employee.save()

        return Response({'success': True, 'message': 'PIN set successfully'})


class VerifyPinView(APIView):
    """Verify an employee's PIN."""

    def post(self, request):
        serializer = VerifyPinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']
        pin = serializer.validated_data['pin']

        try:
            employee = Employee.objects.get(id=employee_id, is_active=True)
        except Employee.DoesNotExist:
            return Response(
                {'valid': False, 'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not employee.has_pin:
            return Response(
                {'valid': False, 'error': 'Employee has no PIN set'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if employee.check_pin(pin):
            return Response({
                'valid': True,
                'employee': EmployeeSerializer(employee).data
            })
        else:
            return Response(
                {'valid': False, 'error': 'Invalid PIN'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class JobCodeCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for job code categories."""
    queryset = JobCodeCategory.objects.filter(is_active=True).prefetch_related('job_codes')
    serializer_class = JobCodeCategorySerializer


class JobCodeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for job codes."""
    queryset = JobCode.objects.filter(is_active=True).select_related('category')
    serializer_class = JobCodeSerializer


class TimeEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for time entries (admin CRUD)."""
    queryset = TimeEntry.objects.all().select_related('employee', 'job_category', 'job_code')
    serializer_class = TimeEntrySerializer

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TimeEntryDetailSerializer
        return TimeEntrySerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        # Filter by job category
        job_category_id = self.request.query_params.get('job_category')
        if job_category_id:
            queryset = queryset.filter(job_category_id=job_category_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)

        return queryset


class ClockStartView(APIView):
    """Clock in - start a new time entry."""

    def post(self, request):
        serializer = ClockStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']
        job_category_id = serializer.validated_data.get('job_category_id')
        job_code_id = serializer.validated_data.get('job_code_id')
        description = serializer.validated_data.get('description', '')

        try:
            employee = Employee.objects.get(id=employee_id, is_active=True)
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get job category and/or code
        job_category = None
        job_code = None

        if job_code_id:
            try:
                job_code = JobCode.objects.get(id=job_code_id, is_active=True)
                job_category = job_code.category
            except JobCode.DoesNotExist:
                return Response(
                    {'error': 'Job code not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif job_category_id:
            try:
                job_category = JobCodeCategory.objects.get(id=job_category_id, is_active=True)
            except JobCodeCategory.DoesNotExist:
                return Response(
                    {'error': 'Job category not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Stop any existing active entries for this employee
        active_entries = TimeEntry.objects.filter(
            employee=employee,
            end_time__isnull=True,
            is_paused=False
        )
        now = timezone.now()
        for entry in active_entries:
            entry.end_time = now
            entry.save()

        # Create new entry
        entry = TimeEntry.objects.create(
            employee=employee,
            job_category=job_category,
            job_code=job_code,
            start_time=now,
            description=description
        )

        return Response(
            TimeEntryDetailSerializer(entry).data,
            status=status.HTTP_201_CREATED
        )


class ClockStopView(APIView):
    """Clock out - stop the current time entry."""

    def post(self, request):
        serializer = ClockStopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the active entry (not paused)
        active_entry = TimeEntry.objects.filter(
            employee=employee,
            end_time__isnull=True,
            is_paused=False
        ).order_by('-start_time').first()

        if not active_entry:
            return Response(
                {'error': 'No active time entry found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cannot stop if this is an interruption and there's a paused entry
        if active_entry.is_interruption:
            return Response(
                {'error': 'Use interrupted-stop to end an interruption'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active_entry.end_time = timezone.now()
        active_entry.save()

        return Response(TimeEntryDetailSerializer(active_entry).data)


class InterruptedStartView(APIView):
    """Start an interruption - pause current job and start new one."""

    def post(self, request):
        serializer = InterruptedStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']
        job_category_id = serializer.validated_data.get('job_category_id')
        job_code_id = serializer.validated_data.get('job_code_id')
        reason = serializer.validated_data['reason']

        try:
            employee = Employee.objects.get(id=employee_id, is_active=True)
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the current active entry
        current_entry = TimeEntry.objects.filter(
            employee=employee,
            end_time__isnull=True,
            is_paused=False
        ).order_by('-start_time').first()

        if not current_entry:
            return Response(
                {'error': 'No active time entry to interrupt'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cannot interrupt an interruption
        if current_entry.is_interruption:
            return Response(
                {'error': 'Cannot interrupt an interruption. Use interrupted-stop first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get job category and/or code for the interruption
        job_category = None
        job_code = None

        if job_code_id:
            try:
                job_code = JobCode.objects.get(id=job_code_id, is_active=True)
                job_category = job_code.category
            except JobCode.DoesNotExist:
                return Response(
                    {'error': 'Job code not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif job_category_id:
            try:
                job_category = JobCodeCategory.objects.get(id=job_category_id, is_active=True)
            except JobCodeCategory.DoesNotExist:
                return Response(
                    {'error': 'Job category not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        now = timezone.now()

        # Pause the current entry
        current_entry.is_paused = True
        current_entry.save()

        # Create the interruption entry
        interruption_entry = TimeEntry.objects.create(
            employee=employee,
            job_category=job_category,
            job_code=job_code,
            start_time=now,
            is_interruption=True,
            interrupted_entry=current_entry,
            interruption_reason=reason
        )

        return Response(
            TimeEntryDetailSerializer(interruption_entry).data,
            status=status.HTTP_201_CREATED
        )


class InterruptedStopView(APIView):
    """End an interruption - close interruption and resume original job."""

    def post(self, request):
        serializer = InterruptedStopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data['employee_id']

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the active interruption entry
        interruption_entry = TimeEntry.objects.filter(
            employee=employee,
            end_time__isnull=True,
            is_paused=False,
            is_interruption=True
        ).order_by('-start_time').first()

        if not interruption_entry:
            return Response(
                {'error': 'No active interruption found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()

        # End the interruption
        interruption_entry.end_time = now
        interruption_entry.save()

        # Resume the original entry
        original_entry = interruption_entry.interrupted_entry
        if original_entry:
            original_entry.is_paused = False
            original_entry.save()
            return Response({
                'closed_interruption': TimeEntryDetailSerializer(interruption_entry).data,
                'resumed_entry': TimeEntryDetailSerializer(original_entry).data
            })

        return Response({
            'closed_interruption': TimeEntryDetailSerializer(interruption_entry).data,
            'resumed_entry': None
        })


class ActivityTagViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for activity tags."""
    queryset = ActivityTag.objects.filter(is_active=True).select_related('role')
    serializer_class = ActivityTagSerializer

    @action(detail=False, methods=['get'])
    def global_tags(self, request):
        """Get only global tags (not role-specific)."""
        tags = self.queryset.filter(role__isnull=True)
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='for-role/(?P<role_id>[^/.]+)')
    def for_role(self, request, role_id=None):
        """Get tags available for a specific role (global + role-specific)."""
        tags = self.queryset.filter(Q(role__isnull=True) | Q(role_id=role_id))
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)


class SessionStartView(APIView):
    """Start a new session (role-based, no employee required)."""

    def post(self, request):
        serializer = SessionStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role_id = serializer.validated_data['role_id']
        job_code_id = serializer.validated_data.get('job_code_id')
        performer_name = serializer.validated_data.get('performer_name', '')
        activity_tag_ids = serializer.validated_data.get('activity_tag_ids', [])

        # Get role (job category)
        try:
            role = JobCodeCategory.objects.get(id=role_id, is_active=True)
        except JobCodeCategory.DoesNotExist:
            return Response(
                {'error': 'Role not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get job code if provided
        job_code = None
        if job_code_id:
            try:
                job_code = JobCode.objects.get(id=job_code_id, is_active=True)
                if job_code.category_id != role_id:
                    return Response(
                        {'error': 'Job code does not belong to the specified role'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except JobCode.DoesNotExist:
                return Response(
                    {'error': 'Job code not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        now = timezone.now()

        # Create new session
        session = TimeEntry.objects.create(
            job_category=role,
            job_code=job_code,
            start_time=now,
            performer_name=performer_name
        )

        # Add activity tags if provided
        if activity_tag_ids:
            tags = ActivityTag.objects.filter(id__in=activity_tag_ids, is_active=True)
            session.activity_tags.set(tags)

        return Response(
            TimeEntryDetailSerializer(session).data,
            status=status.HTTP_201_CREATED
        )


class SessionStopView(APIView):
    """Stop a session."""

    def post(self, request):
        serializer = SessionStopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data.get('session_id')

        if session_id:
            try:
                session = TimeEntry.objects.get(id=session_id, end_time__isnull=True)
            except TimeEntry.DoesNotExist:
                return Response(
                    {'error': 'Active session not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Stop the most recent active session
            session = TimeEntry.objects.filter(
                end_time__isnull=True,
                is_paused=False
            ).order_by('-start_time').first()

            if not session:
                return Response(
                    {'error': 'No active session found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        session.end_time = timezone.now()
        session.save()

        return Response(TimeEntryDetailSerializer(session).data)


class SessionSwitchView(APIView):
    """Switch from current role to a new role (ends current, starts new)."""

    def post(self, request):
        serializer = SessionSwitchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role_id = serializer.validated_data['role_id']
        job_code_id = serializer.validated_data.get('job_code_id')
        performer_name = serializer.validated_data.get('performer_name', '')

        # Get new role
        try:
            role = JobCodeCategory.objects.get(id=role_id, is_active=True)
        except JobCodeCategory.DoesNotExist:
            return Response(
                {'error': 'Role not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get job code if provided
        job_code = None
        if job_code_id:
            try:
                job_code = JobCode.objects.get(id=job_code_id, is_active=True)
                if job_code.category_id != role_id:
                    return Response(
                        {'error': 'Job code does not belong to the specified role'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except JobCode.DoesNotExist:
                return Response(
                    {'error': 'Job code not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        now = timezone.now()

        # End current active session(s)
        ended_sessions = []
        active_sessions = TimeEntry.objects.filter(
            end_time__isnull=True,
            is_paused=False
        )
        for session in active_sessions:
            session.end_time = now
            session.save()
            ended_sessions.append(TimeEntryDetailSerializer(session).data)

        # Start new session
        new_session = TimeEntry.objects.create(
            job_category=role,
            job_code=job_code,
            start_time=now,
            performer_name=performer_name
        )

        return Response({
            'ended_sessions': ended_sessions,
            'new_session': TimeEntryDetailSerializer(new_session).data
        }, status=status.HTTP_201_CREATED)


class SessionTagsView(APIView):
    """Update tags on an active session."""

    def patch(self, request, session_id):
        serializer = SessionTagUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tag_ids = serializer.validated_data['tag_ids']

        try:
            session = TimeEntry.objects.get(id=session_id, end_time__isnull=True)
        except TimeEntry.DoesNotExist:
            return Response(
                {'error': 'Active session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update tags
        tags = ActivityTag.objects.filter(id__in=tag_ids, is_active=True)
        session.activity_tags.set(tags)

        return Response(TimeEntryDetailSerializer(session).data)


class ActiveSessionView(APIView):
    """Get the current active session (for role-based tracking without employee)."""

    def get(self, request):
        # Get the most recent active session
        session = TimeEntry.objects.filter(
            end_time__isnull=True,
            is_paused=False
        ).select_related(
            'employee', 'job_category', 'job_code'
        ).prefetch_related('activity_tags').order_by('-start_time').first()

        if not session:
            return Response({'active_session': None})

        return Response({
            'active_session': TimeEntryDetailSerializer(session).data
        })


class InsightsRoleHoursView(APIView):
    """Get hours breakdown by role for a date range."""

    def get(self, request):
        from django.db.models import Sum, F
        from django.db.models.functions import Coalesce
        from datetime import timedelta

        # Parse date range (default: last 7 days)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = TimeEntry.objects.filter(end_time__isnull=False)

        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)

        # Aggregate hours by role (job_category)
        role_hours = queryset.values(
            'job_category__id', 'job_category__name'
        ).annotate(
            total_seconds=Sum(
                F('end_time') - F('start_time'),
                output_field=models.DurationField()
            )
        ).order_by('-total_seconds')

        results = []
        for item in role_hours:
            if item['total_seconds']:
                total_seconds = item['total_seconds'].total_seconds()
                results.append({
                    'role_id': item['job_category__id'],
                    'role_name': item['job_category__name'],
                    'total_hours': round(total_seconds / 3600, 2),
                    'total_seconds': total_seconds
                })

        return Response({'role_hours': results})


class InsightsTagDistributionView(APIView):
    """Get activity tag distribution for a date range."""

    def get(self, request):
        from django.db.models import Count

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        role_id = request.query_params.get('role_id')

        queryset = TimeEntry.objects.filter(end_time__isnull=False)

        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
        if role_id:
            queryset = queryset.filter(job_category_id=role_id)

        # Count sessions by tag
        tag_counts = ActivityTag.objects.filter(
            time_entries__in=queryset
        ).annotate(
            session_count=Count('time_entries')
        ).values('id', 'name', 'color', 'session_count').order_by('-session_count')

        # Also count sessions without tags
        sessions_with_tags = queryset.filter(activity_tags__isnull=False).distinct().count()
        total_sessions = queryset.count()
        sessions_without_tags = total_sessions - sessions_with_tags

        return Response({
            'tag_distribution': list(tag_counts),
            'sessions_without_tags': sessions_without_tags,
            'total_sessions': total_sessions
        })


class InsightsPatternsView(APIView):
    """Get time-of-day and day-of-week patterns."""

    def get(self, request):
        from django.db.models import Count
        from django.db.models.functions import ExtractHour, ExtractWeekDay

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        role_id = request.query_params.get('role_id')

        queryset = TimeEntry.objects.filter(end_time__isnull=False)

        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
        if role_id:
            queryset = queryset.filter(job_category_id=role_id)

        # Hour distribution (0-23)
        hour_distribution = queryset.annotate(
            hour=ExtractHour('start_time')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('hour')

        # Day of week distribution (1=Sunday, 7=Saturday in Django)
        day_distribution = queryset.annotate(
            day=ExtractWeekDay('start_time')
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')

        # Map day numbers to names
        day_names = {1: 'Sunday', 2: 'Monday', 3: 'Tuesday', 4: 'Wednesday',
                     5: 'Thursday', 6: 'Friday', 7: 'Saturday'}

        day_data = [
            {'day': day_names.get(item['day'], item['day']), 'day_number': item['day'], 'count': item['count']}
            for item in day_distribution
        ]

        return Response({
            'hour_distribution': list(hour_distribution),
            'day_distribution': day_data
        })


class TimeEntryPhotoViewSet(viewsets.ModelViewSet):
    """ViewSet for time entry photos."""
    queryset = TimeEntryPhoto.objects.all().select_related('time_entry')
    serializer_class = TimeEntryPhotoSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = super().get_queryset()
        time_entry_id = self.request.query_params.get('time_entry')
        if time_entry_id:
            queryset = queryset.filter(time_entry_id=time_entry_id)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


# ============================================
# Admin API Endpoints (protected by API key)
# ============================================

import os
from functools import wraps


def require_admin_key(view_func):
    """Decorator to require ADMIN_API_KEY for admin endpoints."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        admin_key = os.environ.get('ADMIN_API_KEY')
        if not admin_key:
            return Response(
                {'error': 'Admin API not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Check Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Missing or invalid Authorization header'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        provided_key = auth_header[7:]  # Remove 'Bearer ' prefix
        if provided_key != admin_key:
            return Response(
                {'error': 'Invalid API key'},
                status=status.HTTP_403_FORBIDDEN
            )

        return view_func(request, *args, **kwargs)
    return wrapper


@api_view(['GET'])
@require_admin_key
def admin_list_employees(request):
    """List all employees."""
    employees = Employee.objects.all().order_by('first_name', 'last_name')
    data = []
    for emp in employees:
        data.append({
            'id': emp.id,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'full_name': emp.full_name,
            'email': emp.email,
            'has_pin': emp.has_pin,
            'is_active': emp.is_active,
        })
    return Response({'employees': data})


@api_view(['POST'])
@require_admin_key
def admin_add_employee(request):
    """Add a new employee."""
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    email = request.data.get('email', '')
    pin = request.data.get('pin')

    if not first_name or not last_name:
        return Response(
            {'error': 'first_name and last_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if Employee.objects.filter(first_name=first_name, last_name=last_name).exists():
        return Response(
            {'error': f'Employee "{first_name} {last_name}" already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if pin:
        if not str(pin).isdigit() or len(str(pin)) < 4 or len(str(pin)) > 10:
            return Response(
                {'error': 'PIN must be 4-10 digits'},
                status=status.HTTP_400_BAD_REQUEST
            )

    employee = Employee.objects.create(
        first_name=first_name,
        last_name=last_name,
        email=email,
        is_active=True
    )

    if pin:
        employee.set_pin(str(pin))
        employee.save()

    return Response({
        'message': f'Created employee: {employee.full_name}',
        'employee': {
            'id': employee.id,
            'full_name': employee.full_name,
            'email': employee.email,
            'has_pin': employee.has_pin,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@require_admin_key
def admin_set_pin(request, employee_id):
    """Set PIN for an employee."""
    pin = request.data.get('pin')

    if not pin:
        return Response(
            {'error': 'pin is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not str(pin).isdigit() or len(str(pin)) < 4 or len(str(pin)) > 10:
        return Response(
            {'error': 'PIN must be 4-10 digits'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response(
            {'error': 'Employee not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    employee.set_pin(str(pin))
    employee.save()

    return Response({
        'message': f'PIN set for {employee.full_name}',
        'employee': {
            'id': employee.id,
            'full_name': employee.full_name,
            'has_pin': employee.has_pin,
        }
    })


@api_view(['DELETE'])
@require_admin_key
def admin_delete_employee(request, employee_id):
    """Delete an employee."""
    try:
        employee = Employee.objects.get(id=employee_id)
    except Employee.DoesNotExist:
        return Response(
            {'error': 'Employee not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    full_name = employee.full_name
    employee.delete()

    return Response({'message': f'Deleted employee: {full_name}'})


@api_view(['POST'])
@require_admin_key
def admin_seed_data(request):
    """Seed job categories, job codes, and optionally employees."""
    data = request.data
    results = {'categories': 0, 'codes': 0, 'employees': 0}

    # Seed job categories
    for cat_data in data.get('categories', []):
        cat, created = JobCodeCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'is_active': cat_data.get('is_active', True)}
        )
        if created:
            results['categories'] += 1

    # Seed job codes
    for code_data in data.get('codes', []):
        try:
            category = JobCodeCategory.objects.get(name=code_data['category'])
            code, created = JobCode.objects.get_or_create(
                name=code_data['name'],
                category=category,
                defaults={
                    'alias': code_data.get('alias', ''),
                    'is_active': code_data.get('is_active', True)
                }
            )
            if created:
                results['codes'] += 1
        except JobCodeCategory.DoesNotExist:
            pass

    # Seed employees (optional)
    for emp_data in data.get('employees', []):
        emp, created = Employee.objects.get_or_create(
            first_name=emp_data['first_name'],
            last_name=emp_data['last_name'],
            defaults={
                'email': emp_data.get('email', ''),
                'is_active': emp_data.get('is_active', True)
            }
        )
        if created:
            results['employees'] += 1
            if emp_data.get('pin'):
                emp.set_pin(str(emp_data['pin']))
                emp.save()

    return Response({
        'message': 'Data seeded successfully',
        'created': results
    }, status=status.HTTP_201_CREATED)
