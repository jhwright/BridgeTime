from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import timedelta

from .models import Employee, JobCodeCategory, JobCode, TimeEntry


class EmployeeModelTest(TestCase):
    def test_full_name(self):
        employee = Employee.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com'
        )
        self.assertEqual(employee.full_name, 'John Doe')

    def test_str_representation(self):
        employee = Employee.objects.create(first_name='Jane', last_name='Smith')
        self.assertEqual(str(employee), 'Jane Smith')


class JobCodeModelTest(TestCase):
    def setUp(self):
        self.category = JobCodeCategory.objects.create(name='WRP', alias='3')

    def test_job_code_str(self):
        job_code = JobCode.objects.create(
            category=self.category,
            name='HEN - Hensley',
            alias='31'
        )
        self.assertEqual(str(job_code), 'WRP - HEN - Hensley')


class TimeEntryModelTest(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='User')
        self.category = JobCodeCategory.objects.create(name='Kitchen')

    def test_is_active_property(self):
        entry = TimeEntry.objects.create(
            employee=self.employee,
            job_category=self.category,
            start_time=timezone.now()
        )
        self.assertTrue(entry.is_active)

        entry.end_time = timezone.now()
        entry.save()
        self.assertFalse(entry.is_active)

    def test_is_active_when_paused(self):
        entry = TimeEntry.objects.create(
            employee=self.employee,
            job_category=self.category,
            start_time=timezone.now(),
            is_paused=True
        )
        self.assertFalse(entry.is_active)

    def test_auto_set_job_category_from_job_code(self):
        job_code = JobCode.objects.create(category=self.category, name='Test Job')
        entry = TimeEntry.objects.create(
            employee=self.employee,
            job_code=job_code,
            start_time=timezone.now()
        )
        self.assertEqual(entry.job_category, self.category)


