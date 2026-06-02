from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Conversion, Model3D
from .serializers import ConversionSerializer, ConversionListSerializer, Model3DSerializer
from users_app.permissions import IsNotViewer
import os
import tempfile
from django.core.files.base import ContentFile
from django.conf import settings
from .beta_gen3d.pipeline import Drawing2CADPipeline

class ConversionViewSet(viewsets.ModelViewSet):
    """
    GET  /api/conversions/          → all authenticated
    POST /api/conversions/          → non-Viewers (triggers pipeline)
    GET  /api/conversions/{id}/     → all authenticated
    POST /api/conversions/{id}/retry/ → non-Viewers
    """
    queryset = Conversion.objects.select_related('document', 'document__asset', 'user').all()
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return ConversionListSerializer if self.action == 'list' else ConversionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        doc_id = self.request.query_params.get('document')
        status_ = self.request.query_params.get('status')
        if doc_id:  qs = qs.filter(document__id=doc_id)
        if status_: qs = qs.filter(status=status_)
        return qs

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Reset a failed conversion to 'waiting' so the pipeline re-picks it up."""
        conversion = self.get_object()
        if conversion.status != Conversion.Status.FAILED:
            return Response(
                {'detail': 'Only failed conversions can be retried.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        conversion.status        = Conversion.Status.WAITING
        conversion.progress      = 0
        conversion.error_code    = ''
        conversion.error_message = ''
        conversion.started_at    = None
        conversion.completed_at  = None
        conversion.completed_at  = None
        conversion.save()
        return Response(ConversionSerializer(conversion, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def convert_plan(self, request):
        """Directly convert an uploaded plan to 3D."""
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Save to temp file for the pipeline
        fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(uploaded_file.name)[1])
        with os.fdopen(fd, 'wb') as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)
                
        try:
            # Run pipeline
            pipeline = Drawing2CADPipeline(output_dir=os.path.join(settings.MEDIA_ROOT, 'models3d'))
            result = pipeline.run(file_path=temp_path, filename=os.path.splitext(uploaded_file.name)[0])
            
            # Formulate response urls
            output_files = result.get('output_files', {})
            urls = {}
            for fmt, path in output_files.items():
                # path is absolute or relative to MEDIA_ROOT? pipeline creates in output_dir
                # output_dir is MEDIA_ROOT/models3d. So relative path to MEDIA_URL is models3d/filename
                rel_path = os.path.relpath(path, settings.MEDIA_ROOT)
                urls[fmt] = request.build_absolute_uri(settings.MEDIA_URL + rel_path.replace('\\', '/'))
            
            return Response({
                'shape_type': result.get('shape_type'),
                'dimensions': result.get('dimensions'),
                'cadquery_code': result.get('cadquery_code'),
                'urls': urls
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass


class Model3DViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/models3d/          → all authenticated
    GET /api/models3d/{id}/     → all authenticated (includes download URL)
    """
    queryset         = Model3D.objects.select_related('conversion').all()
    serializer_class = Model3DSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        conv_id = self.request.query_params.get('conversion')
        fmt     = self.request.query_params.get('format')
        if conv_id: qs = qs.filter(conversion__id=conv_id)
        if fmt:     qs = qs.filter(format=fmt.upper())
        return qs
