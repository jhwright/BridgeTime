from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Employee, JobCodeCategory, JobCode, TimeEntry
from .serializers import (
    EmployeeSerializer, JobCodeCategorySerializer, JobCodeSerializer,
    TimeEntrySerializer, TimeEntryDetailSerializer,
    ClockStartSerializer, ClockStopSerializer,
    InterruptedStartSerializer, InterruptedStopSerializer
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
