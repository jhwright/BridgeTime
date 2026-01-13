"""
Management command for employee operations.

Usage:
    python manage.py employee list
    python manage.py employee add "First" "Last" --email user@example.com --pin 1234
    python manage.py employee setpin "First Last" 1234
    python manage.py employee delete "First Last"
"""
from django.core.management.base import BaseCommand, CommandError
from api.models import Employee


class Command(BaseCommand):
    help = 'Manage employees (list, add, setpin, delete)'

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='action', help='Action to perform')

        # List
        list_parser = subparsers.add_parser('list', help='List all employees')

        # Add
        add_parser = subparsers.add_parser('add', help='Add a new employee')
        add_parser.add_argument('first_name', type=str, help='First name')
        add_parser.add_argument('last_name', type=str, help='Last name')
        add_parser.add_argument('--email', type=str, default='', help='Email address')
        add_parser.add_argument('--pin', type=str, help='4-10 digit PIN')

        # Set PIN
        setpin_parser = subparsers.add_parser('setpin', help='Set PIN for an employee')
        setpin_parser.add_argument('name', type=str, help='Employee name (first last)')
        setpin_parser.add_argument('pin', type=str, help='4-10 digit PIN')

        # Delete
        delete_parser = subparsers.add_parser('delete', help='Delete an employee')
        delete_parser.add_argument('name', type=str, help='Employee name (first last)')

    def handle(self, *args, **options):
        action = options.get('action')

        if action == 'list':
            self.list_employees()
        elif action == 'add':
            self.add_employee(options)
        elif action == 'setpin':
            self.set_pin(options)
        elif action == 'delete':
            self.delete_employee(options)
        else:
            self.stdout.write(self.style.WARNING('Usage: python manage.py employee <list|add|setpin|delete>'))

    def list_employees(self):
        employees = Employee.objects.all().order_by('first_name', 'last_name')
        if not employees:
            self.stdout.write('No employees found.')
            return

        self.stdout.write(f'\n{"ID":<5} {"Name":<25} {"Email":<30} {"PIN":<5} {"Active":<6}')
        self.stdout.write('-' * 75)
        for emp in employees:
            pin_status = 'Yes' if emp.has_pin else 'No'
            active = 'Yes' if emp.is_active else 'No'
            self.stdout.write(f'{emp.id:<5} {emp.full_name:<25} {emp.email:<30} {pin_status:<5} {active:<6}')
        self.stdout.write('')

    def add_employee(self, options):
        first_name = options['first_name']
        last_name = options['last_name']
        email = options.get('email', '')
        pin = options.get('pin')

        # Check if employee already exists
        if Employee.objects.filter(first_name=first_name, last_name=last_name).exists():
            raise CommandError(f'Employee "{first_name} {last_name}" already exists')

        # Validate PIN
        if pin:
            if not pin.isdigit() or len(pin) < 4 or len(pin) > 10:
                raise CommandError('PIN must be 4-10 digits')

        employee = Employee.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_active=True
        )

        if pin:
            employee.set_pin(pin)
            employee.save()

        self.stdout.write(self.style.SUCCESS(
            f'Created employee: {employee.full_name} (ID: {employee.id})'
            + (f' with PIN' if pin else '')
        ))

    def set_pin(self, options):
        name = options['name']
        pin = options['pin']

        # Validate PIN
        if not pin.isdigit() or len(pin) < 4 or len(pin) > 10:
            raise CommandError('PIN must be 4-10 digits')

        # Find employee by name
        employee = self._find_employee(name)

        employee.set_pin(pin)
        employee.save()

        self.stdout.write(self.style.SUCCESS(f'PIN set for {employee.full_name}'))

    def delete_employee(self, options):
        name = options['name']
        employee = self._find_employee(name)

        full_name = employee.full_name
        employee.delete()

        self.stdout.write(self.style.SUCCESS(f'Deleted employee: {full_name}'))

    def _find_employee(self, name):
        """Find employee by full name or partial match."""
        parts = name.strip().split()

        if len(parts) >= 2:
            first_name = parts[0]
            last_name = ' '.join(parts[1:])
            employee = Employee.objects.filter(
                first_name__iexact=first_name,
                last_name__iexact=last_name
            ).first()
        else:
            employee = None

        if not employee:
            # Try partial match
            employee = Employee.objects.filter(
                first_name__icontains=name
            ).first() or Employee.objects.filter(
                last_name__icontains=name
            ).first()

        if not employee:
            raise CommandError(f'Employee "{name}" not found')

        return employee
