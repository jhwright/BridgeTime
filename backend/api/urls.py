from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmployeeViewSet, JobCodeCategoryViewSet, JobCodeViewSet, TimeEntryViewSet,
    ClockStartView, ClockStopView, InterruptedStartView, InterruptedStopView
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'jobs/categories', JobCodeCategoryViewSet)
router.register(r'jobs/codes', JobCodeViewSet)
router.register(r'time-entries', TimeEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('clock/start/', ClockStartView.as_view(), name='clock-start'),
    path('clock/stop/', ClockStopView.as_view(), name='clock-stop'),
    path('clock/interrupted-start/', InterruptedStartView.as_view(), name='clock-interrupted-start'),
    path('clock/interrupted-stop/', InterruptedStopView.as_view(), name='clock-interrupted-stop'),
]
