from django.core.management.base import BaseCommand
from api.models import Employee


class Command(BaseCommand):
    help = 'Create sample employees for testing'

    def handle(self, *args, **options):
        employees = [
            {'first_name': 'Alice', 'last_name': 'Johnson', 'email': 'alice@bridgeart.space'},
            {'first_name': 'Bob', 'last_name': 'Smith', 'email': 'bob@bridgeart.space'},
            {'first_name': 'Carol', 'last_name': 'Williams', 'email': 'carol@bridgeart.space'},
            {'first_name': 'David', 'last_name': 'Brown', 'email': 'david@bridgeart.space'},
            {'first_name': 'Emma', 'last_name': 'Davis', 'email': 'emma@bridgeart.space'},
        ]

        created = 0
        for emp_data in employees:
            employee, was_created = Employee.objects.get_or_create(
                email=emp_data['email'],
                defaults=emp_data
            )
            if was_created:
                created += 1
                self.stdout.write(f"Created employee: {employee.full_name}")
            else:
                self.stdout.write(f"Employee already exists: {employee.full_name}")

        self.stdout.write(self.style.SUCCESS(f"\nCreated {created} employees"))
