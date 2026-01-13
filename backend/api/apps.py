from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Register HEIF/HEIC support with Pillow at startup
        # This allows ImageField to validate HEIC images
        import pillow_heif
        pillow_heif.register_heif_opener()
