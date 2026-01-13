from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
import os

def serve_frontend(request):
    """Serve the React frontend index.html for all non-API routes."""
    index_path = settings.BASE_DIR / 'staticfiles' / 'frontend' / 'index.html'
    if index_path.exists():
        with open(index_path, 'r') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse('Frontend not built. Run: cd frontend && npm run build', status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# In production, serve the React frontend for all other routes
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^(?!api/|admin/|static/|media/).*$', serve_frontend),
    ]
