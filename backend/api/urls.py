from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet, JobCodeCategoryViewSet, JobCodeViewSet, TimeEntryViewSet,
    ClockStartView, ClockStopView, InterruptedStartView, InterruptedStopView,
    ActivityTagViewSet, VerifyPinView, TimeEntryPhotoViewSet,
    SessionStartView, SessionStopView, SessionSwitchView, SessionTagsView, ActiveSessionView,
    InsightsRoleHoursView, InsightsTagDistributionView, InsightsPatternsView,
    admin_list_employees, admin_add_employee, admin_set_pin, admin_delete_employee
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'jobs/categories', JobCodeCategoryViewSet)
router.register(r'jobs/codes', JobCodeViewSet)
router.register(r'time-entries', TimeEntryViewSet)
router.register(r'tags', ActivityTagViewSet)
router.register(r'photos', TimeEntryPhotoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # PIN authentication
    path('auth/verify-pin/', VerifyPinView.as_view(), name='verify-pin'),
    # Legacy employee-based clock endpoints
    path('clock/start/', ClockStartView.as_view(), name='clock-start'),
    path('clock/stop/', ClockStopView.as_view(), name='clock-stop'),
    path('clock/interrupted-start/', InterruptedStartView.as_view(), name='clock-interrupted-start'),
    path('clock/interrupted-stop/', InterruptedStopView.as_view(), name='clock-interrupted-stop'),
    # New role-based session endpoints
    path('sessions/start/', SessionStartView.as_view(), name='session-start'),
    path('sessions/stop/', SessionStopView.as_view(), name='session-stop'),
    path('sessions/switch/', SessionSwitchView.as_view(), name='session-switch'),
    path('sessions/<int:session_id>/tags/', SessionTagsView.as_view(), name='session-tags'),
    path('sessions/active/', ActiveSessionView.as_view(), name='session-active'),
    # Insights endpoints
    path('insights/role-hours/', InsightsRoleHoursView.as_view(), name='insights-role-hours'),
    path('insights/tag-distribution/', InsightsTagDistributionView.as_view(), name='insights-tag-distribution'),
    path('insights/patterns/', InsightsPatternsView.as_view(), name='insights-patterns'),
    # Admin API (protected by ADMIN_API_KEY)
    path('admin/employees/', admin_list_employees, name='admin-list-employees'),
    path('admin/employees/add/', admin_add_employee, name='admin-add-employee'),
    path('admin/employees/<int:employee_id>/set-pin/', admin_set_pin, name='admin-set-pin'),
    path('admin/employees/<int:employee_id>/delete/', admin_delete_employee, name='admin-delete-employee'),
]
