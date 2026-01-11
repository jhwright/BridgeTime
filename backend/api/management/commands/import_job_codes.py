import csv
from django.core.management.base import BaseCommand
from api.models import JobCodeCategory, JobCode


class Command(BaseCommand):
    help = 'Import job codes from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']

        categories_created = 0
        categories_updated = 0
        job_codes_created = 0
        job_codes_updated = 0

        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            for row in reader:
                category_name = row.get('JobcodeLevel_0', '').strip()
                category_alias = row.get('JobcodeLevel_0_Alias', '').strip()
                job_code_name = row.get('JobcodeLevel_1', '').strip()
                job_code_alias = row.get('JobcodeLevel_1_Alias', '').strip()

                if not category_name:
                    continue

                # Create or update category
                category, created = JobCodeCategory.objects.update_or_create(
                    name=category_name,
                    defaults={'alias': category_alias}
                )

                if created:
                    categories_created += 1
                    self.stdout.write(f"Created category: {category_name}")
                else:
                    categories_updated += 1

                # Create or update job code if present
                if job_code_name:
                    job_code, created = JobCode.objects.update_or_create(
                        category=category,
                        name=job_code_name,
                        defaults={'alias': job_code_alias}
                    )

                    if created:
                        job_codes_created += 1
                        self.stdout.write(f"  Created job code: {job_code_name}")
                    else:
                        job_codes_updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nImport complete:\n"
            f"  Categories: {categories_created} created, {categories_updated} updated\n"
            f"  Job codes: {job_codes_created} created, {job_codes_updated} updated"
        ))
