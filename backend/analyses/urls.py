from rest_framework.routers import SimpleRouter

from .views import AnalysisViewSet

router = SimpleRouter(trailing_slash=False)
router.register("analyses", AnalysisViewSet, basename="analysis")

urlpatterns = router.urls