class EmployeeAPITest(APITestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com'
        )

    def test_list_employees(self):
        response = self.client.get('/api/v1/employees/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_current_entry_none(self):
        response = self.client.get(f'/api/v1/employees/{self.employee.id}/current_entry/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['current_entry'])


class JobCodeAPITest(APITestCase):
    def setUp(self):
        self.category = JobCodeCategory.objects.create(name='WRP', alias='3')
        self.job_code = JobCode.objects.create(
            category=self.category,
            name='HEN - Hensley',
            alias='31'
        )

    def test_list_categories(self):
        response = self.client.get('/api/v1/jobs/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(len(response.data['results'][0]['job_codes']), 1)


class ClockStartAPITest(APITestCase):
    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='User')
        self.category = JobCodeCategory.objects.create(name='Kitchen')
        self.wrp = JobCodeCategory.objects.create(name='WRP')
        self.job_code = JobCode.objects.create(category=self.wrp, name='Hensley')

    def test_clock_start_with_category(self):
        response = self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimeEntry.objects.count(), 1)
        entry = TimeEntry.objects.first()
        self.assertEqual(entry.job_category, self.category)
        self.assertIsNone(entry.end_time)

    def test_clock_start_with_job_code(self):
        response = self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        entry = TimeEntry.objects.first()
        self.assertEqual(entry.job_code, self.job_code)
        self.assertEqual(entry.job_category, self.wrp)

    def test_clock_start_stops_previous_entry(self):
        # Start first entry
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category.id
        })

        # Start second entry
        response = self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimeEntry.objects.count(), 2)

        # First entry should be closed
        first_entry = TimeEntry.objects.filter(job_category=self.category).first()
        self.assertIsNotNone(first_entry.end_time)

        # Second entry should be open
        second_entry = TimeEntry.objects.filter(job_code=self.job_code).first()
        self.assertIsNone(second_entry.end_time)

    def test_clock_start_missing_job(self):
        response = self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clock_start_invalid_employee(self):
        response = self.client.post('/api/v1/clock/start/', {
            'employee_id': 9999,
            'job_category_id': self.category.id
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ClockStopAPITest(APITestCase):
    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='User')
        self.category = JobCodeCategory.objects.create(name='Kitchen')

    def test_clock_stop(self):
        # First clock in
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category.id
        })

        # Then clock out
        response = self.client.post('/api/v1/clock/stop/', {
            'employee_id': self.employee.id
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entry = TimeEntry.objects.first()
        self.assertIsNotNone(entry.end_time)

    def test_clock_stop_no_active_entry(self):
        response = self.client.post('/api/v1/clock/stop/', {
            'employee_id': self.employee.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class InterruptionAPITest(APITestCase):
    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='User')
        self.category1 = JobCodeCategory.objects.create(name='WRP')
        self.category2 = JobCodeCategory.objects.create(name='Kitchen')
        self.job_code = JobCode.objects.create(category=self.category1, name='Hensley')

    def test_interrupted_start(self):
        # Clock in to first job
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })

        # Start interruption
        response = self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category2.id,
            'reason': 'Emergency repair'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TimeEntry.objects.count(), 2)

        # Original entry should be paused
        original = TimeEntry.objects.filter(job_code=self.job_code).first()
        self.assertTrue(original.is_paused)

        # Interruption should be active
        interruption = TimeEntry.objects.filter(job_category=self.category2).first()
        self.assertTrue(interruption.is_interruption)
        self.assertEqual(interruption.interrupted_entry, original)
        self.assertEqual(interruption.interruption_reason, 'Emergency repair')

    def test_interrupted_start_no_active_entry(self):
        response = self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category2.id,
            'reason': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_interrupt_an_interruption(self):
        # Clock in
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })

        # Start first interruption
        self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category2.id,
            'reason': 'First interrupt'
        })

        # Try to start second interruption
        response = self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category1.id,
            'reason': 'Second interrupt'
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot interrupt an interruption', response.data['error'])

    def test_interrupted_stop(self):
        # Clock in
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })

        # Start interruption
        self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category2.id,
            'reason': 'Emergency'
        })

        # End interruption
        response = self.client.post('/api/v1/clock/interrupted-stop/', {
            'employee_id': self.employee.id
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Interruption should be closed
        interruption = TimeEntry.objects.filter(is_interruption=True).first()
        self.assertIsNotNone(interruption.end_time)

        # Original should be resumed
        original = TimeEntry.objects.filter(job_code=self.job_code).first()
        self.assertFalse(original.is_paused)

    def test_interrupted_stop_no_active_interruption(self):
        response = self.client.post('/api/v1/clock/interrupted-stop/', {
            'employee_id': self.employee.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_normal_stop_during_interruption(self):
        # Clock in
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.job_code.id
        })

        # Start interruption
        self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.category2.id,
            'reason': 'Emergency'
        })

        # Try normal stop
        response = self.client.post('/api/v1/clock/stop/', {
            'employee_id': self.employee.id
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('interrupted-stop', response.data['error'])


class TimeEntryAPITest(APITestCase):
    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='User')
        self.category = JobCodeCategory.objects.create(name='Kitchen')
        self.entry = TimeEntry.objects.create(
            employee=self.employee,
            job_category=self.category,
            start_time=timezone.now() - timedelta(hours=2),
            end_time=timezone.now() - timedelta(hours=1)
        )

    def test_list_time_entries(self):
        response = self.client.get('/api/v1/time-entries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_by_employee(self):
        other_employee = Employee.objects.create(first_name='Other', last_name='Person')
        TimeEntry.objects.create(
            employee=other_employee,
            job_category=self.category,
            start_time=timezone.now()
        )

        response = self.client.get(f'/api/v1/time-entries/?employee={self.employee.id}')
        self.assertEqual(len(response.data['results']), 1)

    def test_update_time_entry(self):
        new_start = timezone.now() - timedelta(hours=3)
        response = self.client.patch(f'/api/v1/time-entries/{self.entry.id}/', {
            'start_time': new_start.isoformat()
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.start_time.replace(microsecond=0),
                        new_start.replace(microsecond=0))

    def test_delete_time_entry(self):
        response = self.client.delete(f'/api/v1/time-entries/{self.entry.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TimeEntry.objects.count(), 0)


class FullInterruptionFlowTest(APITestCase):
    """Test the full interruption workflow as described in CLAUDE.md."""

    def setUp(self):
        self.employee = Employee.objects.create(first_name='Test', last_name='Worker')
        self.wrp = JobCodeCategory.objects.create(name='WRP')
        self.kitchen = JobCodeCategory.objects.create(name='Kitchen')
        self.hensley = JobCode.objects.create(category=self.wrp, name='HEN - Hensley')

    def test_full_interruption_flow(self):
        # 9:00 AM - START on "WRP - Hensley"
        self.client.post('/api/v1/clock/start/', {
            'employee_id': self.employee.id,
            'job_code_id': self.hensley.id
        })

        entry_a = TimeEntry.objects.first()
        self.assertIsNone(entry_a.end_time)
        self.assertFalse(entry_a.is_paused)

        # 10:00 AM - INTERRUPTED START for "Kitchen"
        self.client.post('/api/v1/clock/interrupted-start/', {
            'employee_id': self.employee.id,
            'job_category_id': self.kitchen.id,
            'reason': 'Pipe burst'
        })

        entry_a.refresh_from_db()
        self.assertTrue(entry_a.is_paused)

        entry_b = TimeEntry.objects.filter(is_interruption=True).first()
        self.assertTrue(entry_b.is_interruption)
        self.assertEqual(entry_b.interrupted_entry, entry_a)
        self.assertEqual(entry_b.interruption_reason, 'Pipe burst')

        # 10:30 AM - INTERRUPTED STOP
        self.client.post('/api/v1/clock/interrupted-stop/', {
            'employee_id': self.employee.id
        })

        entry_a.refresh_from_db()
        entry_b.refresh_from_db()

        self.assertFalse(entry_a.is_paused)
        self.assertIsNone(entry_a.end_time)  # Still open
        self.assertIsNotNone(entry_b.end_time)  # Closed

        # 12:00 PM - STOP
        self.client.post('/api/v1/clock/stop/', {
            'employee_id': self.employee.id
        })

        entry_a.refresh_from_db()
        self.assertIsNotNone(entry_a.end_time)

        # Verify final state
        self.assertEqual(TimeEntry.objects.count(), 2)
        # Entry A: Hensley (not interruption)
        # Entry B: Kitchen (interruption)
