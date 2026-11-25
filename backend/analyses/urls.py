from rest_framework.routers import SimpleRouter

from .views import AnalysisViewSet, ClientViewSet

router = SimpleRouter(trailing_slash=False)
router.register("analyses", AnalysisViewSet, basename="analysis")
router.register("clients", ClientViewSet, basename="client")

urlpatterns = router.urls
