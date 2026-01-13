from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Register HEIF/HEIC support with Pillow at startup
        # This allows ImageField to validate HEIC images
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
            logger.info("pillow_heif registered successfully")
        except ImportError:
            logger.warning("pillow_heif not available - HEIC support disabled")
