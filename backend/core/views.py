import logging
from decimal import Decimal
from typing import Any, cast

from django.contrib.auth import authenticate
from django.core.paginator import EmptyPage, Paginator
from django.db.models import Q, Sum
from django.db.models.functions import TruncMonth
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .exports import (
    MissingExportDependencyError,
    SUPPORTED_EXPORT_FORMATS,
    export_records_response,
    export_users_response,
)
from .models import AuditLog, FinancialRecord, User
from .permissions import (
    CanAccessDashboard,
    CanAccessRecords,
    CanManageUsers,
    IsActiveAuthenticated,
)
from .serializers import (
    DashboardFilterSerializer,
    FinancialRecordSerializer,
    LoginSerializer,
    RegisterSerializer,
    RecordFilterSerializer,
    UserSerializer,
)
from .throttles import LoginRateThrottle, RegisterRateThrottle

logger = logging.getLogger(__name__)


def model_pk(instance: Any) -> int:
    return int(getattr(instance, 'pk'))


def request_user(request: Any) -> User:
    return cast(User, request.user)


def serializer_data(serializer: Any) -> dict[str, Any]:
    return cast(dict[str, Any], serializer.validated_data)


def get_request_identity(request):
    return {
        'username': getattr(request.user, 'username', 'anonymous'),
        'ip': request.META.get('REMOTE_ADDR', 'unknown'),
    }


def forbidden_response(message):
    return Response({'detail': message}, status=status.HTTP_403_FORBIDDEN)


def create_audit_log(user, action, object_type, object_id):
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        object_type=object_type,
        object_id=object_id,
    )


def records_queryset():
    return FinancialRecord.objects.select_related('created_by', 'updated_by').only(
        'id',
        'amount',
        'record_type',
        'category',
        'transaction_date',
        'notes',
        'created_at',
        'updated_at',
        'created_by_id',
        'updated_by_id',
        'created_by__id',
        'created_by__username',
        'created_by__name',
        'updated_by__id',
        'updated_by__username',
        'updated_by__name',
    )


def apply_record_filters(queryset, validated_filters):
    record_type = validated_filters.get('record_type')
    category = validated_filters.get('category')
    search = validated_filters.get('search')
    start_date = validated_filters.get('start_date')
    end_date = validated_filters.get('end_date')

    if record_type:
        queryset = queryset.filter(record_type=record_type)
    if category:
        queryset = queryset.filter(category__iexact=category.strip())
    if search:
        queryset = queryset.filter(
            Q(category__icontains=search) | Q(notes__icontains=search)
        )
    if start_date:
        queryset = queryset.filter(transaction_date__gte=start_date)
    if end_date:
        queryset = queryset.filter(transaction_date__lte=end_date)
    return queryset


def apply_user_filters(queryset, role=None, status_filter=None, search=None):
    if role in {choice for choice, _ in User.Role.choices}:
        queryset = queryset.filter(role=role)
    if status_filter in {'active', 'inactive'}:
        queryset = queryset.filter(is_active=status_filter == 'active')
    if search:
        queryset = queryset.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(name__icontains=search)
        )
    return queryset


def get_export_format(request):
    export_format = request.query_params.get('format', 'pdf').lower()
    if export_format not in SUPPORTED_EXPORT_FORMATS:
        raise ValidationError(
            {
                'format': [
                    f'Unsupported export format. Choose one of: {", ".join(sorted(SUPPORTED_EXPORT_FORMATS))}.'
                ]
            }
        )
    return export_format


def build_dashboard_payload(queryset):
    record_count = queryset.count()
    income_total = queryset.filter(record_type=FinancialRecord.RecordType.INCOME).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    expense_total = queryset.filter(record_type=FinancialRecord.RecordType.EXPENSE).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    category_totals = [
        {
            'category': row['category'],
            'type': row['record_type'],
            'total': row['total'],
        }
        for row in queryset.values('category', 'record_type')
        .annotate(total=Sum('amount'))
        .order_by('category', 'record_type')
    ]

    monthly_trends = [
        {
            'month': row['month'].strftime('%Y-%m') if row['month'] else None,
            'income': row['income'] or Decimal('0'),
            'expenses': row['expenses'] or Decimal('0'),
            'net_balance': (row['income'] or Decimal('0')) - (row['expenses'] or Decimal('0')),
        }
        for row in queryset.annotate(month=TruncMonth('transaction_date'))
        .values('month')
        .annotate(
            income=Sum(
                'amount',
                filter=Q(record_type=FinancialRecord.RecordType.INCOME),
            ),
            expenses=Sum(
                'amount',
                filter=Q(record_type=FinancialRecord.RecordType.EXPENSE),
            ),
        )
        .order_by('month')
    ]

    recent_activity = FinancialRecordSerializer(list(queryset[:5]), many=True).data

    return {
        'totals': {
            'income': income_total,
            'expenses': expense_total,
            'net_balance': income_total - expense_total,
            'record_count': record_count,
        },
        'category_totals': category_totals,
        'monthly_trends': monthly_trends,
        'recent_activity': recent_activity,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'finance-dashboard-api'})


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = cast(User, serializer.save())
    identity = get_request_identity(request)
    logger.info(
        'User registered: username=%s role=%s ip=%s',
        user.username,
        user.role,
        identity['ip'],
    )
    create_audit_log(user, AuditLog.Action.REGISTER, 'user', model_pk(user))
    return Response(
        {
            'detail': 'Registration successful. Please log in with your new account.',
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    identity = get_request_identity(request)
    credentials = serializer_data(serializer)
    username = str(credentials['username'])
    password = str(credentials['password'])

    user = cast(
        User | None,
        authenticate(
            username=username,
            password=password,
        ),
    )
    if not user:
        logger.warning(
            'Failed login attempt: username=%s ip=%s',
            username,
            identity['ip'],
        )
        return Response(
            {'detail': 'Invalid username or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not user.is_active:
        logger.warning(
            'Inactive user login blocked: username=%s ip=%s',
            user.username,
            identity['ip'],
        )
        return Response(
            {'detail': 'This user account is inactive.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh = RefreshToken.for_user(user)
    logger.info('Successful login: username=%s ip=%s', user.username, identity['ip'])
    create_audit_log(user, AuditLog.Action.LOGIN, 'user', model_pk(user))
    return Response(
        {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_view(request):
    serializer = TokenRefreshSerializer(data=request.data)
    try:
        serializer.is_valid(raise_exception=True)
        validated = serializer_data(serializer)
        payload = {'access': str(validated['access'])}
        refresh_token = validated.get('refresh')
        if refresh_token:
            payload['refresh'] = str(refresh_token)
        logger.info('Refresh token rotated successfully.')
        return Response(payload)
    except (ValidationError, TokenError):
        logger.warning('Refresh token rejected during refresh attempt.')
        return Response(
            {'detail': 'Refresh token is invalid or expired.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(['GET'])
@permission_classes([IsActiveAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['GET', 'POST'])
@permission_classes([IsActiveAuthenticated, CanManageUsers])
def users_view(request):
    current_user = request_user(request)

    if request.method == 'GET':
        queryset = User.objects.only(
            'id',
            'username',
            'email',
            'name',
            'role',
            'is_active',
            'date_joined',
            'created_at',
            'updated_at',
        ).order_by('id')
        role = request.query_params.get('role')
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        queryset = apply_user_filters(queryset, role=role, status_filter=status_filter, search=search)
        return Response(UserSerializer(queryset, many=True).data)

    serializer = UserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = cast(User, serializer.save())
    logger.info(
        'Admin created user: admin=%s created_user=%s role=%s',
        current_user.username,
        user.username,
        user.role,
    )
    create_audit_log(current_user, AuditLog.Action.CREATE, 'user', model_pk(user))
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsActiveAuthenticated, CanManageUsers])
def user_detail_view(request, user_id):
    current_user = request_user(request)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserSerializer(user).data)

    partial = request.method == 'PATCH'
    serializer = UserSerializer(user, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    updated_user = cast(User, serializer.save())
    logger.info(
        'Admin updated user: admin=%s target_user=%s role=%s active=%s',
        current_user.username,
        updated_user.username,
        updated_user.role,
        updated_user.is_active,
    )
    create_audit_log(current_user, AuditLog.Action.UPDATE, 'user', model_pk(updated_user))
    return Response(UserSerializer(updated_user).data)


@api_view(['GET', 'POST'])
@permission_classes([IsActiveAuthenticated, CanAccessRecords])
def records_view(request):
    current_user = request_user(request)

    if request.method == 'GET':
        filters = RecordFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        validated_filters = serializer_data(filters)
        queryset = apply_record_filters(
            records_queryset().all(),
            validated_filters,
        )

        paginator = Paginator(queryset, int(validated_filters['page_size']))
        try:
            page = paginator.page(int(validated_filters['page']))
        except EmptyPage:
            return Response(
                {'detail': 'Requested page is out of range.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                'count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': page.number,
                'results': FinancialRecordSerializer(page.object_list, many=True).data,
            }
        )

    serializer = FinancialRecordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    record = cast(
        FinancialRecord,
        serializer.save(created_by=current_user, updated_by=current_user),
    )
    record_pk = model_pk(record)
    logger.info(
        'Financial record created: admin=%s record_id=%s category=%s amount=%s',
        current_user.username,
        record_pk,
        record.category,
        record.amount,
    )
    create_audit_log(current_user, AuditLog.Action.CREATE, 'financial_record', record_pk)
    return Response(FinancialRecordSerializer(record).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsActiveAuthenticated, CanAccessRecords])
def record_detail_view(request, record_id):
    current_user = request_user(request)

    try:
        record = records_queryset().get(pk=record_id)
    except FinancialRecord.DoesNotExist:
        return Response({'detail': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(FinancialRecordSerializer(record).data)

    if request.method == 'DELETE':
        record_pk = model_pk(record)
        logger.info(
            'Financial record deleted: admin=%s record_id=%s category=%s',
            current_user.username,
            record_pk,
            record.category,
        )
        record.soft_delete(current_user)
        create_audit_log(current_user, AuditLog.Action.DELETE, 'financial_record', record_pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = FinancialRecordSerializer(record, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    updated_record = cast(FinancialRecord, serializer.save(updated_by=current_user))
    updated_record_pk = model_pk(updated_record)
    logger.info(
        'Financial record updated: admin=%s record_id=%s category=%s amount=%s',
        current_user.username,
        updated_record_pk,
        updated_record.category,
        updated_record.amount,
    )
    create_audit_log(current_user, AuditLog.Action.UPDATE, 'financial_record', updated_record_pk)
    return Response(FinancialRecordSerializer(updated_record).data)


@api_view(['GET'])
@permission_classes([IsActiveAuthenticated, CanAccessRecords])
def records_export_view(request):
    raw_filters = request.query_params.copy()
    raw_filters.pop('format', None)

    filters = RecordFilterSerializer(data=raw_filters)
    filters.is_valid(raise_exception=True)
    validated_filters = serializer_data(filters)
    queryset = apply_record_filters(records_queryset().all(), validated_filters)

    try:
        return export_records_response(queryset, get_export_format(request))
    except MissingExportDependencyError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([IsActiveAuthenticated, CanManageUsers])
def users_export_view(request):
    queryset = apply_user_filters(
        User.objects.only(
            'id',
            'username',
            'email',
            'name',
            'role',
            'is_active',
            'date_joined',
            'created_at',
            'updated_at',
        ).order_by('id'),
        role=request.query_params.get('role'),
        status_filter=request.query_params.get('status'),
        search=request.query_params.get('search'),
    )

    try:
        return export_users_response(queryset, get_export_format(request))
    except MissingExportDependencyError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


@api_view(['GET'])
@permission_classes([IsActiveAuthenticated, CanAccessDashboard])
def dashboard_summary_view(request):
    filters = DashboardFilterSerializer(data=request.query_params)
    filters.is_valid(raise_exception=True)
    validated_filters = serializer_data(filters)
    queryset = apply_record_filters(
        records_queryset().all(),
        validated_filters,
    )
    return Response(build_dashboard_payload(queryset))
